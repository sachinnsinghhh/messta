const mongoose = require("mongoose");

const thaliTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, default: "Veg" },
  mealSlot: { type: String, default: "lunch" },
  description: { type: String, default: "" },
  items: [
    {
      name: { type: String },
      quantity: { type: Number },
      unit: { type: String, default: "g" },
      pricePerUnit: { type: Number },
    },
  ],
  miscellaneousCost: { type: Number, default: 0 },
  totalCostPrice: { type: Number, default: 0 },
  suggestedPrice: { type: Number, required: true },
  allowDirectPurchase: { type: Boolean, default: true },
  allowMembershipRedemption: { type: Boolean, default: true },
  benchmarkPlan: { type: String, default: "" },
});

const messSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    locality: { type: String, required: true, trim: true },
    city: { type: String, default: "Pune", trim: true },
    cuisineType: {
      type: String,
      default: "North Indian",
      enum: ["North Indian", "South Indian", "Maharashtrian", "Gujarati", "Multi-Cuisine"],
    },
    phone: { type: String, default: "+91 98765 43210" },
    imageUrl: {
      type: String,
      default: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=800",
    },
    seatingCapacity: { type: Number, default: 40, min: 0 },
    isOpen: { type: Boolean, default: true },
    ownerEmail: { type: String, default: "owner@messta.com", index: true },
    pricePerMeal: { type: Number, default: 80, min: 0 },

    todayMenu: {
      lunch: { type: String, default: "Roti, Dal Tadka, Jeera Rice, Paneer Sabzi, Salad" },
      dinner: { type: String, default: "Roti, Dal Fry, Steamed Rice, Seasonal Veg, Sweet" },
    },

    availableSlots: {
      lunch: { type: Number, default: 25, min: 0 },
      dinner: { type: Number, default: 20, min: 0 },
    },

    // Messta Advance Slot Booking & Cut-Off Engine Configuration
    advanceBookingConfig: {
      isAdvanceOnly: { type: Boolean, default: true },
      lunchCutOffTime: { type: String, default: "22:00" }, // 10:00 PM (night before)
      dinnerCutOffTime: { type: String, default: "14:00" }, // 02:00 PM (day of dinner)
      dinnerCutOffDay: { type: String, enum: ["same_day", "previous_night"], default: "same_day" },
      rationPerHead: {
        riceGrams: { type: Number, default: 80 },
        attaGrams: { type: Number, default: 90 },
        dalGrams: { type: Number, default: 40 },
        veggieGrams: { type: Number, default: 120 },
        paneerGrams: { type: Number, default: 50 },
        oilMl: { type: Number, default: 15 },
      },
    },

    // Step A: Dynamic Meal Spreads & Time-Slot Configuration with Capacity Limits
    mealSpreads: [
      {
        id: { type: String, required: true }, // e.g. "breakfast", "lunch", "dinner", "snacks"
        name: { type: String, required: true }, // e.g. "Morning Breakfast", "Lunch Spread", "Dinner Spread"
        icon: { type: String, default: "🍽️" }, // e.g. "🌅", "☀️", "🌙", "☕"
        timing: { type: String, default: "" }, // e.g. "07:30 AM – 10:30 AM"
        description: { type: String, default: "" },
      },
    ],
    timeSlots: {
      type: mongoose.Schema.Types.Mixed,
      default: {
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
      },
    },

    // Step B & C: Daily Thalis with Membership Tier Mapping (Crucial Link)
    activeThalis: [
      {
        id: { type: String, default: () => `thali_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` },
        name: { type: String, required: true },
        category: { type: String, default: "Veg" }, // "Veg", "Non-Veg", "Lite", "Special", "Combo"
        mealType: { type: String, default: "both" }, // "lunch", "dinner", "both"
        sellingPrice: { type: Number, required: true },
        description: { type: String, default: "" },
        // Membership Tier Mapping (e.g., ["veg", "combo"], ["lite"], ["non_veg"])
        eligibleTiers: [{ type: String }],
        allowDirectPurchase: { type: Boolean, default: true },
        allowMembershipRedemption: { type: Boolean, default: true },
        benchmarkPlan: { type: String, default: "" },
        items: [{ name: String, quantity: Number, unit: String, pricePerUnit: Number }],
        miscellaneousCost: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
      },
    ],

    bookmarkedThalis: [thaliTemplateSchema],

    // Custom Staff Roles created by mess owner (e.g., desk job, table service, storekeeper)
    customStaffRoles: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        icon: { type: String, default: "👤" },
        description: { type: String, default: "" },
        defaultShift: { type: String, default: "General Shift" },
        defaultSalary: { type: Number, default: 15000 },
        salaryType: { type: String, enum: ["monthly", "daily_wage"], default: "monthly" },
        permissions: {
          canScanQR: { type: Boolean, default: false },
          canManageInventory: { type: Boolean, default: false },
          canManageMeals: { type: Boolean, default: false },
          canViewFinance: { type: Boolean, default: false },
          canManageStaff: { type: Boolean, default: false },
          canEditOutlet: { type: Boolean, default: false },
        },
      },
    ],

    // ── OWNER VERIFICATION & ONBOARDING SYSTEM ──
    verificationStatus: {
      type: String,
      enum: ["unverified", "pending_review", "verified", "rejected"],
      default: "unverified",
      index: true,
    },
    isVerified: { type: Boolean, default: false, index: true },
    verifiedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },
    reviewedByAdmin: { type: String, default: null },

    // Step A: Address & Physical Geo-Coordinates
    address: {
      street: { type: String, default: "" },
      city: { type: String, default: "Pune" },
      pincode: { type: String, default: "" },
      latitude: { type: Number, default: 18.5204 },
      longitude: { type: Number, default: 73.8567 },
    },

    // Step B: Legal, Food Safety & Establishment Compliance Proof
    complianceDocs: {
      fssaiNumber: { type: String, default: "" }, // 14-digit FSSAI license number
      fssaiCertificateUrl: { type: String, default: "" },
      fssaiExpiryDate: { type: String, default: "" },
      ownerIdType: { type: String, default: "Aadhaar Card" },
      ownerIdNumber: { type: String, default: "" },
      ownerIdDocumentUrl: { type: String, default: "" },
      establishmentProofType: { type: String, default: "Commercial Electricity Bill" },
      establishmentProofUrl: { type: String, default: "" },
      electricityConsumerNumber: { type: String, default: "" },
    },

    // Banking & Payout Settlement Details
    bankDetails: {
      accountHolderName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
      bankName: { type: String, default: "" },
      upiId: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Mess", messSchema);