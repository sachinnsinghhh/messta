const mongoose = require("mongoose");

const messPlanSchema = new mongoose.Schema(
  {
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mess",
      required: [true, "Mess reference is required"],
      index: true,
    },
    planName: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
    }, // e.g. "Monthly Gold Student Pass", "Executive Veg Pass"
    price: {
      type: Number,
      required: [true, "Plan price is required"],
      min: [0, "Price cannot be negative"],
    },
    // Supports 1 to 8 meals per day
    mealsPerDay: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
      default: 2,
    },
    frequency: {
      type: String,
      default: "2_meals_per_day",
    },
    category: {
      type: String,
      enum: ["veg", "non_veg", "combo"],
      default: "veg",
    },
    totalTokens: {
      type: Number,
      required: [true, "Total token allocation is required"],
      min: [1, "Total tokens must be at least 1"],
    }, // e.g., 30, 60, 90 tokens
    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MessPlan", messPlanSchema);