const mongoose = require("mongoose");

const adminProfileSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "superadmin_config",
      unique: true,
      index: true,
    },
    adminName: {
      type: String,
      default: "Sachin Singh",
      trim: true,
    },
    businessName: {
      type: String,
      default: "Messta Digital Food Escrow",
      trim: true,
    },
    email: {
      type: String,
      default: "admin@messta.in",
      trim: true,
    },
    phone: {
      type: String,
      default: "+91 98765 43210",
      trim: true,
    },

    // ── 1. CENTRAL PAYMENT ACCOUNT (QR & Phone displayed to students for payment) ──
    centralUpiPhone: {
      type: String,
      default: "9876543210",
      trim: true,
    },
    centralUpiId: {
      type: String,
      default: "messta.central@hdfcbank",
      trim: true,
    },
    centralQrImageUrl: {
      type: String,
      default: "", // If empty, frontend dynamically creates live UPI QR using upiId & amount
    },
    centralBankName: {
      type: String,
      default: "HDFC Business Bank",
    },
    centralAccountNumber: {
      type: String,
      default: "50200089218201",
    },
    centralIfsc: {
      type: String,
      default: "HDFC0001029",
    },

    // ── 2. ADMIN'S PERSONAL BANK ACCOUNT (Where daily commission profit is transferred) ──
    commissionBankName: {
      type: String,
      default: "State Bank of India",
    },
    commissionAccountHolder: {
      type: String,
      default: "Sachin Singh",
    },
    commissionAccountNumber: {
      type: String,
      default: "389201928312",
    },
    commissionIfsc: {
      type: String,
      default: "SBIN0004521",
    },
    commissionUpiId: {
      type: String,
      default: "sachin.singh@sbi",
    },

    // ── 3. COMMISSION CONFIGURATION ──
    // Membership Rule: (Number of Tokens x ₹1)
    membershipTokenRate: {
      type: Number,
      default: 1.0, // ₹1.00 per token
    },
    // Per-Plate Rule: (Plate Price x 0.04) i.e. 4%
    perPlateRatePct: {
      type: Number,
      default: 4.0, // 4.0% of plate price
    },
    commissionPerPlate: {
      type: Number,
      default: 4.0, // % or flat representation
    },
    commissionMembershipPct: {
      type: Number,
      default: 1.0, // ₹1/token representation
    },

    autoEodSettlementEnabled: {
      type: Boolean,
      default: true,
    },
    lastEodSettlementDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminProfile", adminProfileSchema);
