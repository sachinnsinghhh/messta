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

const formatTime12h = (t) => {
  if (!t) return "";
  if (t.includes("AM") || t.includes("PM")) return t;
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return t;
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m || "00"} ${ampm}`;
};

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

  // Step 2: Selected Thali
  const [selectedThali, setSelectedThali] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Student's active pass status for smart indicator preview
  const [studentPass, setStudentPass] = useState(null);

  // Published Membership Plans for this mess outlet
  const [messPlans, setMessPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);

  // Central Payment & UPI States for purchasing membership pass
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);
  const [membershipUtr, setMembershipUtr] = useState("");
  const [copiedField, setCopiedField] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState({
    centralUpiPhone: "9876543210",
    centralUpiId: "messta.central@hdfcbank",
    centralQrImageUrl: "",
    businessName: "Messta Digital Food Escrow",
  });

  // Fetch Public Payment Config
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

  // Fetch published membership plans for this mess
  useEffect(() => {
    if (!id) return;
    let ignore = false;
    async function fetchPlans() {
      try {
        setPlansLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/subscriptions/plans/${id}`);
        const data = await res.json();
        if (!ignore && data.success) {
          setMessPlans(data.data || []);
        }
      } catch {
        // ignore
      } finally {
        if (!ignore) setPlansLoading(false);
      }
    }
    fetchPlans();
    return () => {
      ignore = true;
    };
  }, [id]);

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

  // Handle Pass Purchase Modal Trigger
  const handleSubscribePlan = (plan) => {
    if (!currentUser) {
      navigate("/login", { state: { from: location } });
      return;
    }
    setSelectedPlanForPayment(plan);
    setMembershipUtr("");
  };

  // Confirm Pass UPI Payment & Activate Pass
  const handleConfirmMembershipPayment = async () => {
    if (!selectedPlanForPayment || !currentUser) return;
    setSubmittingPayment(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.uid,
          userName: currentUser.displayName || currentUser.email.split("@")[0],
          userEmail: currentUser.email,
          userPhone: currentUser.phoneNumber || "+91 98765 43210",
          messId: id,
          planId: selectedPlanForPayment._id,
          planName: selectedPlanForPayment.planName,
          category: selectedPlanForPayment.category,
          frequency: selectedPlanForPayment.frequency,
          mealsPerDay: selectedPlanForPayment.mealsPerDay || 2,
          totalTokens: selectedPlanForPayment.totalTokens,
          price: Number(selectedPlanForPayment.price) + 150,
          utrNumber: membershipUtr,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStudentPass(data.data);
        setSelectedPlanForPayment(null);
        alert(`🎉 Congratulations! Your pass '${selectedPlanForPayment.planName}' is now active with ${selectedPlanForPayment.totalTokens} tokens. View it anytime in the Student Pass vault!`);
      } else {
        alert(data.message || "Failed to activate pass.");
      }
    } catch {
      alert("Server error activating pass.");
    } finally {
      setSubmittingPayment(false);
    }
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
          
          {/* Header Row: Title, Phone & Seating */}
          <div className="border-b border-gray-100 pb-6">
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
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-300">
                  Token Pass Enrolled
                </span>
                <Link
                  to={`/membership?messId=${mess._id || mess.id}`}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold uppercase rounded-lg transition flex items-center gap-1 shadow-2xs"
                >
                  <span>📱 Pass Vault</span>
                </Link>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ── ADVANCE BOOKING & CUT-OFF TIMING CARD ── */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center text-lg shrink-0">
                  🗓️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                      Advance Booking
                    </span>
                    <span className="text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-md">
                      Tomorrow Only
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-stone-900 tracking-tight mt-0.5">
                    Reserve Your Meal for Tomorrow
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-stone-500 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200 self-start sm:self-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Fresh kitchen preparation</span>
              </div>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              Meals are prepared fresh daily based on advance reservations. Please book before the daily cut-off times:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/90 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">☀️</span>
                  <div>
                    <span className="font-semibold text-stone-900 block text-xs">Tomorrow&apos;s Lunch</span>
                    <span className="text-[11px] text-stone-500">
                      Closes tonight at {formatTime12h(mess?.advanceBookingConfig?.lunchCutOffTime || "22:00")}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white text-stone-700 border border-stone-200 shadow-2xs">
                  Night before
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/90 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🌙</span>
                  <div>
                    <span className="font-semibold text-stone-900 block text-xs">Tomorrow&apos;s Dinner</span>
                    <span className="text-[11px] text-stone-500">
                      Closes tomorrow at {formatTime12h(mess?.advanceBookingConfig?.dinnerCutOffTime || "14:00")}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white text-stone-700 border border-stone-200 shadow-2xs">
                  Same day afternoon
                </span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ── STEP 1: CHOOSE MEAL SESSION (LUNCH / DINNER) ── */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                Step 1
              </span>
              <h2 className="text-lg font-bold text-stone-900 tracking-tight mt-1.5">
                Choose Meal Session
              </h2>
              <p className="text-xs text-stone-500">
                Select your dining session to view today&apos;s published thalis and capacity.
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
                    className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-orange-600 bg-orange-50/40 shadow-xs ring-1 ring-orange-500"
                        : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{spread.icon || "🍽️"}</span>
                        <div>
                          <h3 className="font-bold text-sm text-stone-900">{spread.name}</h3>
                          <span className="text-[11px] text-stone-500 font-medium">{spread.timing}</span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          stats.remaining === 0
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {stats.remaining === 0 ? "Full" : `${stats.remaining} Left`}
                      </span>
                    </div>
                    {spread.description && (
                      <p className="text-xs text-stone-500 leading-relaxed line-clamp-2 mt-1">
                        {spread.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ── STEP 2: SELECT THALI / MEAL OPTION ── */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                  Step 2
                </span>
                <h3 className="text-base font-black text-gray-900 mt-1 uppercase tracking-wider">
                  Browse Available Daily Thalis ({availableThalis.length})
                </h3>
              </div>
              <span className="text-[10px] font-black text-orange-600 uppercase bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                {(mealSpreads.find((s) => s.id === selectedMeal)?.name || selectedMeal).toUpperCase()}
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
                      sellingPrice: mess.pricePerMeal || 65,
                    })}
                    className="mt-2 px-5 py-2 bg-orange-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs"
                  >
                    Reserve Standard Meal (₹{mess.pricePerMeal || 65})
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
                            <div className="text-right">
                              <span className="text-xl font-black text-orange-600 block">₹{thali.sellingPrice}</span>
                              <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                Save ~35% vs Walk-In
                              </span>
                            </div>
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
                          <span>{coversThali ? "Redeem 1 Token (₹0)" : `Book Advance Plate (₹${thali.sellingPrice})`}</span>
                          <span>→</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ── PUBLISHED MEMBERSHIP PASSES & DINING PLANS ── */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div id="passes" className="p-6 sm:p-7 rounded-3xl bg-white border border-gray-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md">
                  Membership Passes
                </span>
                <h3 className="text-xl font-black text-gray-900 mt-1">
                  Choose Your Dining Plan
                </h3>
                <p className="text-xs text-gray-500">
                  Published monthly token passes for <strong className="text-gray-800">{mess.name}</strong>.
                </p>
              </div>

              {studentPass && (
                <Link
                  to={`/membership?messId=${mess._id || mess.id}`}
                  className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1"
                >
                  <span>View Pass in Student Vault 📱</span>
                </Link>
              )}
            </div>

            {plansLoading ? (
              <p className="text-xs text-gray-400 py-8 text-center">Loading passes...</p>
            ) : messPlans.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <span className="text-3xl">🍲</span>
                <p className="text-sm font-bold text-gray-700">No Membership Plans Published Yet</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  The owner has not published any monthly token passes yet. You can still book single-meal advance slots above!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {messPlans.map((p) => {
                  const isCurrentActive = studentPass?.planId === p._id && studentPass?.status === "active";

                  return (
                    <div
                      key={p._id}
                      className="p-5 rounded-3xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-orange-300 hover:shadow-sm transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-orange-100 text-orange-700 rounded-md">
                                {p.category}
                              </span>
                              <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-300">
                                🛡️ Zero-Waste Token Pass
                              </span>
                            </div>
                            <h4 className="font-black text-base text-gray-900 mt-1">{p.planName}</h4>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-black text-orange-600 block">₹{Number(p.price) + 150}</span>
                            <span className="text-[9px] text-gray-400 font-semibold block">₹{p.price} mess + ₹150 pass fee</span>
                          </div>
                        </div>

                        <p className="text-xs text-gray-500 leading-relaxed font-medium">
                          {p.description || "Comprehensive token package for college students with zero-waste pause protection."}
                        </p>

                        <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200/80 text-[10px] text-emerald-900 font-semibold flex items-center gap-1.5">
                          <span>✨</span>
                          <span>Never waste money on missed days: tokens never expire!</span>
                        </div>

                        <div className="flex flex-wrap gap-2 text-[10px] font-extrabold pt-1">
                          <span className="px-2 py-0.5 bg-white border border-gray-200 rounded-md text-gray-700">
                            {p.frequency}
                          </span>
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md">
                            {p.totalTokens} Tokens
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                            ₹{((Number(p.price) + 150) / p.totalTokens).toFixed(0)} / meal
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSubscribePlan(p)}
                        disabled={submittingPayment || isCurrentActive}
                        className={`w-full py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition shadow-xs cursor-pointer ${
                          isCurrentActive
                            ? "bg-emerald-100 text-emerald-800 cursor-default"
                            : "bg-orange-600 hover:bg-orange-700 text-white active:scale-95"
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

      {/* ── STEP 3: CHECKOUT MODAL ── */}
      {isModalOpen && (
        <BookingModal
          mess={mess}
          selectedMeal={selectedMeal}
          selectedThali={selectedThali}
          onClose={() => setIsModalOpen(false)}
          onBookingSuccess={reloadMess}
        />
      )}

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
                className="text-gray-400 hover:text-gray-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Price Box */}
            <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 text-center space-y-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Zero-Waste Pass Total</span>
              <div className="text-3xl font-black text-purple-900 font-mono">
                ₹{Number(selectedPlanForPayment.price) + 150}
              </div>
              <p className="text-[11px] text-gray-600 font-bold">
                {selectedPlanForPayment.planName} • {selectedPlanForPayment.totalTokens} Tokens ({selectedPlanForPayment.frequency})
              </p>
              <div className="pt-2 border-t border-purple-200/60 text-[10px] text-gray-600 flex justify-between">
                <span>Mess Monthly Rate: <strong>₹{selectedPlanForPayment.price}</strong></span>
                <span>Messta Token Guarantee: <strong>₹150</strong></span>
              </div>
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
                    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi%3A%2F%2Fpay%3Fpa%3D${encodeURIComponent(paymentConfig.centralUpiId)}%26pn%3DMessta%2520Escrow%26am%3D${Number(selectedPlanForPayment.price) + 150}%26cu%3DINR%26tn%3DMembership_${selectedPlanForPayment.planName.replace(/\s+/g, "_")}`
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
              disabled={submittingPayment}
              className="w-full py-3.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {submittingPayment ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                  <span>Activating Membership Pass...</span>
                </>
              ) : (
                <>
                  <span>✅ I Have Paid ₹{Number(selectedPlanForPayment.price) + 150} — Activate Pass</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}