const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");

// 1. Get Public VAPID Key for Browser Subscription
router.get("/vapid-key", notificationController.getVapidPublicKey);

// 2. Register Client Push Subscription
router.post("/subscribe", notificationController.subscribe);

// 3. Broadcast Nightly Cut-off Reminder (8:30 PM)
// "⏰ 90 Mins Left! Tomorrow's lunch booking on MESSTA closes at 10:00 PM tonight. Reserve your plate now."
router.post("/send-cutoff-reminder", notificationController.sendNightlyCutoffReminder);

// 4. Send Meal Service Alert (With personalized Mess Name)
// "🍽️ Lunch Ready at {messName}!"
router.post("/send-meal-alert", notificationController.sendMealServiceAlert);

// 5. Send Test Alert to Current Device/User
router.post("/test-alert", notificationController.sendTestAlert);

module.exports = router;
