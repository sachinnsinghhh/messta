const mongoose = require("mongoose");

const staffAttendanceSchema = new mongoose.Schema(
  {
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mess",
      required: [true, "Mess ID is required"],
      index: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: [true, "Staff member ID is required"],
      index: true,
    },
    staffName: {
      type: String,
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    shift: {
      type: String,
      default: "Morning Shift",
    },
    status: {
      type: String,
      enum: ["present", "late", "half_day", "absent"],
      default: "present",
    },
    checkInTime: {
      type: Date,
      default: Date.now,
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
    mealsServedDuringShift: {
      type: Number,
      default: 0,
    },
    wagesEarned: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StaffAttendance", staffAttendanceSchema);
