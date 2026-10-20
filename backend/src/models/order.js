const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mess",
      required: [true, "Mess ID is required"],
      index: true,
    },
    messName: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      default: "Customer",
    },
    mealType: {
      type: String,
      required: true,
    },
    timeSlot: {
      type: String,
      default: "",
    },
    thaliName: {
      type: String,
      default: "Standard Thali",
    },
    thaliCategory: {
      type: String,
      default: "Veg",
    },
    bookingType: {
      type: String,
      enum: ["direct_payment", "membership_token"],
      default: "direct_payment",
      index: true,
    },
    bookingDate: {
      type: String,
      required: [true, "Booking date is required"],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    razorpayOrderId: {
      type: String,
      default: "DIRECT_OR_TOKEN",
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenStatus: {
      type: String,
      enum: ["active", "redeemed", "expired"],
      default: "active",
      index: true,
    },
    redeemedAt: {
      type: Date,
      default: null,
    },
    scannedByStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },
    scannedByStaffName: {
      type: String,
      default: null,
    },
    scannedShift: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);