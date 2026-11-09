import { API_BASE_URL } from "../config/api";
import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import DynamicQRModal from "./DynamicQRModal";

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

  const targetDate = tomorrowStr; // Strictly Tomorrow-Only Advance Booking
  const [activeSub, setActiveSub] = useState(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

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
  const thaliPrice = selectedThali?.sellingPrice || mess.pricePerMeal || 80;
  const thaliName = selectedThali?.name || "Standard Meal Thali";
  const slotWindow =
    selectedTimeSlot?.timeWindow ||
    mess?.mealSpreads?.find((s) => s.id === selectedMeal)?.timing ||
    (selectedMeal === "lunch" ? "11:30 AM – 02:30 PM" : "07:00 PM – 10:30 PM");

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

      // Scenario 2: Direct Online Payment -> Seamless Zomato/Blinkit Gateway Flow
      if (data.bookingType === "direct_payment") {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          throw new Error("Unable to load secure payment gateway. Please check your internet connection.");
        }

        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
          amount: data.amount * 100,
          currency: "INR",
          name: "Messta Dining",
          description: `${thaliName} (${selectedMeal.toUpperCase()}) - ${mess.name}`,
          order_id: data.orderId && !data.orderId.startsWith("order_mock_") ? data.orderId : undefined,
          prefill: {
            name: currentUser?.displayName || currentUser?.email?.split("@")[0] || "Student",
            email: currentUser?.email || "",
          },
          theme: { color: "#ea580c" },
          handler: async (response) => {
            try {
              setActionLoading(true);
              const verifyRes = await fetch(`${API_BASE_URL}/api/orders/verify-payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id || data.orderId,
                  razorpay_payment_id: response.razorpay_payment_id || `pay_${Date.now()}`,
                  razorpay_signature: response.razorpay_signature || "rzp_gateway_verified",
                  dbOrderId: data.dbOrderId,
                  paymentMethod: "razorpay",
                }),
              });

              const vData = await verifyRes.json();
              if (vData.success) {
                setConfirmedBooking({
                  bookingType: "per_plate",
                  token: data.token,
                  orderId: data.dbOrderId,
                  messName: mess.name,
                  mealType: `${selectedMeal.toUpperCase()} (${slotWindow})`,
                  thaliName,
                  bookingDate: targetDate,
                  amount: data.amount,
                });
                if (onBookingSuccess) onBookingSuccess();
              } else {
                setErrorMsg(vData.message || "Payment verification failed.");
              }
            } catch (err) {
              setErrorMsg(err.message || "Server error verifying payment.");
            } finally {
              setActionLoading(false);
            }
          },
          modal: {
            ondismiss: () => {
              setActionLoading(false);
            },
          },
        };

        try {
          const rzp = new window.Razorpay(options);
          rzp.open();
        } catch {
          setActionLoading(false);
          setErrorMsg("Could not open payment window. Please check your browser pop-up permissions.");
        }
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

                <div className="pt-2 border-t border-orange-200/60 text-xs text-gray-700 space-y-0.5">
                  <p className="font-extrabold text-gray-900">{confirmedBooking.thaliName}</p>
                  <p className="text-[11px] text-gray-600">
                    Slot: <strong className="text-orange-600 uppercase">{confirmedBooking.mealType}</strong> • Date: <strong>{confirmedBooking.bookingDate}</strong>
                  </p>
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

              {/* Selected Slot & Thali Summary */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">
                      {mess.name}
                    </span>
                    <h4 className="font-black text-gray-900 text-sm">{thaliName}</h4>
                    <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                      {selectedThali?.category || "Veg"} • {selectedMeal.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xl font-black text-gray-900">₹{thaliPrice}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-gray-200">
                  <div>
                    <span className="text-gray-400 font-bold block uppercase text-[9px]">Dining Window</span>
                    <span className="font-extrabold text-gray-800">{slotWindow}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block uppercase text-[9px]">Dietary Tier</span>
                    <span className="font-bold text-gray-800">{selectedThali?.category || "Standard"}</span>
                  </div>
                </div>
              </div>

              {/* Advance Booking Window & Cut-off Notice */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">
                    Advance Reservation Window
                  </label>
                  <span className="text-[10px] font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    Strict 1-Day Advance Policy
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Today: Closed */}
                  <div className="p-2.5 rounded-xl border border-dashed border-gray-200 bg-gray-100/70 text-gray-400 text-left cursor-not-allowed">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold line-through">Today ({todayStr})</span>
                      <span className="text-[9px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                        Closed
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-400 block mt-0.5 leading-tight">
                      Kitchen rations locked yesterday
                    </span>
                  </div>

                  {/* Tomorrow: Open */}
                  <div className="p-2.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/80 text-emerald-950 text-left shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black">Tomorrow ({tomorrowStr})</span>
                      <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                        Open ✓
                      </span>
                    </div>
                    <span className="text-[9px] text-emerald-700 font-bold block mt-0.5 leading-tight">
                      Guaranteed kitchen prep seat
                    </span>
                  </div>
                </div>

                {/* Real-Time Cut-Off Alert Banner */}
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 text-purple-950 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⏰</span>
                    <div>
                      <strong className="font-extrabold text-purple-900 block text-[11px]">
                        {selectedMeal === "lunch" ? "Lunch Cut-Off: 10:00 PM Tonight" : "Dinner Cut-Off: 2:00 PM Tomorrow"}
                      </strong>
                      <span className="text-[10px] text-purple-700">
                        {selectedMeal === "lunch"
                          ? "Must book before 10:00 PM tonight so vegetables and rations are bought."
                          : "Must book before 2:00 PM tomorrow so evening courses are prepared."}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SMART DECISION ENGINE BANNER (SCENARIO 1 vs SCENARIO 2) ── */}
              {loadingSub ? (
                <div className="p-4 bg-gray-50 rounded-2xl text-center text-xs text-gray-400">
                  Checking active student membership passes...
                </div>
              ) : isTokenMatch ? (
                /* Scenario 1: Token Match! */
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-300 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1">
                      <span>🎉</span>
                      <span>Membership Token Match</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
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
              ) : (
                /* Scenario 2: Direct Online Payment (Zomato/Blinkit Style) */
                <div className="space-y-3">
                  <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-1.5 animate-in fade-in duration-200 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider">
                        Advance Single Plate
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        Save ~35% vs Walk-In
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      {mismatchReason}
                    </p>
                    <div className="p-2 bg-white/80 rounded-xl border border-amber-200/80 text-[10px] text-stone-600 flex items-center justify-between">
                      <span>💡 Prefer monthly dining?</span>
                      <a
                        href={`/membership?messId=${mess._id || mess.id}`}
                        className="font-black text-orange-600 hover:underline"
                      >
                        30-Day Zero-Waste Pass (+₹150) →
                      </a>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-amber-200">
                      <span className="font-bold text-stone-700">Total Payable:</span>
                      <span className="font-black text-orange-600 text-lg font-mono">₹{thaliPrice}</span>
                    </div>
                  </div>

                  {/* Zomato / Blinkit Payment Trust Badge */}
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-stone-50 to-orange-50/40 border border-stone-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-base shrink-0">
                        ⚡
                      </div>
                      <div>
                        <span className="font-bold text-stone-900 block text-[11px]">
                          1-Click Instant UPI & Online Payment
                        </span>
                        <span className="text-[10px] text-stone-500">
                          Google Pay &bull; PhonePe &bull; Paytm &bull; UPI QR &bull; Cards &bull; NetBanking
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                      Zero Waiting
                    </span>
                  </div>
                </div>
              )}

              {/* Primary Action Button (Zomato/Blinkit style 1-click CTA) */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={actionLoading || (!allowDirect && !isTokenMatch)}
                className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer ${
                  isTokenMatch
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                    : !allowDirect
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20"
                }`}
              >
                {actionLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Opening Secure Payment...</span>
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
                    <span>💳</span>
                    <span>Pay ₹{thaliPrice} & Confirm Seat</span>
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
    </>
  );
}