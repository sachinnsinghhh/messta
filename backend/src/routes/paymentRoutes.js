const express = require("express");
const router = express.Router();
const phonepeController = require("../controllers/phonepeController");

// 1. Initiate PhonePe Payment (Creates Order/Sub + Returns UPI Intent & PG URL)
router.post("/phonepe/initiate", phonepeController.initiatePayment);

// 2. Server-to-Server Webhook Callback from PhonePe
router.post("/phonepe/callback", phonepeController.handleCallback);

// 3. Status Check for Transaction Polling & Confirmation
router.get("/phonepe/status/:txnId", phonepeController.checkPaymentStatus);

// 4. Instant Payment Simulation (For sandbox & instant local verification)
router.post("/phonepe/simulate", phonepeController.simulatePaymentSuccess);

module.exports = router;
