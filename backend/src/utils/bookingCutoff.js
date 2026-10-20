// ─────────────────────────────────────────────────────────────────────────────
// MESSTA ADVANCE SLOT BOOKING & CUT-OFF TIMING ENGINE (IST AWARE)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns current Date in Indian Standard Time (IST: UTC+5:30)
 */
function getNowIST() {
  const now = new Date();
  // IST is UTC + 5.5 hours
  const utcOffset = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcOffset + 5.5 * 3600000);
}

/**
 * Formats a Date object as "YYYY-MM-DD"
 */
function formatDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns tomorrow's Date object in IST
 */
function getTomorrowIST() {
  const ist = getNowIST();
  ist.setDate(ist.getDate() + 1);
  return ist;
}

/**
 * Returns human-readable label, e.g. "Tuesday, Oct 21"
 */
function getFormattedDateLabel(dateStr) {
  try {
    const parts = dateStr.split("-");
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

/**
 * Evaluates the cut-off status for a given meal period and target date.
 *
 * Rules:
 * - Tomorrow's Lunch: Closes at 10:00 PM (22:00) TONIGHT.
 * - Tomorrow's Dinner: Closes at 02:00 PM (14:00) on the day of dinner (TOMORROW).
 *
 * @param {string} mealPeriod - "lunch" | "dinner" | "breakfast" | "snacks"
 * @param {string} targetDate - "YYYY-MM-DD" (defaults to tomorrow)
 * @param {object} config - optional custom cut-offs from mess.advanceBookingConfig
 */
function evaluateCutOff(mealPeriod, targetDate, config = {}) {
  const nowIST = getNowIST();
  const todayStr = formatDate(nowIST);
  const tomorrowStr = formatDate(getTomorrowIST());

  const bookingDate = targetDate || tomorrowStr;
  const period = (mealPeriod || "lunch").toLowerCase();

  // 1. Is this a booking for "today"? Direct same-day booking is strictly forbidden.
  if (bookingDate === todayStr) {
    return {
      allowed: false,
      isSameDayBlocked: true,
      reason: "Direct same-day bookings are closed. Messta requires advance slot reservation (minimum 1 day prior) so mess kitchens can prepare exact portions without food waste.",
      isLocked: true,
      deadlineStr: "Closed for Kitchen Prep",
      minutesRemaining: 0,
      todayStr,
      tomorrowStr,
      bookingDate,
    };
  }

  // Parse custom or default cutoff times
  const lunchCutOffTime = config.lunchCutOffTime || "22:00"; // default 10:00 PM night before
  const dinnerCutOffTime = config.dinnerCutOffTime || "14:00"; // default 2:00 PM day of dinner
  const dinnerCutOffDay = config.dinnerCutOffDay || "same_day"; // "same_day" or "previous_night"

  let deadlineIST = new Date(nowIST);

  if (period === "lunch" || period === "breakfast") {
    // Closes TONIGHT at lunchCutOffTime (e.g. 22:00)
    const [h, m] = lunchCutOffTime.split(":").map((n) => parseInt(n, 10));
    deadlineIST.setHours(h, m, 0, 0);
  } else {
    // Dinner
    if (dinnerCutOffDay === "previous_night") {
      // Closes tonight at 10:00 PM
      const [h, m] = lunchCutOffTime.split(":").map((n) => parseInt(n, 10));
      deadlineIST.setHours(h, m, 0, 0);
    } else {
      // Closes tomorrow afternoon at 2:00 PM (14:00)
      const [h, m] = dinnerCutOffTime.split(":").map((n) => parseInt(n, 10));
      deadlineIST = getTomorrowIST();
      deadlineIST.setHours(h, m, 0, 0);
    }
  }

  const diffMs = deadlineIST.getTime() - nowIST.getTime();
  const minutesRemaining = Math.max(0, Math.floor(diffMs / 60000));
  const isLocked = diffMs <= 0;

  // Format readable deadline
  let deadlineStr = "";
  if (period === "lunch" || period === "breakfast" || dinnerCutOffDay === "previous_night") {
    const hours12 = parseInt(lunchCutOffTime.split(":")[0], 10) % 12 || 12;
    const ampm = parseInt(lunchCutOffTime.split(":")[0], 10) >= 12 ? "PM" : "AM";
    deadlineStr = `Tonight at ${hours12}:00 ${ampm}`;
  } else {
    const hours12 = parseInt(dinnerCutOffTime.split(":")[0], 10) % 12 || 12;
    const ampm = parseInt(dinnerCutOffTime.split(":")[0], 10) >= 12 ? "PM" : "AM";
    deadlineStr = `Tomorrow at ${hours12}:00 ${ampm}`;
  }

  return {
    allowed: !isLocked,
    isLocked,
    isSameDayBlocked: false,
    reason: isLocked
      ? `Cut-off deadline reached (${deadlineStr}). Advance slot bookings for ${period.toUpperCase()} on ${bookingDate} are now locked for kitchen preparation.`
      : "Open for advance reservation",
    deadlineStr,
    deadlineISO: deadlineIST.toISOString(),
    minutesRemaining,
    hoursRemaining: Math.floor(minutesRemaining / 60),
    minsRemainder: minutesRemaining % 60,
    todayStr,
    tomorrowStr,
    bookingDate,
  };
}

/**
 * Calculates raw grocery / ration estimates based on confirmed headcount
 */
function calculateRationSheet(headcountTotal, vegCount = 0, nonVegCount = 0, configRations = {}) {
  const total = Number(headcountTotal) || 0;
  const veg = Number(vegCount) || total;

  const ricePerHead = configRations.riceGrams || 80; // g
  const attaPerHead = configRations.attaGrams || 90; // g (approx 3 rotis)
  const dalPerHead = configRations.dalGrams || 40; // g
  const vegPerHead = configRations.veggieGrams || 120; // g
  const paneerPerHead = configRations.paneerGrams || 50; // g
  const oilPerHead = configRations.oilMl || 15; // ml

  return {
    headcountTotal: total,
    vegCount: veg,
    nonVegCount: Number(nonVegCount) || 0,
    rations: [
      {
        item: "Raw Rice (Chawal)",
        perHead: `${ricePerHead}g`,
        totalKg: Number(((total * ricePerHead) / 1000).toFixed(2)),
        unit: "kg",
        notes: "For steamed/jeera rice course",
      },
      {
        item: "Wheat Flour (Atta)",
        perHead: `${attaPerHead}g`,
        totalKg: Number(((total * attaPerHead) / 1000).toFixed(2)),
        unit: "kg",
        notes: `Approx. ${total * 3} fresh rotis/chapatis`,
      },
      {
        item: "Dal / Pulses (Toor/Moong)",
        perHead: `${dalPerHead}g`,
        totalKg: Number(((total * dalPerHead) / 1000).toFixed(2)),
        unit: "kg",
        notes: "For yellow dal tadka / sambar",
      },
      {
        item: "Fresh Sabzi / Vegetables",
        perHead: `${vegPerHead}g`,
        totalKg: Number(((total * vegPerHead) / 1000).toFixed(2)),
        unit: "kg",
        notes: "Seasonal dry & gravy vegetables",
      },
      {
        item: "Paneer / Cottage Cheese",
        perHead: `${paneerPerHead}g`,
        totalKg: Number(((veg * paneerPerHead) / 1000).toFixed(2)),
        unit: "kg",
        notes: "For special veg gravy thalis",
      },
      {
        item: "Cooking Oil / Ghee",
        perHead: `${oilPerHead}ml`,
        totalKg: Number(((total * oilPerHead) / 1000).toFixed(2)),
        unit: "liters",
        notes: "Refined sunflower/mustard oil",
      },
    ],
  };
}

module.exports = {
  getNowIST,
  formatDate,
  getTomorrowIST,
  getFormattedDateLabel,
  evaluateCutOff,
  calculateRationSheet,
};
