import { API_BASE_URL } from "../config/api";
import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import DynamicQRModal from "./DynamicQRModal";
import PhonePeUpiModal from "./PhonePeUpiModal";

export default function BookingModal({
  mess,
  selectedMeal, // "lunch" | "dinner"
  selectedTimeSlot, // { id, timeWindow, maxCapacity, bookedCount }
  selectedThali, // { id, name, category, sellingPrice, eligibleTiers, description }
  onClose,
  onBookingSuccess,
}) {
  const { currentUser } = useAuth();

  const formatDateString = (dateObj) => {
    return dateObj.toISOString().split("T")[0];
  };

  const todayStr = formatDateString(new Date());
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = formatDateString(tomorrowObj);
  const formattedTomorrow = tomorrowObj.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const targetDate = tomorrowStr; // Strictly Tomorrow-Only Advance Booking
  const [activeSub, setActiveSub] = useState(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [phonePeModalOpen, setPhonePeModalOpen] = useState(false);
  const [phonePeBookingData, setPhonePeBookingData] = useState(null);

  // Helper to dynamically load Razorpay Checkout SDK
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Preload Razorpay SDK in background
  useEffect(() => {
    loadRazorpayScript();
  }, []);

  // 1. Fetch student's active subscription for this mess outlet
  useEffect(() => {
    let ignore = false;
    async function checkSubscription() {
      if (!currentUser?.uid || !mess) {
        setLoadingSub(false);
        return;
      }
      try {
        setLoadingSub(true);
        const messId = mess._id || mess.id;
        const res = await fetch(
          `${API_BASE_URL}/api/subscriptions?messId=${messId}&userId=${currentUser.uid}&status=active`
        );
        const data = await res.json();
        if (!ignore && data.success && data.data?.length > 0) {
          setActiveSub(data.data[0]);
        }
      } catch (err) {
        console.warn("Could not check subscription:", err);
      } finally {
        if (!ignore) setLoadingSub(false);
      }
    }

    checkSubscription();
    return () => {
      ignore = true;
    };
  }, [currentUser?.uid, mess]);

  // 2. SMART DECISION ENGINE: Evaluate Token Match vs Cross-Category Out-of-Plan
  const thaliCategory = (selectedThali?.category || "Veg").toLowerCase();
  const thaliPrice = selectedThali?.sellingPrice || (mess.pricePerMeal && mess.pricePerMeal !== 80 ? mess.pricePerMeal : 65);
  const thaliName = selectedThali?.name || "Standard Meal Thali";
  const slotWindow =
    selectedTimeSlot?.timeWindow ||
    mess?.mealSpreads?.find((s) => s.id === selectedMeal)?.timing ||
    (selectedMeal === "lunch" ? "11:30 AM – 02:30 PM" : "07:00 PM – 10:30 PM");

  // Meal Spread Details & Closing Window Calculations
  const currentSpread = mess?.mealSpreads?.find((s) => s.id === selectedMeal);
  const spreadName = currentSpread?.name || (selectedMeal === "lunch" ? "Lunch Spread" : "Dinner Spread");
  const diningTiming = selectedTimeSlot?.timeWindow || currentSpread?.timing || slotWindow;

  const advanceConfig = mess?.advanceBookingConfig || {};
  const lunchCutOffTime = advanceConfig.lunchCutOffTime || "22:00";
  const dinnerCutOffTime = advanceConfig.dinnerCutOffTime || "14:00";

  const formatTime12h = (time24) => {
    if (!time24) return "10:00 PM";
    const [h, m] = String(time24).split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hours12 = h % 12 || 12;
    const minutes = isNaN(m) ? "00" : m < 10 ? `0${m}` : m;
    return `${hours12}:${minutes} ${period}`;
  };

  const closingDeadlineStr =
    selectedMeal === "lunch"
      ? `${formatTime12h(lunchCutOffTime)} Tonight`
      : advanceConfig.dinnerCutOffDay === "previous_night"
      ? `${formatTime12h(dinnerCutOffTime)} Tonight`
      : `${formatTime12h(dinnerCutOffTime)} Tomorrow Afternoon`;

  const thaliComposition =
    selectedThali?.description ||
    (Array.isArray(selectedThali?.items)
      ? selectedThali.items
          .map((i) => (typeof i === "object" ? i.name : i))
          .filter(Boolean)
          .join(" • ")
      : "");

  let isTokenMatch = false;
  let matchBadge = "";
  let mismatchReason = "";

  const allowRedemption = selectedThali?.allowMembershipRedemption !== false;
  const allowDirect = selectedThali?.allowDirectPurchase !== false;

  if (!allowRedemption) {
    isTokenMatch = false;
    mismatchReason = "This thali is available for direct plate purchase only and cannot be redeemed with membership tokens.";
  } else if (activeSub && activeSub.remainingTokens > 0) {
    const subCat = (activeSub.category || "veg").toLowerCase();
    const eligibleTiers = (selectedThali?.eligibleTiers || []).map((t) => t.toLowerCase());
    const subPlanId = activeSub.planId ? String(activeSub.planId).toLowerCase() : "";
    const subPlanName = (activeSub.planName || "").toLowerCase();

    // Check specific published plan match first (Crucial Link)
    const matchesSpecificPlan =
      (subPlanId && eligibleTiers.includes(subPlanId)) ||
      (subPlanName && eligibleTiers.includes(subPlanName)) ||
      eligibleTiers.some(
        (t) =>
          t === subPlanName ||
          t === subPlanId ||
          (subPlanName && t.length > 3 && (subPlanName.includes(t) || t.includes(subPlanName)))
      );

    if (matchesSpecificPlan) {
      isTokenMatch = true;
      matchBadge = `${activeSub.planName} Mapped`;
    } else if (subCat.includes("combo") || eligibleTiers.includes("combo")) {
      isTokenMatch = true;
      matchBadge = "Combo Pass: Covers All Thalis";
    } else if (
      (thaliCategory === "veg" || thaliCategory === "lite") &&
      (subCat.includes("veg") || subCat.includes("lite"))
    ) {
      isTokenMatch = true;
      matchBadge = "Veg Pass: Covers Veg & Lite Thalis";
    } else if (thaliCategory === "non-veg" && subCat.includes("non_veg")) {
      isTokenMatch = true;
      matchBadge = "Non-Veg Pass: Covers Non-Veg Thalis";
    } else if (eligibleTiers.includes(subCat) || eligibleTiers.includes("all")) {
      isTokenMatch = true;
      matchBadge = "Plan Tier Mapped";
    } else {
      isTokenMatch = false;
      mismatchReason = `Your active pass is ${activeSub.category.toUpperCase()} (${activeSub.planName}) — which is not linked to ${selectedThali?.name || "this thali"}. Direct online payment required.`;
    }
  } else if (activeSub && activeSub.remainingTokens <= 0) {
    isTokenMatch = false;
    mismatchReason = "Your membership tokens are exhausted. Please renew your pass or pay directly.";
  } else {
    isTokenMatch = false;
    mismatchReason = !allowDirect
      ? "This thali is exclusively reserved for members with active subscription plans."
      : "No active membership pass found for this mess. Direct online payment required.";
  }

  // 3. EXECUTE BOOKING (Seamless Zomato / Blinkit Flow)
  const handleCheckout = async () => {
    setActionLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/smart-book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messId: mess._id || mess.id,
          userId: currentUser?.uid,
          userEmail: currentUser?.email,
          userName: currentUser?.displayName || currentUser?.email?.split("@")[0] || "Student",
          mealPeriod: selectedMeal,
          timeSlotId: selectedTimeSlot?.id,
          timeWindow: slotWindow,
          thaliId: selectedThali?.id || selectedThali?._id,
          thaliName,
          thaliCategory: selectedThali?.category || "Veg",
          thaliPrice,
          bookingDate: targetDate,
          actionChoice: isTokenMatch ? "token" : "direct_payment",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Booking failed.");
      }

      // Scenario 1: Token Matched -> Instant Pass Generated!
      if (data.bookingType === "membership_token") {
        setConfirmedBooking({
          bookingType: "membership",
          token: data.token,
          passCode: activeSub?.passCode || data.token,
          subscriptionId: activeSub?._id,
          messName: mess.name,
          mealType: `${selectedMeal.toUpperCase()} (${slotWindow})`,
          thaliName,
          bookingDate: targetDate,
          remainingTokens: data.remainingTokens,
          totalTokens: activeSub?.totalTokens,
        });
        if (onBookingSuccess) onBookingSuccess();
        setActionLoading(false);
        return;
      }

      // Scenario 2: Direct Online Payment -> Automated PhonePe UPI Intent Flow
      if (data.bookingType === "direct_payment") {
        setPhonePeBookingData({
          bookingType: "per_plate",
          messId: mess._id || mess.id,
          mealType: selectedMeal,
          timeSlot: slotWindow,
          thaliName,
          thaliCategory: selectedThali?.category || "Veg",
          bookingDate: targetDate,
          amount: data.amount || thaliPrice,
          userId: currentUser?.uid,
          userName: currentUser?.displayName || currentUser?.email?.split("@")[0] || "Student",
          userEmail: currentUser?.email,
          userPhone: localStorage.getItem("messta_user_phone") || currentUser?.phoneNumber || "",
          title: `${thaliName} (${selectedMeal.toUpperCase()}) - ${mess.name}`,
        });
        setPhonePeModalOpen(true);
        setActionLoading(false);
        return;
      }
    } catch (err) {
      setErrorMsg(err.message || "Server error completing reservation.");
      setActionLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <div className="bg-stone-900 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-800 space-y-5 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto text-stone-100">
          
          {/* ── SUCCESS STATE: TOKEN / TICKET CONFIRMED ── */}
          {confirmedBooking ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-stone-800 text-emerald-400 border border-stone-700 rounded-xl flex items-center justify-center mx-auto text-2xl font-mono">
                ✓
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/50 px-2.5 py-0.5 rounded border border-emerald-800/60">
                  {confirmedBooking.bookingType === "membership"
                    ? "1 TOKEN DEDUCTED • SLOT CONFIRMED"
                    : "PAYMENT VERIFIED • TICKET GENERATED"}
                </span>
                <h3 className="text-xl font-semibold text-white tracking-tight mt-1">
                  Dining Reservation Confirmed
                </h3>
                <p className="text-xs text-stone-400 font-mono">
                  Display counter token or dynamic QR code at the desk.
                </p>
              </div>

              {/* Counter Token Box */}
              <div className="p-5 bg-black/60 border border-stone-800 rounded-xl space-y-2 text-center">
                <span className="text-[10px] uppercase font-mono tracking-widest text-stone-500 block">
                  COUNTER PICKUP TOKEN
                </span>
                <span className="text-3xl sm:text-4xl font-mono font-medium tracking-widest text-amber-400 block">
                  {confirmedBooking.token}
                </span>

                <div className="pt-2 border-t border-stone-800 text-xs text-stone-400 space-y-1 font-mono">
                  <p className="font-semibold text-stone-200">{confirmedBooking.thaliName}</p>
                  <div className="flex items-center justify-center gap-2 flex-wrap text-[11px] pt-0.5">
                    <span className="text-amber-400 uppercase bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded">
                      {confirmedBooking.mealType}
                    </span>
                    <span className="text-stone-300 bg-stone-800 px-2 py-0.5 rounded border border-stone-700">
                      {confirmedBooking.timeSlot || slotWindow}
                    </span>
                    <span className="text-stone-500">
                      {confirmedBooking.bookingDate}
                    </span>
                  </div>
                  {confirmedBooking.remainingTokens !== undefined && (
                    <p className="text-[10px] text-emerald-400 font-mono pt-1">
                      Token Balance: {confirmedBooking.remainingTokens} remaining
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQrModalOpen(true)}
                  className="py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs uppercase tracking-wider rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer btn-minimal"
                >
                  <span>Display QR</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 bg-stone-800 hover:bg-stone-750 text-stone-200 font-mono text-xs uppercase tracking-wider rounded-lg border border-stone-700 transition cursor-pointer btn-minimal"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* ── CHECKOUT REVIEW: LINEAR / APPLE MINIMALIST ── */
            <div className="space-y-4">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400">
                    RESERVATION CHECKOUT
                  </span>
                  <h3 className="font-semibold text-white text-base mt-0.5">
                    Confirm Dining Reservation
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-stone-500 hover:text-stone-300 text-lg font-mono p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-mono rounded-lg">
                  {errorMsg}
                </div>
              )}

              {/* ── 1. MEAL SPREAD & DINING SCHEDULE CARD ── */}
              <div className="bg-stone-950/70 rounded-xl border border-stone-800 p-4 space-y-3">
                {/* Header: Outlet, Spread badge & Price */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded">
                        {spreadName}
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">
                        {mess.name}
                      </span>
                    </div>
                    <h4 className="text-base font-semibold text-white tracking-tight">
                      {thaliName}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xl font-mono text-amber-400 block font-medium">
                      ₹{thaliPrice}.00
                    </span>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded">
                      {selectedThali?.category || "Veg"}
                    </span>
                  </div>
                </div>

                {/* Dining Timing & Service Window */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800 text-xs font-mono">
                  <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800">
                    <span className="text-[9px] uppercase tracking-wider text-stone-500 block">
                      RESERVED DATE
                    </span>
                    <span className="font-medium text-stone-200 text-xs block mt-0.5">
                      Tomorrow ({formattedTomorrow})
                    </span>
                  </div>
                  <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800">
                    <span className="text-[9px] uppercase tracking-wider text-stone-500 block">
                      SERVING HOURS
                    </span>
                    <span className="font-medium text-stone-200 text-xs block mt-0.5">
                      {diningTiming}
                    </span>
                  </div>
                </div>

                {/* Thali Menu Composition / Included Dishes */}
                {thaliComposition && (
                  <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800 space-y-1 font-mono">
                    <span className="text-[9px] uppercase tracking-wider text-stone-500 block">
                      INCLUDED DISHES
                    </span>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      {thaliComposition}
                    </p>
                  </div>
                )}
              </div>

              {/* ── 2. BOOKING DEADLINE & CLOSING WINDOW (MINIMALIST) ── */}
              <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl text-xs space-y-1 font-mono">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    <span className="text-[10px] uppercase tracking-wider text-stone-300 font-semibold">
                      DEADLINE: 22:00 IST TONIGHT
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                    CLOSES: {closingDeadlineStr}
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 leading-relaxed pt-0.5">
                  Kitchen locks grocery procurement at <strong>{closingDeadlineStr}</strong> for zero food waste.
                </p>
              </div>

              {/* ── SMART DECISION ENGINE BANNER (SCENARIO 1 vs SCENARIO 2) ── */}
              {loadingSub ? (
                <div className="p-4 bg-stone-950 rounded-xl text-center text-xs font-mono text-stone-500">
                  Checking active student membership passes...
                </div>
              ) : isTokenMatch ? (
                /* Scenario 1: Token Match! */
                <div className="p-4 bg-stone-950 rounded-xl border border-emerald-800/60 space-y-2 animate-in fade-in duration-200 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-emerald-400 tracking-wider">
                      MEMBERSHIP PASS MATCH
                    </span>
                    <span className="text-[10px] font-mono text-stone-300 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                      {activeSub?.remainingTokens} TOKENS LEFT
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Covered by active <strong>{activeSub?.planName}</strong>.
                  </p>
                  <div className="flex justify-between items-center pt-2 border-t border-stone-800 text-xs">
                    <span className="text-stone-400">Payable:</span>
                    <span className="font-mono text-emerald-400 font-medium">₹0.00 (1 Token Deducted)</span>
                  </div>
                </div>
              ) : null}

              {/* Primary Action Button (Minimalist Linear style CTA) */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={actionLoading || (!allowDirect && !isTokenMatch)}
                className={`w-full py-3 rounded-lg font-semibold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 btn-minimal disabled:opacity-50 cursor-pointer ${
                  isTokenMatch
                    ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-sm"
                    : !allowDirect
                    ? "bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed"
                    : "bg-amber-500 hover:bg-amber-400 text-black shadow-sm"
                }`}
              >
                {actionLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                    <span>Processing Reservation...</span>
                  </>
                ) : isTokenMatch ? (
                  <span>Confirm Reservation (1 Token)</span>
                ) : !allowDirect ? (
                  <span>Pass Required</span>
                ) : (
                  <span>Confirm & Pay ₹{thaliPrice}.00</span>
                )}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Dynamic QR Modal when student clicks 'Show Dynamic QR' */}
      {confirmedBooking && (
        <DynamicQRModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          type={confirmedBooking.bookingType}
          data={confirmedBooking}
        />
      )}

      {/* Automated PhonePe UPI Intent Modal */}
      {phonePeModalOpen && (
        <PhonePeUpiModal
          isOpen={phonePeModalOpen}
          onClose={() => setPhonePeModalOpen(false)}
          bookingDetails={phonePeBookingData}
          onPaymentSuccess={(confirmed) => {
            setConfirmedBooking({
              bookingType: "per_plate",
              token: confirmed.token,
              messName: mess.name,
              mealType: selectedMeal.toUpperCase(),
              timeSlot: slotWindow,
              thaliName,
              bookingDate: targetDate,
              amount: confirmed.amount || thaliPrice,
            });
            setPhonePeModalOpen(false);
            if (onBookingSuccess) onBookingSuccess();
          }}
        />
      )}
    </>
  );
}