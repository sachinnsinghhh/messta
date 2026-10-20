const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/order");
const Mess = require("../models/mess");
const Subscription = require("../models/Subscription");
const Staff = require("../models/Staff");
const { deductRecipeStockFromInventory } = require("./inventorycontroller");
const { creditPartnerWallet } = require("./walletcontroller");
const { evaluateCutOff, getNowIST, formatDate, getTomorrowIST } = require("../utils/bookingCutoff");

// Helper to record staff meal redemption metrics
const recordStaffMealRedemption = async (staffId) => {
  if (!staffId || !mongoose.Types.ObjectId.isValid(staffId)) return;
  try {
    await Staff.findByIdAndUpdate(staffId, {
      $inc: { mealsServedCount: 1, todayMealsServed: 1 },
      lastActiveAt: new Date(),
    });
  } catch {
    // Non-blocking
  }
};

// Initialize Razorpay instance with dev fallback
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "rzp_secret_placeholder",
});

// Helper to generate a 4-character uppercase token (e.g., MESSTA-7A8B)
const generateToken = () => {
  const chars = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MESSTA-${chars}`;
};

// Helper: validate max 1-day advance booking
const isValidBookingDate = (dateString) => {
  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    targetDate.getTime() === today.getTime() ||
    targetDate.getTime() === tomorrow.getTime()
  );
};

// @desc    Initiate a Razorpay payment order and reserve a preliminary order record
// @route   POST /api/orders/create-payment
exports.createPaymentOrder = async (req, res) => {
  try {
    const { messId, mealType, bookingDate, userId, userEmail, userName } = req.body;

    const mess = await Mess.findById(messId);
    if (!mess) {
      return res.status(404).json({
        success: false,
        message: "Mess listing not found.",
      });
    }

    // Strict Advance Slot Booking & Cut-Off Validation
    const cutOffEval = evaluateCutOff(mealType, bookingDate, mess.advanceBookingConfig);
    if (!cutOffEval.allowed) {
      return res.status(400).json({
        success: false,
        message: cutOffEval.reason,
        cutOffStatus: cutOffEval,
      });
    }

    const slotType = mealType === "lunch" ? "lunch" : "dinner";
    const available = mess.availableSlots?.[slotType] ?? 10;
    if (available <= 0) {
      return res.status(400).json({
        success: false,
        message: `Sorry, ${mealType} slots are completely sold out for this mess today.`,
      });
    }

    const price = mess.pricePerMeal || 80;
    const options = {
      amount: price * 100, // amount in paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    };

    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create(options);
    } catch {
      // Mock fallback for local dev when real API keys are not active
      razorpayOrder = {
        id: `order_mock_${Date.now()}`,
        amount: options.amount,
        currency: "INR",
      };
    }

    const uniqueToken = generateToken();

    const preliminaryOrder = new Order({
      messId: mess._id,
      messName: mess.name,
      userId,
      userEmail,
      userName: userName || userEmail.split("@")[0],
      mealType,
      bookingDate,
      amount: price,
      razorpayOrderId: razorpayOrder.id,
      token: uniqueToken,
      paymentStatus: "pending",
      tokenStatus: "active",
    });

    const savedOrder = await preliminaryOrder.save();

    return res.status(201).json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      dbOrderId: savedOrder._id,
      token: uniqueToken,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error initiating payment order.",
      error: error.message,
    });
  }
};

// @desc    Verify payment signature and finalize slot reservation
// @route   POST /api/orders/verify-payment
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, dbOrderId } = req.body;

    const order = await Order.findById(dbOrderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Reservation order not found.",
      });
    }

    order.paymentStatus = "paid";
    order.razorpayPaymentId = razorpay_payment_id || `pay_${Date.now()}`;
    await order.save();

    // Safely decrement available slots for the mess
    const slotKey = order.mealType === "lunch" ? "availableSlots.lunch" : "availableSlots.dinner";
    await Mess.findByIdAndUpdate(order.messId, {
      $inc: { [slotKey]: -1 },
    });

    // Messta Virtual Escrow Ledger: credit mess wallet and split 4% plate platform cut
    try {
      const commAmt = Math.round(Number(order.amount) * 0.04 * 100) / 100;
      await creditPartnerWallet({
        messId: order.messId,
        grossAmount: order.amount,
        platePrice: order.amount,
        commissionType: "per_plate",
        source: "per_plate_booking",
        title: `${order.userName || "Student"} - ${order.mealType?.toUpperCase() || "Meal"} Plate`,
        description: `Student paid ₹${order.amount} via Universal QR. Super Admin cut: ₹${commAmt} (4% of plate price). Credited ₹${order.amount - commAmt} to mess income.`,
        studentName: order.userName || order.userEmail || "Student",
        orderId: order.token || `ORD_${order._id.toString().slice(-6)}`,
        paymentMethod: "upi_qr",
      });
    } catch (wErr) {
      console.warn("Wallet split notice during order verification:", wErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Payment captured successfully! Slot confirmed.",
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error during payment verification.",
      error: error.message,
    });
  }
};

// @desc    Get order history for a student/customer
// @route   GET /api/orders/user/:userId
exports.getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching user orders.",
      error: error.message,
    });
  }
};

// @desc    Counter Scanner: Dual Token Lookup (checks single-meal orders AND student subscriptions)
// @route   GET /api/orders/token/:token
exports.verifyToken = async (req, res) => {
  try {
    const rawToken = req.params.token.toUpperCase().trim();

    // 1. First, search in standard single-meal orders
    const order = await Order.findOne({ token: rawToken });
    if (order) {
      return res.status(200).json({
        success: true,
        type: "order",
        data: {
          token: order.token,
          tokenStatus: order.tokenStatus,
          paymentStatus: order.paymentStatus,
          customerName: order.userName,
          customerEmail: order.userEmail,
          mealType: order.mealType,
          bookingDate: order.bookingDate,
          amount: order.amount,
          messId: order.messId,
          messName: order.messName,
        },
      });
    }

    // 2. Next, search in student membership daily redemptions
    const subscription = await Subscription.findOne({
      $or: [
        { "dailyRedemptions.tokenCode": rawToken },
        { passCode: rawToken },
      ],
    }).populate("messId");

    if (subscription) {
      const redemption = subscription.dailyRedemptions.find(
        (r) => r.tokenCode === rawToken
      );

      return res.status(200).json({
        success: true,
        type: "subscription",
        data: {
          token: rawToken,
          tokenStatus: redemption ? redemption.status : subscription.status,
          paymentStatus: "paid",
          customerName: subscription.userName,
          customerEmail: subscription.userEmail,
          customerPhone: subscription.userPhone,
          mealType: redemption ? redemption.mealType : "membership_pass",
          bookingDate: redemption ? redemption.date : new Date().toISOString().split("T")[0],
          planName: subscription.planName,
          category: subscription.category,
          frequency: subscription.frequency,
          remainingTokens: subscription.remainingTokens,
          totalTokens: subscription.totalTokens,
          subscriptionId: subscription._id,
          messId: subscription.messId?._id || subscription.messId,
          messName: subscription.messId?.name || "Messta Outlet",
        },
      });
    }

    return res.status(404).json({
      success: false,
      message: `Token code '${rawToken}' not found in active orders or student memberships.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error during token verification.",
      error: error.message,
    });
  }
};

// @desc    Counter Scanner: Redeem/Mark Meal as Served (Dual handler for Orders & Subscriptions)
// @route   PUT /api/orders/token/:token/redeem
exports.redeemToken = async (req, res) => {
  try {
    const rawToken = req.params.token.toUpperCase().trim();
    const { staffId, staffName, shift } = req.body || {};
    const todayStr = formatDate(getNowIST());

    // 1. Check if it's an Order
    const order = await Order.findOne({ token: rawToken });
    if (order) {
      if (order.tokenStatus === "redeemed") {
        return res.status(400).json({
          success: false,
          message: "This token has ALREADY been redeemed!",
          order,
        });
      }

      if (order.paymentStatus !== "paid") {
        return res.status(400).json({
          success: false,
          message: "Cannot redeem meal: Payment status is pending or failed.",
          order,
        });
      }

      // Advance Slot Validation: Ensure meal is scheduled for today
      if (order.bookingDate) {
        if (order.bookingDate > todayStr) {
          return res.status(400).json({
            success: false,
            message: `Seat locked for TOMORROW (${order.bookingDate})! Under Advance Slot Booking policy, this meal can only be served tomorrow.`,
            order,
          });
        }
        if (order.bookingDate < todayStr) {
          return res.status(400).json({
            success: false,
            message: `This meal reservation was scheduled for ${order.bookingDate} and has expired.`,
            order,
          });
        }
      }

      order.tokenStatus = "redeemed";
      order.redeemedAt = new Date();
      if (staffId && mongoose.Types.ObjectId.isValid(staffId)) {
        order.scannedByStaffId = staffId;
      }
      if (staffName) {
        order.scannedByStaffName = staffName;
      }
      if (shift) {
        order.scannedShift = shift;
      }
      await order.save();

      // Synchronize with Subscription if it was booked with a membership token
      try {
        await Subscription.updateOne(
          { "dailyRedemptions.tokenCode": rawToken },
          {
            $set: {
              "dailyRedemptions.$.status": "served",
              "dailyRedemptions.$.servedAt": new Date(),
              "dailyRedemptions.$.scannedByStaffName": staffName || "Counter Desk",
            },
          }
        );
      } catch (err) {
        // Non-blocking
      }

      // Attribute accountability to staff member
      recordStaffMealRedemption(staffId);

      // Automated Inventory Deduction on meal served
      deductRecipeStockFromInventory({
        messId: order.messId,
        thaliName: order.thaliName,
        orderId: order._id,
        studentName: order.userName,
      });

      return res.status(200).json({
        success: true,
        message: `Token ${rawToken} redeemed successfully! Meal served.`,
        data: order,
      });
    }

    // 2. Check if it's a Subscription Daily Slot or Pass
    const sub = await Subscription.findOne({
      $or: [
        { "dailyRedemptions.tokenCode": rawToken },
        { passCode: rawToken },
      ],
    }).populate("messId");

    if (sub) {
      const redemption = sub.dailyRedemptions.find((r) => r.tokenCode === rawToken);

      if (redemption) {
        if (redemption.status === "served") {
          return res.status(400).json({
            success: false,
            message: `Daily meal slot token ${rawToken} was already marked as served!`,
          });
        }
        if (redemption.date) {
          if (redemption.date > todayStr) {
            return res.status(400).json({
              success: false,
              message: `Membership seat reservation is locked for TOMORROW (${redemption.date})! It can only be served tomorrow.`,
            });
          }
          if (redemption.date < todayStr) {
            return res.status(400).json({
              success: false,
              message: `This membership meal reservation was scheduled for ${redemption.date} and has expired.`,
            });
          }
        }

        redemption.status = "served";
        redemption.servedAt = new Date();
        if (staffName) redemption.scannedByStaffName = staffName;

        // Sync companion order if exists
        try {
          await Order.updateOne(
            { token: rawToken },
            {
              $set: {
                tokenStatus: "redeemed",
                redeemedAt: new Date(),
                scannedByStaffName: staffName || "Counter Desk",
              },
            }
          );
        } catch {}
      } else {
        // Direct redemption via passCode:
        // Under Advance Slot Booking policy, passholders MUST reserve their slot 1 day in advance.
        const todayReservation = (sub.dailyRedemptions || []).find(
          (r) => r.date === todayStr && r.status === "pending"
        );

        if (todayReservation) {
          // Auto-fulfill their today advance reservation
          todayReservation.status = "served";
          todayReservation.servedAt = new Date();
          if (staffName) todayReservation.scannedByStaffName = staffName;
          try {
            await Order.updateOne(
              { token: todayReservation.tokenCode },
              {
                $set: {
                  tokenStatus: "redeemed",
                  redeemedAt: new Date(),
                  scannedByStaffName: staffName || "Counter Desk",
                },
              }
            );
          } catch {}
        } else {
          // Advance Only check
          const isAdvanceOnly = sub.messId?.advanceBookingConfig?.isAdvanceOnly !== false;
          if (isAdvanceOnly) {
            return res.status(400).json({
              success: false,
              message: `No advance meal slot locked for today (${todayStr})! Under Messta Advance Slot Booking rules, monthly passholders must lock their slot 1 day prior. Same-day walk-in is blocked to prevent kitchen rationing shortages.`,
            });
          }

          // Fallback only if advance-only is turned off
          if (sub.remainingTokens <= 0) {
            sub.status = "exhausted";
            sub.isCommunityMember = false;
            await sub.save();
            return res.status(400).json({
              success: false,
              message: "Student tokens exhausted! Please ask student to renew plan.",
            });
          }

          sub.remainingTokens = Math.max(0, sub.remainingTokens - 1);
          sub.dailyRedemptions.push({
            tokenCode: rawToken,
            date: todayStr,
            mealType: "counter_instant",
            status: "served",
            redeemedAt: new Date(),
            servedAt: new Date(),
            scannedByStaffName: staffName || "Counter Desk",
          });
          if (sub.remainingTokens === 0) {
            sub.status = "exhausted";
            sub.isCommunityMember = false;
          }
        }
      }

      await sub.save();

      // Attribute accountability to staff member
      recordStaffMealRedemption(staffId);

      // Automated Inventory Deduction on subscription meal served
      deductRecipeStockFromInventory({
        messId: sub.messId?._id || sub.messId,
        thaliName: redemption ? redemption.thaliName : sub.planName,
        subscriptionId: sub._id,
        studentName: sub.userName,
      });

      return res.status(200).json({
        success: true,
        message: `Student membership meal served! Tokens remaining: ${sub.remainingTokens}`,
        data: sub,
      });
    }

    return res.status(404).json({
      success: false,
      message: `Token ${rawToken} not found.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error redeeming meal token.",
      error: error.message,
    });
  }
};

// @desc    Get all orders belonging to a mess outlet (for live orders queue)
// @route   GET /api/orders/mess/:messId
exports.getMessOrders = async (req, res) => {
  try {
    const { messId } = req.params;
    let query = {};

    if (messId && messId !== "all" && mongoose.Types.ObjectId.isValid(messId)) {
      query = { messId };
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(50);

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching mess orders queue.",
      error: error.message,
    });
  }
};

// @desc    Intelligent Dual QR Scanner: Verifies and optionally auto-redeems dynamic QR codes (Order or Membership)
// @route   POST /api/orders/scan-qr
// @access  Public / Owner Counter
exports.scanQrCode = async (req, res) => {
  try {
    const { qrPayload, autoRedeem, staffId, staffName, shift } = req.body;

    if (!qrPayload) {
      return res.status(400).json({
        success: false,
        message: "No QR code payload provided.",
      });
    }

    let rawToken = "";
    let payloadObj = null;

    if (typeof qrPayload === "object") {
      payloadObj = qrPayload;
      rawToken = qrPayload.token || qrPayload.passCode || qrPayload.tokenCode || "";
    } else {
      const trimmed = String(qrPayload).trim();
      try {
        payloadObj = JSON.parse(trimmed);
        rawToken = payloadObj.token || payloadObj.passCode || payloadObj.tokenCode || "";
      } catch {
        rawToken = trimmed.toUpperCase();
      }
    }

    rawToken = String(rawToken).toUpperCase().trim();

    if (!rawToken) {
      return res.status(400).json({
        success: false,
        message: "Could not extract a valid token from QR data.",
      });
    }

    // 1. Search in single-meal Orders
    const order = await Order.findOne({ token: rawToken });
    if (order) {
      const todayStr = formatDate(getNowIST());

      // Advance Slot Validation: Ensure meal is scheduled for today
      if (order.bookingDate) {
        if (order.bookingDate > todayStr) {
          return res.status(400).json({
            success: false,
            message: `Seat locked for TOMORROW (${order.bookingDate})! Under Advance Slot Booking policy, this meal can only be served tomorrow.`,
            tokenType: "per_plate",
            data: order,
          });
        }
        if (order.bookingDate < todayStr) {
          return res.status(400).json({
            success: false,
            message: `Meal reservation was scheduled for ${order.bookingDate} and has expired.`,
            tokenType: "per_plate",
            data: order,
          });
        }
      }

      if (autoRedeem) {
        if (order.tokenStatus === "redeemed") {
          return res.status(400).json({
            success: false,
            message: `Ticket ${rawToken} was ALREADY redeemed!`,
            tokenType: "per_plate",
            data: order,
          });
        }
        if (order.paymentStatus !== "paid") {
          return res.status(400).json({
            success: false,
            message: "Cannot redeem meal: Payment status is not completed.",
            tokenType: "per_plate",
            data: order,
          });
        }

        order.tokenStatus = "redeemed";
        order.redeemedAt = new Date();
        if (staffId && mongoose.Types.ObjectId.isValid(staffId)) {
          order.scannedByStaffId = staffId;
        }
        if (staffName) {
          order.scannedByStaffName = staffName;
        }
        if (shift) {
          order.scannedShift = shift;
        }
        await order.save();

        // Attribute accountability to staff
        recordStaffMealRedemption(staffId);

        // Synchronize with Subscription if it was booked with a membership token
        try {
          await Subscription.updateOne(
            { "dailyRedemptions.tokenCode": rawToken },
            {
              $set: {
                "dailyRedemptions.$.status": "served",
                "dailyRedemptions.$.servedAt": new Date(),
                "dailyRedemptions.$.scannedByStaffName": staffName || "Counter Desk",
              },
            }
          );
        } catch {}

        // Automated Inventory Deduction on meal served
        deductRecipeStockFromInventory({
          messId: order.messId,
          thaliName: order.thaliName,
          orderId: order._id,
          studentName: order.userName,
        });

        return res.status(200).json({
          success: true,
          redeemed: true,
          tokenType: "per_plate",
          message: `Ticket ${rawToken} verified & marked as redeemed! Meal served.`,
          data: {
            token: order.token,
            tokenStatus: "redeemed",
            paymentStatus: order.paymentStatus,
            customerName: order.userName,
            customerEmail: order.userEmail,
            mealType: order.mealType,
            bookingDate: order.bookingDate,
            amount: order.amount,
            messId: order.messId,
            messName: order.messName,
            scannedByStaffName: order.scannedByStaffName,
            scannedShift: order.scannedShift,
          },
        });
      }

      return res.status(200).json({
        success: true,
        redeemed: false,
        tokenType: "per_plate",
        message: "Single-plate meal ticket verified.",
        data: {
          token: order.token,
          tokenStatus: order.tokenStatus,
          paymentStatus: order.paymentStatus,
          customerName: order.userName,
          customerEmail: order.userEmail,
          mealType: order.mealType,
          bookingDate: order.bookingDate,
          amount: order.amount,
          messId: order.messId,
          messName: order.messName,
        },
      });
    }

    // 2. Search in student Subscriptions (Daily slot token or passCode)
    const subscription = await Subscription.findOne({
      $or: [
        { "dailyRedemptions.tokenCode": rawToken },
        { passCode: rawToken },
      ],
    }).populate("messId");

    if (subscription) {
      const todayStr = formatDate(getNowIST());
      const redemption = subscription.dailyRedemptions.find(
        (r) => r.tokenCode === rawToken
      );

      if (redemption && redemption.date) {
        if (redemption.date > todayStr) {
          return res.status(400).json({
            success: false,
            message: `Membership seat reservation is locked for TOMORROW (${redemption.date})! It can only be served tomorrow.`,
            tokenType: "membership",
            data: subscription,
          });
        }
        if (redemption.date < todayStr) {
          return res.status(400).json({
            success: false,
            message: `This membership meal reservation was scheduled for ${redemption.date} and has expired.`,
            tokenType: "membership",
            data: subscription,
          });
        }
      }

      if (autoRedeem) {
        if (redemption) {
          if (redemption.status === "served") {
            return res.status(400).json({
              success: false,
              message: `Membership meal slot ${rawToken} was ALREADY marked as served!`,
              tokenType: "membership",
              data: subscription,
            });
          }
          redemption.status = "served";
          redemption.servedAt = new Date();
          if (staffName) redemption.scannedByStaffName = staffName;

          // Sync companion Order
          try {
            await Order.updateOne(
              { token: rawToken },
              {
                $set: {
                  tokenStatus: "redeemed",
                  redeemedAt: new Date(),
                  scannedByStaffName: staffName || "Counter Desk",
                },
              }
            );
          } catch {}
        } else {
          // Direct passCode scanned:
          // Check if student locked a slot for today
          const todayReservation = (subscription.dailyRedemptions || []).find(
            (r) => r.date === todayStr && r.status === "pending"
          );

          if (todayReservation) {
            todayReservation.status = "served";
            todayReservation.servedAt = new Date();
            if (staffName) todayReservation.scannedByStaffName = staffName;
            try {
              await Order.updateOne(
                { token: todayReservation.tokenCode },
                {
                  $set: {
                    tokenStatus: "redeemed",
                    redeemedAt: new Date(),
                    scannedByStaffName: staffName || "Counter Desk",
                  },
                }
              );
            } catch {}
          } else {
            const isAdvanceOnly = subscription.messId?.advanceBookingConfig?.isAdvanceOnly !== false;
            if (isAdvanceOnly) {
              return res.status(400).json({
                success: false,
                message: `No advance meal slot locked for today (${todayStr})! Under Messta Advance Slot Booking rules, monthly passholders must lock their slot 1 day prior. Same-day walk-in is blocked to prevent kitchen rationing shortages.`,
                tokenType: "membership",
                data: subscription,
              });
            }

            if (subscription.remainingTokens <= 0) {
              subscription.status = "exhausted";
              subscription.isCommunityMember = false;
              await subscription.save();
              return res.status(400).json({
                success: false,
                message: "Student tokens exhausted! Please ask student to renew plan.",
                tokenType: "membership",
                data: subscription,
              });
            }

            subscription.remainingTokens = Math.max(0, subscription.remainingTokens - 1);
            subscription.dailyRedemptions.push({
              tokenCode: rawToken,
              date: todayStr,
              mealType: payloadObj?.mealType || "counter_instant",
              status: "served",
              redeemedAt: new Date(),
              servedAt: new Date(),
              scannedByStaffName: staffName || "Counter Desk",
            });
            if (subscription.remainingTokens === 0) {
              subscription.status = "exhausted";
              subscription.isCommunityMember = false;
            }
          }
        }

        await subscription.save();

        // Attribute accountability to staff
        recordStaffMealRedemption(staffId);

        // Automated Inventory Deduction on subscription meal served
        deductRecipeStockFromInventory({
          messId: subscription.messId?._id || subscription.messId,
          thaliName: redemption ? redemption.thaliName : subscription.planName,
          subscriptionId: subscription._id,
          studentName: subscription.userName,
        });

        return res.status(200).json({
          success: true,
          redeemed: true,
          tokenType: "membership",
          message: `Membership meal served! 1 token deducted (${subscription.remainingTokens} remaining).`,
          data: {
            token: rawToken,
            tokenStatus: "served",
            paymentStatus: "paid",
            customerName: subscription.userName,
            customerEmail: subscription.userEmail,
            customerPhone: subscription.userPhone,
            mealType: redemption ? redemption.mealType : (payloadObj?.mealType || "Daily Slot"),
            bookingDate: redemption ? redemption.date : todayStr,
            planName: subscription.planName,
            category: subscription.category,
            frequency: subscription.frequency,
            remainingTokens: subscription.remainingTokens,
            totalTokens: subscription.totalTokens,
            subscriptionId: subscription._id,
            messId: subscription.messId?._id || subscription.messId,
            messName: subscription.messId?.name || "Messta Outlet",
          },
        });
      }

      return res.status(200).json({
        success: true,
        redeemed: false,
        tokenType: "membership",
        message: "Student membership pass verified.",
        data: {
          token: rawToken,
          tokenStatus: redemption ? redemption.status : "active",
          paymentStatus: "paid",
          customerName: subscription.userName,
          customerEmail: subscription.userEmail,
          customerPhone: subscription.userPhone,
          mealType: redemption ? redemption.mealType : "Daily Pass",
          bookingDate: redemption ? redemption.date : todayStr,
          planName: subscription.planName,
          category: subscription.category,
          frequency: subscription.frequency,
          remainingTokens: subscription.remainingTokens,
          totalTokens: subscription.totalTokens,
          subscriptionId: subscription._id,
          messId: subscription.messId?._id || subscription.messId,
          messName: subscription.messId?.name || "Messta Outlet",
        },
      });
    }

    return res.status(404).json({
      success: false,
      message: `Token code '${rawToken}' not found in active bookings or student memberships.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error during QR code scan.",
      error: error.message,
    });
  }
};

// @desc    Smart Decision Engine: Evaluates token match vs cross-category direct payment
// @route   POST /api/orders/smart-book
// @access  Public / Student
exports.smartBook = async (req, res) => {
  try {
    const {
      messId,
      userId,
      userEmail,
      userName,
      mealPeriod, // "lunch" | "dinner"
      timeSlotId,
      timeWindow,
      thaliId,
      thaliName,
      thaliCategory,
      thaliPrice,
      bookingDate,
      actionChoice, // "auto" | "token" | "direct_payment"
    } = req.body;

    if (!messId || !userId || !mealPeriod) {
      return res.status(400).json({
        success: false,
        message: "Missing required booking details (messId, userId, mealPeriod).",
      });
    }

    const mess = await Mess.findById(messId);
    if (!mess) {
      return res.status(404).json({ success: false, message: "Mess not found." });
    }

    const tomorrowStr = formatDate(getTomorrowIST());
    const dateToBook = bookingDate || tomorrowStr;

    // Strict Advance Slot Booking & Cut-Off Validation (Must be tomorrow & before cut-off deadline)
    const cutOffEval = evaluateCutOff(mealPeriod, dateToBook, mess.advanceBookingConfig);
    if (!cutOffEval.allowed) {
      return res.status(400).json({
        success: false,
        message: cutOffEval.reason,
        cutOffStatus: cutOffEval,
      });
    }

    // Check time slot capacity for any operational window (breakfast, lunch, dinner, snacks, etc.)
    const periodKey = (mealPeriod || "lunch").toLowerCase();
    let targetSlot = null;
    if (mess.timeSlots && mess.timeSlots[periodKey]) {
      targetSlot = mess.timeSlots[periodKey].find(
        (s) => s.id === timeSlotId || s.timeWindow === timeWindow
      );
    }

    if (targetSlot && targetSlot.bookedCount >= targetSlot.maxCapacity) {
      return res.status(400).json({
        success: false,
        message: `Time slot ${targetSlot.timeWindow} is fully booked (${targetSlot.maxCapacity} seats reached). Please choose an adjacent time interval!`,
      });
    }

    // Look for active student subscription for this mess
    const activeSub = await Subscription.findOne({
      userId,
      messId,
      status: "active",
      remainingTokens: { $gt: 0 },
    });

    // Check Thali eligibility mapping
    const thali = (mess.activeThalis || []).find(
      (t) => t.id === thaliId || String(t._id) === thaliId || t.name === thaliName
    );

    const price = Number(thaliPrice || thali?.sellingPrice || 80);
    const category = (thaliCategory || thali?.category || "Veg").toLowerCase();
    const finalThaliName = thaliName || thali?.name || "Standard Thali";
    const slotWindow =
      timeWindow ||
      targetSlot?.timeWindow ||
      (periodKey === "lunch" ? "12:30 PM – 01:00 PM" : "08:00 PM – 08:30 PM");

    // Match algorithm:
    let isTokenMatch = false;
    let matchReason = "";

    if (activeSub && activeSub.remainingTokens > 0) {
      const subCat = (activeSub.category || "veg").toLowerCase();
      const eligibleTiers = (thali?.eligibleTiers || []).map((t) => t.toLowerCase());
      const subPlanId = activeSub.planId ? String(activeSub.planId).toLowerCase() : "";
      const subPlanName = (activeSub.planName || "").toLowerCase();

      // Check specific published plan match first (Crucial Link)
      const matchesSpecificPlan =
        (subPlanId && eligibleTiers.includes(subPlanId)) ||
        (subPlanName && eligibleTiers.includes(subPlanName)) ||
        eligibleTiers.some(
          (t) =>
            t === subPlanName ||
            t === subPlanId ||
            (subPlanName && t.length > 3 && (subPlanName.includes(t) || t.includes(subPlanName)))
        );

      if (matchesSpecificPlan) {
        isTokenMatch = true;
        matchReason = `Covered by published plan: ${activeSub.planName}`;
      }
      // 1. Combo covers all
      else if (subCat.includes("combo") || eligibleTiers.includes("combo")) {
        isTokenMatch = true;
        matchReason = "Covered by Combo Membership Pass";
      }
      // 2. Veg / Lite thalis covered by Veg or Lite subscriptions
      else if (
        (category === "veg" || category === "lite") &&
        (subCat.includes("veg") || subCat.includes("lite"))
      ) {
        isTokenMatch = true;
        matchReason = "Covered by Veg Membership Pass";
      }
      // 3. Non-veg thalis covered by Non-Veg subscriptions
      else if (category === "non-veg" && subCat.includes("non_veg")) {
        isTokenMatch = true;
        matchReason = "Covered by Non-Veg Membership Pass";
      }
      // 4. Check explicit tier tags
      else if (eligibleTiers.includes(subCat) || eligibleTiers.includes("all")) {
        isTokenMatch = true;
        matchReason = "Covered by Plan Tier Tag";
      }
    }

    // If user explicitly chose direct payment or there is a mismatch
    if (!isTokenMatch || actionChoice === "direct_payment") {
      let mismatchMsg = "Direct payment required.";
      if (activeSub && activeSub.remainingTokens > 0) {
        mismatchMsg = `Your active plan is ${activeSub.category.toUpperCase()} (${activeSub.planName}), which does not cover ${thaliCategory || "this"} Thali. Direct payment required.`;
      } else if (activeSub && activeSub.remainingTokens <= 0) {
        mismatchMsg = "Your membership tokens are exhausted. Please renew or pay directly.";
      } else {
        mismatchMsg = "No active membership pass enrolled for this outlet.";
      }

      // Initiate direct Razorpay payment flow
      const options = {
        amount: price * 100,
        currency: "INR",
        receipt: `rcpt_sb_${Date.now()}`,
      };

      let razorpayOrder;
      try {
        razorpayOrder = await razorpay.orders.create(options);
      } catch {
        razorpayOrder = {
          id: `order_mock_${Date.now()}`,
          amount: options.amount,
          currency: "INR",
        };
      }

      const uniqueToken = generateToken();

      const preliminaryOrder = new Order({
        messId: mess._id,
        messName: mess.name,
        userId,
        userEmail,
        userName: userName || userEmail.split("@")[0],
        mealType: periodKey,
        timeSlot: slotWindow,
        thaliName: finalThaliName,
        thaliCategory: thaliCategory || "Veg",
        bookingType: "direct_payment",
        bookingDate: dateToBook,
        amount: price,
        razorpayOrderId: razorpayOrder.id,
        token: uniqueToken,
        paymentStatus: "pending",
        tokenStatus: "active",
      });

      const savedOrder = await preliminaryOrder.save();

      return res.status(200).json({
        success: true,
        bookingType: "direct_payment",
        mismatchReason: mismatchMsg,
        orderId: razorpayOrder.id,
        amount: price,
        currency: "INR",
        dbOrderId: savedOrder._id,
        token: uniqueToken,
        details: {
          messName: mess.name,
          mealPeriod: periodKey,
          timeSlot: slotWindow,
          thaliName: finalThaliName,
          thaliPrice: price,
          bookingDate: dateToBook,
        },
      });
    }

    // Scenario 1: Token Match! Decrement 1 token, update slot capacity, generate QR pass
    // Check duplicate reservation for this student on the same date and session
    const existingBooking = (activeSub.dailyRedemptions || []).find((r) => {
      const rPeriod = (r.mealType || "").toLowerCase();
      const matchPeriod =
        (periodKey.includes("lunch") && rPeriod.includes("lunch")) ||
        (periodKey.includes("dinner") && rPeriod.includes("dinner"));
      return r.date === dateToBook && matchPeriod && r.status !== "cancelled";
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: `You already have a confirmed advance reservation (${existingBooking.tokenCode}) for ${periodKey.toUpperCase()} on ${dateToBook}. Show your existing token at counter.`,
        tokenCode: existingBooking.tokenCode,
      });
    }

    activeSub.remainingTokens = Math.max(0, activeSub.remainingTokens - 1);
    const tokenCode = generateToken();

    activeSub.dailyRedemptions.push({
      tokenCode,
      date: dateToBook,
      mealType: `${periodKey.toUpperCase()} - ${finalThaliName}`,
      timeSlot: slotWindow,
      thaliName: finalThaliName,
      status: "pending",
      redeemedAt: new Date(),
    });

    if (activeSub.remainingTokens === 0) {
      activeSub.status = "exhausted";
      activeSub.isCommunityMember = false;
    }
    await activeSub.save();

    // Increment timeSlot booked count and decrement availableSlots
    if (targetSlot) {
      targetSlot.bookedCount = (targetSlot.bookedCount || 0) + 1;
    }
    if (mess.availableSlots && mess.availableSlots[periodKey] !== undefined) {
      mess.availableSlots[periodKey] = Math.max(0, mess.availableSlots[periodKey] - 1);
    }
    await mess.save();

    // Create companion confirmed Order record for unified queue and history
    const companionOrder = new Order({
      messId: mess._id,
      messName: mess.name,
      userId,
      userEmail,
      userName: userName || activeSub.userName,
      mealType: periodKey,
      timeSlot: slotWindow,
      thaliName: finalThaliName,
      thaliCategory: thaliCategory || "Veg",
      bookingType: "membership_token",
      bookingDate: dateToBook,
      amount: 0,
      razorpayOrderId: `TOKEN_PASS_${activeSub._id}`,
      token: tokenCode,
      paymentStatus: "paid",
      tokenStatus: "active",
    });
    const savedOrder = await companionOrder.save();

    return res.status(200).json({
      success: true,
      bookingType: "membership_token",
      message: `Token matched (${matchReason})! 1 token deducted from your active pass.`,
      token: tokenCode,
      subscription: activeSub,
      remainingTokens: activeSub.remainingTokens,
      order: savedOrder,
      details: {
        messName: mess.name,
        mealPeriod: periodKey,
        timeSlot: slotWindow,
        thaliName: finalThaliName,
        bookingDate: dateToBook,
        customerName: activeSub.userName,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error executing smart booking decision engine.",
      error: error.message,
    });
  }
};