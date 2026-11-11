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
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 text-stone-100">
      
      {/* ── TOP HERO HEADER & OUTLET SELECTION ── */}
      <div className="bg-stone-900/90 rounded-2xl p-6 sm:p-8 border border-stone-800 shadow-xl space-y-6 card-minimal">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider bg-stone-950 text-amber-400 px-2.5 py-1 rounded-md border border-stone-800">
              PASS VAULT // STUDENT DINING
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              Membership Pass & Token Vault
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 max-w-xl font-mono">
              Track active token balances, lock next-day meal slots before 22:00 IST, and present digital dynamic boarding passes.
            </p>
          </div>

          {/* Outlet Switcher for Student */}
          <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-1.5 font-mono">
            <label className="block text-[10px] uppercase text-stone-400">
              SELECT MESS OUTLET:
            </label>
            <select
              value={selectedMessId}
              onChange={(e) => setSelectedMessId(e.target.value)}
              aria-label="Select Mess Outlet"
              className="bg-stone-900 text-stone-200 text-xs font-mono py-2 px-3 rounded-lg border border-stone-800 focus:outline-none cursor-pointer"
            >
              {messes.map((m) => (
                <option key={m._id || m.id} value={m._id || m.id}>
                  {m.name} ({m.locality})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Switcher Helper: If user has an active pass at another mess */}
      {otherPass && otherPass.messId && (
        <div className="p-3.5 bg-stone-900/80 rounded-xl border border-stone-800 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">ℹ</span>
            <span className="text-stone-300">
              You have an active pass (<strong className="text-white">{otherPass.planName}</strong>) at another mess.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedMessId(otherPass.messId?._id || otherPass.messId)}
            className="px-3 py-1.5 bg-stone-100 hover:bg-white text-stone-950 text-[11px] font-semibold rounded-lg transition cursor-pointer self-start sm:self-auto btn-minimal"
          >
            Switch to Active Pass Mess →
          </button>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback.text && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
              : "bg-rose-950/60 border-rose-800 text-rose-300"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback({ text: "", type: "" })}
            className="text-stone-400 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-stone-900/60 rounded-2xl p-12 border border-stone-800 text-center space-y-3 font-mono">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-stone-400">Loading student pass vault & token balances...</p>
        </div>
      ) : mySubscription ? (
        /* ── BALANCED 2-COLUMN LAYOUT: DIGITAL PASS & SEAT RESERVATION ── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ════ LEFT COLUMN: ACTIVE PASS CARD & REDEMPTIONS ════ */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* DIGITAL PASS CARD */}
            <div className="bg-stone-900/90 rounded-2xl p-6 sm:p-7 border border-stone-800 shadow-xl space-y-5 card-minimal">
              <div className="flex justify-between items-center font-mono">
                <span className="text-[10px] uppercase tracking-wider text-amber-400 bg-stone-950 px-2.5 py-1 rounded-md border border-stone-800">
                  ACTIVE DIGITAL PASS
                </span>
                <span className="text-[10px] text-stone-400 bg-stone-950 px-2.5 py-1 rounded-md border border-stone-800">
                  {mySubscription.passCode}
                </span>
              </div>

              {/* Visual Holographic Digital Card */}
              <div className="relative overflow-hidden rounded-xl bg-stone-950 text-white p-5 shadow-md border border-stone-800 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-amber-400 tracking-wider">
                      {activeMessObj?.name || "Messta Partner Outlet"}
                    </span>
                    <h3 className="text-lg font-bold tracking-tight mt-0.5 text-white">
                      {mySubscription.planName}
                    </h3>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-stone-900 text-stone-300 rounded border border-stone-800">
                      {mySubscription.category} • {mySubscription.frequency}
                    </span>
                  </div>

                  <span
                    className={`text-[9px] uppercase font-mono px-2.5 py-0.5 rounded-md border ${
                      mySubscription.status === "active"
                        ? "bg-emerald-950/60 text-emerald-400 border-emerald-800"
                        : "bg-rose-950/60 text-rose-400 border-rose-800"
                    }`}
                  >
                    {mySubscription.status}
                  </span>
                </div>

                {/* Token Burn-down Progress Meter */}
                <div className="space-y-1.5 pt-2 font-mono">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-400 text-[10px] uppercase tracking-wider">REMAINING BALANCE</span>
                    <span className="text-amber-400 font-semibold">
                      {mySubscription.remainingTokens} / {mySubscription.totalTokens} TOKENS
                    </span>
                  </div>
                  <div className="w-full bg-stone-900 h-1.5 rounded-full overflow-hidden border border-stone-800">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{
                        width: `${(mySubscription.remainingTokens / mySubscription.totalTokens) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="flex justify-between items-end pt-2 text-[10px] text-stone-400 border-t border-stone-800 font-mono">
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-stone-500">CARDHOLDER</span>
                    <span className="font-semibold text-stone-200">{mySubscription.userName}</span>
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
                      className="px-2.5 py-1 bg-stone-100 hover:bg-white text-stone-950 font-semibold text-xs rounded-md transition flex items-center gap-1 cursor-pointer btn-minimal font-mono"
                      title="Show Dynamic Pass QR"
                    >
                      <span>PASS QR</span>
                    </button>
                    <span className="font-mono text-stone-400 font-semibold">{mySubscription.passCode}</span>
                  </div>
                </div>
              </div>

              {/* Instant Counter Token Result Banner */}
              {generatedCode && (
                <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl text-center space-y-2 font-mono">
                  <span className="text-[10px] uppercase text-amber-400 tracking-wider">
                    COUNTER CODE GENERATED
                  </span>
                  <p className="text-2xl font-mono font-bold text-white tracking-widest">
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
                    className="px-4 py-2 bg-stone-100 hover:bg-white text-stone-950 font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer btn-minimal font-mono"
                  >
                    <span>SHOW DYNAMIC QR CODE</span>
                  </button>
                  <p className="text-[10px] text-stone-400 font-mono">
                    Present dynamic QR at the counter to redeem.
                  </p>
                </div>
              )}

              {/* ── TODAY'S COUNTER ACCESS STATUS ── */}
              <div className="space-y-2 pt-2 border-t border-stone-800 font-mono">
                <span className="text-[10px] uppercase text-stone-400 tracking-wider flex items-center justify-between">
                  <span>TODAY&rsquo;S ACCESS // {todayStr}</span>
                  <span className="text-[9px] bg-stone-950 text-stone-400 border border-stone-800 px-2 py-0.5 rounded">
                    LIVE STATUS
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
                            className="p-3.5 bg-stone-950 border border-stone-800 rounded-xl flex items-center justify-between gap-3 text-xs font-mono"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <strong className="font-semibold text-white">
                                  CONFIRMED SEAT
                                </strong>
                              </div>
                              <p className="text-[11px] text-stone-400 mt-0.5">
                                {b.mealType} {b.timeSlot ? `• ${b.timeSlot}` : ""}
                              </p>
                              <span className="font-mono text-amber-400 text-xs">
                                TOKEN: {b.tokenCode}
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
                              className="px-3 py-1.5 bg-stone-100 hover:bg-white text-stone-950 font-semibold text-[10px] uppercase rounded-lg transition cursor-pointer btn-minimal"
                            >
                              <span>COUNTER QR</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-stone-400 text-xs space-y-1 font-mono">
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-semibold">
                        <span>!</span>
                        <span>No Advance Slot Booked for Today</span>
                      </div>
                      <p className="text-[10px] text-stone-400 leading-snug">
                        Kitchen rations were finalized yesterday at 22:00 IST. Please reserve tomorrow&rsquo;s slot using the advance seat locker.
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* ── RECENT MEAL REDEMPTIONS ── */}
              {mySubscription.dailyRedemptions?.length > 0 && (
                <div className="pt-2 border-t border-stone-800 space-y-2 font-mono">
                  <span className="text-[10px] uppercase tracking-wider text-stone-500 block">
                    RECENT REDEMPTIONS
                  </span>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {mySubscription.dailyRedemptions.slice(-5).reverse().map((r, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-stone-950 rounded-xl border border-stone-800 text-xs flex justify-between items-center"
                      >
                        <div>
                          <span className="font-mono text-stone-200 block">{r.tokenCode}</span>
                          <span className="text-[10px] text-stone-500 font-mono">
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
                            className="px-2 py-0.5 bg-stone-900 hover:bg-stone-800 text-stone-200 text-[10px] rounded border border-stone-800 flex items-center gap-1 transition cursor-pointer btn-minimal"
                            title="Show Dynamic QR Ticket"
                          >
                            <span>QR</span>
                          </button>
                          <span
                            className={`text-[9px] uppercase px-2 py-0.5 rounded border ${
                              r.status === "served"
                                ? "bg-emerald-950/60 text-emerald-400 border-emerald-800"
                                : "bg-amber-950/60 text-amber-400 border-amber-800"
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

            {/* ── ADVANCE SEAT RESERVATION & CUT-OFF TIMING ENGINE ── */}
            {mySubscription.status === "active" && mySubscription.remainingTokens > 0 ? (
              <div className="p-6 rounded-2xl bg-stone-900/90 text-white space-y-4 border border-stone-800 shadow-xl card-minimal font-mono">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-amber-400 bg-stone-950 px-2.5 py-0.5 rounded border border-stone-800 block w-max">
                      ADVANCE SEAT LOCKER
                    </span>
                    <h4 className="font-bold text-base text-white mt-1">
                      Lock Tomorrow&rsquo;s Slot ({tomorrowStr})
                    </h4>
                  </div>
                  <span className="text-xs font-mono text-amber-400 bg-stone-950 border border-stone-800 px-2.5 py-1 rounded-lg">
                    {mySubscription.remainingTokens} TOKENS LEFT
                  </span>
                </div>

                {/* Cut-off Timers */}
                <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
                  <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
                    <span className="text-stone-400 block text-[9px] uppercase">LUNCH CUT-OFF</span>
                    <strong className="text-amber-400">TONIGHT 22:00 IST</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-950 border border-stone-800">
                    <span className="text-stone-400 block text-[9px] uppercase">DINNER CUT-OFF</span>
                    <strong className="text-stone-200">TOMORROW 14:00 IST</strong>
                  </div>
                </div>

                {/* Meal Period Toggle */}
                <div>
                  <label className="block text-[10px] text-stone-400 uppercase mb-1.5">
                    SELECT MEAL SPREAD
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAdvanceMeal("lunch");
                        setAdvanceTimeSlot("12:30 PM – 01:00 PM");
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-mono uppercase transition cursor-pointer flex items-center justify-center gap-1.5 btn-minimal ${
                        advanceMeal === "lunch"
                          ? "bg-stone-100 text-stone-950 font-semibold"
                          : "bg-stone-950 text-stone-400 hover:text-white border border-stone-800"
                      }`}
                    >
                      <span>LUNCH SPREAD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdvanceMeal("dinner");
                        setAdvanceTimeSlot("08:00 PM – 08:30 PM");
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-mono uppercase transition cursor-pointer flex items-center justify-center gap-1.5 btn-minimal ${
                        advanceMeal === "dinner"
                          ? "bg-stone-100 text-stone-950 font-semibold"
                          : "bg-stone-950 text-stone-400 hover:text-white border border-stone-800"
                      }`}
                    >
                      <span>DINNER SPREAD</span>
                    </button>
                  </div>
                </div>

                {/* Time Slot Selection */}
                <div>
                  <label className="block text-[10px] text-stone-400 uppercase mb-1.5">
                    SELECT TIME WINDOW
                  </label>
                  <select
                    value={advanceTimeSlot}
                    onChange={(e) => setAdvanceTimeSlot(e.target.value)}
                    className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 font-mono focus:outline-none cursor-pointer"
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
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs font-mono uppercase tracking-wider rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 btn-minimal"
                >
                  {actionLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-stone-950/40 border-t-stone-950 rounded-full animate-spin"></span>
                      <span>Locking Seat...</span>
                    </>
                  ) : (
                    <span>Confirm Reservation (1 Token • ₹0.00)</span>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-5 bg-stone-900/90 border border-stone-800 text-stone-400 text-xs rounded-2xl text-center space-y-2 card-minimal font-mono">
                <span className="text-xl block">∅</span>
                <p className="font-semibold text-white">All tokens consumed on this pass.</p>
                {selectedMessId && (
                  <Link
                    to={`/mess/${selectedMessId}#passes`}
                    className="inline-block px-4 py-2 bg-stone-100 hover:bg-white text-stone-950 font-semibold text-xs rounded-lg transition btn-minimal"
                  >
                    Renew or Purchase Pass →
                  </Link>
                )}
              </div>
            )}

            {/* ── COMMUNITY BROADCASTS FEED ── */}
            <div className="bg-stone-900/90 rounded-2xl p-6 sm:p-7 border border-stone-800 shadow-xl space-y-4 card-minimal font-mono">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-amber-400 bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
                    MESS DISPATCH
                  </span>
                  <h3 className="text-base font-bold text-white mt-1">
                    Daily Notes & Specials
                  </h3>
                </div>
                <span className="text-xs text-stone-500 font-mono">
                  {broadcasts.length} NOTES
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {broadcasts.length === 0 ? (
                  <p className="text-xs text-stone-500 py-6 text-center font-mono">
                    No announcements from mess owner today.
                  </p>
                ) : (
                  broadcasts.map((b) => (
                    <div key={b._id} className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono uppercase text-amber-400">
                          {b.tag || "Daily Special"}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">{b.date}</span>
                      </div>
                      <p className="text-stone-300 font-sans">{b.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ── QUICK OUTLET LINK ── */}
            {activeMessObj && (
              <div className="p-4 bg-stone-900/90 rounded-xl border border-stone-800 flex items-center justify-between gap-3 text-xs font-mono card-minimal">
                <div>
                  <span className="text-[10px] uppercase text-stone-500 block">CURRENT OUTLET</span>
                  <strong className="text-white font-semibold">{activeMessObj.name}</strong>
                  <span className="text-stone-400 block text-[11px]">{activeMessObj.locality || activeMessObj.address}</span>
                </div>
                <Link
                  to={`/mess/${activeMessObj._id || activeMessObj.id}`}
                  className="px-3.5 py-2 bg-stone-950 hover:bg-stone-800 text-stone-200 text-xs rounded-lg border border-stone-800 transition shrink-0 btn-minimal"
                >
                  View Outlet →
                </Link>
              </div>
            )}

          </div>

        </div>
      ) : (
        /* ── WHEN USER HAS NO ACTIVE PASS FOR THIS MESS ── */
        <div className="space-y-6">
          <div className="bg-stone-900/90 rounded-2xl p-8 sm:p-12 border border-stone-800 shadow-xl text-center max-w-2xl mx-auto space-y-5 card-minimal font-mono">
            <div className="w-12 h-12 rounded-xl bg-stone-950 border border-stone-800 text-amber-400 flex items-center justify-center text-xl mx-auto">
              ∅
            </div>
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-amber-400 bg-stone-950 px-2.5 py-0.5 rounded border border-stone-800">
                NO ACTIVE PASS
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                No Active Pass for {activeMessObj?.name || "this Mess"}
              </h3>
              <p className="text-xs sm:text-sm text-stone-400 max-w-md mx-auto leading-relaxed">
                You don&rsquo;t have an active membership pass for this outlet. All dining passes can be explored and purchased directly with each mess.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {selectedMessId && (
                <Link
                  to={`/mess/${selectedMessId}#passes`}
                  className="w-full sm:w-auto px-5 py-2.5 bg-stone-100 hover:bg-white text-stone-950 font-semibold text-xs uppercase tracking-wider rounded-lg transition btn-minimal flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>View {activeMessObj?.name || "Mess"} Passes</span>
                  <span>→</span>
                </Link>
              )}
              <Link
                to="/mess"
                className="w-full sm:w-auto px-4 py-2.5 bg-stone-950 hover:bg-stone-800 text-stone-300 font-semibold text-xs uppercase tracking-wider rounded-lg border border-stone-800 transition cursor-pointer btn-minimal"
              >
                Browse Outlets
              </Link>
            </div>
          </div>

          {/* If announcements exist for this mess, student can still read them */}
          {broadcasts.length > 0 && (
            <div className="max-w-2xl mx-auto bg-stone-900/90 rounded-2xl p-6 sm:p-7 border border-stone-800 shadow-xl space-y-4 card-minimal font-mono">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-amber-400 bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
                    MESS DISPATCH
                  </span>
                  <h3 className="text-base font-bold text-white mt-1">
                    Daily Notes from {activeMessObj?.name || "Mess"}
                  </h3>
                </div>
                <span className="text-xs text-stone-500 font-mono">
                  {broadcasts.length} NOTES
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {broadcasts.map((b) => (
                  <div key={b._id} className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono uppercase text-amber-400">
                        {b.tag || "Daily Special"}
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">{b.date}</span>
                    </div>
                    <p className="text-stone-300 font-sans">{b.message}</p>
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
