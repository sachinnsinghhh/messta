const express = require("express");
const router = express.Router();
const Subscription = require("../models/Subscription");
const MessPlan = require("../models/MessPlan");
const MessBroadcast = require("../models/MessBroadcast");
const Mess = require("../models/mess");
const Order = require("../models/order");
const { creditPartnerWallet } = require("../controllers/walletcontroller");
const {
  evaluateCutOff,
  getNowIST,
  formatDate,
  getTomorrowIST,
  getFormattedDateLabel,
} = require("../utils/bookingCutoff");

// Helper to generate a unique redemption token code (e.g., MESSTA-9F2B)
const generateSlotToken = () => {
  const chars = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MESSTA-${chars}`;
};

// ==================== MEMBERSHIP PLANS ROUTES ====================

// GET all membership plans for a specific mess outlet
router.get("/plans/:messId", async (req, res) => {
  try {
    const plans = await MessPlan.find({ messId: req.params.messId }).sort({ price: 1 });
    res.status(200).json({ success: true, count: plans.length, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST create a new membership plan (Owner action with 1-8 meals/day frequency)
router.post("/plans", async (req, res) => {
  try {
    const { messId, planName, price, frequency, mealsPerDay, category, totalTokens, description } = req.body;

    const countMeals = mealsPerDay || (frequency && parseInt(frequency, 10)) || 2;
    const freqLabel = frequency || `${countMeals} meals / day`;

    const newPlan = new MessPlan({
      messId,
      planName,
      price: Number(price),
      mealsPerDay: Number(countMeals),
      frequency: freqLabel,
      category: category || "veg",
      totalTokens: Number(totalTokens),
      description: description || "",
    });

    const savedPlan = await newPlan.save();
    res.status(201).json({ success: true, data: savedPlan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE a membership plan (Owner action)
router.delete("/plans/:id", async (req, res) => {
  try {
    const deletedPlan = await MessPlan.findByIdAndDelete(req.params.id);
    if (!deletedPlan) {
      return res.status(404).json({ success: false, message: "Membership plan not found." });
    }
    res.status(200).json({ success: true, message: "Plan removed successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== SUBSCRIPTIONS & COMMUNITY CRM ROUTES ====================

// GET subscriptions (Owner CRM subscriber table or Student active pass view)
// Supports search filter by name, email, phone, or plan
router.get("/", async (req, res) => {
  try {
    const { messId, userId, search, status } = req.query;
    let query = {};

    if (messId) query.messId = messId;
    if (userId) query.userId = userId;
    if (status && status !== "all") query.status = status;

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { userName: { $regex: term, $options: "i" } },
        { userEmail: { $regex: term, $options: "i" } },
        { userPhone: { $regex: term, $options: "i" } },
        { planName: { $regex: term, $options: "i" } },
        { passCode: { $regex: term, $options: "i" } },
      ];
    }

    const subscriptions = await Subscription.find(query)
      .populate("messId")
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, count: subscriptions.length, data: subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST purchase/subscribe to a plan (Student action -> allocates tokens & enrolls into community)
router.post("/", async (req, res) => {
  try {
    const {
      userId,
      userName,
      userEmail,
      userPhone,
      messId,
      planId,
      planName,
      category,
      frequency,
      mealsPerDay,
      totalTokens,
    } = req.body;

    // Check if student already holds an active subscription for this mess
    const existing = await Subscription.findOne({ userId, messId, status: "active" });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You already have an active membership pass for this mess outlet.",
      });
    }

    const passCode = `PASS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const newSub = new Subscription({
      userId,
      userName: userName || userEmail.split("@")[0],
      userEmail,
      userPhone: userPhone || "",
      messId,
      planId,
      planName,
      category: category || "veg",
      frequency: frequency || "2 meals / day",
      mealsPerDay: mealsPerDay || 2,
      passCode,
      totalTokens: Number(totalTokens),
      remainingTokens: Number(totalTokens),
      status: "active",
      isCommunityMember: true,
      dailyRedemptions: [],
    });

    const savedSub = await newSub.save();

    // Messta Virtual Escrow Ledger: credit mess wallet and split commission (Tokens in pass x ₹1)
    try {
      let passPrice = Number(req.body.price) || 2400;
      if (!req.body.price && planId) {
        const planDoc = await MessPlan.findById(planId);
        if (planDoc?.price) passPrice = Number(planDoc.price);
      }
      const passTokens = Number(totalTokens) || Number(savedSub.totalTokens) || 60;

      await creditPartnerWallet({
        messId,
        grossAmount: passPrice,
        commissionType: "membership",
        source: "membership_pass",
        tokens: passTokens,
        title: `${userName || "Student"} - ${planName || "Membership Pass"}`,
        description: `Student purchased ${passTokens}-token membership for ₹${passPrice} via Universal QR. Retained ₹${passTokens * 1} (${passTokens} tokens × ₹1) platform commission; credited ₹${passPrice - passTokens} to mess income.`,
        studentName: userName || userEmail || "Student",
        orderId: passCode,
        paymentMethod: "upi_qr",
      });
    } catch (wErr) {
      console.warn("Wallet split notice during subscription creation:", wErr.message);
    }

    res.status(201).json({ success: true, data: savedSub });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST redeem a token for an advance daily meal slot (Universal Seat Locking for Passholders)
// Requires student to reserve 1 day in advance before cut-off deadline
router.post("/:id/redeem", async (req, res) => {
  try {
    const { date, mealType, timeSlot, timeSlotId, thaliName } = req.body;
    const sub = await Subscription.findById(req.params.id);

    if (!sub || sub.status !== "active") {
      return res.status(404).json({
        success: false,
        message: "Active student membership pass not found.",
      });
    }

    if (sub.remainingTokens <= 0) {
      sub.status = "exhausted";
      sub.isCommunityMember = false;
      await sub.save();
      return res.status(400).json({
        success: false,
        message: "Token pool exhausted! Please renew your membership pass.",
      });
    }

    const mess = await Mess.findById(sub.messId);
    const tomorrowStr = formatDate(getTomorrowIST());
    const targetDate = date || tomorrowStr;
    const period = (mealType || "lunch").toLowerCase();

    // Strict Advance Booking & Cut-Off Engine Validation
    const cutOffEval = evaluateCutOff(period, targetDate, mess?.advanceBookingConfig || {});
    if (!cutOffEval.allowed) {
      return res.status(400).json({
        success: false,
        message: cutOffEval.reason,
        cutOffStatus: cutOffEval,
      });
    }

    // Check duplicate reservation for this student on the same date and session
    const existingBooking = (sub.dailyRedemptions || []).find((r) => {
      const rPeriod = (r.mealType || "").toLowerCase();
      const matchPeriod = (period.includes("lunch") && rPeriod.includes("lunch")) ||
                          (period.includes("dinner") && rPeriod.includes("dinner"));
      return r.date === targetDate && matchPeriod && r.status !== "cancelled";
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: `You already have a confirmed advance reservation (${existingBooking.tokenCode}) for ${period.toUpperCase()} on ${targetDate}. Show your existing token at counter.`,
        tokenCode: existingBooking.tokenCode,
      });
    }

    // Verify time slot capacity if specified
    const slotPeriodKey = period.includes("dinner") ? "dinner" : "lunch";
    let matchedSlot = null;
    if (mess?.timeSlots && mess.timeSlots[slotPeriodKey]) {
      matchedSlot = mess.timeSlots[slotPeriodKey].find(
        (s) => s.id === timeSlotId || s.timeWindow === timeSlot
      );
      if (matchedSlot && matchedSlot.bookedCount >= matchedSlot.maxCapacity) {
        return res.status(400).json({
          success: false,
          message: `Slot ${matchedSlot.timeWindow} is fully booked (${matchedSlot.maxCapacity} seats reached). Please choose an adjacent time window!`,
        });
      }
      if (matchedSlot) {
        matchedSlot.bookedCount = (matchedSlot.bookedCount || 0) + 1;
        mess.markModified("timeSlots");
        await mess.save().catch(() => {});
      }
    }

    const tokenCode = generateSlotToken();
    const finalSlotWindow = timeSlot || matchedSlot?.timeWindow || (period.includes("dinner") ? "08:00 PM – 08:30 PM" : "12:30 PM – 01:00 PM");

    // Decrement 1 token from membership
    sub.remainingTokens -= 1;
    sub.dailyRedemptions.push({
      tokenCode,
      date: targetDate,
      mealType: `${period.toUpperCase()} (${finalSlotWindow})`,
      timeSlot: finalSlotWindow,
      thaliName: thaliName || `${sub.category.toUpperCase()} Membership Thali`,
      status: "pending",
      redeemedAt: new Date(),
    });

    if (sub.remainingTokens === 0) {
      sub.status = "exhausted";
      sub.isCommunityMember = false;
    }

    await sub.save();

    // Create synchronized Order record for the counter scanner & kitchen headcount
    try {
      const orderRecord = new Order({
        messId: sub.messId,
        messName: mess?.name || "Messta Partner Mess",
        userId: sub.userId,
        userEmail: sub.userEmail,
        userName: sub.userName || "Passholder",
        mealType: period,
        timeSlot: finalSlotWindow,
        thaliName: thaliName || `${sub.category.toUpperCase()} Membership Thali`,
        thaliCategory: sub.category === "non_veg" ? "Non-Veg" : "Veg",
        bookingType: "membership_token",
        bookingDate: targetDate,
        amount: 0,
        razorpayOrderId: `PASS_${sub.passCode}`,
        token: tokenCode,
        paymentStatus: "paid",
        tokenStatus: "active",
      });
      await orderRecord.save();
    } catch (orderErr) {
      console.warn("Notice: Order record sync for membership token:", orderErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Advance meal slot locked for ${targetDate}! Token ${tokenCode} generated. Present token or dynamic QR code at the counter during ${finalSlotWindow}. 🍽️`,
      tokenCode,
      targetDate,
      targetDateLabel: getFormattedDateLabel(targetDate),
      timeSlot: finalSlotWindow,
      data: sub,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT pause or resume subscription (Owner or Student action)
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body; // "active" or "paused"
    if (!["active", "paused"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value." });
    }

    const sub = await Subscription.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );

    if (!sub) {
      return res.status(404).json({ success: false, message: "Subscription not found." });
    }

    res.status(200).json({ success: true, message: `Membership status updated to ${status}.`, data: sub });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE cancel or discontinue a student subscription (Owner action)
router.delete("/:id", async (req, res) => {
  try {
    const deletedSub = await Subscription.findByIdAndDelete(req.params.id);
    if (!deletedSub) {
      return res.status(404).json({ success: false, message: "Subscription not found." });
    }
    res.status(200).json({ success: true, message: "Student membership cancelled successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== DAILY COMMUNITY BROADCASTS ROUTES ====================

// GET broadcasts for a mess outlet (ordered newest first)
router.get("/broadcasts/:messId", async (req, res) => {
  try {
    const broadcasts = await MessBroadcast.find({ messId: req.params.messId })
      .sort({ createdAt: -1 })
      .limit(30);

    res.status(200).json({ success: true, count: broadcasts.length, data: broadcasts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST send a daily note/broadcast to community members (Owner action)
router.post("/broadcasts", async (req, res) => {
  try {
    const { messId, ownerEmail, message, tag, date } = req.body;

    const newBroadcast = new MessBroadcast({
      messId,
      ownerEmail: ownerEmail || "owner@messta.com",
      message,
      tag: tag || "Daily Menu Special",
      date: date || new Date().toISOString().split("T")[0],
    });

    const saved = await newBroadcast.save();
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE a broadcast note (Owner action)
router.delete("/broadcasts/:id", async (req, res) => {
  try {
    const deleted = await MessBroadcast.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Broadcast not found." });
    }
    res.status(200).json({ success: true, message: "Broadcast note deleted." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;