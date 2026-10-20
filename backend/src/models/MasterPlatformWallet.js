const mongoose = require("mongoose");

const masterPlatformWalletSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "primary",
      unique: true,
      index: true,
    },
    // Total gross funds received across all messes into Messta business account
    totalMasterCollections: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Messta's accumulated net profit from per-plate (4%) & membership (Tokens x ₹1)
    totalPlatformCommissionEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Total platform commission already transferred to Super Admin's bank account
    totalCommissionWithdrawn: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Total funds disbursed from master account to mess bank accounts
    totalPartnerFundsDisbursed: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Partner funds currently held in escrow pending settlement payout
    currentEscrowFloat: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalTransactionsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastReconciledAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "MasterPlatformWallet",
  masterPlatformWalletSchema
);
