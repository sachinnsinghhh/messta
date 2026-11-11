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

              {/* Clean Humanized Counter Pickup Token Card */}
              <div className="relative p-6 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-3">
                <span className="text-[11px] font-semibold text-gray-500 block uppercase tracking-wider">
                  Pickup Token
                </span>
                <span className="text-4xl sm:text-5xl font-extrabold tracking-wider text-orange-600 block">
                  #{confirmedBooking.token}
                </span>

                <div className="pt-3 border-t border-orange-200/70 text-xs space-y-1.5">
                  <p className="font-bold text-gray-900 text-sm">{confirmedBooking.thaliName}</p>
                  <div className="flex items-center justify-center gap-2 flex-wrap text-xs pt-0.5">
                    <span className="font-semibold text-gray-700 bg-white px-2.5 py-1 rounded-md border border-gray-200">
                      {confirmedBooking.mealType}
                    </span>
                    <span className="font-semibold text-gray-700 bg-white px-2.5 py-1 rounded-md border border-gray-200">
                      {confirmedBooking.timeSlot || slotWindow}
                    </span>
                    <span className="text-gray-500">
                      {confirmedBooking.bookingDate}
                    </span>
                  </div>
                  {confirmedBooking.remainingTokens !== undefined && (
                    <p className="text-xs text-emerald-700 font-semibold pt-1">
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
                  className="py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <span>Show QR Code</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* ── CHECKOUT REVIEW ── */
            <div className="space-y-4">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    Confirm Meal Reservation
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Advance booking for tomorrow&rsquo;s meal
                  </p>
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
              <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                {/* Header: Outlet, Spread badge & Price */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                        {spreadName}
                      </span>
                      <span className="text-xs font-medium text-gray-500">
                        at {mess.name}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-gray-900 tracking-tight">
                      {thaliName}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xl font-extrabold text-gray-900 block">
                      ₹{thaliPrice}
                    </span>
                    <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                      {selectedThali?.category || "Veg"}
                    </span>
                  </div>
                </div>

                {/* Dining Timing & Service Window */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-medium text-gray-500 block">
                      Date
                    </span>
                    <span className="font-semibold text-gray-900 text-xs block mt-0.5">
                      Tomorrow ({formattedTomorrow})
                    </span>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-medium text-gray-500 block">
                      Serving Hours
                    </span>
                    <span className="font-semibold text-gray-900 text-xs block mt-0.5">
                      {diningTiming}
                    </span>
                  </div>
                </div>

                {/* Thali Menu Composition / Included Dishes */}
                {thaliComposition && (
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 space-y-1">
                    <span className="text-[10px] font-medium text-gray-500 block">
                      Included In This Thali
                    </span>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      {thaliComposition}
                    </p>
                  </div>
                )}
              </div>

              {/* ── 2. BOOKING DEADLINE NOTICE ── */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-900">
                    Advance Booking Notice
                  </span>
                  <span className="text-[11px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-200">
                    Closes {closingDeadlineStr}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Reserve in advance so the kitchen can prepare fresh rations and guarantee your meal.
                </p>
              </div>

              {/* ── MEMBERSHIP TOKEN MATCH BANNER ── */}
              {loadingSub ? (
                <div className="p-4 bg-gray-50 rounded-2xl text-center text-xs text-gray-400">
                  Checking active student meal passes...
                </div>
              ) : isTokenMatch ? (
                <div className="p-4 bg-green-50 rounded-2xl border border-green-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-green-900">
                      Meal Pass Applied
                    </span>
                    <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-md">
                      {activeSub?.remainingTokens} Tokens Available
                    </span>
                  </div>
                  <p className="text-xs text-green-800">
                    Your <strong>{activeSub?.planName}</strong> pass covers this thali.
                  </p>
                  <div className="flex justify-between items-center pt-2 border-t border-green-200 text-xs">
                    <span className="font-medium text-green-950">Amount to pay:</span>
                    <span className="font-bold text-green-800 text-sm">₹0 (1 Token)</span>
                  </div>
                </div>
              ) : null}

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={actionLoading || (!allowDirect && !isTokenMatch)}
                className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                  isTokenMatch
                    ? "bg-green-700 hover:bg-green-800 text-white"
                    : !allowDirect
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-orange-600 hover:bg-orange-700 text-white"
                }`}
              >
                {actionLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : isTokenMatch ? (
                  <span>Confirm with Meal Pass (1 Token)</span>
                ) : !allowDirect ? (
                  <span>Members Only — Active Pass Required</span>
                ) : (
                  <span>Pay ₹{thaliPrice} via UPI</span>
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