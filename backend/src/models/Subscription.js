const mongoose = require("mongoose");

const redemptionItemSchema = new mongoose.Schema({
  tokenCode: { type: String, required: true }, // e.g., MESSTA-7A8B
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  mealType: { type: String, required: true }, // "lunch", "dinner", "morning", "evening"
  timeSlot: { type: String, default: "" }, // e.g., "12:30 PM – 01:00 PM"
  thaliName: { type: String, default: "" }, // e.g., "Royal Paneer Special Thali"
  status: { type: String, enum: ["pending", "served", "cancelled"], default: "pending" },
  redeemedAt: { type: Date, default: Date.now },
  servedAt: { type: Date },
});

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true }, // Firebase UID of the student
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, required: true, trim: true, index: true },
    userPhone: { type: String, default: "", trim: true },
    messId: { type: mongoose.Schema.Types.ObjectId, ref: "Mess", required: true, index: true },

    // Plan Details
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "MessPlan" },
    planName: { type: String, required: true }, // e.g., "Monthly Unlimited Veg Pass"
    category: { type: String, enum: ["veg", "non_veg", "combo"], default: "veg" },
    mealsPerDay: { type: Number, default: 2, min: 1, max: 8 },
    frequency: { type: String, default: "2_meals_per_day" },
    preferredSlot: { type: String, default: "flexible" },

    // Pass Identifier
    passCode: {
      type: String,
      default: () => `PASS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      unique: true,
      sparse: true,
    },

    // Token Allocation & Usage
    totalTokens: { type: Number, required: true, min: 1 },
    remainingTokens: { type: Number, required: true, min: 0 },

    // Status & Community Membership
    status: {
      type: String,
      enum: ["active", "exhausted", "paused", "cancelled"],
      default: "active",
      index: true,
    },
    isCommunityMember: { type: Boolean, default: true },

    // Daily Slot Bookings Log (Tracks when tokens are redeemed & served at counter)
    dailyRedemptions: [redemptionItemSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);