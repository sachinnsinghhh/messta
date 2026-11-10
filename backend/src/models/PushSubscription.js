const mongoose = require("mongoose");

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["user", "owner", "admin"],
      default: "user",
    },
    subscription: {
      endpoint: { type: String, required: true },
      expirationTime: { type: Number, default: null },
      keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
      },
    },
    // User dining context (for personalized meal alerts)
    lastMessName: {
      type: String,
      default: "",
    },
    lastToken: {
      type: String,
      default: "",
    },
    lastMealType: {
      type: String,
      default: "lunch",
    },
    lastBookingDate: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Prevent duplicate subscriptions for the same endpoint
pushSubscriptionSchema.index({ "subscription.endpoint": 1 }, { unique: true });

module.exports = mongoose.model("PushSubscription", pushSubscriptionSchema);
