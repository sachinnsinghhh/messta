import { API_BASE_URL } from "../config/api";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import DynamicQRModal from "../components/DynamicQRModal";

export default function StudentMembership() {
  const { currentUser } = useAuth();
  const [messes, setMesses] = useState([]);
  const [selectedMessId, setSelectedMessId] = useState(() => {
    return localStorage.getItem("messta_activeMessId") || "";
  });

  const [plans, setPlans] = useState([]);
  const [mySubscription, setMySubscription] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: "", type: "" });
  const [generatedCode, setGeneratedCode] = useState("");
  const [qrModal, setQrModal] = useState({ isOpen: false, data: null });
  const [reloadKey, setReloadKey] = useState(0);

  // Advance Slot Booking & Cut-Off Engine States
  const todayDateObj = new Date();
  const todayStr = todayDateObj.toISOString().split("T")[0];
  const tomorrowDateObj = new Date(todayDateObj);
  tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
  const tomorrowStr = tomorrowDateObj.toISOString().split("T")[0];

  const [advanceMeal, setAdvanceMeal] = useState("lunch");
  const [advanceTimeSlot, setAdvanceTimeSlot] = useState("12:30 PM – 01:00 PM");

  // Central Payment & UPI States for Membership
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);
  const [membershipUtr, setMembershipUtr] = useState("");
  const [copiedField, setCopiedField] = useState("");
  const [paymentConfig, setPaymentConfig] = useState({
    centralUpiPhone: "9876543210",
    centralUpiId: "messta.central@hdfcbank",
    centralQrImageUrl: "",
    businessName: "Messta Digital Food Escrow",
  });

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

  // 1. Fetch all mess outlets for student selection
  useEffect(() => {
    let ignore = false;
    async function fetchMesses() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/mess`);
        if (!res.ok) return;
        const data = await res.json();
        const list = data.data || [];
        if (!ignore) {
          setMesses(list);
          if (!selectedMessId && list.length > 0) {
            const firstId = list[0]._id || list[0].id;
            setSelectedMessId(firstId);
          }
        }
      } catch (err) {
        console.warn("Could not load messes:", err.message);
      }
    }
    fetchMesses();
    return () => {
      ignore = true;
    };
  }, [selectedMessId]);

  // 2. Fetch plans, subscription, and broadcasts for selected mess outlet
  useEffect(() => {
    if (!selectedMessId) return;
    let ignore = false;

    async function loadStudentData() {
      try {
        setLoading(true);

        const fetchPlans = fetch(`${API_BASE_URL}/api/subscriptions/plans/${selectedMessId}`).then((r) => r.json());
        const fetchBroadcasts = fetch(`${API_BASE_URL}/api/subscriptions/broadcasts/${selectedMessId}`).then((r) => r.json());
        
        let fetchSub = Promise.resolve({ data: [] });
        if (currentUser?.uid) {
          fetchSub = fetch(`${API_BASE_URL}/api/subscriptions?messId=${selectedMessId}&userId=${currentUser.uid}`).then((r) => r.json());
        }

        const [plansRes, bRes, subRes] = await Promise.all([fetchPlans, fetchBroadcasts, fetchSub]);

        if (!ignore) {
          if (plansRes.success) setPlans(plansRes.data || []);
          if (bRes.success) setBroadcasts(bRes.data || []);

          if (subRes.success && subRes.data?.length > 0) {
            setMySubscription(subRes.data[0]);
          } else {
            setMySubscription(null);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.warn("Failed loading student pass data:", err.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadStudentData();

    return () => {
      ignore = true;
    };
  }, [selectedMessId, currentUser?.uid, reloadKey]);

  const triggerReload = () => setReloadKey((k) => k + 1);

  // Step 1: Open Payment Modal with Central UPI QR
  const handleSubscribe = (plan) => {
    if (!currentUser) {
      setFeedback({ text: "Please sign in to purchase a digital membership pass.", type: "error" });
      return;
    }
    setSelectedPlanForPayment(plan);
    setMembershipUtr("");
  };

  // Step 2: Confirm Central UPI Payment & Generate Membership Pass
  const handleConfirmMembershipPayment = async () => {
    if (!selectedPlanForPayment) return;
    setActionLoading(true);
    setFeedback({ text: "", type: "" });

    try {
      const res = await fetch(`${API_BASE_URL}/api/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.uid,
          userName: currentUser.displayName || currentUser.email.split("@")[0],
          userEmail: currentUser.email,
          userPhone: currentUser.phoneNumber || "+91 98765 43210",
          messId: selectedMessId,
          planId: selectedPlanForPayment._id,
          planName: selectedPlanForPayment.planName,
          category: selectedPlanForPayment.category,
          frequency: selectedPlanForPayment.frequency,
          mealsPerDay: selectedPlanForPayment.mealsPerDay || 2,
          totalTokens: selectedPlanForPayment.totalTokens,
          price: selectedPlanForPayment.price,
          utrNumber: membershipUtr,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          text: `Congratulations! Digital Membership Pass generated with ${selectedPlanForPayment.totalTokens} tokens. Welcome to the mess community! 🎉`,
          type: "success",
        });
        setMySubscription(data.data);
        setSelectedPlanForPayment(null);
        triggerReload();
      } else {
        setFeedback({ text: data.message || "Failed to purchase pass.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Server error purchasing pass.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Advance Meal Slot Locking for Tomorrow (Universal Seat Locking Engine)
  const handleLockAdvanceSlot = async (overrideMeal, overrideSlot) => {
    if (!mySubscription) return;
    setActionLoading(true);
    setFeedback({ text: "", type: "" });
    setGeneratedCode("");

    const meal = overrideMeal || advanceMeal;
    const slot = overrideSlot || advanceTimeSlot;

    try {
      const res = await fetch(`${API_BASE_URL}/api/subscriptions/${mySubscription._id}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: tomorrowStr,
          mealType: meal,
          timeSlot: slot,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGeneratedCode(data.tokenCode);
        setFeedback({
          text: `Advance seat confirmed for Tomorrow (${data.targetDateLabel || tomorrowStr})! Kitchen headcount locked. 🍽️`,
          type: "success",
        });
        setMySubscription(data.data);
        // Automatically pop up the dynamic QR modal
        setQrModal({
          isOpen: true,
          data: {
            token: data.tokenCode,
            tokenCode: data.tokenCode,
            passCode: data.data?.passCode || mySubscription.passCode,
            subscriptionId: mySubscription._id,
            messId: mySubscription.messId?._id || mySubscription.messId || selectedMessId,
            messName: activeMessObj?.name || "Messta Partner Mess",
            userName: mySubscription.userName,
            mealType: `${meal.toUpperCase()} (${slot})`,
            remainingTokens: data.data?.remainingTokens,
            totalTokens: data.data?.totalTokens,
            planName: mySubscription.planName,
            category: mySubscription.category,
            frequency: mySubscription.frequency,
          },
        });
      } else {
        setFeedback({ text: data.message || "Failed to reserve advance slot.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Server error reserving advance slot.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const activeMessObj = messes.find((m) => (m._id || m.id) === selectedMessId);

  return (
    <div className="min-h-screen bg-gray-50/70 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* ── TOP HERO HEADER & OUTLET SELECTION ── */}
      <div className="bg-gradient-to-br from-orange-600 via-orange-700 to-amber-700 text-white rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 text-white px-2.5 py-1 rounded-full backdrop-blur-sm">
              Student Dining Passport
            </span>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              Digital Membership Pass & Token Vault
            </h1>
            <p className="text-xs sm:text-sm text-orange-100 max-w-xl">
              Enjoy flexible, transparent dining across Pune messes. Buy tokens, redeem meal slots on-demand, and track real-time consumption.
            </p>
          </div>

          {/* Outlet Switcher for Student */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 space-y-1">
            <label className="block text-[10px] font-black uppercase text-orange-200">
              Select Mess Outlet:
            </label>
            <select
              value={selectedMessId}
              onChange={(e) => setSelectedMessId(e.target.value)}
              aria-label="Select Mess Outlet"
              className="bg-white text-gray-900 text-xs font-bold py-2 px-3 rounded-xl focus:outline-none cursor-pointer shadow-sm"
            >
              {messes.map((m) => (
                <option key={m._id || m.id} value={m._id || m.id}>
                  📍 {m.name} ({m.locality})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback.text && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback({ text: "", type: "" })}
            className="text-gray-400 hover:text-gray-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── CORE 2-COLUMN LAYOUT: DIGITAL PASS & MARKETPLACE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: ACTIVE DIGITAL MEMBERSHIP PASS & DAILY SLOT REDEMPTION */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* DIGITAL PASS CARD */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs space-y-5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                Active Pass
              </span>
              {mySubscription && (
                <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                  {mySubscription.passCode}
                </span>
              )}
            </div>

            {mySubscription ? (
              <div className="space-y-5">
                {/* Visual Holographic Digital Card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-orange-950 text-white p-5 shadow-md border border-gray-700/60 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">
                        {activeMessObj?.name || "Messta Partner Outlet"}
                      </span>
                      <h3 className="text-lg font-black tracking-tight mt-0.5">
                        {mySubscription.planName}
                      </h3>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded border border-orange-500/30">
                        {mySubscription.category} • {mySubscription.frequency}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${
                        mySubscription.status === "active"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {mySubscription.status}
                    </span>
                  </div>

                  {/* Token Burn-down Progress Meter */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs font-black">
                      <span className="text-gray-400 text-[10px] uppercase tracking-wider">Remaining Balance</span>
                      <span className="text-orange-400">
                        {mySubscription.remainingTokens} / {mySubscription.totalTokens} Tokens
                      </span>
                    </div>
                    <div className="w-full bg-gray-700/80 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${(mySubscription.remainingTokens / mySubscription.totalTokens) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end pt-2 text-[10px] text-gray-400 border-t border-gray-700/50">
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-gray-500">Cardholder</span>
                      <span className="font-bold text-gray-200">{mySubscription.userName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQrModal({
                          isOpen: true,
                          data: {
                            token: mySubscription.passCode,
                            passCode: mySubscription.passCode,
                            subscriptionId: mySubscription._id,
                            messId: mySubscription.messId?._id || mySubscription.messId || selectedMessId,
                            messName: activeMessObj?.name || "Messta Partner Mess",
                            userName: mySubscription.userName,
                            mealType: "Membership Pass",
                            remainingTokens: mySubscription.remainingTokens,
                            totalTokens: mySubscription.totalTokens,
                            planName: mySubscription.planName,
                            category: mySubscription.category,
                            frequency: mySubscription.frequency,
                          }
                        })}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg border border-white/20 transition flex items-center gap-1 shadow-2xs backdrop-blur-xs"
                        title="Show Dynamic Pass QR"
                      >
                        <span>📱</span>
                        <span>Pass QR</span>
                      </button>
                      <span className="font-mono text-gray-300 font-bold">{mySubscription.passCode}</span>
                    </div>
                  </div>
                </div>

                {/* Instant Counter Token Result Banner */}
                {generatedCode && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-center space-y-2 animate-in zoom-in-95 duration-200">
                    <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">
                      Counter Code Ready
                    </span>
                    <p className="text-2xl font-mono font-black text-emerald-900 tracking-widest">
                      {generatedCode}
                    </p>
                    <button
                      type="button"
                      onClick={() => setQrModal({
                        isOpen: true,
                        data: {
                          token: generatedCode,
                          tokenCode: generatedCode,
                          passCode: mySubscription.passCode,
                          subscriptionId: mySubscription._id,
                          messId: mySubscription.messId?._id || mySubscription.messId || selectedMessId,
                          messName: activeMessObj?.name || "Messta Partner Mess",
                          userName: mySubscription.userName,
                          mealType: "Daily Slot",
                          remainingTokens: mySubscription.remainingTokens,
                          totalTokens: mySubscription.totalTokens,
                          planName: mySubscription.planName,
                          category: mySubscription.category,
                          frequency: mySubscription.frequency,
                        }
                      })}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 mx-auto"
                    >
                      <span>📱</span>
                      <span>Show Dynamic QR Code</span>
                    </button>
                    <p className="text-[11px] text-emerald-700">
                      Show this dynamic QR code to the mess staff at the counter to collect your meal!
                    </p>
                  </div>
                )}

                {/* ── ADVANCE SEAT RESERVATION & CUT-OFF TIMING ENGINE ── */}
                {mySubscription.status === "active" && mySubscription.remainingTokens > 0 ? (
                  <div className="space-y-4 pt-1">
                    
                    {/* SECTION 1: TODAY'S DINING STATUS */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center justify-between">
                        <span>Today's Counter Access ({todayStr})</span>
                        <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                          Advance Check
                        </span>
                      </span>

                      {(() => {
                        const todayBookings = (mySubscription.dailyRedemptions || []).filter(
                          (r) => r.date === todayStr && r.status !== "cancelled"
                        );

                        if (todayBookings.length > 0) {
                          return (
                            <div className="space-y-2">
                              {todayBookings.map((b, idx) => (
                                <div
                                  key={idx}
                                  className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-3 text-xs"
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                      <strong className="font-extrabold text-emerald-950">
                                        Confirmed Seat for Today
                                      </strong>
                                    </div>
                                    <p className="text-[11px] text-emerald-800 mt-0.5">
                                      {b.mealType} {b.timeSlot ? `• ${b.timeSlot}` : ""}
                                    </p>
                                    <span className="font-mono font-black text-emerald-900 text-xs">
                                      Token: {b.tokenCode}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setQrModal({
                                        isOpen: true,
                                        data: {
                                          token: b.tokenCode,
                                          tokenCode: b.tokenCode,
                                          passCode: mySubscription.passCode,
                                          subscriptionId: mySubscription._id,
                                          messId: mySubscription.messId?._id || mySubscription.messId || selectedMessId,
                                          messName: activeMessObj?.name || "Messta Partner Mess",
                                          userName: mySubscription.userName,
                                          mealType: b.mealType,
                                          remainingTokens: mySubscription.remainingTokens,
                                          totalTokens: mySubscription.totalTokens,
                                          planName: mySubscription.planName,
                                          category: mySubscription.category,
                                          frequency: mySubscription.frequency,
                                        },
                                      })
                                    }
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs"
                                  >
                                    <span>📱</span>
                                    <span>Counter QR</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          );
                        }

                        return (
                          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-300 text-amber-950 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 font-black text-[11px] text-amber-900">
                              <span>⚠️</span>
                              <span>No Advance Slot Booked for Today</span>
                            </div>
                            <p className="text-[10px] text-amber-800 leading-snug">
                              Kitchen rations were finalized yesterday night. Without an advance seat reservation, meal tokens cannot be generated on the spot. Please reserve your slot for <strong>Tomorrow</strong> below!
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* SECTION 2: LOCK TOMORROW'S ADVANCE SEAT */}
                    <div className="p-4 rounded-3xl bg-gradient-to-br from-gray-900 via-purple-950 to-indigo-950 text-white space-y-3.5 border border-purple-800/40 shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🔒</span>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded-full border border-purple-700/60 block w-max">
                              Universal Seat Locking
                            </span>
                            <h4 className="font-black text-sm text-white mt-0.5">
                              Lock Tomorrow's Seat ({tomorrowStr})
                            </h4>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-amber-400">
                          {mySubscription.remainingTokens} Tokens Left
                        </span>
                      </div>

                      {/* Cut-off Timers */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="p-2 rounded-xl bg-white/10 border border-white/15">
                          <span className="text-purple-300 block font-bold">Lunch Cut-Off</span>
                          <strong className="text-white">Tonight 10:00 PM</strong>
                        </div>
                        <div className="p-2 rounded-xl bg-white/10 border border-white/15">
                          <span className="text-teal-300 block font-bold">Dinner Cut-Off</span>
                          <strong className="text-white">Tomorrow 2:00 PM</strong>
                        </div>
                      </div>

                      {/* Meal Period Toggle */}
                      <div>
                        <label className="block text-[10px] font-bold text-purple-200 uppercase mb-1">
                          Select Meal Spread
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAdvanceMeal("lunch");
                              setAdvanceTimeSlot("12:30 PM – 01:00 PM");
                            }}
                            className={`py-2 px-3 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                              advanceMeal === "lunch"
                                ? "bg-amber-400 text-gray-950 shadow-sm"
                                : "bg-white/10 text-purple-200 hover:bg-white/15 border border-white/10"
                            }`}
                          >
                            <span>☀️</span>
                            <span>Lunch Spread</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAdvanceMeal("dinner");
                              setAdvanceTimeSlot("08:00 PM – 08:30 PM");
                            }}
                            className={`py-2 px-3 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                              advanceMeal === "dinner"
                                ? "bg-amber-400 text-gray-950 shadow-sm"
                                : "bg-white/10 text-purple-200 hover:bg-white/15 border border-white/10"
                            }`}
                          >
                            <span>🌙</span>
                            <span>Dinner Spread</span>
                          </button>
                        </div>
                      </div>

                      {/* Time Slot Selection */}
                      <div>
                        <label className="block text-[10px] font-bold text-purple-200 uppercase mb-1">
                          Select Preferred Time Slot
                        </label>
                        <select
                          value={advanceTimeSlot}
                          onChange={(e) => setAdvanceTimeSlot(e.target.value)}
                          className="w-full p-2.5 bg-white/10 border border-white/20 rounded-xl text-xs text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                        >
                          {advanceMeal === "lunch" ? (
                            <>
                              <option value="12:00 PM – 12:30 PM" className="text-gray-900">12:00 PM – 12:30 PM (Early Lunch)</option>
                              <option value="12:30 PM – 01:00 PM" className="text-gray-900">12:30 PM – 01:00 PM (Peak Lunch)</option>
                              <option value="01:00 PM – 01:30 PM" className="text-gray-900">01:00 PM – 01:30 PM (Mid Lunch)</option>
                              <option value="01:30 PM – 02:00 PM" className="text-gray-900">01:30 PM – 02:00 PM (Late Lunch)</option>
                            </>
                          ) : (
                            <>
                              <option value="07:30 PM – 08:00 PM" className="text-gray-900">07:30 PM – 08:00 PM (Early Dinner)</option>
                              <option value="08:00 PM – 08:30 PM" className="text-gray-900">08:00 PM – 08:30 PM (Peak Dinner)</option>
                              <option value="08:30 PM – 09:00 PM" className="text-gray-900">08:30 PM – 09:00 PM (Mid Dinner)</option>
                              <option value="09:00 PM – 09:30 PM" className="text-gray-900">09:00 PM – 09:30 PM (Late Dinner)</option>
                            </>
                          )}
                        </select>
                      </div>

                      {/* Lock Seat CTA */}
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleLockAdvanceSlot()}
                        className="w-full py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-gray-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {actionLoading ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-gray-950/40 border-t-gray-950 rounded-full animate-spin"></span>
                            <span>Locking Seat & Prepping Rations...</span>
                          </>
                        ) : (
                          <>
                            <span>🔒</span>
                            <span>Lock Tomorrow's Seat (1 Token • ₹0 Extra)</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl text-center">
                    All tokens consumed. Please purchase a new pass from the marketplace on the right!
                  </div>
                )}

                {/* Redemption History */}
                {mySubscription.dailyRedemptions?.length > 0 && (
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                      Recent Meal Redemptions
                    </span>
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {mySubscription.dailyRedemptions.slice(-5).reverse().map((r, i) => (
                        <div
                          key={i}
                          className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs flex justify-between items-center"
                        >
                          <div>
                            <span className="font-mono font-bold text-gray-900 block">{r.tokenCode}</span>
                            <span className="text-[10px] text-gray-500 font-medium">
                              {r.mealType} • {r.date}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setQrModal({
                                isOpen: true,
                                data: {
                                  token: r.tokenCode,
                                  tokenCode: r.tokenCode,
                                  passCode: mySubscription.passCode,
                                  subscriptionId: mySubscription._id,
                                  messId: mySubscription.messId?._id || mySubscription.messId || selectedMessId,
                                  messName: activeMessObj?.name || "Messta Partner Mess",
                                  userName: mySubscription.userName,
                                  mealType: r.mealType,
                                  bookingDate: r.date,
                                  remainingTokens: mySubscription.remainingTokens,
                                  totalTokens: mySubscription.totalTokens,
                                  planName: mySubscription.planName,
                                  category: mySubscription.category,
                                  frequency: mySubscription.frequency,
                                }
                              })}
                              className="px-2 py-0.5 bg-white hover:bg-gray-100 text-gray-700 text-[10px] font-bold rounded-lg border border-gray-200 shadow-2xs flex items-center gap-1 transition active:scale-95"
                              title="Show Dynamic QR Ticket"
                            >
                              <span>📱</span>
                              <span>QR</span>
                            </button>
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                r.status === "served"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {r.status || "pending"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 space-y-3">
                <span className="text-3xl">🎟️</span>
                <p className="text-sm font-bold text-gray-800">No Active Pass for this Mess</p>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Select a token pass from the marketplace to join the community and start dining on your schedule.
                </p>
              </div>
            )}
          </div>

          {/* COMMUNITY BROADCASTS FEED */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                  Community Feed
                </span>
                <h3 className="text-base font-black text-gray-900 mt-1">
                  Daily Notes & Specials
                </h3>
              </div>
              <span className="text-xs font-bold text-gray-400">
                {broadcasts.length} notes
              </span>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {broadcasts.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">
                  No announcements from mess owner today.
                </p>
              ) : (
                broadcasts.map((b) => (
                  <div key={b._id} className="p-3 bg-orange-50/50 rounded-2xl border border-orange-100 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-orange-600">
                        {b.tag || "Daily Special"}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">{b.date}</span>
                    </div>
                    <p className="font-semibold text-gray-800">{b.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: MEMBERSHIP MARKETPLACE (Browse and purchase meal packages) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                  Pass Marketplace
                </span>
                <h2 className="text-xl font-black text-gray-900 mt-1">
                  Choose Your Dining Plan
                </h2>
                <p className="text-xs text-gray-500">
                  Plans available for <strong className="text-gray-800">{activeMessObj?.name || "this outlet"}</strong>.
                </p>
              </div>

              <Link
                to="/mess"
                className="text-xs font-bold text-orange-600 hover:underline"
              >
                Browse Other Messes →
              </Link>
            </div>

            {loading ? (
              <p className="text-xs text-gray-400 py-12 text-center">Loading available passes...</p>
            ) : plans.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <span className="text-3xl">🍲</span>
                <p className="text-sm font-bold text-gray-700">No Membership Plans Published Yet</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  The owner of this mess has not published any token passes yet. You can still order single-meal slots or explore other messes!
                </p>
                <Link
                  to="/mess"
                  className="inline-block mt-3 px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-xl"
                >
                  Explore Other Outlets
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map((p) => {
                  const isCurrentActive = mySubscription?.planId === p._id && mySubscription?.status === "active";

                  return (
                    <div
                      key={p._id}
                      className="p-5 rounded-3xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-orange-300 hover:shadow-sm transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-orange-100 text-orange-700 rounded-md">
                              {p.category}
                            </span>
                            <h4 className="font-black text-base text-gray-900 mt-1">{p.planName}</h4>
                          </div>
                          <span className="text-xl font-black text-orange-600">₹{p.price}</span>
                        </div>

                        <p className="text-xs text-gray-500 leading-relaxed">
                          {p.description || "Comprehensive token package for college students."}
                        </p>

                        <div className="flex flex-wrap gap-2 text-[10px] font-extrabold pt-1">
                          <span className="px-2 py-0.5 bg-white border border-gray-200 rounded-md text-gray-700">
                            {p.frequency}
                          </span>
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md">
                            {p.totalTokens} Tokens
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                            ₹{(p.price / p.totalTokens).toFixed(0)} / meal
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSubscribe(p)}
                        disabled={actionLoading || isCurrentActive}
                        className={`w-full py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition shadow-xs ${
                          isCurrentActive
                            ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                            : "bg-orange-600 hover:bg-orange-700 text-white"
                        }`}
                      >
                        {isCurrentActive ? "Active Plan Enrolled ✓" : "Purchase Pass & Join"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── CENTRAL UPI QR PAYMENT MODAL FOR MEMBERSHIP PASS ── */}
      {selectedPlanForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  Universal UPI QR Payment
                </span>
                <h3 className="font-black text-gray-900 text-base mt-0.5">
                  Activate Membership Pass
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlanForPayment(null)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Price Box */}
            <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 text-center space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Total Membership Fee</span>
              <div className="text-3xl font-black text-purple-900 font-mono">
                ₹{selectedPlanForPayment.price}
              </div>
              <p className="text-[11px] text-gray-600 font-bold">
                {selectedPlanForPayment.planName} • {selectedPlanForPayment.totalTokens} Tokens ({selectedPlanForPayment.frequency})
              </p>
            </div>

            {/* Central QR Code Display */}
            <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-gray-200 text-center space-y-2">
              <span className="text-[11px] font-extrabold text-gray-700 block">
                Scan Universal Messta UPI QR
              </span>
              <div className="flex justify-center">
                <img
                  src={
                    paymentConfig.centralQrImageUrl ||
                    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi%3A%2F%2Fpay%3Fpa%3D${encodeURIComponent(paymentConfig.centralUpiId)}%26pn%3DMessta%2520Escrow%26am%3D${selectedPlanForPayment.price}%26cu%3DINR%26tn%3DMembership_${selectedPlanForPayment.planName.replace(/\s+/g, "_")}`
                  }
                  alt="Messta Central UPI QR"
                  className="w-44 h-44 rounded-xl border border-gray-200 p-2 bg-white shadow-xs"
                />
              </div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                GPay • PhonePe • Paytm • BHIM
              </div>
            </div>

            {/* UPI Phone Number & ID with Copy Buttons */}
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">UPI Mobile Number</span>
                  <strong className="text-gray-900 font-mono text-sm">{paymentConfig.centralUpiPhone}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(paymentConfig.centralUpiPhone);
                    setCopiedField("phone");
                    setTimeout(() => setCopiedField(""), 2000);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 font-bold text-[11px] rounded-lg border border-gray-200 transition cursor-pointer"
                >
                  {copiedField === "phone" ? "Copied! ✓" : "Copy Phone 📋"}
                </button>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Central UPI ID (VPA)</span>
                  <strong className="text-gray-900 font-mono text-xs">{paymentConfig.centralUpiId}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(paymentConfig.centralUpiId);
                    setCopiedField("upi");
                    setTimeout(() => setCopiedField(""), 2000);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 font-bold text-[11px] rounded-lg border border-gray-200 transition cursor-pointer"
                >
                  {copiedField === "upi" ? "Copied! ✓" : "Copy UPI 📋"}
                </button>
              </div>
            </div>

            {/* UTR Reference input */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                UPI Reference / UTR Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 428901928312"
                value={membershipUtr}
                onChange={(e) => setMembershipUtr(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleConfirmMembershipPayment}
              disabled={actionLoading}
              className="w-full py-3.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {actionLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                  <span>Activating Membership Pass...</span>
                </>
              ) : (
                <>
                  <span>✅ I Have Paid ₹{selectedPlanForPayment.price} — Activate Pass</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Dynamic QR Modal for Membership Pass & Daily Slot */}
      <DynamicQRModal
        isOpen={qrModal.isOpen}
        onClose={() => setQrModal({ isOpen: false, data: null })}
        type="membership"
        data={qrModal.data}
      />

    </div>
  );
}