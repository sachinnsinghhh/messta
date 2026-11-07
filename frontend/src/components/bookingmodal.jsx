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

  // Central Payment & UPI States
  const [pendingPaymentData, setPendingPaymentData] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState({
    centralUpiPhone: "9876543210",
    centralUpiId: "messta.central@hdfcbank",
    centralQrImageUrl: "",
    businessName: "Messta Digital Food Escrow",
  });
  const [copiedField, setCopiedField] = useState("");
  const [userUtr, setUserUtr] = useState("");
  const [isAwaitingApproval, setIsAwaitingApproval] = useState(false);
  const [rejectionNotice, setRejectionNotice] = useState("");

  // 2. SMART DECISION ENGINE: Evaluate Token Match vs Cross-Category Out-of-Plan
  const thaliCategory = (selectedThali?.category || "Veg").toLowerCase();
  const thaliPrice = selectedThali?.sellingPrice || mess.pricePerMeal || 80;
  const thaliName = selectedThali?.name || "Standard Meal Thali";
  const slotWindow =
    selectedTimeSlot?.timeWindow ||
    mess?.mealSpreads?.find((s) => s.id === selectedMeal)?.timing ||
    (selectedMeal === "lunch" ? "11:30 AM – 02:30 PM" : "07:00 PM – 10:30 PM");

  // Poll order status when awaiting counter UPI verification
  useEffect(() => {
    if (!isAwaitingApproval || !pendingPaymentData?.dbOrderId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/orders/${pendingPaymentData.dbOrderId}/status`);
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.paymentStatus === "paid" && json.data.tokenStatus === "active") {
            clearInterval(interval);
            setIsAwaitingApproval(false);
            setConfirmedBooking({
              bookingType: "per_plate",
              token: json.data.token,
              orderId: pendingPaymentData.dbOrderId,
              messName: mess.name,
              mealType: `${selectedMeal.toUpperCase()} (${slotWindow})`,
              thaliName,
              bookingDate: targetDate,
              amount: thaliPrice,
            });
            setPendingPaymentData(null);
            if (onBookingSuccess) onBookingSuccess();
          } else if (json.data.paymentStatus === "failed" || json.data.tokenStatus === "cancelled") {
            clearInterval(interval);
            setIsAwaitingApproval(false);
            setRejectionNotice(json.data.rejectionReason || "Payment could not be verified by the mess counter.");
          }
        }
      } catch {
        // Continue polling
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isAwaitingApproval, pendingPaymentData?.dbOrderId, mess.name, selectedMeal, slotWindow, thaliName, targetDate, thaliPrice, onBookingSuccess]);

  // Fetch Public Central Payment Details (QR & Phone)
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/wallet/public-payment-config`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setPaymentConfig({
            centralUpiPhone: d.centralUpiPhone || "9876543210",
            centralUpiId: d.centralUpiId || "messta.central@hdfcbank",
            centralQrImageUrl: d.centralQrImageUrl || "",
            businessName: d.businessName || "Messta Digital Food Escrow",
          });
        }
      })
      .catch(() => {});
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

  // 3. EXECUTE BOOKING (Scenario 1 or Scenario 2)
  const handleCheckout = async () => {
    setActionLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/smart-book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messId: mess._id || mess.id,
          userId: currentUser.uid,
          userEmail: currentUser.email,
          userName: currentUser.displayName || currentUser.email.split("@")[0],
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
      }
      // Scenario 2: Direct Payment Order -> Prompt Central UPI QR & Phone Payment
      else if (data.bookingType === "direct_payment") {
        setPendingPaymentData(data);
      }
    } catch (err) {
      setErrorMsg(err.message || "Server error completing reservation.");
    } finally {
      setActionLoading(false);
    }
  };

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

  // 4A. INSTANT PAYMENT: Razorpay Gateway (Automated Cryptographic Verification)
  const handleGatewayPayment = async () => {
    if (!pendingPaymentData) return;
    setActionLoading(true);
    setErrorMsg("");
    setRejectionNotice("");

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setErrorMsg("Payment gateway could not be loaded. Please scan the UPI QR below.");
      setActionLoading(false);
      return;
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
      amount: thaliPrice * 100,
      currency: "INR",
      name: mess.name,
      description: `${thaliName} (${selectedMeal.toUpperCase()})`,
      order_id: pendingPaymentData.orderId && !pendingPaymentData.orderId.startsWith("order_mock_")
        ? pendingPaymentData.orderId
        : undefined,
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
              razorpay_order_id: response.razorpay_order_id || pendingPaymentData.orderId,
              razorpay_payment_id: response.razorpay_payment_id || `pay_${Date.now()}`,
              razorpay_signature: response.razorpay_signature || "rzp_gateway_verified",
              dbOrderId: pendingPaymentData.dbOrderId,
              paymentMethod: "razorpay",
            }),
          });
          const vData = await verifyRes.json();
          if (vData.success) {
            setConfirmedBooking({
              bookingType: "per_plate",
              token: pendingPaymentData.token,
              orderId: pendingPaymentData.dbOrderId,
              messName: mess.name,
              mealType: `${selectedMeal.toUpperCase()} (${slotWindow})`,
              thaliName,
              bookingDate: targetDate,
              amount: thaliPrice,
            });
            setPendingPaymentData(null);
            if (onBookingSuccess) onBookingSuccess();
          } else {
            setErrorMsg(vData.message || "Gateway payment verification failed.");
          }
        } catch (err) {
          setErrorMsg(err.message || "Error verifying gateway payment.");
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
      const rzpInstance = new window.Razorpay(options);
      rzpInstance.open();
    } catch {
      setErrorMsg("Could not initialize online checkout. Please scan UPI QR below.");
      setActionLoading(false);
    }
  };

  // 4B. DIRECT UPI QR SCAN: Mandatory 12-Digit UTR + Anti-Fraud Check + Owner Desk Approval
  const handleFinalizePayment = async () => {
    if (!pendingPaymentData) return;
    setErrorMsg("");
    setRejectionNotice("");

    const cleanUtr = String(userUtr || "").trim();
    if (!cleanUtr) {
      setErrorMsg("12-digit UPI reference number (UTR) is mandatory to verify your payment.");
      return;
    }
    if (!/^\d{12}$/.test(cleanUtr)) {
      setErrorMsg("Invalid UTR format. Bank reference number must be exactly 12 numeric digits.");
      return;
    }
    const dummyPatterns = [
      "000000000000", "111111111111", "222222222222", "333333333333",
      "444444444444", "555555555555", "666666666666", "777777777777",
      "888888888888", "999999999999", "123456789012", "012345678901",
      "123412341234", "987654321098"
    ];
    if (dummyPatterns.includes(cleanUtr)) {
      setErrorMsg("Invalid or dummy UTR detected. Please enter the authentic 12-digit reference from your UPI receipt.");
      return;
    }

    setActionLoading(true);

    try {
      const verifyRes = await fetch(`${API_BASE_URL}/api/orders/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dbOrderId: pendingPaymentData.dbOrderId,
          utrNumber: cleanUtr,
          paymentMethod: "upi_qr",
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.message || "UPI payment verification failed.");
      }

      // Enter waiting state while mess owner verifies on counter screen
      setIsAwaitingApproval(true);
    } catch (err) {
      setErrorMsg(err.message || "Server error submitting UPI verification.");
    } finally {
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
                    : "Payment Verified • Meal Token Active"}
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
                  className="py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <span>📱</span>
                  <span>Show Dynamic QR</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 bg-gray-900 hover:bg-black text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-xs"
                >
                  Done & Return
                </button>
              </div>
            </div>
          ) : pendingPaymentData ? (
            /* ── PAYMENT VERIFICATION VIEW (GATEWAY OR DIRECT UPI QR) ── */
            isAwaitingApproval ? (
              /* AWAITING MESS COUNTER VERIFICATION SCREEN */
              <div className="text-center py-6 space-y-5 animate-in fade-in duration-200">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
                  <span className="text-2xl">⏳</span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                    Awaiting Counter Approval
                  </span>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight mt-1">
                    Verifying Payment with Counter
                  </h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                    Your 12-digit reference has been sent to the mess counter. Your meal token & QR code will automatically unlock on this screen as soon as counter staff confirms.
                  </p>
                </div>

                {/* Details Card */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-left space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500 font-medium">Outlet:</span>
                    <strong className="text-stone-900">{mess.name}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500 font-medium">Meal & Thali:</span>
                    <strong className="text-stone-900">{thaliName} ({selectedMeal.toUpperCase()})</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-500 font-medium">Amount to Pay:</span>
                    <strong className="text-stone-900 font-mono text-sm">₹{thaliPrice}</strong>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-stone-200">
                    <span className="text-stone-500 font-medium">Submitted UTR:</span>
                    <span className="font-mono font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded text-xs">
                      {userUtr}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-left flex items-start gap-2.5 text-xs text-amber-900">
                  <span className="text-base shrink-0">💡</span>
                  <p className="text-[11px] leading-relaxed">
                    <strong>Counter Tip:</strong> Counter staff can verify your UTR ending in <strong>{userUtr.slice(-4)}</strong> on their Live Counter Screen in real-time.
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAwaitingApproval(false)}
                    className="text-xs font-semibold text-stone-500 hover:text-stone-800 transition underline cursor-pointer"
                  >
                    ← Edit UTR or Pay via Online Gateway
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    Close (Will auto-activate once approved)
                  </button>
                </div>
              </div>
            ) : (
              /* PAYMENT SELECTION & DIRECT UPI QR VIEW */
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                      Payment Verification Required
                    </span>
                    <h3 className="font-black text-gray-900 text-base mt-0.5">
                      Pay for Single Meal Slot
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingPaymentData(null)}
                    className="text-gray-400 hover:text-gray-600 text-xs font-bold"
                  >
                    ← Back
                  </button>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">
                    {errorMsg}
                  </div>
                )}

                {rejectionNotice && (
                  <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200 space-y-1">
                    <p className="font-bold">❌ Payment was rejected by the mess counter.</p>
                    <p className="text-[11px] text-rose-600">Reason: {rejectionNotice}</p>
                    <p className="text-[10px] text-rose-500">Please re-check your UTR or pay online via Gateway.</p>
                  </div>
                )}

                {/* Amount & Instruction */}
                <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 text-center space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Amount to Pay</span>
                  <div className="text-3xl font-black text-purple-900 font-mono">
                    ₹{thaliPrice}
                  </div>
                  <p className="text-[11px] text-gray-600">
                    {thaliName} • {mess.name}
                  </p>
                </div>

                {/* OPTION 1: INSTANT ONLINE PAYMENT VIA GATEWAY */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleGatewayPayment}
                    disabled={actionLoading}
                    className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <span>⚡ Pay ₹{thaliPrice} via Gateway (Instant Verification)</span>
                  </button>
                  <p className="text-[10px] text-gray-400 text-center font-medium">
                    Card, NetBanking, UPI App • Automated verification, zero waiting
                  </p>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink mx-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Or Scan UPI QR & Submit UTR
                  </span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                {/* Central QR Code Display */}
                <div className="bg-white p-3.5 rounded-2xl border-2 border-dashed border-gray-200 text-center space-y-2.5">
                  <span className="text-[11px] font-extrabold text-gray-700 block">
                    Scan Universal Messta UPI QR
                  </span>
                  <div className="flex justify-center">
                    <img
                      src={
                        paymentConfig.centralQrImageUrl ||
                        `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi%3A%2F%2Fpay%3Fpa%3D${encodeURIComponent(paymentConfig.centralUpiId)}%26pn%3DMessta%2520Food%26am%3D${thaliPrice}%26cu%3DINR%26tn%3DMeal_${pendingPaymentData.token}`
                      }
                      alt="Messta Central UPI QR"
                      className="w-40 h-40 rounded-xl border border-gray-200 p-2 bg-white shadow-xs"
                    />
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    GPay • PhonePe • Paytm • BHIM
                  </div>
                </div>

                {/* UPI Phone Number & ID with Copy Buttons */}
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-gray-400 font-bold uppercase block">UPI Mobile Number</span>
                      <strong className="text-gray-900 font-mono text-xs">{paymentConfig.centralUpiPhone}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(paymentConfig.centralUpiPhone);
                        setCopiedField("phone");
                        setTimeout(() => setCopiedField(""), 2000);
                      }}
                      className="px-2 py-1 bg-white hover:bg-gray-100 text-gray-700 font-bold text-[10px] rounded-lg border border-gray-200 transition cursor-pointer"
                    >
                      {copiedField === "phone" ? "Copied! ✓" : "Copy Phone 📋"}
                    </button>
                  </div>

                  <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-gray-400 font-bold uppercase block">Central UPI ID (VPA)</span>
                      <strong className="text-gray-900 font-mono text-xs">{paymentConfig.centralUpiId}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(paymentConfig.centralUpiId);
                        setCopiedField("upi");
                        setTimeout(() => setCopiedField(""), 2000);
                      }}
                      className="px-2 py-1 bg-white hover:bg-gray-100 text-gray-700 font-bold text-[10px] rounded-lg border border-gray-200 transition cursor-pointer"
                    >
                      {copiedField === "upi" ? "Copied! ✓" : "Copy UPI 📋"}
                    </button>
                  </div>
                </div>

                {/* Mandatory UTR Input with Anti-Fraud Validation */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-gray-700">
                      12-Digit UPI Reference / UTR Number *
                    </label>
                    <span className="text-[10px] text-orange-600 font-bold">Mandatory</span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="e.g. 428901928312"
                    value={userUtr}
                    onChange={(e) => setUserUtr(e.target.value.replace(/\D/g, "").slice(0, 12))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Found on your UPI app receipt (12 numeric digits). Token will unlock upon counter verification.
                  </p>
                </div>

                {/* Submit UTR Button */}
                <button
                  type="button"
                  onClick={handleFinalizePayment}
                  disabled={actionLoading || userUtr.trim().length !== 12}
                  className="w-full py-3 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                      <span>Submitting Reference...</span>
                    </>
                  ) : (
                    <>
                      <span>🔒 Submit UTR & Await Counter Approval</span>
                    </>
                  )}
                </button>
              </div>
            )
          ) : (
            /* ── CHECKOUT REVIEW: SMART DECISION ENGINE ── */
            <div className="space-y-4">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                    Smart Decision Checkout
                  </span>
                  <h3 className="font-black text-gray-900 text-base mt-0.5">
                    Confirm Dining Reservation
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1"
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
                      <span>Scenario 1: Membership Token Match</span>
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
                /* Scenario 2: Cross-Category Mismatch / Out-of-Plan */
                <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-300 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider flex items-center gap-1">
                      <span>⚡</span>
                      <span>Scenario 2: Direct Payment Required</span>
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 uppercase">
                      Out-of-Plan
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed font-medium">
                    {mismatchReason}
                  </p>
                  <div className="flex justify-between items-center pt-2 border-t border-amber-200 text-xs">
                    <span className="font-bold text-amber-950">Total Amount Payable:</span>
                    <span className="font-black text-orange-600 text-lg">₹{thaliPrice}</span>
                  </div>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={actionLoading || (!allowDirect && !isTokenMatch)}
                className={`w-full py-3.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition shadow-xs flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 ${
                  isTokenMatch
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                    : !allowDirect
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20"
                }`}
              >
                {actionLoading ? (
                  <span>Locking Tomorrow's Seat...</span>
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
                    <span>Pay ₹{thaliPrice} & Lock Tomorrow's Seat</span>
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