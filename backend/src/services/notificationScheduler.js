const { sendNightlyCutoffReminder, sendMealServiceAlert } = require("../controllers/notificationController");

let lastCutoffDate = "";
let lastLunchDate = "";
let lastDinnerDate = "";

/**
 * Automated Push Notification Scheduler (Runs in Indian Standard Time - UTC+5:30)
 * - 8:30 PM (20:30 IST): 90-minute cutoff reminder for tomorrow's lunch bookings
 * - 12:00 PM (12:00 IST): Lunch service alert personalized with mess name
 * - 7:30 PM (19:30 IST): Dinner service alert personalized with mess name
 */
function startNotificationScheduler() {
  console.log("⏱️ Messta Automated Push Notification Scheduler started (IST timezone)");

  setInterval(async () => {
    try {
      // Calculate current IST time (UTC + 5 hours 30 mins)
      const now = new Date();
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(now.getTime() + istOffsetMs);

      const hours = istDate.getUTCHours();
      const minutes = istDate.getUTCMinutes();
      const dateKey = istDate.toISOString().split("T")[0]; // YYYY-MM-DD

      // Dummy response object to satisfy controller signature
      const mockRes = {
        status: () => ({
          json: (data) => data,
        }),
      };

      // 1. Nightly Cut-off Reminder at 20:30 (8:30 PM IST)
      // "⏰ 90 Mins Left! Tomorrow's lunch booking on MESSTA closes at 10:00 PM tonight. Reserve your plate now."
      if (hours === 20 && minutes === 30 && lastCutoffDate !== dateKey) {
        lastCutoffDate = dateKey;
        console.log(`[Scheduler] 8:30 PM Cutoff Alert triggering for ${dateKey}...`);
        await sendNightlyCutoffReminder({ body: {} }, mockRes);
      }

      // 2. Lunch Service Alert at 12:00 PM IST
      // "🍽️ Lunch Ready at {messName}!"
      if (hours === 12 && minutes === 0 && lastLunchDate !== dateKey) {
        lastLunchDate = dateKey;
        console.log(`[Scheduler] 12:00 PM Lunch Ready Alert triggering for ${dateKey}...`);
        await sendMealServiceAlert({ body: { mealType: "lunch" } }, mockRes);
      }

      // 3. Dinner Service Alert at 19:30 (7:30 PM IST)
      // "🍽️ Dinner Ready at {messName}!"
      if (hours === 19 && minutes === 30 && lastDinnerDate !== dateKey) {
        lastDinnerDate = dateKey;
        console.log(`[Scheduler] 7:30 PM Dinner Ready Alert triggering for ${dateKey}...`);
        await sendMealServiceAlert({ body: { mealType: "dinner" } }, mockRes);
      }
    } catch (err) {
      console.warn("[Scheduler] Push scheduler tick notice:", err.message);
    }
  }, 60 * 1000); // Check every 60 seconds
}

module.exports = { startNotificationScheduler };
