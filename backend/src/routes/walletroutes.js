const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletcontroller");

// 1. SuperAdmin Master Wallet, Partner Wallets & Real-Time Split Ledger
router.get("/admin/overview", walletController.getAdminWalletOverview);

// 2. SuperAdmin Disburse Single Partner Wallet Payout
router.post("/admin/disburse-single", walletController.adminDisburseSingle);

// 2B. SuperAdmin Transfer Accumulated Platform Commission to Admin Bank
router.post("/admin/withdraw-commission", walletController.adminWithdrawCommission);

// 3. SuperAdmin 1-Click Batch Settlement Payout to All Partner Messes
router.post("/admin/disburse-batch", walletController.adminDisburseBatch);

// 4. Partner Mess Wallet Balance & Ledger Passbook (Mess Owner view)
router.get("/mess/:messId", walletController.getMessWalletDetails);

// 5. Public Payment Config (QR & Phone for Student Booking & Membership)
router.get("/public-payment-config", walletController.getPublicPaymentConfig);

// 6. Admin Profile Registration & Central Bank Config
router.get("/admin/profile", walletController.getAdminProfile);
router.put("/admin/profile", walletController.updateAdminProfile);

// 7. Daily End-of-Day Settlement Engine (Messes Payouts + Admin Commission Payout)
router.post("/admin/eod-settle", walletController.executeDailyEodSettlement);
router.get("/admin/eod-history", walletController.getDailyEodHistory);

// 8. Test/Simulate Incoming Payment Hook
router.post("/simulate-payment", async (req, res) => {
  try {
    const {
      messId,
      grossAmount = 100,
      source = "per_plate_booking",
      tokens = null,
      studentName = "Student Customer",
      orderId,
    } = req.body;

    const isPass = source === "membership_pass";
    const passTokens = isPass ? (tokens || 60) : null;
    const finalGross = isPass ? (grossAmount || 2400) : (grossAmount || 100);

    const result = await walletController.creditPartnerWallet({
      messId,
      grossAmount: Number(finalGross),
      commissionType: isPass ? "membership" : "per_plate",
      source,
      tokens: passTokens,
      studentName,
      orderId: orderId || `SIM-${Date.now().toString().slice(-6)}`,
    });

    res.status(200).json({ success: true, message: "Payment simulated successfully!", data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
