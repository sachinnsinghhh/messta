const mongoose = require("mongoose");

const partnerWalletSchema = new mongoose.Schema(
  {
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mess",
      required: true,
      unique: true,
      index: true,
    },
    messName: {
      type: String,
      required: true,
      trim: true,
    },
    // Available balance ready for disbursement/withdrawal
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Total gross funds received via Universal QR for this mess
    totalGrossCollected: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Total platform commission earned by Super Admin from this mess
    totalCommissionEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Breakup of commission
    membershipCommissionEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    perPlateCommissionEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    membershipGrossCollected: {
      type: Number,
      default: 0,
      min: 0,
    },
    perPlateGrossCollected: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Lifetime earnings credited (net of Messta commission: gross - commission)
    totalEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Lifetime funds paid out to mess's bank account
    totalWithdrawn: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Locked balance (e.g. in-flight or held for chargebacks)
    lockedBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastSettlementDate: {
      type: Date,
      default: null,
    },
    payoutBankDetails: {
      accountHolderName: { type: String, default: "" },
      bankName: { type: String, default: "HDFC Bank" },
      accountNumber: { type: String, default: "" },
      ifscCode: { type: String, default: "HDFC0001029" },
      upiId: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["active", "suspended", "frozen"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PartnerWallet", partnerWalletSchema);
