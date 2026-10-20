const express = require("express");
const router = express.Router();
const {
  createPaymentOrder,
  verifyPayment,
  smartBook,
  getUserOrders,
  verifyToken,
  redeemToken,
  scanQrCode,
  getMessOrders,
} = require("../controllers/ordercontroller");

// Booking & payment endpoints
router.post("/create-payment", createPaymentOrder);
router.post("/verify-payment", verifyPayment);
router.post("/smart-book", smartBook);
router.get("/user/:userId", getUserOrders);

// Counter Token & QR Scanner endpoints (dual support for orders and student memberships)
router.post("/scan-qr", scanQrCode);
router.get("/token/:token", verifyToken);
router.put("/token/:token/redeem", redeemToken);
router.get("/mess/:messId", getMessOrders);

module.exports = router;