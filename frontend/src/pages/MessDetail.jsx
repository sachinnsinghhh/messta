import { API_BASE_URL } from "../config/api";
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import BookingModal from "../components/bookingmodal";

const DEFAULT_SPREADS = [
  {
    id: "lunch",
    name: "Lunch Spread",
    icon: "☀️",
    timing: "11:30 AM – 02:30 PM",
    description: "Afternoon freshly cooked thalis & sides.",
  },
  {
    id: "dinner",
    name: "Dinner Spread",
    icon: "🌙",
    timing: "07:00 PM – 10:30 PM",
    description: "Evening freshly prepared dinner courses.",
  },
];

export default function MessDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const [mess, setMess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Step A: Selected Meal Section / Spread ID (e.g. "lunch", "dinner", "breakfast")
  const [selectedMeal, setSelectedMeal] = useState("lunch");

  // Step B: Selected Time-Slot Interval & Selected Thali
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [selectedThali, setSelectedThali] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Student's active pass status for smart indicator preview
  const [studentPass, setStudentPass] = useState(null);

  // Fetch Mess details
  useEffect(() => {
    let ignore = false;
    const fetchMessDetail = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/mess/${id}`);

        if (res.ok) {
          const result = await res.json();
          if (!ignore) setMess(result.data);
        } else {
          throw new Error("Mess listing not found. It may have been unlisted or removed.");
        }
      } catch (err) {
        if (!ignore) setError(err.message || "Mess listing not found");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchMessDetail();
    return () => {
      ignore = true;
    };
  }, [id]);

  // Fetch Student's active pass for this mess outlet (if logged in)
  useEffect(() => {
    let ignore = false;
    async function fetchPass() {
      if (!currentUser?.uid || !id) return;
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/subscriptions?messId=${id}&userId=${currentUser.uid}&status=active`
        );
        const data = await res.json();
        if (!ignore && data.success && data.data?.length > 0) {
          setStudentPass(data.data[0]);
        }
      } catch {
        // ignore
      }
    }
    fetchPass();
    return () => {
      ignore = true;
    };
  }, [currentUser?.uid, id]);

  // Available meal spreads for this mess (falling back to DEFAULT_SPREADS)
  const mealSpreads = useMemo(() => {
    if (mess?.mealSpreads && Array.isArray(mess.mealSpreads) && mess.mealSpreads.length > 0) {
      return mess.mealSpreads;
    }
    return DEFAULT_SPREADS;
  }, [mess]);

  // Ensure selectedMeal matches an available spread
  useEffect(() => {
    if (mealSpreads.length > 0 && !mealSpreads.some((s) => s.id === selectedMeal)) {
      setSelectedMeal(mealSpreads[0].id);
    }
  }, [mealSpreads, selectedMeal]);

  // Auto-select first available time slot interval when meal section changes
  useEffect(() => {
    if (!mess) return;
    const slots = (mess.timeSlots && mess.timeSlots[selectedMeal]) || [];
    if (slots.length > 0) {
      const firstAvailable = slots.find((s) => (s.maxCapacity - s.bookedCount) > 0) || slots[0];
      const timer = setTimeout(() => {
        setSelectedTimeSlot(firstAvailable);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedMeal, mess]);

  // Dynamic Spread Capacity Aggregator
  const getSpreadStats = (spreadId) => {
    const list = (mess?.timeSlots && mess.timeSlots[spreadId]) || [];
    const max = list.reduce((sum, s) => sum + Number(s.maxCapacity || 0), 0);
    const booked = list.reduce((sum, s) => sum + Number(s.bookedCount || 0), 0);
    const remaining = Math.max(0, max - booked);
    const fallback =
      spreadId === "dinner"
        ? (mess?.availableSlots?.dinner ?? 20)
        : (mess?.availableSlots?.lunch ?? 25);
    return { max, booked, remaining: max > 0 ? remaining : fallback };
  };

  // Filter available thalis for the selected meal section
  const availableThalis = useMemo(() => {
    if (!mess?.activeThalis || mess.activeThalis.length === 0) return [];
    return mess.activeThalis.filter((t) => {
      const type = (t.mealType || "").toLowerCase();
      const current = (selectedMeal || "").toLowerCase();
      return type === current || type === "both" || type === "all" || !type;
    });
  }, [mess, selectedMeal]);

  // Handle Trigger Booking Modal
  const handleInitiateBooking = (thali) => {
    if (!currentUser) {
      navigate("/login", { state: { from: location } });
      return;
    }
    setSelectedThali(thali);
    setIsModalOpen(true);
  };

  const reloadMess = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/mess/${id}`);
      if (res.ok) {
        const result = await res.json();
        setMess(result.data);
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-gray-500">Loading mess dining details...</p>
      </div>
    );
  }

  if (error || !mess) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-3">
        <span className="text-3xl">🍲</span>
        <h2 className="text-xl font-black text-gray-800">Mess Listing Not Found</h2>
        <p className="text-xs text-gray-500">This mess provider may no longer be active.</p>
        <Link
          to="/mess"
          className="px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-xl"
        >
          ← Back to All Messes
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/70 py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      
      {/* Back Button */}
      <Link
        to="/mess"
        className="inline-flex items-center text-xs font-bold text-gray-500 hover:text-orange-600 transition-colors"
      >
        ← Back to Pune Mess Directory
      </Link>

      <div className="bg-white rounded-3xl border border-gray-200/80 overflow-hidden shadow-xs space-y-6">
        
        {/* Hero Photo Banner */}
        <div className="relative h-64 sm:h-80 w-full bg-gray-100 overflow-hidden">
          <img
            src={mess.imageUrl || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800"}
            alt={mess.name}
            className="w-full h-full object-cover"
          />
          <span className="absolute top-4 left-4 bg-black/75 text-white text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full backdrop-blur-md">
            📍 {mess.locality}, {mess.city || "Pune"}
          </span>
          {(mess.isVerified || mess.verificationStatus === "verified") && (
            <span className="absolute bottom-4 left-4 bg-emerald-800/90 text-white text-xs font-black tracking-wide px-3 py-1.5 rounded-full backdrop-blur-md shadow-md flex items-center gap-1.5 border border-emerald-400/40">
              <span>🛡️</span>
              <span>FSSAI Certified & Verified Establishment</span>
            </span>
          )}
          <span className="absolute top-4 right-4 bg-orange-600 text-white text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow">
            {mess.cuisineType}
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Header Row: Title, Phone, Price & Membership CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-6">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  {mess.name}
                </h1>
                {(mess.isVerified || mess.verificationStatus === "verified") && (
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                    <svg className="w-3.5 h-3.5 fill-emerald-600 text-white" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>FSSAI Verified</span>
                  </span>
                )}
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {mess.isOpen ? "Open" : "Closed"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Contact: <strong className="text-gray-800">{mess.phone || "+91 98765 43210"}</strong> • Seating Capacity: <strong>{mess.seatingCapacity || 40} students</strong>
                {mess.complianceDocs?.fssaiNumber && (
                  <span className="ml-2 font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    FSSAI #{mess.complianceDocs.fssaiNumber}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to={`/membership?messId=${mess._id || mess.id}`}
                className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5"
              >
                <span>🎟️</span>
                <span>Membership Pass Vault</span>
              </Link>
            </div>
          </div>

          {/* Student's Active Plan Indicator Banner (if enrolled) */}
          {studentPass && (
            <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                  💳
                </span>
                <div>
                  <span className="font-extrabold text-emerald-950 block">
                    Active Pass: {studentPass.planName} ({studentPass.category.toUpperCase()})
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    Remaining: <strong className="text-emerald-950">{studentPass.remainingTokens} / {studentPass.totalTokens} Tokens</strong>
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-300">
                Token Pass Enrolled
              </span>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ── ADVANCE BOOKING & CUT-OFF TIMING ENGINE BANNER ── */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⏰</span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-800/80 px-2.5 py-0.5 rounded-full border border-purple-600/50">
                      Tomorrow-Only Advance Window
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700/50">
                      Zero Waste • Fresh Kitchen Prep
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight mt-1 text-white">
                    Advance Seat Booking Strictly for Tomorrow
                  </h3>
                </div>
              </div>
            </div>
            <p className="text-xs text-purple-200/80 leading-relaxed">
              To eliminate kitchen guesswork and ensure fresh hot food without food waste, all students (both Membership Passholders & Per-Plate Walk-ins) must reserve their seats one day in advance before the daily cut-off deadlines.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
              <div className="p-3 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-purple-300 font-bold block uppercase">Tomorrow's Lunch</span>
                  <span className="font-extrabold text-white text-xs">Closes 10:00 PM Tonight</span>
                </div>
                <span className="text-[10px] bg-purple-800/90 text-purple-200 font-bold px-2.5 py-1 rounded-full border border-purple-600/40">
                  Night-before lock
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-teal-300 font-bold block uppercase">Tomorrow's Dinner</span>
                  <span className="font-extrabold text-white text-xs">Closes 02:00 PM Tomorrow</span>
                </div>
                <span className="text-[10px] bg-teal-900/90 text-teal-200 font-bold px-2.5 py-1 rounded-full border border-teal-600/40">
                  Afternoon lock
                </span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ── STEP A: CHOOSE MEAL SPREAD (LUNCH / DINNER / BREAKFAST) ── */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                Step A
              </span>
              <h2 className="text-lg font-black text-gray-900 mt-1">
                Choose Meal Spread
              </h2>
              <p className="text-xs text-gray-500">
                Select your preferred operational window to inspect live capacity quotas.
              </p>
            </div>

            <div className={`grid grid-cols-1 ${mealSpreads.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-4`}>
              {mealSpreads.map((spread) => {
                const stats = getSpreadStats(spread.id);
                const isSelected = selectedMeal === spread.id;
                return (
                  <div
                    key={spread.id}
                    onClick={() => setSelectedMeal(spread.id)}
                    className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50/40 shadow-xs ring-2 ring-orange-500/20"
                        : "border-gray-200 bg-gray-50/70 hover:border-gray-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{spread.icon || "🍽️"}</span>
                        <h3 className="font-black text-sm text-gray-900">{spread.name}</h3>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          stats.remaining === 0
                            ? "bg-red-100 text-red-700"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {stats.remaining === 0 ? "Full" : `${stats.remaining} Slots Left`}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                      {spread.timing ? `${spread.timing} • ` : ""}
                      {spread.description || "Freshly prepared dining spread."}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ── STEP B: SELECT TIME SLOT & THALI ── */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="space-y-6 pt-2">
            
            {/* Part 1: Select Precise Time Slot Interval */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                    Step B • Part 1
                  </span>
                  <h3 className="text-sm font-black text-gray-900 mt-1 uppercase tracking-wider">
                    Select Your Dining Time Slot Interval
                  </h3>
                </div>
                <span className="text-[10px] font-black text-orange-600 uppercase bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                  {(mealSpreads.find((s) => s.id === selectedMeal)?.name || selectedMeal).toUpperCase()}
                </span>
              </div>

              {/* Time Slots Carousel/Grid */}
              {((mess.timeSlots && mess.timeSlots[selectedMeal]) || []).length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-500">
                  Flexible counter dining • No strict interval restrictions for this spread.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {((mess.timeSlots && mess.timeSlots[selectedMeal]) || []).map((slot) => {
                  const remaining = Math.max(0, slot.maxCapacity - slot.bookedCount);
                  const isSelected = selectedTimeSlot?.id === slot.id || selectedTimeSlot?.timeWindow === slot.timeWindow;
                  const isFull = remaining === 0;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={isFull}
                      onClick={() => setSelectedTimeSlot(slot)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? "bg-gray-900 text-white border-gray-900 shadow-xs ring-2 ring-gray-900/20"
                          : isFull
                          ? "bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed"
                          : "bg-gray-50 border-gray-200 hover:border-orange-400 hover:bg-white text-gray-800"
                      }`}
                    >
                      <span className="font-extrabold text-xs block leading-tight">
                        {slot.timeWindow}
                      </span>
                      <span
                        className={`text-[10px] font-bold block pt-1 ${
                          isSelected
                            ? "text-orange-400"
                            : isFull
                            ? "text-red-500 font-black"
                            : "text-emerald-700"
                        }`}
                      >
                        {isFull ? "Sold Out ✕" : `${remaining} seats left`}
                      </span>
                    </button>
                  );
                })}
                </div>
              )}
            </div>

            {/* Part 2: Select Thali Option (with clear pricing & tier coverage indicator) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                    Step B • Part 2
                  </span>
                  <h3 className="text-sm font-black text-gray-900 mt-1 uppercase tracking-wider">
                    Browse Available Daily Thalis ({availableThalis.length})
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-gray-500">
                  Select a thali to reserve
                </span>
              </div>

              {availableThalis.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-3xl border border-gray-200 space-y-2">
                  <span className="text-3xl">🍲</span>
                  <p className="text-xs text-gray-500 font-bold">
                    No custom thalis published for this window today.
                  </p>
                  <p className="text-[11px] text-gray-400">
                    You can still reserve a standard single meal ticket below!
                  </p>
                  <button
                    type="button"
                    onClick={() => handleInitiateBooking({
                      name: "Standard Daily Meal",
                      category: "Veg",
                      sellingPrice: mess.pricePerMeal || 80,
                    })}
                    className="mt-2 px-5 py-2 bg-orange-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs"
                  >
                    Reserve Standard Meal (₹{mess.pricePerMeal || 80})
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {availableThalis.map((thali) => {
                    // Check if student's pass covers this thali
                    let coversThali = false;
                    let passReason = "";

                    const allowRedeem = thali.allowMembershipRedemption !== false;
                    const allowDirect = thali.allowDirectPurchase !== false;

                    if (!allowRedeem) {
                      coversThali = false;
                      passReason = "Direct plate only (Tokens not applicable)";
                    } else if (studentPass && studentPass.remainingTokens > 0) {
                      const subCat = (studentPass.category || "veg").toLowerCase();
                      const thaliCat = (thali.category || "veg").toLowerCase();
                      const eligibleTiers = (thali.eligibleTiers || []).map((t) => t.toLowerCase());
                      const subPlanId = studentPass.planId ? String(studentPass.planId).toLowerCase() : "";
                      const subPlanName = (studentPass.planName || "").toLowerCase();

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
                        coversThali = true;
                        passReason = `Covered by your ${studentPass.planName}`;
                      } else if (subCat.includes("combo") || eligibleTiers.includes("combo")) {
                        coversThali = true;
                        passReason = "Combo Pass covers all thalis";
                      } else if ((thaliCat === "veg" || thaliCat === "lite") && (subCat.includes("veg") || subCat.includes("lite"))) {
                        coversThali = true;
                        passReason = "100% Covered by Veg Pass";
                      } else if (thaliCat === "non-veg" && subCat.includes("non_veg")) {
                        coversThali = true;
                        passReason = "100% Covered by Non-Veg Pass";
                      } else if (eligibleTiers.includes(subCat) || eligibleTiers.includes("all")) {
                        coversThali = true;
                        passReason = "Covered by Pass Tier Mapping";
                      } else {
                        coversThali = false;
                        passReason = allowDirect ? "Out-of-Plan (Requires direct payment)" : "Plan mismatch (Pass required)";
                      }
                    }

                    return (
                      <div
                        key={thali.id || thali._id}
                        className="bg-white p-5 rounded-3xl border border-gray-200 hover:border-orange-400 hover:shadow-sm transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                    thali.category === "Non-Veg"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  {thali.category}
                                </span>
                                {allowDirect && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                                    🛍️ Walk-In
                                  </span>
                                )}
                                {allowRedeem && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    🎟️ 1 Token Pass
                                  </span>
                                )}
                              </div>
                              <h4 className="font-black text-base text-gray-900 mt-1">{thali.name}</h4>
                            </div>
                            <span className="text-xl font-black text-orange-600">₹{thali.sellingPrice}</span>
                          </div>

                          <p className="text-xs text-gray-500 leading-relaxed font-medium">
                            {thali.description || thali.items?.map((i) => i.name).join(", ")}
                          </p>

                          {/* Live Smart Membership Match Indicator */}
                          {studentPass ? (
                            coversThali ? (
                              <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-[10px] text-emerald-900 font-bold flex items-center gap-1.5">
                                <span>🟢</span>
                                <span>{passReason || "1 Token covers this meal (₹0 Extra)"}</span>
                              </div>
                            ) : (
                              <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-[10px] text-amber-900 font-bold flex items-center gap-1.5">
                                <span>🟠</span>
                                <span>{passReason || `Out-of-Plan: Requires ₹${thali.sellingPrice} payment`}</span>
                              </div>
                            )
                          ) : (
                            <div className="p-2 bg-gray-50 rounded-xl border border-gray-200 text-[10px] text-gray-600 font-bold flex items-center gap-1.5">
                              <span>💳</span>
                              <span>
                                {allowDirect && allowRedeem
                                  ? "Walk-in Plate or 1 Token Pass Eligible"
                                  : allowDirect
                                  ? "Direct Walk-in Purchase Available"
                                  : "Exclusive to Active Subscribers"}
                              </span>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleInitiateBooking(thali)}
                          className="w-full py-2.5 bg-gray-900 hover:bg-black text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                        >
                          <span>{coversThali ? "Redeem 1 Token" : `Select & Book (₹${thali.sellingPrice})`}</span>
                          <span>→</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* ── STEP C: SMART DECISION ENGINE CHECKOUT MODAL ── */}
      {isModalOpen && (
        <BookingModal
          mess={mess}
          selectedMeal={selectedMeal}
          selectedTimeSlot={selectedTimeSlot}
          selectedThali={selectedThali}
          onClose={() => setIsModalOpen(false)}
          onBookingSuccess={reloadMess}
        />
      )}

    </div>
  );
}