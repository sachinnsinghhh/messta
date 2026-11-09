const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/order");
const Mess = require("../models/mess");
const MessPlan = require("../models/MessPlan");
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

// Anti-Fraud UTR validation algorithm
const validateUtrFormat = (utr) => {
  if (!utr || typeof utr !== "string") {
    return { valid: false, reason: "12-digit UPI Reference Number (UTR) is required." };
  }
  const clean = utr.trim();
  // Standard Indian Banking UPI Ref / UTR is exactly 12 numeric digits
  if (!/^\d{12}$/.test(clean)) {
    return { valid: false, reason: "Invalid UTR format. Bank reference number must be exactly 12 numeric digits (e.g. 428901928312)." };
  }
  // Anti-fraud: reject common fake or dummy sequential patterns
  const dummyPatterns = [
    "000000000000",
    "111111111111",
    "222222222222",
    "333333333333",
    "444444444444",
    "555555555555",
    "666666666666",
    "777777777777",
    "888888888888",
    "999999999999",
    "123456789012",
    "012345678901",
    "123412341234",
    "987654321098",
  ];
  if (dummyPatterns.includes(clean)) {
    return { valid: false, reason: "Invalid or dummy UTR detected. Please enter the authentic 12-digit reference number from your UPI payment app (GPay / PhonePe / Paytm)." };
  }
  return { valid: true, cleanUtr: clean };
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

    let price = Number(req.body.thaliPrice) || mess.pricePerMeal;
    if (!price || price <= 0) {
      const plan = await MessPlan.findOne({ messId: mess._id }).sort({ price: 1 });
      const baseCost = plan ? (plan.price / (plan.totalTokens || 60)) : 50;
      price = Math.round(baseCost * 1.30);
    }
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
      tokenStatus: "locked",
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

// @desc    Verify payment signature and finalize slot reservation (Hybrid: Gateway vs UPI QR Verification)
// @route   POST /api/orders/verify-payment
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, dbOrderId, utrNumber, paymentMethod } = req.body;

    const order = await Order.findById(dbOrderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Reservation order not found.",
      });
    }

    // 1. GATEWAY PAYMENT VERIFICATION (Razorpay PG)
    if (razorpay_signature && razorpay_signature !== "upi_qr_verified") {
      const secret = process.env.RAZORPAY_KEY_SECRET || "rzp_secret_placeholder";
      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const expectedSignature = hmac.digest("hex");

      const isDevFallback = !process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET === "rzp_secret_placeholder";
      const isValidSignature = isDevFallback || expectedSignature === razorpay_signature;

      if (!isValidSignature) {
        order.paymentStatus = "failed";
        order.tokenStatus = "cancelled";
        await order.save();
        return res.status(400).json({
          success: false,
          message: "Payment signature verification failed. Untrusted payment payload.",
        });
      }

      // Valid Gateway Payment -> Instantly Activate!
      order.paymentStatus = "paid";
      order.tokenStatus = "active";
      order.paymentMethod = "razorpay";
      order.razorpayPaymentId = razorpay_payment_id;
      order.verifiedAt = new Date();
      order.verifiedBy = "Razorpay Gateway (Auto)";
      await order.save();

      // Decrement available slots
      const slotKey = order.mealType === "lunch" ? "availableSlots.lunch" : "availableSlots.dinner";
      await Mess.findByIdAndUpdate(order.messId, { $inc: { [slotKey]: -1 } });

      // Escrow ledger credit
      try {
        const commAmt = Math.round(Number(order.amount) * 0.05 * 100) / 100;
        await creditPartnerWallet({
          messId: order.messId,
          grossAmount: order.amount,
          platePrice: order.amount,
          commissionType: "per_plate",
          source: "per_plate_booking",
          title: `${order.userName || "Student"} - ${order.mealType?.toUpperCase() || "Meal"} Plate`,
          description: `Student paid ₹${order.amount} via Razorpay Gateway. Messta commission: ₹${commAmt} (5% platform fee). Credited ₹${order.amount - commAmt} (95%) to mess income.`,
          studentName: order.userName || order.userEmail || "Student",
          orderId: order.token || `ORD_${order._id.toString().slice(-6)}`,
          paymentMethod: "razorpay",
        });
      } catch (wErr) {
        console.warn("Wallet split notice during order verification:", wErr.message);
      }

      return res.status(200).json({
        success: true,
        verified: true,
        tokenStatus: "active",
        message: "Payment captured successfully via Gateway! Meal token is active.",
        order,
      });
    }

    // 2. DIRECT UPI QR CODE SCAN / UTR VERIFICATION
    const submittedUtr = utrNumber || (razorpay_payment_id && razorpay_payment_id.startsWith("upi_") ? razorpay_payment_id.replace("upi_", "") : "");
    const utrCheck = validateUtrFormat(submittedUtr);
    if (!utrCheck.valid) {
      return res.status(400).json({
        success: false,
        message: utrCheck.reason,
      });
    }

    // Anti-replay / Duplicate check across all orders
    const duplicateOrder = await Order.findOne({
      utrNumber: utrCheck.cleanUtr,
      paymentStatus: { $in: ["paid", "pending_verification"] },
      _id: { $ne: order._id },
    });

    if (duplicateOrder) {
      return res.status(400).json({
        success: false,
        message: `This UPI reference number (UTR: ${utrCheck.cleanUtr}) has already been used on ${duplicateOrder.bookingDate || "a previous order"}. Duplicate submissions are blocked by the fraud prevention system.`,
      });
    }

    // Lock token and transition to pending_verification for mess owner review
    order.paymentStatus = "pending_verification";
    order.tokenStatus = "locked";
    order.paymentMethod = "upi_qr";
    order.utrNumber = utrCheck.cleanUtr;
    order.razorpayPaymentId = `upi_${utrCheck.cleanUtr}`;
    await order.save();

    return res.status(200).json({
      success: true,
      pendingVerification: true,
      tokenStatus: "locked",
      message: "UPI reference submitted! Token locked awaiting mess counter verification.",
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
          utrNumber: order.utrNumber,
          paymentMethod: order.paymentMethod,
          rejectionReason: order.rejectionReason,
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

      if (order.tokenStatus === "locked" || order.paymentStatus === "pending_verification") {
        return res.status(400).json({
          success: false,
          message: `⚠️ PAYMENT PENDING: Token is LOCKED (UTR: ${order.utrNumber || "N/A"}). Please approve the student's UPI reference on your Counter Desk before serving meal.`,
          order,
        });
      }

      if (order.tokenStatus === "cancelled" || order.paymentStatus === "failed") {
        return res.status(400).json({
          success: false,
          message: "❌ CANCELLED: This meal reservation was rejected or payment failed. Do not serve meal.",
          order,
        });
      }

      if (order.paymentStatus !== "paid") {
        return res.status(400).json({
          success: false,
          message: "Cannot redeem meal: Payment status is not completed.",
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
        if (order.tokenStatus === "locked" || order.paymentStatus === "pending_verification") {
          return res.status(400).json({
            success: false,
            message: `⚠️ PAYMENT PENDING: Token is LOCKED (UTR: ${order.utrNumber || "N/A"}). Please approve the UPI reference on Counter Desk before serving meal.`,
            tokenType: "per_plate",
            data: order,
          });
        }
        if (order.tokenStatus === "cancelled" || order.paymentStatus === "failed") {
          return res.status(400).json({
            success: false,
            message: "❌ CANCELLED: This meal reservation was cancelled or payment failed. Do not serve meal.",
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
            utrNumber: order.utrNumber,
            paymentMethod: order.paymentMethod,
            scannedByStaffName: order.scannedByStaffName,
            scannedShift: order.scannedShift,
          },
        });
      }

      const isLocked = order.tokenStatus === "locked" || order.paymentStatus === "pending_verification";

      return res.status(200).json({
        success: true,
        redeemed: false,
        tokenType: "per_plate",
        message: isLocked
          ? "⚠️ Token Locked: Payment pending counter staff approval."
          : "Single-plate meal ticket verified.",
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
          utrNumber: order.utrNumber,
          paymentMethod: order.paymentMethod,
          rejectionReason: order.rejectionReason,
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

    let price = Number(thaliPrice || thali?.sellingPrice);
    if (!price || price <= 0) {
      const plan = await MessPlan.findOne({ messId: mess._id }).sort({ price: 1 });
      const baseCost = plan ? (plan.price / (plan.totalTokens || 60)) : (mess.pricePerMeal ? mess.pricePerMeal / 1.30 : 50);
      price = Math.round(baseCost * 1.30);
    }
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
        tokenStatus: "locked",
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

// @desc    Mess Counter / Owner approves pending UPI payment and unlocks token
// @route   POST /api/orders/approve-upi
// @access  Private / Owner Counter
exports.approveUpiPayment = async (req, res) => {
  try {
    const { orderId, ownerName } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order ID is required." });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    if (order.paymentStatus === "paid" && order.tokenStatus === "active") {
      return res.status(200).json({
        success: true,
        message: "Order has already been verified and token is active.",
        order,
      });
    }

    order.paymentStatus = "paid";
    order.tokenStatus = "active";
    order.verifiedAt = new Date();
    order.verifiedBy = ownerName || "Mess Counter Staff";
    order.rejectionReason = null;
    await order.save();

    // Safely decrement available slots for the mess
    const slotKey = order.mealType === "lunch" ? "availableSlots.lunch" : "availableSlots.dinner";
    await Mess.findByIdAndUpdate(order.messId, {
      $inc: { [slotKey]: -1 },
    });

    // Messta Virtual Escrow Ledger: credit mess wallet and split 5% plate platform cut
    try {
      const commAmt = Math.round(Number(order.amount) * 0.05 * 100) / 100;
      await creditPartnerWallet({
        messId: order.messId,
        grossAmount: order.amount,
        platePrice: order.amount,
        commissionType: "per_plate",
        source: "per_plate_booking",
        title: `${order.userName || "Student"} - ${order.mealType?.toUpperCase() || "Meal"} Plate`,
        description: `Student paid ₹${order.amount} via UPI QR (UTR: ${order.utrNumber || "N/A"}). Messta commission: ₹${commAmt} (5% platform fee). Credited ₹${order.amount - commAmt} (95%) to mess income. Verified by ${order.verifiedBy}.`,
        studentName: order.userName || order.userEmail || "Student",
        orderId: order.token || `ORD_${order._id.toString().slice(-6)}`,
        paymentMethod: "upi_qr",
      });
    } catch (wErr) {
      console.warn("Wallet split notice during order verification:", wErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `UPI Payment verified! Token ${order.token} is now ACTIVE and unlocked.`,
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error approving UPI payment.",
      error: error.message,
    });
  }
};

// @desc    Mess Counter / Owner rejects unverified / fake UPI payment
// @route   POST /api/orders/reject-upi
// @access  Private / Owner Counter
exports.rejectUpiPayment = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order ID is required." });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    order.paymentStatus = "failed";
    order.tokenStatus = "cancelled";
    order.rejectionReason = reason || "Payment reference (UTR) not received in mess bank account / soundbox.";
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Payment rejected. Token cancelled.",
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error rejecting UPI payment.",
      error: error.message,
    });
  }
};

// @desc    Get all orders pending UPI verification for a mess
// @route   GET /api/orders/pending-upi/:messId
// @access  Private / Owner Counter
exports.getPendingUpiOrders = async (req, res) => {
  try {
    const { messId } = req.params;
    let query = { paymentStatus: "pending_verification" };

    if (messId && messId !== "all" && mongoose.Types.ObjectId.isValid(messId)) {
      query.messId = messId;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching pending UPI orders.",
      error: error.message,
    });
  }
};

// @desc    Get live order status (for student modal polling)
// @route   GET /api/orders/:id/status
// @access  Public / Student
exports.getOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }

    const order = await Order.findById(
      id,
      "paymentStatus tokenStatus token amount utrNumber rejectionReason bookingDate mealType thaliName messName"
    );
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching order status.",
      error: error.message,
    });
  }
};