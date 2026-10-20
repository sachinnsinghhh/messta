const mongoose = require("mongoose");

const inventoryTransactionSchema = new mongoose.Schema(
  {
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mess",
      required: [true, "Mess reference is required"],
      index: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      index: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    transactionType: {
      type: String,
      required: true,
      enum: ["purchase", "recipe_consumption", "manual_adjustment", "spoilage_waste", "daily_usage"],
      index: true,
    }, // purchase = Inflow (+), recipe_consumption = Automated Outflow (-), etc.
    quantity: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    resultingStock: {
      type: Number,
      required: true,
    },
    unitCost: {
      type: Number,
      default: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
    },
    vendor: {
      name: { type: String, default: "", trim: true },
      invoiceNo: { type: String, default: "", trim: true },
      phone: { type: String, default: "", trim: true },
    },
    reason: {
      type: String,
      default: "",
      trim: true,
    }, // e.g. "Counter QR Scan: Royal Paneer Thali served", "Rotten tomatoes discarded"
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    loggedBy: {
      type: String,
      default: "System Kitchen Engine",
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InventoryTransaction", inventoryTransactionSchema);
