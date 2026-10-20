const mongoose = require("mongoose");

const dailyEodSettlementSchema = new mongoose.Schema(
  {
    settlementDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    dateLabel: {
      type: String, // e.g. "2026-10-19"
      required: true,
      index: true,
    },
    // Total gross money collected from students today in Central QR account
    totalDayCollections: {
      type: Number,
      required: true,
      default: 0,
    },
    // Admin's commission profit transferred today to Admin's registered personal bank account
    adminCommissionDisbursed: {
      type: Number,
      required: true,
      default: 0,
    },
    adminBankDetails: {
      bankName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      accountHolder: { type: String, default: "" },
      ifsc: { type: String, default: "" },
      upiId: { type: String, default: "" },
    },
    adminUtr: {
      type: String,
      required: true,
    },
    // Partner mess payouts disbursed today from Central account
    messesSettledCount: {
      type: Number,
      default: 0,
    },
    totalPartnerFundsDisbursed: {
      type: Number,
      required: true,
      default: 0,
    },
    partnerDisbursements: [
      {
        messId: { type: mongoose.Schema.Types.ObjectId, ref: "Mess" },
        messName: { type: String, required: true },
        grossRevenueToday: { type: Number, default: 0 },
        adminCutToday: { type: Number, default: 0 },
        netDisbursed: { type: Number, required: true },
        bankName: { type: String, default: "HDFC Bank" },
        accountNumberEnding: { type: String, default: "4821" },
        utrNumber: { type: String, required: true },
        status: { type: String, default: "processed" },
      },
    ],
    status: {
      type: String,
      enum: ["completed", "partial", "failed"],
      default: "completed",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "DailyEodSettlement",
  dailyEodSettlementSchema
);
