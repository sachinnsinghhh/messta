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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-5 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
          
          {/* ── SUCCESS STATE: TOKEN / TICKET CONFIRMED ── */}
          {confirmedBooking ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-3xl font-black">
                ✓
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {confirmedBooking.bookingType === "membership"
                    ? "1 Token Deducted • Meal Slot Reserved"
                    : "Payment Captured • Single-Meal Ticket"}
                </span>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight mt-1">
                  Booking Confirmed!
                </h3>
                <p className="text-xs text-gray-500">
                  Present your counter token or dynamic QR code at the mess counter desk.
                </p>
              </div>

              {/* Counter Token Box */}
              <div className="p-5 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-dashed border-orange-300 rounded-2xl space-y-2">
                <span className="text-[10px] uppercase font-black text-orange-600 tracking-wider block">
                  Counter Pickup Token
                </span>
                <span className="text-3xl sm:text-4xl font-black tracking-widest text-gray-900 font-mono block">
                  {confirmedBooking.token}
                </span>

                <div className="pt-2 border-t border-orange-200/60 text-xs text-gray-700 space-y-1">
                  <p className="font-extrabold text-gray-900">{confirmedBooking.thaliName}</p>
                  <div className="flex items-center justify-center gap-2 flex-wrap text-[11px] pt-0.5">
                    <span className="font-black text-orange-700 uppercase bg-orange-100 px-2 py-0.5 rounded">
                      {confirmedBooking.mealType} Spread
                    </span>
                    <span className="font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded flex items-center gap-1 border border-stone-200">
                      ⏰ {confirmedBooking.timeSlot || slotWindow}
                    </span>
                    <span className="text-stone-600 font-medium">
                      📅 {confirmedBooking.bookingDate}
                    </span>
                  </div>
                  {confirmedBooking.remainingTokens !== undefined && (
                    <p className="text-[10px] text-emerald-700 font-bold pt-1">
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
                  className="py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <span>📱</span>
                  <span>Show Dynamic QR</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 bg-gray-900 hover:bg-black text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-xs cursor-pointer"
                >
                  Done & Return
                </button>
              </div>
            </div>
          ) : (
            /* ── CHECKOUT REVIEW: SMART DECISION ENGINE (ZOMATO/BLINKIT UX) ── */
            <div className="space-y-4">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                    Instant Dining Checkout
                  </span>
                  <h3 className="font-black text-gray-900 text-base mt-0.5">
                    Confirm Dining Reservation
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">
                  {errorMsg}
                </div>
              )}

              {/* ── 1. MEAL SPREAD & DINING SCHEDULE CARD ── */}
              <div className="bg-gradient-to-br from-stone-50 via-orange-50/20 to-amber-50/30 rounded-2xl border border-stone-200 p-4 space-y-3">
                {/* Header: Outlet, Spread badge & Price */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md">
                        {spreadName}
                      </span>
                      <span className="text-[10px] font-bold text-stone-500">
                        at {mess.name}
                      </span>
                    </div>
                    <h4 className="text-base font-black text-stone-900 tracking-tight">
                      {thaliName}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xl font-black text-stone-900 block font-mono">
                      ₹{thaliPrice}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200">
                      {selectedThali?.category || "Veg"}
                    </span>
                  </div>
                </div>

                {/* Dining Timing & Service Window */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200/70 text-xs">
                  <div className="bg-white/90 p-2.5 rounded-xl border border-stone-200/60">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block">
                      📅 Reserved For
                    </span>
                    <span className="font-black text-stone-900 text-xs block mt-0.5">
                      Tomorrow ({formattedTomorrow})
                    </span>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-xl border border-stone-200/60">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block">
                      🍽️ Serving Hours
                    </span>
                    <span className="font-extrabold text-stone-900 text-xs block mt-0.5">
                      {diningTiming}
                    </span>
                  </div>
                </div>

                {/* Thali Menu Composition / Included Dishes */}
                {thaliComposition && (
                  <div className="bg-white/90 p-2.5 rounded-xl border border-stone-200/60 space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block">
                      🥘 Included In This Spread
                    </span>
                    <p className="text-[11px] text-stone-700 font-medium leading-relaxed">
                      {thaliComposition}
                    </p>
                  </div>
                )}
              </div>

              {/* ── 2. BOOKING DEADLINE & CLOSING WINDOW ── */}
              <div className="p-3.5 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 rounded-2xl border-2 border-amber-300/80 text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-950">
                      🟢 Booking Window Open
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-orange-800 bg-white px-2.5 py-0.5 rounded-full border border-orange-200 shadow-2xs">
                    ⏰ Closes: {closingDeadlineStr}
                  </span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                  Kitchen locks grocery procurement at <strong>{closingDeadlineStr}</strong> to prepare fresh rations with zero food waste.
                </p>
              </div>

              {/* ── SMART DECISION ENGINE BANNER (SCENARIO 1 vs SCENARIO 2) ── */}
              {loadingSub ? (
                <div className="p-4 bg-gray-50 rounded-2xl text-center text-xs text-gray-400">
                  Checking active student membership passes...
                </div>
              ) : isTokenMatch ? (
                /* Scenario 1: Token Match! */
                <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-300 space-y-2 animate-in fade-in duration-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1">
                      <span>🎉</span>
                      <span>Membership Token Match</span>
                    </span>
                    <span className="text-[10px] font-mono font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      {activeSub?.remainingTokens} Tokens Left
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                    Your active <strong>{activeSub?.planName}</strong> ({activeSub?.category?.toUpperCase()}) natively covers this thali.
                    {matchBadge && (
                      <span className="block text-[11px] text-emerald-700 font-bold mt-0.5">
                        ✓ {matchBadge}
                      </span>
                    )}
                  </p>
                  <div className="flex justify-between items-center pt-2 border-t border-emerald-200 text-xs">
                    <span className="font-bold text-emerald-950">Net Amount to Pay:</span>
                    <span className="font-black text-emerald-700 text-base">₹0 (1 Token Deducted)</span>
                  </div>
                </div>
              ) : null}

              {/* Primary Action Button (Swiggy/Zomato style 1-click CTA) */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={actionLoading || (!allowDirect && !isTokenMatch)}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 btn-bouncy disabled:opacity-50 cursor-pointer ${
                  isTokenMatch
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30"
                    : !allowDirect
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-orange-500/30"
                }`}
              >
                {actionLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Opening 1-Tap Payment...</span>
                  </>
                ) : isTokenMatch ? (
                  <>
                    <span>🔒</span>
                    <span>Lock Tomorrow's Seat (1 Membership Token)</span>
                  </>
                ) : !allowDirect ? (
                  <>
                    <span>🔒</span>
                    <span>Member Exclusive — Subscription Pass Required</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>1-Tap UPI • Pay ₹{thaliPrice} & Lock Seat</span>
                  </>
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