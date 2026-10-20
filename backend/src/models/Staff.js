const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mess",
      required: [true, "Mess Outlet ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Staff member name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Contact phone number is required"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      default: "counter_operator",
      index: true,
      trim: true,
    },
    roleTitle: {
      type: String,
      default: "Counter Operator / Cashier",
    },
    pin: {
      type: String,
      default: "1234", // 4-digit PIN for rapid counter login/shift switch
      trim: true,
    },
    shift: {
      type: String,
      enum: ["morning", "evening", "fullday", "night", "custom"],
      default: "morning",
    },
    shiftTiming: {
      type: String,
      default: "07:00 AM – 02:00 PM (Morning & Lunch Rush)",
    },
    salaryType: {
      type: String,
      enum: ["monthly", "daily_wage", "per_shift"],
      default: "monthly",
    },
    salaryAmount: {
      type: Number,
      required: true,
      default: 15000,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "on_leave", "inactive"],
      default: "active",
      index: true,
    },
    permissions: {
      canScanQR: { type: Boolean, default: true },
      canManageInventory: { type: Boolean, default: false },
      canManageMeals: { type: Boolean, default: false },
      canViewFinance: { type: Boolean, default: false },
      canManageStaff: { type: Boolean, default: false },
      canEditOutlet: { type: Boolean, default: false },
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    mealsServedCount: {
      type: Number,
      default: 0,
    },
    todayMealsServed: {
      type: Number,
      default: 0,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Staff", staffSchema);
