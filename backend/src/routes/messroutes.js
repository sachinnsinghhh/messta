const express = require("express");
const router = express.Router();
const {
  getAllMesses,
  getMessById,
  createMess,
  updateMess,
  deleteMess,
  claimMessByEmail,
  grantMessAccess,
  updateTimeSlots,
  publishThali,
  deleteThali,
  addMealSpread,
  deleteMealSpread,
  submitVerification,
  reviewVerification,
  getVerificationQueue,
  getAdvanceHeadcount,
  updateAdvanceBookingConfig,
} = require("../controllers/messcontroller");

// Admin Verification Queue (Must precede :id)
router.get("/admin/verifications", getVerificationQueue);

// Hybrid Access: Auto-claim mess by owner email (Must precede :id)
router.post("/claim-by-email", claimMessByEmail);

// Base mess routes
router.route("/").get(getAllMesses).post(createMess);

// Grant/update mess owner permission
router.put("/:id/grant-access", grantMessAccess);

router.route("/:id").get(getMessById).put(updateMess).delete(deleteMess);

// Advance Slot Booking Cut-Off Engine & Kitchen Headcount Report
router.get("/:id/advance-headcount", getAdvanceHeadcount);
router.put("/:id/advance-config", updateAdvanceBookingConfig);

// Verification submission & review
router.post("/:id/verification", submitVerification);
router.put("/:id/verification/review", reviewVerification);

// Time-slot intervals & capacity limits (Step A)
router.put("/:id/time-slots", updateTimeSlots);

// Custom Meal Spreads (Breakfast, Snacks, etc.)
router.post("/:id/spreads", addMealSpread);
router.delete("/:id/spreads/:spreadId", deleteMealSpread);

// Thali publishing & membership tier mapping (Step B & C)
router.post("/:id/thalis", publishThali);
router.delete("/:id/thalis/:thaliId", deleteThali);

module.exports = router;