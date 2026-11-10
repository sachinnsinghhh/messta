const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/order");
const Subscription = require("../models/Subscription");
const Mess = require("../models/mess");
const MessPlan = require("../models/MessPlan");
const AdminProfile = require("../models/AdminProfile");
const { creditPartnerWallet } = require("./walletcontroller");
const { sendInstantBookingPush } = require("./notificationController");

// Helper to generate a 4-character pickup token (e.g., MESSTA-7A8B)
const generateToken = () => {
  const chars = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MESSTA-${chars}`;
};

// Helper to get PhonePe PG Config
const getPhonePeConfig = () => {
  const env = (process.env.PHONEPE_ENV || "UAT").toUpperCase();
  const merchantId = process.env.PHONEPE_MERCHANT_ID || "PGTESTPAYUAT";
  const saltKey = process.env.PHONEPE_SALT_KEY || "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";
  const saltIndex = process.env.PHONEPE_SALT_INDEX || "1";

  const hostUrl =
    env === "PRODUCTION"
      ? "https://api.phonepe.com/apis/hermes"
      : "https://api-preprod.phonepe.com/apis/pg-sandbox";

  return {
    env,
    merchantId,
    saltKey,
    saltIndex,
    hostUrl,
  };
};

// Helper: Finalize payment success (called by webhook or status check)
const finalizePaymentSuccess = async ({ merchantTransactionId, paymentId, utrNumber, provider = "phonepe" }) => {
  // 1. Check if it's a Per-Plate Order
  const order = await Order.findOne({ razorpayOrderId: merchantTransactionId });

  if (order) {
    if (order.paymentStatus === "paid") {
      return { success: true, alreadyPaid: true, type: "per_plate", order };
    }

    order.paymentStatus = "paid";
    order.tokenStatus = "active";
    order.paymentMethod = "phonepe_upi";
    order.razorpayPaymentId = paymentId || `PH_${merchantTransactionId}`;
    order.utrNumber = utrNumber || (paymentId ? String(paymentId).slice(-12) : null);
    order.verifiedAt = new Date();
    order.verifiedBy = "PhonePe PG (Auto Webhook)";
    await order.save();

    // Trigger instant lockscreen push notification to student
    sendInstantBookingPush({
      userId: order.userId,
      messName: order.messName,
      mealType: order.mealType,
      token: order.token,
    }).catch(() => {});

    // Decrement available slots on mess
    const slotKey = order.mealType === "lunch" ? "availableSlots.lunch" : "availableSlots.dinner";
    await Mess.findByIdAndUpdate(order.messId, { $inc: { [slotKey]: -1 } }).catch(() => {});

    // Escrow ledger automatic split (95% to Mess Owner, 5% to Messta Platform)
    try {
      const commAmt = Math.round(Number(order.amount) * 0.05 * 100) / 100;
      await creditPartnerWallet({
        messId: order.messId,
        grossAmount: order.amount,
        platePrice: order.amount,
        commissionType: "per_plate",
        source: "per_plate_booking",
        title: `${order.userName || "Student"} - ${order.mealType?.toUpperCase() || "Meal"} Plate`,
        description: `Student paid ₹${order.amount} via PhonePe UPI. Messta commission: ₹${commAmt} (5% platform fee). Credited ₹${order.amount - commAmt} (95%) to mess partner wallet.`,
        studentName: order.userName || order.userEmail || "Student",
        orderId: order.token || `ORD_${order._id.toString().slice(-6)}`,
        paymentMethod: "phonepe_upi",
      });
    } catch (wErr) {
      console.warn("Wallet split notice during PhonePe order confirmation:", wErr.message);
    }

    return { success: true, type: "per_plate", order };
  }

  // 2. Check if it's a Membership Pass Subscription
  const sub = await Subscription.findOne({
    $or: [
      { merchantTransactionId },
      { passCode: merchantTransactionId },
    ],
  });

  if (sub) {
    if (sub.paymentStatus === "paid" && sub.status === "active") {
      return { success: true, alreadyPaid: true, type: "membership_pass", subscription: sub };
    }

    sub.paymentStatus = "paid";
    sub.status = "active";
    await sub.save();

    // Trigger instant lockscreen push notification to student
    sendInstantBookingPush({
      userId: sub.userId,
      messName: sub.userName || "Your Mess",
      mealType: sub.planName || "Monthly Pass",
      token: sub.passCode,
    }).catch(() => {});

    // Escrow ledger automatic split (100% of Base Mess Plan to Mess Partner, ₹150 Flat Guarantee Fee to Messta)
    try {
      let baseMessPrice = 1700;
      if (sub.planId) {
        const planDoc = await MessPlan.findById(sub.planId);
        if (planDoc?.price) baseMessPrice = Number(planDoc.price);
      } else if (sub.amountPaid) {
        baseMessPrice = Math.max(0, Number(sub.amountPaid) - 150);
      }

      const totalCollected = baseMessPrice + 150;
      const passTokens = Number(sub.totalTokens) || 30;

      await creditPartnerWallet({
        messId: sub.messId,
        grossAmount: totalCollected,
        commissionType: "membership",
        source: "membership_pass",
        tokens: passTokens,
        title: `${sub.userName || "Student"} - ${sub.planName || "Monthly Pass"}`,
        description: `Student paid ₹${totalCollected} via PhonePe UPI (Base Mess Rate ₹${baseMessPrice} + ₹150 Messta Token Guarantee Fee). Credited ₹${baseMessPrice} (100% of mess rate) to mess partner wallet.`,
        studentName: sub.userName || sub.userEmail || "Student",
        orderId: sub.passCode,
        paymentMethod: "phonepe_upi",
      });
    } catch (wErr) {
      console.warn("Wallet split notice during PhonePe subscription confirmation:", wErr.message);
    }

    return { success: true, type: "membership_pass", subscription: sub };
  }

  return { success: false, message: "Order or Subscription not found for transaction: " + merchantTransactionId };
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. INITIATE PHONEPE PAYMENT (DAILY THALI OR MEMBERSHIP PASS)
// ─────────────────────────────────────────────────────────────────────────────
exports.initiatePayment = async (req, res) => {
  try {
    const {
      bookingType = "per_plate", // "per_plate" | "membership_pass"
      messId,
      amount,
      userId,
      userName,
      userEmail,
      userPhone,
      // For Per-Plate:
      mealType,
      timeSlot,
      thaliName,
      thaliCategory,
      bookingDate,
      // For Membership Pass:
      planId,
      planName,
      category,
      frequency,
      mealsPerDay,
      totalTokens,
    } = req.body;

    if (!messId || !amount || Number(amount) <= 0 || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required booking details (messId, amount, userId).",
      });
    }

    const mess = await Mess.findById(messId);
    if (!mess) {
      return res.status(404).json({ success: false, message: "Mess outlet not found." });
    }

    // Fetch Central Admin Profile for Central UPI details
    const adminProfile = await AdminProfile.findOne({ key: "superadmin_config" }).lean();
    const centralUpiId = adminProfile?.centralUpiId || "messta.central@hdfcbank";
    const centralBusinessName = adminProfile?.businessName || "Messta Food Services";

    // Generate unique merchant transaction ID
    const txnPrefix = bookingType === "membership_pass" ? "MT_PASS" : "MT_THALI";
    const merchantTransactionId = `${txnPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    let createdRecord = null;
    let pickupToken = null;

    if (bookingType === "per_plate") {
      pickupToken = generateToken();
      const order = new Order({
        messId: mess._id,
        messName: mess.name,
        userId,
        userEmail: userEmail || "student@messta.in",
        userPhone: userPhone || "",
        userName: userName || (userEmail ? userEmail.split("@")[0] : "Student Diner"),
        mealType: mealType || "lunch",
        timeSlot: timeSlot || "",
        thaliName: thaliName || "Standard Daily Thali",
        thaliCategory: thaliCategory || "Veg",
        bookingDate: bookingDate || new Date().toISOString().split("T")[0],
        amount: Number(amount),
        razorpayOrderId: merchantTransactionId, // Stored as gateway txn id
        token: pickupToken,
        paymentStatus: "pending",
        tokenStatus: "locked",
        paymentMethod: "phonepe_upi",
      });
      createdRecord = await order.save();
    } else {
      // Membership Pass
      const passCode = `PASS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      pickupToken = passCode;
      const sub = new Subscription({
        userId,
        userName: userName || (userEmail ? userEmail.split("@")[0] : "Student Passholder"),
        userEmail: userEmail || "student@messta.in",
        userPhone: userPhone || "",
        messId: mess._id,
        planId: planId || null,
        planName: planName || "Monthly Pass",
        category: category || "veg",
        frequency: frequency || "2 meals / day",
        mealsPerDay: mealsPerDay || 2,
        passCode,
        totalTokens: Number(totalTokens) || 30,
        remainingTokens: Number(totalTokens) || 30,
        status: "pending_payment",
        paymentStatus: "pending",
        amountPaid: Number(amount),
        merchantTransactionId,
        isCommunityMember: true,
        dailyRedemptions: [],
      });
      createdRecord = await sub.save();
    }

    const { env, merchantId, saltKey, saltIndex, hostUrl } = getPhonePeConfig();
    const amountInPaise = Math.round(Number(amount) * 100);

    const frontendBase = process.env.FRONTEND_URL || "http://localhost:5173";
    const backendBase = process.env.BACKEND_URL || "http://localhost:5000";

    // 1-Tap Direct UPI Intent Deep Link (Opens GPay, PhonePe, Paytm directly on student's mobile!)
    const paymentNote = bookingType === "membership_pass" ? `Messta Pass ${pickupToken}` : `Messta Thali ${pickupToken}`;
    const directUpiIntentUrl = `upi://pay?pa=${encodeURIComponent(centralUpiId)}&pn=${encodeURIComponent(centralBusinessName)}&am=${Number(amount)}&tr=${merchantTransactionId}&tn=${encodeURIComponent(paymentNote)}&cu=INR`;

    // Construct standard PhonePe PG Payload
    const phonePePayload = {
      merchantId,
      merchantTransactionId,
      merchantUserId: String(userId).replace(/[^a-zA-Z0-9]/g, "_").slice(0, 36) || "student_user",
      amount: amountInPaise,
      redirectUrl: `${frontendBase}/payment-status?txnId=${merchantTransactionId}`,
      redirectMode: "POST",
      callbackUrl: `${backendBase}/api/payment/phonepe/callback`,
      mobileNumber: String(userPhone || "9876543210").replace(/[^0-9]/g, "").slice(-10),
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const base64Payload = Buffer.from(JSON.stringify(phonePePayload)).toString("base64");
    const stringToHash = base64Payload + "/pg/v1/pay" + saltKey;
    const sha256Hash = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const xVerifyHeader = `${sha256Hash}###${saltIndex}`;

    let phonePeRedirectUrl = null;

    // Call PhonePe PG API if in UAT or PRODUCTION mode
    if (env !== "MOCK") {
      try {
        const response = await fetch(`${hostUrl}/pg/v1/pay`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": xVerifyHeader,
          },
          body: JSON.stringify({ request: base64Payload }),
        });

        const resJson = await response.json().catch(() => null);
        if (resJson && resJson.success && resJson.data?.instrumentResponse?.redirectInfo?.url) {
          phonePeRedirectUrl = resJson.data.instrumentResponse.redirectInfo.url;
        }
      } catch (apiErr) {
        console.warn("PhonePe PG API connection fallback:", apiErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      bookingType,
      merchantTransactionId,
      amount: Number(amount),
      token: pickupToken,
      upiIntentUrl: directUpiIntentUrl,
      paymentUrl: phonePeRedirectUrl || `${frontendBase}/payment-status?txnId=${merchantTransactionId}&mock=true`,
      centralUpiId,
      centralBusinessName,
      createdId: createdRecord._id,
      env,
    });
  } catch (error) {
    console.error("Error initiating PhonePe payment:", error);
    return res.status(500).json({ success: false, message: "Payment initiation error: " + error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. PHONEPE SERVER-TO-SERVER WEBHOOK CALLBACK (AUTOMATIC VERIFICATION)
// ─────────────────────────────────────────────────────────────────────────────
exports.handleCallback = async (req, res) => {
  try {
    const xVerify = req.headers["x-verify"];
    const { response: responseBase64 } = req.body;

    if (!responseBase64) {
      return res.status(400).json({ success: false, message: "Missing response payload" });
    }

    const { saltKey, saltIndex } = getPhonePeConfig();

    // Verify SHA256 Checksum Signature
    if (xVerify) {
      const stringToHash = responseBase64 + saltKey;
      const expectedHash = crypto.createHash("sha256").update(stringToHash).digest("hex");
      const expectedVerify = `${expectedHash}###${saltIndex}`;

      if (xVerify !== expectedVerify && process.env.PHONEPE_ENV === "PRODUCTION") {
        console.error("PhonePe callback signature verification failed!");
        return res.status(400).json({ success: false, message: "Invalid signature" });
      }
    }

    const decodedBuffer = Buffer.from(responseBase64, "base64");
    const decodedJson = JSON.parse(decodedBuffer.toString("utf8"));

    const code = decodedJson.code;
    const txnData = decodedJson.data || {};
    const merchantTransactionId = txnData.merchantTransactionId;
    const paymentId = txnData.transactionId;
    const utrNumber = txnData.paymentInstrument?.utr || null;

    if (code === "PAYMENT_SUCCESS") {
      const result = await finalizePaymentSuccess({
        merchantTransactionId,
        paymentId,
        utrNumber,
        provider: "phonepe",
      });

      return res.status(200).json({ success: true, message: "Payment processed successfully", result });
    } else {
      // Payment Failed or Pending
      const order = await Order.findOne({ razorpayOrderId: merchantTransactionId });
      if (order && order.paymentStatus === "pending") {
        order.paymentStatus = "failed";
        order.tokenStatus = "cancelled";
        await order.save();
      }

      return res.status(200).json({ success: false, message: "Payment not successful: " + code });
    }
  } catch (error) {
    console.error("Error processing PhonePe webhook:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. CHECK TRANSACTION STATUS (POLLING & USER REDIRECT)
// ─────────────────────────────────────────────────────────────────────────────
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { txnId } = req.params;

    if (!txnId) {
      return res.status(400).json({ success: false, message: "Transaction ID required" });
    }

    // Check Order
    const order = await Order.findOne({ razorpayOrderId: txnId }).lean();
    if (order) {
      return res.status(200).json({
        success: true,
        type: "per_plate",
        isPaid: order.paymentStatus === "paid",
        status: order.paymentStatus,
        token: order.token,
        thaliName: order.thaliName,
        mealType: order.mealType,
        timeSlot: order.timeSlot,
        bookingDate: order.bookingDate,
        amount: order.amount,
        messName: order.messName,
      });
    }

    // Check Subscription
    const sub = await Subscription.findOne({
      $or: [{ merchantTransactionId: txnId }, { passCode: txnId }],
    }).lean();

    if (sub) {
      return res.status(200).json({
        success: true,
        type: "membership_pass",
        isPaid: sub.paymentStatus === "paid" || sub.status === "active",
        status: sub.paymentStatus || sub.status,
        token: sub.passCode,
        planName: sub.planName,
        totalTokens: sub.totalTokens,
        amount: sub.amountPaid,
      });
    }

    return res.status(404).json({ success: false, message: "Transaction record not found" });
  } catch (error) {
    console.error("Error checking payment status:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. TEST / SIMULATE PAYMENT SUCCESS (FOR DEMO & INSTANT TESTING)
// ─────────────────────────────────────────────────────────────────────────────
exports.simulatePaymentSuccess = async (req, res) => {
  try {
    const { txnId } = req.body;
    if (!txnId) {
      return res.status(400).json({ success: false, message: "Transaction ID is required to simulate" });
    }

    const dummyUtr = `UTR${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`;
    const result = await finalizePaymentSuccess({
      merchantTransactionId: txnId,
      paymentId: `SIM_${Date.now()}`,
      utrNumber: dummyUtr,
      provider: "phonepe_simulator",
    });

    return res.status(200).json({
      success: true,
      message: "Payment simulated successfully! Order confirmed and escrow split executed.",
      result,
    });
  } catch (error) {
    console.error("Error simulating payment success:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
