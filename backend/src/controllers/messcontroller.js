const Mess = require("../models/mess");
const Order = require("../models/order");
const Subscription = require("../models/Subscription");
const { ADMIN_SECURITY_KEY, checkAdminKey } = require("../config/adminSecurity");
const {
  getNowIST,
  formatDate,
  getTomorrowIST,
  getFormattedDateLabel,
  evaluateCutOff,
  calculateRationSheet,
} = require("../utils/bookingCutoff");

// Standard Defaults for Step A: Meal Period & Time-Slot Configuration with Capacity Limits
const getDefaultTimeSlots = () => ({
  lunch: [
    { id: "slot_l1", timeWindow: "12:00 PM – 12:30 PM", maxCapacity: 30, bookedCount: 8 },
    { id: "slot_l2", timeWindow: "12:30 PM – 01:00 PM", maxCapacity: 30, bookedCount: 16 },
    { id: "slot_l3", timeWindow: "01:00 PM – 01:30 PM", maxCapacity: 30, bookedCount: 5 },
    { id: "slot_l4", timeWindow: "01:30 PM – 02:00 PM", maxCapacity: 25, bookedCount: 0 },
  ],
  dinner: [
    { id: "slot_d1", timeWindow: "07:30 PM – 08:00 PM", maxCapacity: 30, bookedCount: 4 },
    { id: "slot_d2", timeWindow: "08:00 PM – 08:30 PM", maxCapacity: 30, bookedCount: 12 },
    { id: "slot_d3", timeWindow: "08:30 PM – 09:00 PM", maxCapacity: 30, bookedCount: 6 },
    { id: "slot_d4", timeWindow: "09:00 PM – 09:30 PM", maxCapacity: 25, bookedCount: 0 },
  ],
});

// Standard Defaults for Step B & C: Daily Published Thalis with Membership Tier Mapping
const getDefaultThalis = () => [
  {
    id: "thali_paneer",
    name: "Paneer Thali",
    category: "Veg",
    mealType: "both",
    sellingPrice: 98,
    description: "Shahi Paneer butter masala, 3 tawa rotis, dal tadka, jeera rice, gulab jamun & salad.",
    eligibleTiers: ["veg", "lite", "combo", "all", "Veg Membership", "Lite Membership"],
    items: [
      { name: "Paneer Sabzi", quantity: 150, unit: "g", pricePerUnit: 0.2 },
      { name: "Roti", quantity: 3, unit: "pcs", pricePerUnit: 4 },
      { name: "Dal Tadka", quantity: 150, unit: "ml", pricePerUnit: 0.06 },
      { name: "Jeera Rice", quantity: 150, unit: "g", pricePerUnit: 0.05 },
    ],
    miscellaneousCost: 8,
    isActive: true,
  },
  {
    id: "thali_nonveg",
    name: "Special Non-Veg Thali",
    category: "Non-Veg",
    mealType: "both",
    sellingPrice: 140,
    description: "Kolhapuri Chicken rassa/sukka, 3 rotis, steamed indrayani rice, and fresh salad.",
    eligibleTiers: ["non_veg", "combo", "Non-Veg Membership"],
    items: [
      { name: "Chicken Curry", quantity: 180, unit: "g", pricePerUnit: 0.35 },
      { name: "Roti", quantity: 3, unit: "pcs", pricePerUnit: 4 },
      { name: "Steamed Rice", quantity: 150, unit: "g", pricePerUnit: 0.05 },
    ],
    miscellaneousCost: 10,
    isActive: true,
  },
  {
    id: "thali_lite",
    name: "Lite Thali",
    category: "Lite",
    mealType: "both",
    sellingPrice: 80,
    description: "2 Rotis, dry seasonal sabzi, dal fry, plain rice & kachumber salad.",
    eligibleTiers: ["veg", "lite", "combo", "all", "Veg Membership", "Lite Membership"],
    items: [
      { name: "Seasonal Sabzi", quantity: 120, unit: "g", pricePerUnit: 0.12 },
      { name: "Roti", quantity: 2, unit: "pcs", pricePerUnit: 4 },
      { name: "Dal Fry", quantity: 120, unit: "ml", pricePerUnit: 0.05 },
    ],
    miscellaneousCost: 6,
    isActive: true,
  },
];

// @desc    Get all mess listings with search, cuisine filter, and city
// @route   GET /api/mess?search=kothrud&cuisine=North Indian
// @access  Public
exports.getAllMesses = async (req, res) => {
  try {
    const { search, cuisine, city, showAll } = req.query;

    let query = {};
    if (showAll !== "true") {
      query.isOpen = true;
      query.$or = [
        { verificationStatus: "verified" },
        { isVerified: true },
      ];
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { name: { $regex: term, $options: "i" } },
        { locality: { $regex: term, $options: "i" } },
        { cuisineType: { $regex: term, $options: "i" } },
      ];
    }

    if (cuisine && cuisine !== "All") {
      query.cuisineType = cuisine;
    }

    if (city && city.trim()) {
      query.city = { $regex: city.trim(), $options: "i" };
    }

    const messes = await Mess.find(query).sort({ createdAt: -1 });

    // Ensure each mess has initialized slots and thalis
    const populated = messes.map((m) => {
      const obj = m.toObject();
      if (!obj.timeSlots || !obj.timeSlots.lunch || obj.timeSlots.lunch.length === 0) {
        obj.timeSlots = getDefaultTimeSlots();
      }
      if (!obj.activeThalis || obj.activeThalis.length === 0) {
        obj.activeThalis = getDefaultThalis();
      }
      return obj;
    });

    return res.status(200).json({
      success: true,
      count: populated.length,
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching messes.",
      error: error.message,
    });
  }
};

// @desc    Get a single mess by ID
// @route   GET /api/mess/:id
// @access  Public
exports.getMessById = async (req, res) => {
  try {
    const mess = await Mess.findById(req.params.id);
    if (!mess) {
      return res.status(404).json({
        success: false,
        message: "Mess listing not found.",
      });
    }

    let needsSave = false;
    if (!mess.timeSlots || !mess.timeSlots.lunch || mess.timeSlots.lunch.length === 0) {
      mess.timeSlots = getDefaultTimeSlots();
      needsSave = true;
    }
    if (!mess.activeThalis || mess.activeThalis.length === 0) {
      mess.activeThalis = getDefaultThalis();
      needsSave = true;
    }

    if (needsSave) {
      await mess.save();
    }

    return res.status(200).json({
      success: true,
      data: mess,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Invalid ID format or server error.",
      error: error.message,
    });
  }
};

// @desc    Create a new mess listing
// @route   POST /api/mess
// @access  Public / Owner
exports.createMess = async (req, res) => {
  try {
    const messData = { ...req.body };
    if (!messData.timeSlots) {
      messData.timeSlots = getDefaultTimeSlots();
    }
    if (!messData.activeThalis) {
      messData.activeThalis = getDefaultThalis();
    }

    const mess = await Mess.create(messData);
    return res.status(201).json({
      success: true,
      message: "Mess created successfully.",
      data: mess,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Failed to create mess listing.",
      error: error.message,
    });
  }
};

// @desc    Update mess details, daily menu, pricing, thalis, and slots
// @route   PUT /api/mess/:id
// @access  Public / Owner
exports.updateMess = async (req, res) => {
  try {
    const updatedMess = await Mess.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true, upsert: false }
    );

    if (!updatedMess) {
      return res.status(404).json({
        success: false,
        message: "Mess listing not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Mess updated successfully.",
      data: updatedMess,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Failed to update mess listing.",
      error: error.message,
    });
  }
};

// @desc    Update Time Slots and Meal Spreads for an Outlet
// @route   PUT /api/mess/:id/time-slots
// @access  Owner
exports.updateTimeSlots = async (req, res) => {
  try {
    const mess = await Mess.findById(req.params.id);
    if (!mess) {
      return res.status(404).json({ success: false, message: "Mess not found." });
    }

    const { timeSlots, mealSpreads } = req.body;

    if (timeSlots) {
      mess.timeSlots = timeSlots;
      mess.markModified("timeSlots");
    } else {
      // If sent directly as { lunch, dinner, breakfast, ... }
      mess.timeSlots = req.body;
      mess.markModified("timeSlots");
    }

    if (mealSpreads && Array.isArray(mealSpreads)) {
      mess.mealSpreads = mealSpreads;
      mess.markModified("mealSpreads");
    }

    await mess.save();
    return res.status(200).json({
      success: true,
      message: "Time slot intervals, meal spreads and capacities updated successfully.",
      data: {
        timeSlots: mess.timeSlots,
        mealSpreads: mess.mealSpreads,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a New Meal Spread (e.g. Breakfast, Evening Snacks)
// @route   POST /api/mess/:id/spreads
// @access  Owner
exports.addMealSpread = async (req, res) => {
  try {
    const mess = await Mess.findById(req.params.id);
    if (!mess) {
      return res.status(404).json({ success: false, message: "Mess not found." });
    }

    const { name, icon, timing, description, initialSlots } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Spread name is required." });
    }

    const spreadKey = name.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
    const spreadId = `spread_${spreadKey}_${Date.now().toString().slice(-4)}`;

    // Ensure mess has initialized mealSpreads
    if (!mess.mealSpreads || mess.mealSpreads.length === 0) {
      mess.mealSpreads = [
        { id: "lunch", name: "Lunch Spread", icon: "☀️", timing: "11:30 AM – 02:30 PM", description: "Afternoon freshly cooked thalis & sides." },
        { id: "dinner", name: "Dinner Spread", icon: "🌙", timing: "07:00 PM – 10:30 PM", description: "Evening freshly prepared dinner courses." },
      ];
    }

    const newSpread = {
      id: spreadKey || spreadId,
      name: name.trim(),
      icon: icon || "🍽️",
      timing: timing || "Flexible Hours",
      description: description || `Freshly prepared ${name.trim()} courses & sides.`,
    };

    mess.mealSpreads.push(newSpread);
    mess.markModified("mealSpreads");

    // Initialize time slots for this spread
    if (!mess.timeSlots) mess.timeSlots = {};
    const defaultIntervals = initialSlots || [
      { id: `slot_${spreadKey}_1`, timeWindow: timing ? timing.split("–")[0].trim() + " – " + (timing.split("–")[1]?.trim() || "09:00 AM") : "08:00 AM – 08:30 AM", maxCapacity: 30, bookedCount: 0 },
      { id: `slot_${spreadKey}_2`, timeWindow: "08:30 AM – 09:00 AM", maxCapacity: 30, bookedCount: 0 },
    ];
    mess.timeSlots[newSpread.id] = defaultIntervals;
    mess.markModified("timeSlots");

    await mess.save();

    return res.status(201).json({
      success: true,
      message: `Meal spread "${name}" added successfully!`,
      data: {
        mealSpreads: mess.mealSpreads,
        timeSlots: mess.timeSlots,
        newSpread,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a Meal Spread
// @route   DELETE /api/mess/:id/spreads/:spreadId
// @access  Owner
exports.deleteMealSpread = async (req, res) => {
  try {
    const mess = await Mess.findById(req.params.id);
    if (!mess) {
      return res.status(404).json({ success: false, message: "Mess not found." });
    }

    const { spreadId } = req.params;

    if (mess.mealSpreads && mess.mealSpreads.length <= 1) {
      return res.status(400).json({
        success: false,
        message: "You must keep at least one active operational meal spread.",
      });
    }

    mess.mealSpreads = (mess.mealSpreads || []).filter((s) => s.id !== spreadId);
    mess.markModified("mealSpreads");

    if (mess.timeSlots && mess.timeSlots[spreadId]) {
      delete mess.timeSlots[spreadId];
      mess.markModified("timeSlots");
    }

    await mess.save();

    return res.status(200).json({
      success: true,
      message: "Meal spread removed successfully.",
      data: {
        mealSpreads: mess.mealSpreads,
        timeSlots: mess.timeSlots,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Publish a new Thali with Membership Tier Mapping
// @route   POST /api/mess/:id/thalis
// @access  Owner
exports.publishThali = async (req, res) => {
  try {
    const mess = await Mess.findById(req.params.id);
    if (!mess) {
      return res.status(404).json({ success: false, message: "Mess not found." });
    }

    const {
      name,
      category,
      mealType,
      sellingPrice,
      description,
      eligibleTiers,
      allowDirectPurchase,
      allowMembershipRedemption,
      benchmarkPlan,
      items,
      miscellaneousCost,
    } = req.body;

    const newThali = {
      id: `thali_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      category: category || "Veg",
      mealType: mealType || "both",
      sellingPrice: Number(sellingPrice),
      description: description || "",
      eligibleTiers: eligibleTiers || ["veg", "combo", "all"],
      allowDirectPurchase: allowDirectPurchase !== false,
      allowMembershipRedemption: allowMembershipRedemption !== false,
      benchmarkPlan: benchmarkPlan || "",
      items: items || [],
      miscellaneousCost: Number(miscellaneousCost || 0),
      isActive: true,
    };

    mess.activeThalis.unshift(newThali);
    await mess.save();

    return res.status(201).json({
      success: true,
      message: `Thali "${name}" published live with tier mapping!`,
      data: mess.activeThalis,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete/Remove a Thali
// @route   DELETE /api/mess/:id/thalis/:thaliId
// @access  Owner
exports.deleteThali = async (req, res) => {
  try {
    const mess = await Mess.findById(req.params.id);
    if (!mess) {
      return res.status(404).json({ success: false, message: "Mess not found." });
    }

    const { thaliId } = req.params;
    mess.activeThalis = mess.activeThalis.filter((t) => t.id !== thaliId && String(t._id) !== thaliId);
    await mess.save();

    return res.status(200).json({
      success: true,
      message: "Thali removed from today's menu.",
      data: mess.activeThalis,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a mess outlet
// @route   DELETE /api/mess/:id
// @access  Public / Owner
exports.deleteMess = async (req, res) => {
  try {
    const deleted = await Mess.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Mess listing not found.",
      });
    }

    // Cascade cleanup of associated plans, broadcasts, subscriptions, and orders
    try {
      const MessPlan = require("../models/MessPlan");
      const MessBroadcast = require("../models/MessBroadcast");
      const Subscription = require("../models/Subscription");
      const Order = require("../models/order");

      await Promise.all([
        MessPlan.deleteMany({ messId: req.params.id }),
        MessBroadcast.deleteMany({ messId: req.params.id }),
        Subscription.deleteMany({ messId: req.params.id }),
        Order.deleteMany({ messId: req.params.id }),
      ]);
    } catch (cleanupErr) {
      console.warn("Cascade cleanup notice:", cleanupErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Mess branch "${deleted.name}" deleted successfully.`,
      data: deleted,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error deleting mess outlet.",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION SYSTEM (KYC, FSSAI, DOCUMENTS & ADMIN REVIEW)
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Submit compliance documents and KYC for mess verification
// @route   POST /api/mess/:id/verification
// @access  Owner
exports.submitVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { address, complianceDocs, bankDetails } = req.body;

    const mess = await Mess.findById(id);
    if (!mess) {
      return res.status(404).json({ success: false, message: "Mess not found." });
    }

    if (address) {
      mess.address = {
        street: address.street || mess.address?.street || "",
        city: address.city || mess.city || "Pune",
        pincode: address.pincode || mess.address?.pincode || "",
        latitude: Number(address.latitude) || mess.address?.latitude || 18.5204,
        longitude: Number(address.longitude) || mess.address?.longitude || 73.8567,
      };
      if (address.street) mess.locality = address.street;
    }

    if (complianceDocs) {
      mess.complianceDocs = {
        fssaiNumber: complianceDocs.fssaiNumber || mess.complianceDocs?.fssaiNumber || "",
        fssaiCertificateUrl: complianceDocs.fssaiCertificateUrl || mess.complianceDocs?.fssaiCertificateUrl || "",
        fssaiExpiryDate: complianceDocs.fssaiExpiryDate || mess.complianceDocs?.fssaiExpiryDate || "",
        ownerIdType: complianceDocs.ownerIdType || "Aadhaar Card",
        ownerIdNumber: complianceDocs.ownerIdNumber || mess.complianceDocs?.ownerIdNumber || "",
        ownerIdDocumentUrl: complianceDocs.ownerIdDocumentUrl || mess.complianceDocs?.ownerIdDocumentUrl || "",
        establishmentProofType: complianceDocs.establishmentProofType || "Commercial Electricity Bill",
        establishmentProofUrl: complianceDocs.establishmentProofUrl || mess.complianceDocs?.establishmentProofUrl || "",
        electricityConsumerNumber: complianceDocs.electricityConsumerNumber || mess.complianceDocs?.electricityConsumerNumber || "",
      };
    }

    if (bankDetails) {
      mess.bankDetails = {
        accountHolderName: bankDetails.accountHolderName || mess.bankDetails?.accountHolderName || "",
        accountNumber: bankDetails.accountNumber || mess.bankDetails?.accountNumber || "",
        ifscCode: bankDetails.ifscCode || mess.bankDetails?.ifscCode || "",
        bankName: bankDetails.bankName || mess.bankDetails?.bankName || "",
        upiId: bankDetails.upiId || mess.bankDetails?.upiId || "",
      };
    }

    mess.verificationStatus = "pending_review";
    mess.rejectionReason = "";
    await mess.save();

    return res.status(200).json({
      success: true,
      message: "Verification credentials submitted successfully. Status updated to Pending Review.",
      data: mess,
    });
  } catch (error) {
    console.error("Error submitting verification:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin review: Approve or reject mess verification
// @route   PUT /api/mess/:id/verification/review
// @access  Admin
exports.reviewVerification = async (req, res) => {
  try {
    const adminKey = req.headers["x-admin-key"] || req.body.adminKey || req.query.adminKey;
    if (!checkAdminKey(adminKey)) {
      return res.status(403).json({
        success: false,
        message: "403 Forbidden: Administrator authorization required to verify or reject messes.",
      });
    }

    const { id } = req.params;
    const { decision, rejectionReason, adminEmail } = req.body;

    const mess = await Mess.findById(id);
    if (!mess) {
      return res.status(404).json({ success: false, message: "Mess not found." });
    }

    if (decision === "approve") {
      mess.verificationStatus = "verified";
      mess.isVerified = true;
      mess.verifiedAt = new Date();
      mess.rejectionReason = "";
      mess.reviewedByAdmin = adminEmail || "compliance@messta.com";
    } else if (decision === "reject") {
      mess.verificationStatus = "rejected";
      mess.isVerified = false;
      mess.rejectionReason = rejectionReason || "Documents could not be verified. Please re-upload clear credentials.";
      mess.reviewedByAdmin = adminEmail || "compliance@messta.com";
    } else {
      return res.status(400).json({ success: false, message: "Decision must be 'approve' or 'reject'." });
    }

    await mess.save();

    return res.status(200).json({
      success: true,
      message: `Mess verification ${decision === "approve" ? "approved" : "rejected"} successfully.`,
      data: mess,
    });
  } catch (error) {
    console.error("Error reviewing verification:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all messes in verification queue for admin inspection
// @route   GET /api/mess/admin/verifications
// @access  Admin
exports.getVerificationQueue = async (req, res) => {
  try {
    const adminKey = req.headers["x-admin-key"] || req.query.adminKey;
    if (!checkAdminKey(adminKey)) {
      return res.status(403).json({
        success: false,
        message: "403 Forbidden: Administrator credentials required to access verification queue.",
      });
    }

    const { status } = req.query;
    let query = {};
    if (status && status !== "all") {
      query.verificationStatus = status;
    }

    const messes = await Mess.find(query).sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: messes.length,
      data: messes,
    });
  } catch (error) {
    console.error("Error fetching verification queue:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADVANCE KITCHEN HEADCOUNT & RATION PREPARATION REPORT
// ─────────────────────────────────────────────────────────────────────────────
// @desc    Generate exact kitchen headcount, slot occupancy, and raw grocery ration sheet
// @route   GET /api/mess/:id/advance-headcount
// @access  Public / Mess Owner
exports.getAdvanceHeadcount = async (req, res) => {
  try {
    const { id } = req.params;
    const mess = await Mess.findById(id);
    if (!mess) {
      return res.status(404).json({ success: false, message: "Mess outlet not found." });
    }

    const nowIST = getNowIST();
    const tomorrowIST = getTomorrowIST();
    const todayStr = formatDate(nowIST);
    const tomorrowStr = formatDate(tomorrowIST);

    // Target date defaults to tomorrow
    const targetDate = req.query.date || tomorrowStr;
    const isTargetTomorrow = targetDate === tomorrowStr;

    const config = mess.advanceBookingConfig || {};

    // Live Cut-off statuses
    const lunchCutOff = evaluateCutOff("lunch", targetDate, config);
    const dinnerCutOff = evaluateCutOff("dinner", targetDate, config);

    // 1. Fetch Paid Orders for this mess and date
    const orders = await Order.find({
      messId: id,
      bookingDate: targetDate,
      paymentStatus: "paid",
    }).lean();

    // 2. Fetch Active Subscriptions with redemptions on this date
    const subscriptions = await Subscription.find({
      messId: id,
      "dailyRedemptions.date": targetDate,
    }).lean();

    let dinersList = [];

    // Aggregate from Orders
    orders.forEach((o) => {
      dinersList.push({
        id: o._id,
        source: "order",
        bookingType: o.bookingType || "direct_payment",
        studentName: o.userName || "Student Diner",
        studentEmail: o.userEmail,
        mealPeriod: (o.mealType || "lunch").toLowerCase(),
        timeSlot: o.timeSlot || "Standard Interval",
        thaliName: o.thaliName || "Standard Thali",
        thaliCategory: o.thaliCategory || "Veg",
        token: o.token,
        tokenStatus: o.tokenStatus,
        bookedAt: o.createdAt,
      });
    });

    // Aggregate from Subscriptions
    const existingTokens = new Set(dinersList.map((d) => d.token));
    subscriptions.forEach((sub) => {
      (sub.dailyRedemptions || []).forEach((r) => {
        if (r.date === targetDate && !existingTokens.has(r.tokenCode)) {
          dinersList.push({
            id: r._id || `${sub._id}_${r.tokenCode}`,
            source: "subscription",
            bookingType: "membership_token",
            studentName: sub.userName || "Passholder Diner",
            studentEmail: sub.userEmail,
            mealPeriod: (r.mealType || "lunch").toLowerCase().includes("dinner") ? "dinner" : "lunch",
            timeSlot: r.timeSlot || "Standard Interval",
            thaliName: r.thaliName || sub.planName || "Membership Pass Thali",
            thaliCategory: sub.category === "non_veg" ? "Non-Veg" : "Veg",
            token: r.tokenCode,
            tokenStatus: r.status === "served" ? "redeemed" : "active",
            bookedAt: r.redeemedAt || sub.updatedAt,
          });
          existingTokens.add(r.tokenCode);
        }
      });
    });

    const totalDiners = dinersList.length;
    const lunchDiners = dinersList.filter((d) => d.mealPeriod.includes("lunch"));
    const dinnerDiners = dinersList.filter((d) => d.mealPeriod.includes("dinner"));

    const membershipDiners = dinersList.filter((d) => d.bookingType === "membership_token");
    const perPlateDiners = dinersList.filter((d) => d.bookingType !== "membership_token");

    const vegDiners = dinersList.filter((d) => {
      const cat = (d.thaliCategory || "veg").toLowerCase();
      return cat.includes("veg") && !cat.includes("non");
    });
    const nonVegDiners = dinersList.filter((d) => (d.thaliCategory || "").toLowerCase().includes("non"));

    // Slot distribution map
    const slotDistribution = {};
    dinersList.forEach((d) => {
      const slot = d.timeSlot || "General Interval";
      slotDistribution[slot] = (slotDistribution[slot] || 0) + 1;
    });

    // Calculate raw ration sheet
    const rationSheet = calculateRationSheet(
      totalDiners,
      vegDiners.length,
      nonVegDiners.length,
      config.rationPerHead || {}
    );

    return res.status(200).json({
      success: true,
      targetDate,
      targetDateLabel: getFormattedDateLabel(targetDate),
      isTargetTomorrow,
      todayStr,
      tomorrowStr,
      systemTimeIST: nowIST.toISOString(),
      cutOffStatus: {
        lunch: lunchCutOff,
        dinner: dinnerCutOff,
      },
      headcount: {
        total: totalDiners,
        lunchCount: lunchDiners.length,
        dinnerCount: dinnerDiners.length,
        membershipCount: membershipDiners.length,
        perPlateCount: perPlateDiners.length,
        vegCount: vegDiners.length,
        nonVegCount: nonVegDiners.length,
        slotDistribution,
      },
      rations: rationSheet.rations,
      diners: dinersList,
    });
  } catch (error) {
    console.error("Error generating advance headcount sheet:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update mess cut-off times and ration formulas
// @route   PUT /api/mess/:id/advance-config
// @access  Mess Owner
exports.updateAdvanceBookingConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { lunchCutOffTime, dinnerCutOffTime, dinnerCutOffDay, rationPerHead } = req.body;

    const mess = await Mess.findById(id);
    if (!mess) {
      return res.status(404).json({ success: false, message: "Mess not found." });
    }

    if (!mess.advanceBookingConfig) {
      mess.advanceBookingConfig = {};
    }

    if (lunchCutOffTime) mess.advanceBookingConfig.lunchCutOffTime = lunchCutOffTime;
    if (dinnerCutOffTime) mess.advanceBookingConfig.dinnerCutOffTime = dinnerCutOffTime;
    if (dinnerCutOffDay) mess.advanceBookingConfig.dinnerCutOffDay = dinnerCutOffDay;
    if (rationPerHead) {
      mess.advanceBookingConfig.rationPerHead = {
        ...mess.advanceBookingConfig.rationPerHead,
        ...rationPerHead,
      };
    }

    await mess.save();

    return res.status(200).json({
      success: true,
      message: "Advance booking cut-off times and ration formulas updated successfully.",
      data: mess.advanceBookingConfig,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};