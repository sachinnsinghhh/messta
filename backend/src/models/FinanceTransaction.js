const mongoose = require("mongoose");

const financeTransactionSchema = new mongoose.Schema(
  {
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mess",
      required: true,
      index: true,
    },
    // Transaction Flow Direction
    type: {
      type: String,
      enum: ["inflow", "outflow"],
      required: true,
      index: true,
    },
    // Operational / Accounting Category
    category: {
      type: String,
      enum: [
        // Inflows
        "subscription",
        "per_plate_meal",
        "counter_addon",
        "event_catering",
        // Outflows
        "inventory_purchase",
        "inventory_cogs",
        "staff_payroll",
        "lpg_gas",
        "electricity",
        "rent",
        "water_supply",
        "kitchen_maintenance",
        "packaging_disposables",
        "misc_overhead",
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
      trim: true,
    },
    // Amounts & Tax/Fee deductions
    grossAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    gatewayFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    // Payment Mode
    paymentMode: {
      type: String,
      enum: ["gateway_online", "upi_qr", "cash", "bank_neft"],
      default: "gateway_online",
    },
    paymentStatus: {
      type: String,
      enum: ["cleared", "pending_settlement", "refunded"],
      default: "cleared",
      index: true,
    },
    // Traceability to other operational modules
    sourceModule: {
      type: String,
      enum: ["subscription", "orders", "inventory", "staff", "manual_entry"],
      default: "manual_entry",
      index: true,
    },
    referenceId: {
      type: String,
      default: null,
    },
    receiptAttachment: {
      type: String,
      default: null,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isReconciled: {
      type: Boolean,
      default: false,
    },
    reconciledBatchId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FinanceTransaction", financeTransactionSchema);
