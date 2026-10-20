const mongoose = require("mongoose");

const settlementPayoutSchema = new mongoose.Schema(
  {
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mess",
      required: true,
      index: true,
    },
    gateway: {
      type: String,
      enum: ["razorpay", "stripe"],
      default: "razorpay",
    },
    payoutId: {
      type: String,
      required: true,
      trim: true,
    },
    utrNumber: {
      type: String,
      default: "",
      trim: true,
    },
    grossAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    feeDeductions: {
      type: Number,
      default: 0,
      min: 0,
    },
    netDeposited: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["processed", "in_transit", "failed"],
      default: "processed",
      index: true,
    },
    bankAccountEnding: {
      type: String,
      default: "4821",
    },
    settlementDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SettlementPayout", settlementPayoutSchema);
