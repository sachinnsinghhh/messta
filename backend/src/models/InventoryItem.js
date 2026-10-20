const mongoose = require("mongoose");

const inventoryItemSchema = new mongoose.Schema(
  {
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mess",
      required: [true, "Mess reference is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    }, // e.g., "Basmati Rice", "Toor Dal", "Amul Paneer", "Sunflower Oil"
    category: {
      type: String,
      required: true,
      enum: ["perishables", "staples", "dairy", "packaging"],
      default: "staples",
      index: true,
    },
    unit: {
      type: String,
      required: true,
      enum: ["kg", "g", "litre", "ml", "pcs", "packets", "cylinders"],
      default: "kg",
    },
    currentStock: {
      type: Number,
      required: true,
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    minThreshold: {
      type: Number,
      required: true,
      min: [0, "Par Level threshold cannot be negative"],
      default: 10, // Safety minimum before alert triggers
    },
    idealStock: {
      type: Number,
      default: 50, // Reorder target
    },
    costPerUnit: {
      type: Number,
      default: 0,
      min: [0, "Unit cost cannot be negative"],
    }, // Average purchase price per unit in ₹
    primaryVendor: {
      name: { type: String, default: "", trim: true },
      phone: { type: String, default: "", trim: true },
      marketLocation: { type: String, default: "", trim: true },
    },
    lastRestockedAt: {
      type: Date,
      default: Date.now,
    },
    shelfLifeDays: {
      type: Number,
      default: 7, // Safe shelf life in days
      min: [1, "Shelf life must be at least 1 day"],
    },
    expiryDate: {
      type: Date,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for Stock Health Status
inventoryItemSchema.virtual("stockStatus").get(function () {
  if (this.currentStock <= 0) return "out_of_stock";
  if (this.currentStock <= this.minThreshold) return "low_stock";
  return "in_stock";
});

// Composite index to prevent duplicate items for the same mess
inventoryItemSchema.index({ messId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("InventoryItem", inventoryItemSchema);
