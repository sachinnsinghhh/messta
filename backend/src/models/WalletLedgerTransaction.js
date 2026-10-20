const mongoose = require("mongoose");

const walletLedgerTransactionSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerWallet",
      index: true,
    },
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mess",
      required: true,
      index: true,
    },
    messName: {
      type: String,
      required: true,
      trim: true,
    },
    // Direction of transaction on partner wallet
    type: {
      type: String,
      enum: ["credit", "debit", "fee_deduction", "adjustment"],
      required: true,
      index: true,
    },
    // Source of the financial event
    source: {
      type: String,
      enum: [
        "per_plate_booking",
        "membership_pass",
        "bank_payout",
        "commission_split",
        "manual_adjustment",
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    grossAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    platformCommission: {
      type: Number,
      default: 0,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    runningBalance: {
      type: Number,
      required: true,
    },
    studentName: {
      type: String,
      default: "",
    },
    orderId: {
      type: String,
      default: "",
    },
    payoutReference: {
      type: String,
      default: "",
    },
    paymentMethod: {
      type: String,
      default: "upi_qr",
    },
    status: {
      type: String,
      enum: ["cleared", "pending", "failed"],
      default: "cleared",
      index: true,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "WalletLedgerTransaction",
  walletLedgerTransactionSchema
);
