const mongoose = require("mongoose");

const messBroadcastSchema = new mongoose.Schema(
  {
    messId: { type: mongoose.Schema.Types.ObjectId, ref: "Mess", required: true, index: true },
    ownerEmail: { type: String, required: true },
    message: { type: String, required: true, trim: true },
    tag: { type: String, default: "Daily Menu Special" },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
  },
  { timestamps: true }
);

module.exports = mongoose.model("MessBroadcast", messBroadcastSchema);