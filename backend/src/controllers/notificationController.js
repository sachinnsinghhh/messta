const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");
const Order = require("../models/order");
const Subscription = require("../models/Subscription");

// Configure VAPID details
const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  "BPhVfJ3RXrtTFQ_0FP-uGEqWKpZT-B61guf1HhEpgpOSZyNKJVCwDaPfnuUuZb4zCQy5yG-e_oW60wBMSPb0zto";
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  "GmNop1EVEgMoI47RktHmROkywEps561lSyh-0HA2Cfg";
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:admin@messta.in";

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (vErr) {
  console.warn("VAPID setup warning:", vErr.message);
}

// 1. Return Public VAPID Key to Frontend Client
exports.getVapidPublicKey = (req, res) => {
  return res.status(200).json({
    success: true,
    publicKey: VAPID_PUBLIC_KEY,
  });
};

// 2. Save or Update Push Subscription for a User
exports.subscribe = async (req, res) => {
  try {
    const { subscription, userId, userEmail, role = "user" } = req.body;

    if (!subscription || !subscription.endpoint || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing subscription payload or userId.",
      });
    }

    // Fetch user's latest order or pass to populate dining context
    const latestOrder = await Order.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();

    const latestPass = await Subscription.findOne({ userId, status: "active" })
      .sort({ createdAt: -1 })
      .lean();

    const lastMessName =
      latestOrder?.messName || latestPass?.messName || "";
    const lastToken = latestOrder?.token || latestPass?.passCode || "";
    const lastMealType = latestOrder?.mealType || "lunch";
    const lastBookingDate = latestOrder?.bookingDate || "";

    const saved = await PushSubscription.findOneAndUpdate(
      { "subscription.endpoint": subscription.endpoint },
      {
        userId,
        userEmail: userEmail || "",
        role: role || "user",
        subscription,
        lastMessName,
        lastToken,
        lastMealType,
        lastBookingDate,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Push notification subscription registered successfully.",
      data: saved,
    });
  } catch (error) {
    console.error("Error registering push subscription:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Send Nightly Cut-Off Reminder (8:30 PM Broadcast)
// Template: "⏰ 90 Mins Left! Tomorrow's lunch booking on MESSTA closes at 10:00 PM tonight. Reserve your plate now."
exports.sendNightlyCutoffReminder = async (req, res) => {
  try {
    const subscribers = await PushSubscription.find({ role: "user" });

    const payload = JSON.stringify({
      title: "⏰ 90 Mins Left!",
      body: "Tomorrow's lunch booking on MESSTA closes at 10:00 PM tonight. Reserve your plate now.",
      icon: "/messta-icon.png",
      badge: "/messta-icon.png",
      tag: "cutoff-reminder",
      url: "/mess",
    });

    let sentCount = 0;
    const invalidEndpoints = [];

    await Promise.allSettled(
      subscribers.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, payload);
          sentCount++;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            invalidEndpoints.push(sub.subscription.endpoint);
          }
        }
      })
    );

    // Clean up stale or expired subscriptions
    if (invalidEndpoints.length > 0) {
      await PushSubscription.deleteMany({
        "subscription.endpoint": { $in: invalidEndpoints },
      }).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: `Cut-off notification sent to ${sentCount} students.`,
      sentCount,
    });
  } catch (error) {
    console.error("Error sending cutoff reminder:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Send Meal Service Alert (Personalized with Booked Mess Name)
// Template: "🍽️ Lunch Ready at {messName}!"
exports.sendMealServiceAlert = async (req, res) => {
  try {
    const { mealType = "lunch" } = req.body;
    const subscribers = await PushSubscription.find({ role: "user" });

    let sentCount = 0;
    const invalidEndpoints = [];

    await Promise.allSettled(
      subscribers.map(async (sub) => {
        // Find user's active booking or pass for this outlet
        let messName = sub.lastMessName || "";
        let token = sub.lastToken || "";

        if (!messName) {
          const activeOrder = await Order.findOne({
            userId: sub.userId,
            paymentStatus: "paid",
            tokenStatus: "active",
          })
            .sort({ createdAt: -1 })
            .lean();

          if (activeOrder) {
            messName = activeOrder.messName;
            token = activeOrder.token;
          }
        }

        const displayMess = messName ? messName : "Your Mess";
        const displayMeal = mealType.toUpperCase();

        const payload = JSON.stringify({
          title: `🍽️ ${displayMeal} Ready at ${displayMess}!`,
          body: `Your meal table is ready at ${displayMess}. Present Token: ${token || "Active Pass"} at the counter desk.`,
          icon: "/messta-icon.png",
          badge: "/messta-icon.png",
          tag: `meal-alert-${displayMeal.toLowerCase()}`,
          url: "/profile",
        });

        try {
          await webpush.sendNotification(sub.subscription, payload);
          sentCount++;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            invalidEndpoints.push(sub.subscription.endpoint);
          }
        }
      })
    );

    if (invalidEndpoints.length > 0) {
      await PushSubscription.deleteMany({
        "subscription.endpoint": { $in: invalidEndpoints },
      }).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: `Meal service alert sent to ${sentCount} students.`,
      sentCount,
    });
  } catch (error) {
    console.error("Error sending meal service alert:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Send Instant Booking Confirmation Push (Triggered by Webhook on Payment)
exports.sendInstantBookingPush = async ({ userId, messName, mealType, token }) => {
  try {
    const subs = await PushSubscription.find({ userId });
    if (!subs || subs.length === 0) return;

    const payload = JSON.stringify({
      title: `🎉 Booking Confirmed at ${messName}!`,
      body: `Your ${mealType?.toUpperCase() || "Meal"} is locked. Counter Token: ${token}. Serving hours ready tomorrow!`,
      icon: "/messta-icon.png",
      badge: "/messta-icon.png",
      tag: `booking-confirmed-${token}`,
      url: "/profile",
    });

    await Promise.allSettled(
      subs.map((s) => webpush.sendNotification(s.subscription, payload))
    );
  } catch (err) {
    console.warn("Background push notification notice:", err.message);
  }
};

// 6. Send Quick Test Push Alert to Current User / Device
exports.sendTestAlert = async (req, res) => {
  try {
    const { userId } = req.body;
    const query = userId ? { userId } : {};
    const subscribers = await PushSubscription.find(query);

    if (!subscribers || subscribers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No push subscriptions found for this account/device.",
      });
    }

    const payload = JSON.stringify({
      title: "🔔 MESSTA Alerts Working!",
      body: "You're all set! You'll receive 10 PM cutoff reminders & meal service pickup alerts on this device.",
      icon: "/messta-icon.png",
      badge: "/messta-icon.png",
      tag: "test-alert",
      url: "/profile",
    });

    let sentCount = 0;
    await Promise.allSettled(
      subscribers.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, payload);
          sentCount++;
        } catch (err) {
          console.warn("Test alert push error:", err.message);
        }
      })
    );

    return res.status(200).json({
      success: true,
      message: `Test alert dispatched to ${sentCount} device(s)!`,
      sentCount,
    });
  } catch (error) {
    console.error("Error sending test alert:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
