import { API_BASE_URL } from "../config/api";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import DynamicQRModal from "../components/DynamicQRModal";

export default function StudentMembership() {
  const { currentUser } = useAuth();
  const [messes, setMesses] = useState([]);
  const [selectedMessId, setSelectedMessId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const queryMessId = params.get("messId");
    if (queryMessId) return queryMessId;
    return localStorage.getItem("messta_activeMessId") || "";
  });

  const [mySubscription, setMySubscription] = useState(null);
  const [otherPass, setOtherPass] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: "", type: "" });
  const [generatedCode, setGeneratedCode] = useState("");
  const [qrModal, setQrModal] = useState({ isOpen: false, data: null });

  // Advance Slot Booking & Cut-Off Engine States
  const todayDateObj = new Date();
  const todayStr = todayDateObj.toISOString().split("T")[0];
  const tomorrowDateObj = new Date(todayDateObj);
  tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
  const tomorrowStr = tomorrowDateObj.toISOString().split("T")[0];

  const [advanceMeal, setAdvanceMeal] = useState("lunch");
  const [advanceTimeSlot, setAdvanceTimeSlot] = useState("12:30 PM – 01:00 PM");

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

  // Check active passes for user across all outlets (to auto-select or suggest)
  useEffect(() => {
    if (!currentUser?.uid) return;
    let ignore = false;

    async function checkUserActivePasses() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/subscriptions?userId=${currentUser.uid}&status=active`);
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore && data.success && data.data?.length > 0) {
          const pass = data.data[0];
          const passMessId = pass.messId?._id || pass.messId;
          const urlParams = new URLSearchParams(window.location.search);
          const hasQuery = urlParams.get("messId");

          if (!hasQuery && !localStorage.getItem("messta_activeMessId") && passMessId) {
            setSelectedMessId(passMessId);
          } else if (passMessId && passMessId !== selectedMessId) {
            setOtherPass(pass);
          } else {
            setOtherPass(null);
          }
        }
      } catch {
        // ignore
      }
    }

    checkUserActivePasses();
    return () => {
      ignore = true;
    };
  }, [currentUser?.uid, selectedMessId]);

  // 2. Fetch subscription and broadcasts for selected mess outlet
  useEffect(() => {
    if (!selectedMessId) return;
    localStorage.setItem("messta_activeMessId", selectedMessId);
    let ignore = false;

    async function loadStudentData() {
      try {
        setLoading(true);

        const fetchBroadcasts = fetch(`${API_BASE_URL}/api/subscriptions/broadcasts/${selectedMessId}`).then((r) => r.json());
        
        let fetchSub = Promise.resolve({ data: [] });
        if (currentUser?.uid) {
          fetchSub = fetch(`${API_BASE_URL}/api/subscriptions?messId=${selectedMessId}&userId=${currentUser.uid}&status=active`).then((r) => r.json());
        }

        const [bRes, subRes] = await Promise.all([fetchBroadcasts, fetchSub]);

        if (!ignore) {
          if (bRes.success) setBroadcasts(bRes.data || []);

          if (subRes.success && subRes.data?.length > 0) {
            setMySubscription(subRes.data[0]);
          } else {
            if (currentUser?.uid) {
              const allSubRes = await fetch(`${API_BASE_URL}/api/subscriptions?messId=${selectedMessId}&userId=${currentUser.uid}`).then((r) => r.json());
              if (!ignore && allSubRes.success && allSubRes.data?.length > 0) {
                setMySubscription(allSubRes.data[0]);
              } else {
                setMySubscription(null);
              }
            } else {
              setMySubscription(null);
            }
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
  }, [selectedMessId, currentUser?.uid]);

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
              Enjoy flexible, transparent dining across Pune messes. Track your remaining tokens, reserve tomorrow&rsquo;s meals, and show dynamic counter QR codes.
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

      {/* Switcher Helper: If user has an active pass at another mess */}
      {otherPass && otherPass.messId && (
        <div className="p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 rounded-2xl border border-purple-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">💡</span>
            <span className="text-purple-950 font-medium">
              You have an active pass (<strong className="font-bold">{otherPass.planName}</strong>) at another mess.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedMessId(otherPass.messId?._id || otherPass.messId)}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-extrabold rounded-xl transition cursor-pointer self-start sm:self-auto"
          >
            Switch to Active Pass Mess →
          </button>
        </div>
      )}

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

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-gray-200/80 shadow-xs text-center space-y-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-gray-600">Loading student membership pass and tokens...</p>
        </div>
      ) : mySubscription ? (
        /* ── BALANCED 2-COLUMN LAYOUT: DIGITAL PASS & SEAT RESERVATION ── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ════ LEFT COLUMN: ACTIVE PASS CARD & REDEMPTIONS ════ */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* DIGITAL PASS CARD */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs space-y-5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md">
                  Active Digital Pass
                </span>
                <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
                  {mySubscription.passCode}
                </span>
              </div>

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
                    className={`text-[9px] uppercase font-black px-2.5 py-0.5 rounded-full ${
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
                  <div className="w-full bg-gray-700/80 h-2.5 rounded-full overflow-hidden">
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
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg border border-white/20 transition flex items-center gap-1 shadow-2xs backdrop-blur-xs cursor-pointer"
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
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                  >
                    <span>📱</span>
                    <span>Show Dynamic QR Code</span>
                  </button>
                  <p className="text-[11px] text-emerald-700">
                    Show this dynamic QR code to the mess staff at the counter to collect your meal!
                  </p>
                </div>
              )}

              {/* ── TODAY'S COUNTER ACCESS STATUS ── */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center justify-between">
                  <span>Today&rsquo;s Counter Access ({todayStr})</span>
                  <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                    Live Check
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
                        Kitchen rations were finalized yesterday night. Without an advance seat reservation, meal tokens cannot be generated on the spot. Please reserve your slot for <strong>Tomorrow</strong> using the reservation box!
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* ── RECENT MEAL REDEMPTIONS ── */}
              {mySubscription.dailyRedemptions?.length > 0 && (
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                    Recent Meal Redemptions
                  </span>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
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
                            className="px-2 py-0.5 bg-white hover:bg-gray-100 text-gray-700 text-[10px] font-bold rounded-lg border border-gray-200 shadow-2xs flex items-center gap-1 transition active:scale-95 cursor-pointer"
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

          </div>

          {/* ════ RIGHT COLUMN: ADVANCE RESERVATION ENGINE & COMMUNITY BROADCASTS ════ */}
          <div className="lg:col-span-6 space-y-6">

            {/* ── ADVANCE SEAT RESERVATION & CUT-OFF TIMING (HUMANIZED) ── */}
            {mySubscription.status === "active" && mySubscription.remainingTokens > 0 ? (
              <div className="p-6 rounded-2xl bg-white text-gray-900 space-y-4 border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-base text-gray-900">
                      Reserve Tomorrow&rsquo;s Meal
                    </h4>
                    <span className="text-xs text-gray-500 block mt-0.5">
                      Date: {tomorrowStr}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-green-800 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg">
                    {mySubscription.remainingTokens} Tokens Left
                  </span>
                </div>

                {/* Cut-off Timers */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-gray-500 block text-[10px] uppercase font-semibold">Lunch Cut-off</span>
                    <strong className="text-gray-900 text-xs">Tonight 10:00 PM</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-gray-500 block text-[10px] uppercase font-semibold">Dinner Cut-off</span>
                    <strong className="text-gray-900 text-xs">Tomorrow 2:00 PM</strong>
                  </div>
                </div>

                {/* Meal Period Toggle */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Select Meal
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAdvanceMeal("lunch");
                        setAdvanceTimeSlot("12:30 PM – 01:00 PM");
                      }}
                      className={`py-2.5 px-3 rounded-xl font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        advanceMeal === "lunch"
                          ? "bg-orange-600 text-white shadow-xs"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <span>Lunch</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdvanceMeal("dinner");
                        setAdvanceTimeSlot("08:00 PM – 08:30 PM");
                      }}
                      className={`py-2.5 px-3 rounded-xl font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        advanceMeal === "dinner"
                          ? "bg-orange-600 text-white shadow-xs"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <span>Dinner</span>
                    </button>
                  </div>
                </div>

                {/* Time Slot Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Preferred Time Slot
                  </label>
                  <select
                    value={advanceTimeSlot}
                    onChange={(e) => setAdvanceTimeSlot(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer"
                  >
                    {advanceMeal === "lunch" ? (
                      <>
                        <option value="12:00 PM – 12:30 PM">12:00 PM – 12:30 PM (Early Lunch)</option>
                        <option value="12:30 PM – 01:00 PM">12:30 PM – 01:00 PM (Peak Lunch)</option>
                        <option value="01:00 PM – 01:30 PM">01:00 PM – 01:30 PM (Mid Lunch)</option>
                        <option value="01:30 PM – 02:00 PM">01:30 PM – 02:00 PM (Late Lunch)</option>
                      </>
                    ) : (
                      <>
                        <option value="07:30 PM – 08:00 PM">07:30 PM – 08:00 PM (Early Dinner)</option>
                        <option value="08:00 PM – 08:30 PM">08:00 PM – 08:30 PM (Peak Dinner)</option>
                        <option value="08:30 PM – 09:00 PM">08:30 PM – 09:00 PM (Mid Dinner)</option>
                        <option value="09:00 PM – 09:30 PM">09:00 PM – 09:30 PM (Late Dinner)</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Lock Seat CTA */}
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleLockAdvanceSlot()}
                  className="w-full py-3 bg-green-700 hover:bg-green-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                      <span>Reserving Seat...</span>
                    </>
                  ) : (
                    <span>Reserve Seat (1 Token)</span>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl text-center space-y-2">
                <span className="text-2xl block">🎟️</span>
                <p className="font-bold">All tokens consumed on this membership pass.</p>
                {selectedMessId && (
                  <Link
                    to={`/mess/${selectedMessId}#passes`}
                    className="inline-block px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-xl hover:bg-orange-700 transition"
                  >
                    Renew or Purchase Pass on Mess Page →
                  </Link>
                )}
              </div>
            )}

            {/* ── COMMUNITY BROADCASTS FEED ── */}
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

            {/* ── QUICK OUTLET LINK ── */}
            {activeMessObj && (
              <div className="p-4 bg-white rounded-2xl border border-gray-200/80 flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Current Outlet</span>
                  <strong className="text-gray-900 font-bold">{activeMessObj.name}</strong>
                  <span className="text-gray-500 block text-[11px]">{activeMessObj.locality || activeMessObj.address}</span>
                </div>
                <Link
                  to={`/mess/${activeMessObj._id || activeMessObj.id}`}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition shrink-0"
                >
                  View Mess Page →
                </Link>
              </div>
            )}

          </div>

        </div>
      ) : (
        /* ── WHEN USER HAS NO ACTIVE PASS FOR THIS MESS ── */
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-200/80 shadow-xs text-center max-w-2xl mx-auto space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-orange-100 text-orange-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
              🎟️
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-md">
                No Active Pass
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900">
                No Active Pass for {activeMessObj?.name || "this Mess"}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                You don&rsquo;t have an active membership pass for this outlet. All dining passes can be checked and purchased directly with each mess!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {selectedMessId && (
                <Link
                  to={`/mess/${selectedMessId}#passes`}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>View {activeMessObj?.name || "Mess"} Passes & Menu</span>
                  <span>→</span>
                </Link>
              )}
              <Link
                to="/mess"
                className="w-full sm:w-auto px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                Browse All Messes
              </Link>
            </div>
          </div>

          {/* If announcements exist for this mess, student can still read them */}
          {broadcasts.length > 0 && (
            <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                    Community Feed
                  </span>
                  <h3 className="text-base font-black text-gray-900 mt-1">
                    Daily Notes from {activeMessObj?.name || "Mess"}
                  </h3>
                </div>
                <span className="text-xs font-bold text-gray-400">
                  {broadcasts.length} notes
                </span>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {broadcasts.map((b) => (
                  <div key={b._id} className="p-3 bg-orange-50/50 rounded-2xl border border-orange-100 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-orange-600">
                        {b.tag || "Daily Special"}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">{b.date}</span>
                    </div>
                    <p className="font-semibold text-gray-800">{b.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
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
