import { API_BASE_URL } from "../config/api";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { useActiveMess } from "../context/useActiveMess";

export default function OwnerMeals() {
  const { currentUser } = useAuth();
  const {
    allMesses,
    activeMessId,
    activeMess,
    loadingMesses,
    switchMess,
    refreshMesses,
  } = useActiveMess(currentUser);

  // Active Management Tab: "thalis" (Step B & C) | "slots" (Step A) | "overview"
  const [activeTab, setActiveTab] = useState("slots");

  const DEFAULT_SPREADS = useMemo(
    () => [
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
    ],
    []
  );

  // ── STEP A: MEAL SPREADS & TIME-SLOT CONFIGURATION STATES ──
  const [mealSpreads, setMealSpreads] = useState(DEFAULT_SPREADS);
  const [timeSlots, setTimeSlots] = useState({
    lunch: [
      { id: "slot_l1", timeWindow: "12:00 PM – 12:30 PM", maxCapacity: 30, bookedCount: 8 },
      { id: "slot_l2", timeWindow: "12:30 PM – 01:00 PM", maxCapacity: 30, bookedCount: 16 },
      { id: "slot_l3", timeWindow: "01:00 PM – 01:30 PM", maxCapacity: 30, bookedCount: 5 },
      { id: "slot_l4", timeWindow: "01:30 PM – 02:00 PM", maxCapacity: 25, bookedCount: 0 },
    ],
    dinner: [
      { id: "slot_d1", timeWindow: "07:30 PM – 08:00 PM", maxCapacity: 30, bookedCount: 4 },
      { id: "slot_d2", timeWindow: "08:00 PM – 08:30 PM", maxCapacity: 30, bookedCount: 12 },
      { id: "slot_d3", timeWindow: "08:30 PM – 09:00 PM", maxCapacity: 30, bookedCount: 6 },
      { id: "slot_d4", timeWindow: "09:00 PM – 09:30 PM", maxCapacity: 25, bookedCount: 0 },
    ],
  });

  // Add Time Slot Modal States
  const [newSlotPeriod, setNewSlotPeriod] = useState("lunch");
  const [newSlotStart, setNewSlotStart] = useState("12:00 PM");
  const [newSlotEnd, setNewSlotEnd] = useState("12:30 PM");
  const [newSlotCapacity, setNewSlotCapacity] = useState(30);
  const [showAddSlotForm, setShowAddSlotForm] = useState(false);

  // Add Custom Meal Spread Modal States (e.g., Breakfast, Snacks)
  const [showAddSpreadModal, setShowAddSpreadModal] = useState(false);
  const [newSpreadName, setNewSpreadName] = useState("Morning Breakfast");
  const [newSpreadIcon, setNewSpreadIcon] = useState("🌅");
  const [newSpreadTiming, setNewSpreadTiming] = useState("07:30 AM – 10:30 AM");
  const [newSpreadDescription, setNewSpreadDescription] = useState("Poha, Upma, Idli-Vada, Parathas & Hot Chai");
  const [newSpreadCapacity, setNewSpreadCapacity] = useState(30);

  // Sync activeMess timeSlots and mealSpreads whenever activeMess changes
  useEffect(() => {
    if (!activeMess) return;
    const timer = setTimeout(() => {
      if (activeMess.mealSpreads && activeMess.mealSpreads.length > 0) {
        setMealSpreads(activeMess.mealSpreads);
      }
      if (activeMess.timeSlots) {
        setTimeSlots(activeMess.timeSlots);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [activeMess]);

  // ── STEP B & C: THALI PUBLISHING & MEMBERSHIP TIER MAPPING STATES ──
  const [thaliName, setThaliName] = useState("Paneer Deluxe Thali");
  const [mealCategory, setMealCategory] = useState("Veg"); // "Veg", "Non-Veg", "Lite", "Special", "Combo"
  const [mealSlot, setMealSlot] = useState("both"); // "lunch", "dinner", "both"
  const [sellingPrice, setSellingPrice] = useState(65);
  const [description, setDescription] = useState("Shahi Paneer butter masala, 3 tawa rotis, dal tadka, jeera rice, gulab jamun, salad & pickle.");
  const [eligibleTiers, setEligibleTiers] = useState(["veg", "lite", "combo", "all"]);

  // Publishing Channels (Separate Walk-In Thali vs Membership Plans)
  const [allowDirectPurchase, setAllowDirectPurchase] = useState(true);
  const [allowMembershipRedemption, setAllowMembershipRedemption] = useState(true);

  // Dynamic Price Formulation: (cost of monthly membership / total tokens) * 1.3
  const [benchmarkPlanId, setBenchmarkPlanId] = useState("auto");
  const [customMonthlyCost, setCustomMonthlyCost] = useState(3000);
  const [customTotalTokens, setCustomTotalTokens] = useState(60);

  // ── ADVANCE KITCHEN HEADCOUNT & RATION PREP SHEET STATES ──
  const [headcountData, setHeadcountData] = useState(null);
  const [loadingHeadcount, setLoadingHeadcount] = useState(false);
  const [headcountDate, setHeadcountDate] = useState("");
  const [copiedRations, setCopiedRations] = useState(false);
  const [showCutOffModal, setShowCutOffModal] = useState(false);
  const [editLunchCutOff, setEditLunchCutOff] = useState("22:00");
  const [editDinnerCutOff, setEditDinnerCutOff] = useState("14:00");
  const [editDinnerDay, setEditDinnerDay] = useState("same_day");
  const [savingCutOff, setSavingCutOff] = useState(false);

  const fetchHeadcountSheet = async (dateParam) => {
    if (!activeMessId) return;
    try {
      setLoadingHeadcount(true);
      const query = dateParam ? `?date=${dateParam}` : (headcountDate ? `?date=${headcountDate}` : "");
      const res = await fetch(`${API_BASE_URL}/api/mess/${activeMessId}/advance-headcount${query}`);
      const data = await res.json();
      if (data.success) {
        setHeadcountData(data);
        if (!headcountDate) setHeadcountDate(data.targetDate);
        if (activeMess?.advanceBookingConfig) {
          setEditLunchCutOff(activeMess.advanceBookingConfig.lunchCutOffTime || "22:00");
          setEditDinnerCutOff(activeMess.advanceBookingConfig.dinnerCutOffTime || "14:00");
          setEditDinnerDay(activeMess.advanceBookingConfig.dinnerCutOffDay || "same_day");
        }
      }
    } catch (err) {
      console.warn("Could not load advance headcount sheet:", err);
    } finally {
      setLoadingHeadcount(false);
    }
  };

  useEffect(() => {
    if (activeMessId) {
      fetchHeadcountSheet();
    }
  }, [activeMessId, activeTab]);

  const handleSaveCutOffConfig = async () => {
    if (!activeMessId) return;
    try {
      setSavingCutOff(true);
      const res = await fetch(`${API_BASE_URL}/api/mess/${activeMessId}/advance-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lunchCutOffTime: editLunchCutOff,
          dinnerCutOffTime: editDinnerCutOff,
          dinnerCutOffDay: editDinnerDay,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ text: "Advance cut-off times updated successfully! ✓", type: "success" });
        setShowCutOffModal(false);
        fetchHeadcountSheet();
      } else {
        setFeedback({ text: data.message || "Failed to update cut-offs", type: "error" });
      }
    } catch {
      setFeedback({ text: "Server error updating cut-offs", type: "error" });
    } finally {
      setSavingCutOff(false);
    }
  };

  const copyGroceryList = () => {
    if (!headcountData?.rations) return;
    const header = `📋 MESSTA KITCHEN PREP SHEET — ${headcountData.targetDateLabel} (${headcountData.targetDate})\nConfirmed Headcount: ${headcountData.headcount?.total || 0} Diners (Lunch: ${headcountData.headcount?.lunchCount || 0}, Dinner: ${headcountData.headcount?.dinnerCount || 0})\n\nGROCERY RATIONS REQUIRED:\n`;
    const body = headcountData.rations
      .map((r) => `• ${r.item}: ${r.totalKg} ${r.unit} (${r.notes})`)
      .join("\n");
    const fullText = `${header}${body}\n\nGenerated automatically by Messta Advance Booking Engine.`;
    navigator.clipboard.writeText(fullText);
    setCopiedRations(true);
    setTimeout(() => setCopiedRations(false), 2500);
  };

  const getWhatsAppShareUrl = () => {
    if (!headcountData?.rations) return "#";
    const header = `*📋 MESSTA KITCHEN PREP SHEET — ${headcountData.targetDateLabel}*\n*Confirmed Headcount:* ${headcountData.headcount?.total || 0} Diners (Lunch: ${headcountData.headcount?.lunchCount || 0}, Dinner: ${headcountData.headcount?.dinnerCount || 0})\n\n*GROCERY RATIONS REQUIRED:*\n`;
    const body = headcountData.rations
      .map((r) => `• *${r.item}:* ${r.totalKg} ${r.unit}`)
      .join("\n");
    const fullText = encodeURIComponent(`${header}${body}\n\n_Auto-generated by Messta Zero-Waste Engine_`);
    return `https://wa.me/?text=${fullText}`;
  };

  // Published Membership Plans fetched from the active mess outlet (Step C: Crucial Link)
  const [publishedPlans, setPublishedPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Fetch real published membership plans for the selected mess branch
  useEffect(() => {
    if (!activeMessId) return;
    let isCancelled = false;

    async function fetchOutletPlans() {
      try {
        setLoadingPlans(true);
        const res = await fetch(`${API_BASE_URL}/api/subscriptions/plans/${activeMessId}`);
        const data = await res.json();
        if (!isCancelled && data.success) {
          const plansList = data.data || [];
          setPublishedPlans(plansList);
          // If eligibleTiers only has default categories, auto-include matching published veg/combo plans
          if (plansList.length > 0) {
            setEligibleTiers((prev) => {
              const vegAndComboNames = plansList
                .filter((p) => p.category === "veg" || p.category === "combo")
                .flatMap((p) => [p._id, p.planName]);
              return Array.from(new Set([...prev, ...vegAndComboNames]));
            });
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn("Failed fetching mess outlet plans:", err.message);
        }
      } finally {
        if (!isCancelled) {
          setLoadingPlans(false);
        }
      }
    }

    fetchOutletPlans();
    return () => {
      isCancelled = true;
    };
  }, [activeMessId]);

  // ── DYNAMIC PRICING FORMULATION ENGINE ──
  // Formula: (cost of monthly membership / total number of tokens) * 1.3
  const benchmarkDetails = useMemo(() => {
    let monthlyCost = Number(customMonthlyCost) || 3000;
    let totalTokens = Number(customTotalTokens) || 60;
    let planTitle = "Custom Benchmark";

    if (benchmarkPlanId === "auto" && publishedPlans.length > 0) {
      const catLower = (mealCategory || "").toLowerCase();
      const match =
        publishedPlans.find((p) => {
          if (catLower.includes("non-veg") || catLower.includes("non_veg")) return p.category === "non_veg";
          if (catLower.includes("lite")) return p.category === "lite" || p.category === "veg";
          return p.category === "veg" || p.category === "combo";
        }) || publishedPlans[0];

      if (match) {
        monthlyCost = Number(match.price) || 3000;
        totalTokens = Number(match.totalTokens) || 60;
        planTitle = match.planName;
      }
    } else if (benchmarkPlanId !== "custom" && benchmarkPlanId !== "auto") {
      const match = publishedPlans.find((p) => p._id === benchmarkPlanId);
      if (match) {
        monthlyCost = Number(match.price) || 3000;
        totalTokens = Number(match.totalTokens) || 60;
        planTitle = match.planName;
      }
    }

    const baseCostPerToken = totalTokens > 0 ? monthlyCost / totalTokens : 0;
    const formulaSellingPrice = Math.round(baseCostPerToken * 1.3);

    return {
      monthlyCost,
      totalTokens,
      planTitle,
      baseCostPerToken: Math.round(baseCostPerToken * 10) / 10,
      formulaSellingPrice,
    };
  }, [benchmarkPlanId, publishedPlans, mealCategory, customMonthlyCost, customTotalTokens]);

  // Local state for optimistic updates
  const [localBookmarks, setLocalBookmarks] = useState(null);
  const [localActives, setLocalActives] = useState(null);

  const bookmarkedMeals = useMemo(() => {
    return localBookmarks ?? (activeMess?.bookmarkedThalis || []);
  }, [localBookmarks, activeMess]);

  const activePublishedMeals = useMemo(() => {
    return localActives ?? (activeMess?.activeThalis || []);
  }, [localActives, activeMess]);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: "", type: "" });

  // ── DYNAMIC CAPACITY AGGREGATE CALCULATIONS (For Any Spread: Lunch, Dinner, Breakfast, etc.) ──
  const getSpreadStats = (spreadId) => {
    const list = timeSlots[spreadId] || [];
    const max = list.reduce((sum, s) => sum + Number(s.maxCapacity || 0), 0);
    const booked = list.reduce((sum, s) => sum + Number(s.bookedCount || 0), 0);
    return { max, booked, remaining: Math.max(0, max - booked) };
  };

  const totalSlotsCount = useMemo(() => {
    return Object.values(timeSlots).reduce(
      (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
      0
    );
  }, [timeSlots]);

  // ── STEP A OPERATIONS: SAVE TIME-SLOT INTERVALS & SPREADS ──
  const handleSaveTimeSlots = async () => {
    if (!activeMessId) return;
    setLoading(true);
    setFeedback({ text: "", type: "" });

    try {
      const res = await fetch(`${API_BASE_URL}/api/mess/${activeMessId}/time-slots`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeSlots,
          mealSpreads,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          text: "Time-slot intervals, capacity quotas, and meal spreads saved successfully! ⏱️",
          type: "success",
        });
        refreshMesses();
      } else {
        setFeedback({ text: data.message || "Failed to update slots.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Network error saving time slots.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // ── CREATE NEW MEAL SPREAD (e.g. Breakfast, Snacks, Midnight) ──
  const handleCreateSpread = async (e) => {
    e.preventDefault();
    if (!newSpreadName.trim() || !activeMessId) return;

    const spreadKey = newSpreadName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
    const spreadId = spreadKey || `spread_${Date.now().toString().slice(-4)}`;

    if (mealSpreads.some((s) => s.id === spreadId)) {
      setFeedback({ text: `A meal spread named "${newSpreadName}" already exists.`, type: "error" });
      return;
    }

    const newSpread = {
      id: spreadId,
      name: newSpreadName.trim(),
      icon: newSpreadIcon || "🍽️",
      timing: newSpreadTiming || "Flexible Hours",
      description: newSpreadDescription || `Freshly prepared ${newSpreadName.trim()} courses & sides.`,
    };

    const starterSlots = [
      {
        id: `slot_${spreadId}_1`,
        timeWindow: newSpreadTiming.includes("–")
          ? `${newSpreadTiming.split("–")[0].trim()} – ${newSpreadTiming.split("–")[1]?.trim() || "09:00 AM"}`
          : "08:00 AM – 08:30 AM",
        maxCapacity: Number(newSpreadCapacity) || 30,
        bookedCount: 0,
      },
      {
        id: `slot_${spreadId}_2`,
        timeWindow: "08:30 AM – 09:00 AM",
        maxCapacity: Number(newSpreadCapacity) || 30,
        bookedCount: 0,
      },
    ];

    const updatedSpreads = [...mealSpreads, newSpread];
    const updatedSlots = { ...timeSlots, [spreadId]: starterSlots };

    setMealSpreads(updatedSpreads);
    setTimeSlots(updatedSlots);
    setShowAddSpreadModal(false);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/mess/${activeMessId}/time-slots`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeSlots: updatedSlots,
          mealSpreads: updatedSpreads,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          text: `"${newSpread.name}" added successfully! Configure its intervals and thalis below. 🚀`,
          type: "success",
        });
        refreshMesses();
      } else {
        setFeedback({ text: data.message || "Failed saving spread.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Network error saving spread.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // ── REMOVE MEAL SPREAD ──
  const handleDeleteSpread = async (spreadId, spreadName) => {
    if (mealSpreads.length <= 1) {
      setFeedback({ text: "You must keep at least one active meal spread.", type: "error" });
      return;
    }
    if (!window.confirm(`Are you sure you want to remove "${spreadName}" and its time slots?`)) return;

    const updatedSpreads = mealSpreads.filter((s) => s.id !== spreadId);
    const updatedSlots = { ...timeSlots };
    delete updatedSlots[spreadId];

    setMealSpreads(updatedSpreads);
    setTimeSlots(updatedSlots);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/mess/${activeMessId}/time-slots`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeSlots: updatedSlots,
          mealSpreads: updatedSpreads,
        }),
      });
      if (res.ok) {
        setFeedback({ text: `Removed "${spreadName}".`, type: "success" });
        refreshMesses();
      }
    } catch {
      setFeedback({ text: "Error removing spread.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlotInterval = () => {
    const windowString = `${newSlotStart} – ${newSlotEnd}`;
    const newSlot = {
      id: `slot_${newSlotPeriod[0]}_${Date.now()}`,
      timeWindow: windowString,
      maxCapacity: Number(newSlotCapacity) || 30,
      bookedCount: 0,
    };

    setTimeSlots((prev) => ({
      ...prev,
      [newSlotPeriod]: [...(prev[newSlotPeriod] || []), newSlot],
    }));

    setShowAddSlotForm(false);
    setFeedback({
      text: `Added new ${newSlotPeriod.toUpperCase()} interval: ${windowString} (Max ${newSlotCapacity} seats). Click "Save Slots Schedule" to persist!`,
      type: "success",
    });
  };

  const handleRemoveSlotInterval = (period, slotId) => {
    setTimeSlots((prev) => ({
      ...prev,
      [period]: prev[period].filter((s) => s.id !== slotId),
    }));
  };

  const handleCapacityChange = (period, slotId, newCapacity) => {
    const capNum = Math.max(1, Number(newCapacity) || 1);
    setTimeSlots((prev) => ({
      ...prev,
      [period]: prev[period].map((s) => (s.id === slotId ? { ...s, maxCapacity: capNum } : s)),
    }));
  };

  // ── STEP B & C OPERATIONS: DYNAMIC PRICING ALGORITHM & CHANNELS ──
  // Formula: (cost of monthly membership / total number of tokens) * 1.3
  const handleCalculatePrice = () => {
    const { monthlyCost, totalTokens, baseCostPerToken, formulaSellingPrice, planTitle } = benchmarkDetails;
    setSellingPrice(formulaSellingPrice);
    setFeedback({
      text: `⚡ Generated Selling Price ₹${formulaSellingPrice}: (${planTitle} ₹${monthlyCost} monthly ÷ ${totalTokens} tokens = ₹${baseCostPerToken}/meal) × 1.3 walk-in markup (+30%).`,
      type: "success",
    });
  };

  // Published Plan Selection Handlers (Crucial Link)
  const isPlanSelected = (plan) => {
    return eligibleTiers.includes(plan._id) || eligibleTiers.includes(plan.planName);
  };

  const togglePlanEligibility = (plan) => {
    const isSelected = isPlanSelected(plan);
    if (isSelected) {
      setEligibleTiers(
        eligibleTiers.filter((t) => t !== plan._id && t !== plan.planName)
      );
    } else {
      setEligibleTiers([...eligibleTiers, plan._id, plan.planName]);
    }
  };

  const handleSelectAllPlans = () => {
    const planKeys = publishedPlans.flatMap((p) => [p._id, p.planName]);
    setEligibleTiers(Array.from(new Set([...eligibleTiers, ...planKeys])));
  };

  const handleClearAllPlans = () => {
    const planIds = new Set(publishedPlans.map((p) => p._id));
    const planNames = new Set(publishedPlans.map((p) => p.planName));
    setEligibleTiers(
      eligibleTiers.filter((t) => !planIds.has(t) && !planNames.has(t))
    );
  };

  // Quick Preset Templates for Instant Step B Selection
  const loadPreset = (presetName) => {
    if (presetName === "paneer") {
      setThaliName("Paneer Deluxe Thali");
      setMealCategory("Veg");
      setMealSlot("both");
      setDescription("Shahi Paneer butter masala, 3 tawa rotis, dal tadka, jeera rice, gulab jamun, salad & pickle.");
      const vegPlans = publishedPlans
        .filter((p) => p.category === "veg" || p.category === "combo")
        .flatMap((p) => [p._id, p.planName]);
      setEligibleTiers(["veg", "lite", "combo", "all", ...vegPlans]);
      setAllowDirectPurchase(true);
      setAllowMembershipRedemption(true);
      const benchmarkCost = publishedPlans.find((p) => p.category === "veg")?.price || 3000;
      const benchmarkTokens = publishedPlans.find((p) => p.category === "veg")?.totalTokens || 60;
      const calc = Math.round((benchmarkCost / benchmarkTokens) * 1.3);
      setSellingPrice(calc || 65);
    } else if (presetName === "nonveg") {
      setThaliName("Special Chicken Thali");
      setMealCategory("Non-Veg");
      setMealSlot("both");
      setDescription("Kolhapuri Chicken rassa/sukka, 3 tawa rotis, steamed indrayani rice, roasted papad and fresh onion salad.");
      const nonVegPlans = publishedPlans
        .filter((p) => p.category === "non_veg" || p.category === "combo")
        .flatMap((p) => [p._id, p.planName]);
      setEligibleTiers(["non_veg", "combo", ...nonVegPlans]);
      setAllowDirectPurchase(true);
      setAllowMembershipRedemption(true);
      const benchmarkCost = publishedPlans.find((p) => p.category === "non_veg")?.price || 3900;
      const benchmarkTokens = publishedPlans.find((p) => p.category === "non_veg")?.totalTokens || 60;
      const calc = Math.round((benchmarkCost / benchmarkTokens) * 1.3);
      setSellingPrice(calc || 85);
    } else if (presetName === "lite") {
      setThaliName("Lite Daily Thali");
      setMealCategory("Lite");
      setMealSlot("both");
      setDescription("2 Phulkas, dry seasonal sabzi, yellow dal fry, plain steamed rice & fresh kachumber salad.");
      const litePlans = publishedPlans
        .filter((p) => p.category === "veg" || p.category === "lite" || p.category === "combo")
        .flatMap((p) => [p._id, p.planName]);
      setEligibleTiers(["veg", "lite", "combo", "all", ...litePlans]);
      setAllowDirectPurchase(true);
      setAllowMembershipRedemption(true);
      const benchmarkCost = publishedPlans.find((p) => p.category === "lite")?.price || 2400;
      const benchmarkTokens = publishedPlans.find((p) => p.category === "lite")?.totalTokens || 60;
      const calc = Math.round((benchmarkCost / benchmarkTokens) * 1.3);
      setSellingPrice(calc || 52);
    }
  };

  // Publish Thali Live with Tier Mapping and Channels
  const handlePublishThali = async () => {
    if (!thaliName.trim()) {
      setFeedback({ text: "Please enter a Thali Name before publishing.", type: "error" });
      return;
    }
    if (!allowDirectPurchase && !allowMembershipRedemption) {
      setFeedback({ text: "Please select at least one publishing channel (Separate Thali or Membership Plan).", type: "error" });
      return;
    }
    if (!activeMessId) return;
    setLoading(true);
    setFeedback({ text: "", type: "" });

    try {
      const res = await fetch(`${API_BASE_URL}/api/mess/${activeMessId}/thalis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: thaliName,
          category: mealCategory,
          mealType: mealSlot,
          sellingPrice: Number(sellingPrice),
          description,
          eligibleTiers: allowMembershipRedemption ? eligibleTiers : [],
          allowDirectPurchase,
          allowMembershipRedemption,
          benchmarkPlan: benchmarkDetails.planTitle,
          items: [],
          miscellaneousCost: 0,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLocalActives(data.data);
        setFeedback({
          text: `"${thaliName}" (₹${sellingPrice}) published live! ${allowDirectPurchase ? "🛍️ Separate Sale" : ""}${allowDirectPurchase && allowMembershipRedemption ? " • " : ""}${allowMembershipRedemption ? "🎟️ Membership Token Pass" : ""}. 🍽️`,
          type: "success",
        });
        refreshMesses();
      } else {
        setFeedback({ text: data.message || "Failed to publish thali.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Network error publishing thali.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Remove Published Thali
  const handleDeleteThali = async (thaliId) => {
    if (!activeMessId) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/mess/${activeMessId}/thalis/${thaliId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLocalActives(data.data);
        setFeedback({ text: "Thali removed from today's menu.", type: "success" });
        refreshMesses();
      } else {
        setFeedback({ text: data.message || "Failed to remove thali.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Network error removing thali.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Save Bookmarked Template
  const handleBookmarkTemplate = async () => {
    if (!activeMessId) return;
    setLoading(true);

    const newTemplate = {
      name: thaliName,
      category: mealCategory,
      mealSlot,
      description,
      suggestedPrice: sellingPrice,
      allowDirectPurchase,
      allowMembershipRedemption,
      benchmarkPlan: benchmarkDetails.planTitle,
      items: [],
      miscellaneousCost: 0,
      totalCostPrice: Math.round(benchmarkDetails.baseCostPerToken),
    };

    const updated = [newTemplate, ...bookmarkedMeals];
    setLocalBookmarks(updated);

    try {
      const res = await fetch(`${API_BASE_URL}/api/mess/${activeMessId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmarkedThalis: updated }),
      });
      if (res.ok) {
        setFeedback({ text: `Recipe "${thaliName}" saved to reusable bookmarks! ⭐`, type: "success" });
        refreshMesses();
      }
    } catch {
      setFeedback({ text: "Error saving template bookmark.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Remove Bookmarked Recipe
  const handleDeleteBookmark = async (bookmarkIndex) => {
    if (!activeMessId) return;
    const bookmarkToDelete = bookmarkedMeals[bookmarkIndex];
    const updated = bookmarkedMeals.filter((_, idx) => idx !== bookmarkIndex);
    setLocalBookmarks(updated);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/mess/${activeMessId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmarkedThalis: updated }),
      });
      if (res.ok) {
        setFeedback({
          text: `Recipe "${bookmarkToDelete?.name || "Thali"}" removed from bookmarks. 🗑️`,
          type: "success",
        });
        refreshMesses();
      } else {
        setFeedback({ text: "Failed to remove recipe bookmark.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Error removing recipe bookmark.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50/60 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      
      {/* ── TOP OUTLET HEADER ── */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wide">
              {activeMess?.name || "Active Mess"} • Kitchen Operations
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            Daily Menu & Meal Slots
          </h1>
          <p className="text-xs text-stone-500">
            Configure dining hours, control counter rush with slot capacities, and publish today's menu.
          </p>
        </div>

        {/* Outlet Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={activeMessId}
            onChange={(e) => switchMess(e.target.value)}
            disabled={loadingMesses || allMesses.length === 0}
            aria-label="Active Outlet Branch"
            className="bg-stone-50 border border-stone-300 text-stone-900 text-xs font-medium py-2 px-3.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition cursor-pointer"
          >
            {allMesses.map((m) => (
              <option key={m._id || m.id} value={m._id || m.id}>
                {m.name} ({m.locality})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("headcount")}
          className={`px-4 py-2 rounded-lg font-medium text-xs transition flex items-center gap-2 ${
            activeTab === "headcount"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span>Kitchen Prep & Headcount</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
            {headcountData?.headcount?.total ?? 0} seats
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("slots")}
          className={`px-4 py-2 rounded-lg font-medium text-xs transition flex items-center gap-2 ${
            activeTab === "slots"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Meal Windows & Slots</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-mono">
            {totalSlotsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("thalis")}
          className={`px-4 py-2 rounded-lg font-medium text-xs transition flex items-center gap-2 ${
            activeTab === "thalis"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span>Daily Menu & Pricing</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
            {activePublishedMeals.length} live
          </span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback.text && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between animate-in fade-in duration-150 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback({ text: "", type: "" })}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-md"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: STEP A - MEAL PERIOD & TIME-SLOT CONFIGURATION ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "slots" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Capacity Section Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mealSpreads.map((spread, idx) => {
              const stats = getSpreadStats(spread.id);
              const isDark = idx % 2 === 1;
              return (
                <div
                  key={spread.id}
                  className={`p-6 rounded-3xl border transition-all duration-200 relative group flex flex-col justify-between space-y-4 ${
                    isDark
                      ? "bg-gradient-to-br from-slate-900 to-gray-800 text-white border-gray-700"
                      : "bg-gradient-to-br from-amber-50 to-orange-50/50 border-amber-200/80 text-gray-900"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black ${
                          isDark ? "bg-white/10 text-white" : "bg-amber-500/20 text-amber-900"
                        }`}
                      >
                        {spread.icon || "🍽️"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider ${
                              isDark ? "text-orange-400" : "text-amber-800"
                            }`}
                          >
                            Operational Window #{idx + 1}
                          </span>
                          {mealSpreads.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSpread(spread.id, spread.name)}
                              className="text-[10px] text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100 font-bold"
                              title="Delete this meal spread"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <h3 className={`text-xl font-black ${isDark ? "text-white" : "text-gray-900"}`}>
                          {spread.name}
                        </h3>
                        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {spread.timing}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-2xl font-black block ${
                          isDark ? "text-emerald-400" : "text-orange-600"
                        }`}
                      >
                        {stats.remaining}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold ${
                          isDark ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Seats Available
                      </span>
                    </div>
                  </div>

                  {spread.description && (
                    <p className={`text-[11px] line-clamp-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      {spread.description}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div
                      className={`flex justify-between text-[11px] font-bold ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      <span>Occupancy: {stats.booked} booked</span>
                      <span>{stats.max} Total Max Capacity</span>
                    </div>
                    <div
                      className={`w-full h-2.5 rounded-full overflow-hidden ${
                        isDark ? "bg-gray-700" : "bg-amber-200/60"
                      }`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isDark
                            ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                            : "bg-gradient-to-r from-orange-500 to-amber-500"
                        }`}
                        style={{
                          width: `${stats.max > 0 ? (stats.booked / stats.max) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Meal Spread Action Card */}
            <button
              type="button"
              onClick={() => setShowAddSpreadModal(true)}
              className="p-6 rounded-3xl border-2 border-dashed border-orange-300/80 hover:border-orange-500 bg-orange-50/40 hover:bg-orange-50/80 transition-all duration-200 flex flex-col items-center justify-center text-center space-y-3 group min-h-[180px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-100 group-hover:bg-orange-600 text-orange-600 group-hover:text-white flex items-center justify-center text-2xl font-black transition-all duration-200 shadow-xs">
                +
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-900 group-hover:text-orange-600 transition">
                  + Add Meal Spread
                </h4>
                <p className="text-xs text-gray-500 max-w-[220px] mt-1">
                  Introduce Breakfast, Evening Snacks, Midnight Canteen, etc.
                </p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-white px-3 py-1 rounded-full border border-orange-200 shadow-2xs">
                Configure New Window
              </span>
            </button>
          </div>

          {/* Time-Slot Interval Manager Grid */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                  Section-Level Anti-Crowd Engine
                </span>
                <h2 className="text-xl font-black text-gray-900 mt-1">
                  Time-Slot Intervals & Seat Quotas
                </h2>
                <p className="text-xs text-gray-500">
                  Prevent student overcrowding by distributing footfall into distinct half-hour dining intervals.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSpreadModal(true)}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs uppercase tracking-wider rounded-xl transition"
                >
                  + Add Spread
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSlotForm(!showAddSlotForm)}
                  className="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-extrabold text-xs uppercase tracking-wider rounded-xl transition"
                >
                  {showAddSlotForm ? "✕ Close Form" : "+ Add Time Interval"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveTimeSlots}
                  disabled={loading}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  {loading ? "Saving Schedule..." : "Save Schedule 💾"}
                </button>
              </div>
            </div>

            {/* Collapsible Add New Slot Interval Form */}
            {showAddSlotForm && (
              <div className="p-5 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-200 space-y-4 animate-in fade-in duration-200">
                <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider">
                  Create Time-Slot Interval
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">Meal Period / Spread</label>
                    <select
                      value={newSlotPeriod}
                      onChange={(e) => setNewSlotPeriod(e.target.value)}
                      className="w-full p-2 text-xs bg-white border border-gray-300 rounded-xl font-bold"
                    >
                      {mealSpreads.map((spread) => (
                        <option key={spread.id} value={spread.id}>
                          {spread.icon || "🍽️"} {spread.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">Start Time</label>
                    <input
                      type="text"
                      value={newSlotStart}
                      onChange={(e) => setNewSlotStart(e.target.value)}
                      placeholder="e.g. 12:00 PM"
                      className="w-full p-2 text-xs bg-white border border-gray-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">End Time</label>
                    <input
                      type="text"
                      value={newSlotEnd}
                      onChange={(e) => setNewSlotEnd(e.target.value)}
                      placeholder="e.g. 12:30 PM"
                      className="w-full p-2 text-xs bg-white border border-gray-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">Max Capacity (Seats)</label>
                    <input
                      type="number"
                      min="5"
                      max="200"
                      value={newSlotCapacity}
                      onChange={(e) => setNewSlotCapacity(Number(e.target.value))}
                      className="w-full p-2 text-xs bg-white border border-gray-300 rounded-xl font-bold"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddSlotInterval}
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-xs"
                  >
                    Add Interval to Schedule
                  </button>
                </div>
              </div>
            )}

            {/* Dynamic Grid: All Configured Spreads */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mealSpreads.map((spread) => {
                const stats = getSpreadStats(spread.id);
                const slots = timeSlots[spread.id] || [];
                return (
                  <div
                    key={spread.id}
                    className="space-y-3 bg-gray-50/70 p-4 rounded-2xl border border-gray-200/80"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase text-gray-800 tracking-wider flex items-center gap-1.5 truncate">
                        <span>{spread.icon || "🍽️"}</span>
                        <span className="truncate">{spread.name} ({slots.length})</span>
                      </h3>
                      <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">
                        Max: {stats.max} seats
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {slots.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-gray-300 text-center space-y-2">
                          <p className="text-[11px] text-gray-500">No time slots configured yet.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setNewSlotPeriod(spread.id);
                              setShowAddSlotForm(true);
                            }}
                            className="text-[10px] font-black text-orange-600 hover:underline uppercase"
                          >
                            + Add First Interval
                          </button>
                        </div>
                      ) : (
                        slots.map((slot) => {
                          const remaining = Math.max(0, slot.maxCapacity - slot.bookedCount);
                          return (
                            <div
                              key={slot.id}
                              className="p-3 bg-white rounded-xl border border-gray-200/90 shadow-2xs transition-colors flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-extrabold text-gray-900 block truncate">
                                  {slot.timeWindow}
                                </span>
                                <span className="text-[10px] text-gray-500 font-medium">
                                  {slot.bookedCount} Booked •{" "}
                                  <strong className="text-orange-600">{remaining} Available</strong>
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-gray-400 font-bold uppercase">Cap:</span>
                                  <input
                                    type="number"
                                    min="5"
                                    value={slot.maxCapacity}
                                    onChange={(e) =>
                                      handleCapacityChange(spread.id, slot.id, e.target.value)
                                    }
                                    className="w-14 p-1 text-center bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSlotInterval(spread.id, slot.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 font-bold transition"
                                  title="Remove Slot Interval"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1.5: TOMORROW'S KITCHEN HEADCOUNT & RATION PREP SHEET ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "headcount" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Header Card with Cut-Off Engine Status */}
          <div className="bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 rounded-3xl p-6 sm:p-8 text-white border border-gray-800 shadow-xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-900/60 px-3 py-0.5 rounded-full border border-purple-700/60 flex items-center gap-1.5">
                    <span>📋</span>
                    <span>Tomorrow-Only Advance Engine</span>
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-700/50">
                    Zero Waste • Guaranteed Headcount
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Tomorrow's Kitchen Headcount & Ration Sheet
                </h2>
                <p className="text-xs sm:text-sm text-purple-200/80 max-w-2xl leading-relaxed">
                  Target Date: <strong className="text-white font-extrabold">{headcountData?.targetDateLabel || "Tomorrow"} ({headcountData?.targetDate || ""})</strong>. Exact verified seats reserved in advance by both Membership Passholders and Per-Plate diners.
                </p>
              </div>

              {/* Actions: Refresh & Config */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCutOffModal(true)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition cursor-pointer flex items-center gap-1.5 backdrop-blur-xs"
                >
                  <span>⚙️</span>
                  <span>Cut-Off Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => fetchHeadcountSheet()}
                  disabled={loadingHeadcount}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <span>🔄</span>
                  <span>{loadingHeadcount ? "Refreshing..." : "Refresh Sheet"}</span>
                </button>
              </div>
            </div>

            {/* Live Cut-Off Status Banners */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-black text-xs uppercase">☀️ Tomorrow's Lunch</span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full ${
                      headcountData?.cutOffStatus?.lunch?.isLocked
                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}>
                      {headcountData?.cutOffStatus?.lunch?.isLocked ? "🔒 Locked for Stove" : "🟢 Open for Booking"}
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-200/70 mt-0.5">
                    Deadline: <strong>Tonight 10:00 PM</strong> • {headcountData?.cutOffStatus?.lunch?.isLocked
                      ? "Booking finalized. Kitchen grocery prep in progress."
                      : `${headcountData?.cutOffStatus?.lunch?.hoursRemaining || 0}h ${headcountData?.cutOffStatus?.lunch?.minsRemainder || 0}m remaining until lock`}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-teal-300 font-black text-xs uppercase">🌙 Tomorrow's Dinner</span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full ${
                      headcountData?.cutOffStatus?.dinner?.isLocked
                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}>
                      {headcountData?.cutOffStatus?.dinner?.isLocked ? "🔒 Locked for Stove" : "🟢 Open for Booking"}
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-200/70 mt-0.5">
                    Deadline: <strong>Tomorrow 02:00 PM</strong> • {headcountData?.cutOffStatus?.dinner?.isLocked
                      ? "Evening courses locked."
                      : `${headcountData?.cutOffStatus?.dinner?.hoursRemaining || 0}h ${headcountData?.cutOffStatus?.dinner?.minsRemainder || 0}m remaining until lock`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Confirmed */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                Total Confirmed Diners
              </span>
              <div className="text-3xl font-black text-gray-900">
                {headcountData?.headcount?.total || 0} <span className="text-sm font-bold text-gray-400">seats</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Locked diners who will eat at your mess tomorrow
              </p>
            </div>

            {/* Card 2: Lunch vs Dinner */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                Session Headcount
              </span>
              <div className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <span>☀️ {headcountData?.headcount?.lunchCount || 0}</span>
                <span className="text-gray-300">•</span>
                <span>🌙 {headcountData?.headcount?.dinnerCount || 0}</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Lunch courses vs Dinner courses
              </p>
            </div>

            {/* Card 3: Membership vs Walk-in */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Diner Channel
              </span>
              <div className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <span className="text-emerald-700 font-mono">{headcountData?.headcount?.membershipCount || 0} Pass</span>
                <span className="text-gray-300">•</span>
                <span className="text-orange-600 font-mono">{headcountData?.headcount?.perPlateCount || 0} Walk-in</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Passholders reserved + prepaid walk-ins
              </p>
            </div>

            {/* Card 4: Veg vs Non-Veg */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                Dietary Preferences
              </span>
              <div className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <span className="text-emerald-700">🌱 {headcountData?.headcount?.vegCount || 0}</span>
                <span className="text-gray-300">•</span>
                <span className="text-red-600">🍗 {headcountData?.headcount?.nonVegCount || 0}</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Vegetarian thalis vs Non-Veg thalis
              </p>
            </div>
          </div>

          {/* ── AUTOMATED RAW GROCERY & RATION SHOPPING ESTIMATOR ── */}
          <div className="bg-white rounded-3xl border border-gray-200/90 shadow-xs p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-0.5 rounded-full border border-emerald-300">
                  Pre-Stove Procurement Calculator
                </span>
                <h3 className="text-xl font-black text-gray-900 tracking-tight mt-1">
                  Automated Grocery & Raw Ration Sheet
                </h3>
                <p className="text-xs text-gray-500">
                  Exact raw material quantities to purchase tonight based on {headcountData?.headcount?.total || 0} confirmed diners. Zero guesswork, zero kitchen waste!
                </p>
              </div>

              {/* Action Buttons: Copy & WhatsApp */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={copyGroceryList}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>📋</span>
                  <span>{copiedRations ? "Copied to Clipboard! ✓" : "Copy Grocery List"}</span>
                </button>
                <a
                  href={getWhatsAppShareUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <span>💬</span>
                  <span>Share on WhatsApp to Cook</span>
                </a>
              </div>
            </div>

            {/* Rations Table */}
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    <th className="py-3 px-4">Raw Ingredient</th>
                    <th className="py-3 px-4">Portion Formula</th>
                    <th className="py-3 px-4 text-right">Recommended Quantity</th>
                    <th className="py-3 px-4">Kitchen Usage Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!headcountData?.rations || headcountData.rations.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400 font-bold">
                        No rations calculated yet. Diners reserving tomorrow will populate this sheet automatically!
                      </td>
                    </tr>
                  ) : (
                    headcountData.rations.map((r, i) => (
                      <tr key={i} className="hover:bg-purple-50/20 transition">
                        <td className="py-3.5 px-4">
                          <strong className="font-extrabold text-gray-900 block text-xs">{r.item}</strong>
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                          {r.perHead} / person
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-mono font-black text-sm text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                            {r.totalKg} {r.unit}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 text-[11px]">
                          {r.notes}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── TIME-SLOT DISTRIBUTION & DINERS MANIFEST ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Slot-by-Slot Occupancy */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-200/90 shadow-xs p-6 space-y-4">
              <div>
                <h4 className="font-black text-gray-900 text-sm">Tomorrow's Slot Distribution</h4>
                <p className="text-[11px] text-gray-500">Seat reservations grouped by 30-min operational interval</p>
              </div>

              <div className="space-y-2.5">
                {Object.keys(headcountData?.headcount?.slotDistribution || {}).length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-xs bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    No slot intervals booked yet for tomorrow.
                  </div>
                ) : (
                  Object.entries(headcountData?.headcount?.slotDistribution || {}).map(([slotName, count], idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <strong className="font-bold text-gray-800">{slotName}</strong>
                        <span className="font-mono font-black text-purple-900 bg-purple-100 px-2 py-0.5 rounded-full text-[11px]">
                          {count} diners
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-600 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, (count / (activeMess?.seatingCapacity || 30)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: Confirmed Diners Attendance Manifest */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-200/90 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-gray-900 text-sm">Tomorrow's Confirmed Diners Roster</h4>
                  <p className="text-[11px] text-gray-500">Real-time attendance roster of passholders and prepaid walk-ins</p>
                </div>
                <span className="text-xs font-mono font-bold text-gray-500">
                  {headcountData?.diners?.length || 0} registered
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-200 max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-200">
                      <th className="py-2.5 px-3">Diner</th>
                      <th className="py-2.5 px-3">Meal & Slot</th>
                      <th className="py-2.5 px-3">Thali / Type</th>
                      <th className="py-2.5 px-3 text-center">Token Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {!headcountData?.diners || headcountData.diners.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400 font-bold">
                          No diners recorded yet for tomorrow.
                        </td>
                      </tr>
                    ) : (
                      headcountData.diners.map((d, idx) => (
                        <tr key={idx} className="hover:bg-purple-50/20 transition">
                          <td className="py-2.5 px-3">
                            <strong className="font-bold text-gray-900 block">{d.studentName}</strong>
                            <span className="text-[10px] text-gray-400">{d.studentEmail}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-extrabold text-purple-900 block uppercase text-[10px]">
                              {d.mealPeriod}
                            </span>
                            <span className="text-[10px] text-gray-500">{d.timeSlot}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-gray-800 block text-[11px]">{d.thaliName}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              d.bookingType === "membership_token"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-orange-100 text-orange-800"
                            }`}>
                              {d.bookingType === "membership_token" ? "Passholder" : "Paid Walk-in"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-mono font-black text-xs text-gray-900 bg-gray-100 px-2 py-1 rounded-lg">
                              {d.token}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* ── MODAL: EDIT CUT-OFF DEADLINE TIMES ── */}
          {showCutOffModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                      Cut-Off Engine Configuration
                    </span>
                    <h3 className="font-black text-gray-900 text-base mt-0.5">
                      Configure Daily Booking Cut-Off Times
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCutOffModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Tomorrow's Lunch Cut-Off Time (Night Before)
                    </label>
                    <input
                      type="time"
                      value={editLunchCutOff}
                      onChange={(e) => setEditLunchCutOff(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Standard default: 22:00 (10:00 PM tonight). After this time, tomorrow's lunch bookings lock.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Tomorrow's Dinner Cut-Off Time
                    </label>
                    <input
                      type="time"
                      value={editDinnerCutOff}
                      onChange={(e) => setEditDinnerCutOff(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Standard default: 14:00 (02:00 PM day of dinner).
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Dinner Cut-Off Deadline Day
                    </label>
                    <select
                      value={editDinnerDay}
                      onChange={(e) => setEditDinnerDay(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="same_day">Same Day Afternoon (2:00 PM day of dinner)</option>
                      <option value="previous_night">Night Before (10:00 PM along with lunch)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCutOffModal(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingCutOff}
                    onClick={handleSaveCutOffConfig}
                    className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    {savingCutOff ? "Saving..." : "Save Cut-Off Times"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
      {activeTab === "thalis" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-200">
          
          {/* LEFT COLUMN: STEP B & C THALI CREATOR & TIER MAPPING */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-gray-200/80 shadow-xs space-y-6">
            
            {/* Header with Quick Presets */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                  Step B & C: Unified Builder
                </span>
                <h2 className="text-xl font-black text-gray-900 mt-1">
                  Thali Publishing & Channel Allocation
                </h2>
                <p className="text-xs text-gray-500">
                  Compose daily thalis, benchmark prices to membership tokens (1.3×), and configure pass redemption.
                </p>
              </div>

              {/* Quick Presets for Instant Setup */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Presets:</span>
                <button
                  type="button"
                  onClick={() => loadPreset("paneer")}
                  className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-[10px] font-black rounded-lg transition"
                >
                  Paneer Deluxe
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset("nonveg")}
                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-black rounded-lg transition"
                >
                  Chicken Special
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset("lite")}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-lg transition"
                >
                  Lite Daily
                </button>
              </div>
            </div>

            {/* 1. Thali Basics (Name & Operational Window) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Thali Option Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Paneer Thali, Kolhapuri Chicken Thali, Standard Lunch Thali"
                  value={thaliName}
                  onChange={(e) => setThaliName(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Operational Window
                </label>
                <select
                  value={mealSlot}
                  onChange={(e) => setMealSlot(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 font-bold cursor-pointer"
                >
                  <option value="all">All Meal Spreads</option>
                  <option value="both">Both Lunch & Dinner</option>
                  {mealSpreads.map((spread) => (
                    <option key={spread.id} value={spread.id}>
                      {spread.icon || "🍽️"} {spread.name} Only
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Thali Items & Menu Composition */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase text-gray-700">
                  Thali Items & Menu Composition
                </label>
                <span className="text-[11px] text-gray-400">
                  List dishes included in this thali
                </span>
              </div>

              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Shahi Paneer butter masala, 3 tawa rotis, dal tadka, jeera rice, gulab jamun, roasted papad, fresh onion salad & pickle"
                className="w-full p-3 text-xs bg-gray-50 border border-gray-300 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 text-gray-800 leading-relaxed font-medium"
              />
            </div>

            {/* 3. Publishing Channels (Option to publish in membership plans and/or separate thali) */}
            <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-3">
              <div>
                <label className="block text-xs font-black uppercase text-gray-900 tracking-wider">
                  Publishing Channels & Accessibility
                </label>
                <p className="text-[11px] text-gray-500">
                  Choose where and how students can buy or redeem this meal.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Channel A: Standalone / Walk-In Purchase */}
                <label
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                    allowDirectPurchase
                      ? "bg-white border-orange-500 shadow-xs ring-2 ring-orange-500/20"
                      : "bg-white/60 border-gray-200 opacity-70"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={allowDirectPurchase}
                    onChange={(e) => setAllowDirectPurchase(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded text-orange-600 focus:ring-orange-500 border-gray-300"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-gray-900">
                        🛍️ Separate Thali (Walk-In)
                      </span>
                      <span className="text-[10px] font-black text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                        ₹{sellingPrice}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-tight">
                      Available for any non-member student to order directly via UPI QR or at counter.
                    </p>
                  </div>
                </label>

                {/* Channel B: Membership Plan Meal */}
                <label
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                    allowMembershipRedemption
                      ? "bg-white border-emerald-500 shadow-xs ring-2 ring-emerald-500/20"
                      : "bg-white/60 border-gray-200 opacity-70"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={allowMembershipRedemption}
                    onChange={(e) => setAllowMembershipRedemption(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-gray-900">
                        🎟️ In Membership Plans
                      </span>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        1 Token
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-tight">
                      Subscribers can redeem this thali natively using 1 Membership Token (₹0 extra).
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* 4. Step C: Eligible Membership Plans Mapping (Visible when Membership Channel is Active) */}
            {allowMembershipRedemption && (
              <div className="p-5 bg-gradient-to-br from-orange-50/80 via-amber-50/50 to-orange-50/30 rounded-3xl border-2 border-orange-200/90 shadow-xs space-y-4 animate-in fade-in duration-150">
                
                {/* Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-orange-200/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-100 px-2.5 py-0.5 rounded-full tracking-wider">
                        Step C: Membership Mapping
                      </span>
                      <span className="text-[10px] font-bold text-gray-500">
                        • {activeMess?.name || "Active Mess"}
                      </span>
                    </div>
                    <h3 className="text-sm font-black uppercase text-gray-900 tracking-wider mt-1">
                      Eligible Membership Plans & Passes
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-3 py-1 bg-white text-orange-700 rounded-xl border border-orange-200 shadow-2xs">
                      {publishedPlans.filter((p) => isPlanSelected(p)).length} / {publishedPlans.length} Plans Active
                    </span>
                    {publishedPlans.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSelectAllPlans}
                          className="text-[11px] font-extrabold text-orange-600 hover:text-orange-800 hover:underline px-1.5 py-0.5"
                        >
                          Select All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={handleClearAllPlans}
                          className="text-[11px] font-extrabold text-gray-500 hover:text-gray-700 hover:underline px-1.5 py-0.5"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed">
                  Tag which <strong>published membership plans</strong> created for this mess can redeem this thali natively with <strong>1 token</strong>.
                </p>

                {/* Published Plans Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                      <span>🎟️</span> Published Mess Membership Plans ({publishedPlans.length})
                    </span>
                  </div>

                  {loadingPlans ? (
                    <div className="p-6 bg-white/70 rounded-2xl border border-orange-100 flex items-center justify-center gap-2 text-xs text-gray-500 font-bold">
                      <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
                      Loading published outlet plans...
                    </div>
                  ) : publishedPlans.length === 0 ? (
                    <div className="p-5 bg-white/90 rounded-2xl border-2 border-dashed border-orange-200 text-center space-y-2">
                      <span className="text-2xl block">🎟️</span>
                      <div>
                        <h4 className="text-xs font-black text-gray-900 uppercase">
                          No Membership Plans Linked
                        </h4>
                        <p className="text-[11px] text-gray-500 mt-0.5 max-w-md mx-auto">
                          This mess currently operates with direct per-plate thali pricing and bookings.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {publishedPlans.map((plan) => {
                        const isSelected = isPlanSelected(plan);
                        const isVeg = plan.category === "veg";
                        const isNonVeg = plan.category === "non_veg";

                        return (
                          <button
                            key={plan._id}
                            type="button"
                            onClick={() => togglePlanEligibility(plan)}
                            className={`p-3 rounded-2xl text-left border-2 transition-all flex flex-col justify-between space-y-2 relative overflow-hidden group ${
                              isSelected
                                ? "bg-white border-orange-500 shadow-xs ring-2 ring-orange-500/20"
                                : "bg-white/70 border-gray-200/90 hover:border-gray-300 hover:bg-white opacity-70 hover:opacity-100"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 w-full">
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  isVeg
                                    ? "bg-emerald-100 text-emerald-800"
                                    : isNonVeg
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-purple-100 text-purple-800"
                                }`}
                              >
                                {isVeg ? "🟢 Veg Plan" : isNonVeg ? "🔴 Non-Veg Plan" : "🟣 Combo Plan"}
                              </span>

                              <div
                                className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-black transition-all ${
                                  isSelected
                                    ? "bg-orange-600 text-white shadow-2xs scale-105"
                                    : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
                                }`}
                              >
                                {isSelected ? "✓" : "+"}
                              </div>
                            </div>

                            <div>
                              <h4 className="font-extrabold text-xs text-gray-900 leading-tight">
                                {plan.planName}
                              </h4>
                              <p className="text-[10px] text-gray-500 font-bold mt-1">
                                ₹{plan.price} • {plan.totalTokens} Tokens • {plan.mealsPerDay || 2} meals/day
                              </p>
                            </div>

                            <div className="pt-1 border-t border-gray-100 flex items-center justify-between text-[10px]">
                              <span className={isSelected ? "text-emerald-700 font-extrabold" : "text-gray-400"}>
                                {isSelected ? "● 1 Token Native Coverage" : "○ Not Linked"}
                              </span>
                              <span className="text-gray-400 font-medium">
                                {plan.frequency || "Daily pass"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. Dynamic Pricing Engine: (cost of monthly membership / total number of tokens) * 1.3 */}
            <div className="p-5 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-500/5 rounded-3xl border-2 border-orange-300/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-orange-200/80 pb-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">⚡</span>
                    <h3 className="text-xs font-black uppercase text-gray-900 tracking-wider">
                      Dynamic Pricing Engine (1.3× Walk-in Markup)
                    </h3>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    Formula: <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-orange-700">(Monthly Plan Cost ÷ Total Tokens) × 1.3</code>
                  </p>
                </div>

                {/* Benchmark Source Selector */}
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black uppercase text-gray-500">Benchmark:</label>
                  <select
                    value={benchmarkPlanId}
                    onChange={(e) => setBenchmarkPlanId(e.target.value)}
                    className="bg-white border border-orange-200 text-gray-900 text-xs font-bold py-1.5 px-3 rounded-xl focus:ring-2 focus:ring-orange-500 shadow-2xs cursor-pointer"
                  >
                    <option value="auto">Auto ({benchmarkDetails.planTitle})</option>
                    {publishedPlans.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.planName} (₹{p.price} / {p.totalTokens} tokens)
                      </option>
                    ))}
                    <option value="custom">Custom Values...</option>
                  </select>
                </div>
              </div>

              {/* Custom Benchmark Inputs if Selected */}
              {benchmarkPlanId === "custom" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-white/80 rounded-2xl border border-orange-200 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-600 mb-1">
                      Monthly Plan Price (₹)
                    </label>
                    <input
                      type="number"
                      min="100"
                      value={customMonthlyCost}
                      onChange={(e) => setCustomMonthlyCost(Number(e.target.value))}
                      className="w-full p-2 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-600 mb-1">
                      Total Plan Tokens
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={customTotalTokens}
                      onChange={(e) => setCustomTotalTokens(Number(e.target.value))}
                      className="w-full p-2 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Price Calculation Demonstration Pill */}
              <div className="p-3 bg-white rounded-2xl border border-orange-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                      Base Rate: ₹{benchmarkDetails.baseCostPerToken}/meal
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      +30% Walk-in Markup (1.3×)
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1">
                    (₹{benchmarkDetails.monthlyCost} ÷ {benchmarkDetails.totalTokens} tokens) × 1.3 = <strong className="text-gray-900 font-black text-sm">₹{benchmarkDetails.formulaSellingPrice}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleCalculatePrice}
                    className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Calculate formula price from membership tokens"
                  >
                    <span>⚡</span>
                    <span>Generate Price</span>
                  </button>
                </div>
              </div>

              {/* Editable Selling Price Field */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                  <label className="block text-xs font-black uppercase text-gray-800">
                    Active Selling Price (₹)
                  </label>
                  <p className="text-[10px] text-gray-500">
                    The direct walk-in purchase price charged to students.
                  </p>
                </div>

                <div className="relative w-full sm:w-48">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-black text-base">₹</span>
                  <input
                    type="number"
                    min="10"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2.5 text-base bg-white border-2 border-orange-400 rounded-xl font-black text-gray-900 focus:ring-2 focus:ring-orange-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleBookmarkTemplate}
                disabled={loading}
                className="py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-2xs cursor-pointer"
              >
                Save as Recipe ⭐
              </button>
              <button
                type="button"
                onClick={handlePublishThali}
                disabled={loading}
                className="py-3 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Publishing..." : "Publish Live to Menu 🚀"}
              </button>
            </div>

          </div>

          {/* RIGHT COLUMN: PUBLISHED TODAY'S THALIS & BOOKMARKED RECIPES */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Live Published Thalis */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                    Live Published Thalis ({activePublishedMeals.length})
                  </h3>
                  <p className="text-xs text-gray-500">Currently live for student bookings.</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {activePublishedMeals.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <span className="text-3xl">🍲</span>
                    <p className="text-xs text-gray-400">No active thalis published yet for today.</p>
                  </div>
                ) : (
                  activePublishedMeals.map((thali) => (
                    <div
                      key={thali.id || thali._id}
                      className="p-4 bg-orange-50/50 rounded-2xl border border-orange-200/80 space-y-2.5 transition-all hover:bg-white hover:shadow-xs"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md">
                              {thali.category}
                            </span>
                            <span className="text-[9px] font-bold text-gray-500 uppercase">
                              • {thali.mealType}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-sm text-gray-900 mt-1">{thali.name}</h4>
                        </div>
                        <span className="text-base font-black text-orange-600">₹{thali.sellingPrice}</span>
                      </div>

                      <p className="text-xs text-gray-600 line-clamp-2">
                        {thali.description || thali.items?.map((i) => i.name).join(", ")}
                      </p>

                      {/* Channels & Tier Mapping Tags */}
                      <div className="flex flex-wrap gap-1 text-[9px] font-bold">
                        {thali.allowDirectPurchase !== false && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded border border-orange-200">
                            🛍️ Direct ₹{thali.sellingPrice}
                          </span>
                        )}
                        {thali.allowMembershipRedemption !== false && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                            🎟️ 1 Token Pass
                          </span>
                        )}
                        {thali.eligibleTiers && thali.eligibleTiers.length > 0 && (
                          thali.eligibleTiers
                            .filter((tier) => !/^[0-9a-fA-F]{24}$/.test(tier))
                            .map((tier) => (
                              <span
                                key={tier}
                                className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-200"
                              >
                                ✓ {tier.toUpperCase()}
                              </span>
                            ))
                        )}
                      </div>

                      <div className="flex justify-end pt-1 border-t border-orange-100">
                        <button
                          type="button"
                          onClick={() => handleDeleteThali(thali.id || thali._id)}
                          className="text-[10px] font-black uppercase text-red-600 hover:text-red-700 transition cursor-pointer"
                        >
                          Remove Thali ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bookmarked Meal Recipes */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                    Saved Recipes ({bookmarkedMeals.length})
                  </h3>
                  <p className="text-xs text-gray-500">Quickly load pre-configured thalis.</p>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {bookmarkedMeals.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">No recipes saved yet.</p>
                ) : (
                  bookmarkedMeals.map((tmpl, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 hover:bg-orange-50/40 rounded-xl border border-gray-200 hover:border-orange-200 transition-colors flex items-center justify-between text-xs gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-extrabold text-gray-900 block truncate">{tmpl.name}</span>
                        <span className="text-[10px] text-gray-400">
                          {tmpl.category} • ₹{tmpl.suggestedPrice}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setThaliName(tmpl.name);
                            setMealCategory(tmpl.category || "Veg");
                            setMealSlot(tmpl.mealSlot || "both");
                            setDescription(tmpl.description || (tmpl.items?.map((i) => i.name).join(", ")) || "");
                            setSellingPrice(tmpl.suggestedPrice || 65);
                            setAllowDirectPurchase(tmpl.allowDirectPurchase !== false);
                            setAllowMembershipRedemption(tmpl.allowMembershipRedemption !== false);
                            setFeedback({ text: `Recipe "${tmpl.name}" loaded into builder! ⭐`, type: "success" });
                          }}
                          className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 text-[10px] font-bold uppercase rounded-lg transition cursor-pointer shadow-2xs"
                          title="Load this recipe into builder"
                        >
                          Load ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBookmark(idx)}
                          disabled={loading}
                          className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
                          title={`Delete "${tmpl.name}" from bookmarks`}
                          aria-label={`Delete "${tmpl.name}" bookmark`}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: ADD CUSTOM MEAL SPREAD (BREAKFAST, SNACKS, ETC.) ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showAddSpreadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 relative max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                  New Operational Window
                </span>
                <h3 className="text-xl font-black text-gray-900 mt-1">
                  Add Meal Spread
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Expand your mess operations with Breakfast, Snacks, Midnight Meals, etc.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSpreadModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase text-gray-400">
                Quick Presets:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewSpreadName("Morning Breakfast");
                    setNewSpreadIcon("🌅");
                    setNewSpreadTiming("07:30 AM – 10:30 AM");
                    setNewSpreadDescription("Poha, Upma, Idli, Parathas & Hot Chai");
                    setNewSpreadCapacity(30);
                  }}
                  className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-left transition flex items-center gap-2"
                >
                  <span className="text-xl">🌅</span>
                  <div>
                    <span className="text-xs font-black text-gray-900 block">Breakfast</span>
                    <span className="text-[9px] text-gray-500">07:30 – 10:30 AM</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewSpreadName("Evening Snacks & Tea");
                    setNewSpreadIcon("☕");
                    setNewSpreadTiming("04:30 PM – 06:30 PM");
                    setNewSpreadDescription("Samosas, Sandwiches, Vada Pav & Tea");
                    setNewSpreadCapacity(25);
                  }}
                  className="p-2.5 rounded-xl border border-orange-200 bg-orange-50/50 hover:bg-orange-100/70 text-left transition flex items-center gap-2"
                >
                  <span className="text-xl">☕</span>
                  <div>
                    <span className="text-xs font-black text-gray-900 block">Evening Snacks</span>
                    <span className="text-[9px] text-gray-500">04:30 – 06:30 PM</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewSpreadName("Midnight Canteen");
                    setNewSpreadIcon("🌙");
                    setNewSpreadTiming("11:00 PM – 02:00 AM");
                    setNewSpreadDescription("Late night Maggi, Fried Rice, Rolls & Coffee");
                    setNewSpreadCapacity(20);
                  }}
                  className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/70 text-left transition flex items-center gap-2"
                >
                  <span className="text-xl">🌙</span>
                  <div>
                    <span className="text-xs font-black text-gray-900 block">Midnight Canteen</span>
                    <span className="text-[9px] text-gray-500">11:00 PM – 02:00 AM</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewSpreadName("Sunday Brunch");
                    setNewSpreadIcon("🥞");
                    setNewSpreadTiming("10:00 AM – 02:00 PM");
                    setNewSpreadDescription("Special weekend brunch spread & desserts");
                    setNewSpreadCapacity(35);
                  }}
                  className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-left transition flex items-center gap-2"
                >
                  <span className="text-xl">🥞</span>
                  <div>
                    <span className="text-xs font-black text-gray-900 block">Sunday Brunch</span>
                    <span className="text-[9px] text-gray-500">10:00 AM – 02:00 PM</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Custom Input Form */}
            <form onSubmit={handleCreateSpread} className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                  <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                    Spread Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newSpreadName}
                    onChange={(e) => setNewSpreadName(e.target.value)}
                    placeholder="e.g. Morning Breakfast, High Tea"
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                    Icon Emoji
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newSpreadIcon}
                    onChange={(e) => setNewSpreadIcon(e.target.value)}
                    className="w-full p-2.5 text-center text-lg bg-gray-50 border border-gray-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                  Operational Window Timing <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newSpreadTiming}
                  onChange={(e) => setNewSpreadTiming(e.target.value)}
                  placeholder="e.g. 07:30 AM – 10:30 AM"
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                    Default Seat Capacity
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={newSpreadCapacity}
                    onChange={(e) => setNewSpreadCapacity(Number(e.target.value))}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                    Auto-Generate Slots
                  </label>
                  <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-[11px] font-semibold text-gray-600 flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>2 starter 30-min intervals</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                  Spread Description (Optional)
                </label>
                <input
                  type="text"
                  value={newSpreadDescription}
                  onChange={(e) => setNewSpreadDescription(e.target.value)}
                  placeholder="e.g. Freshly cooked breakfast with tea or filter coffee"
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddSpreadModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-xs font-bold text-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black uppercase tracking-wider shadow-xs transition disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Meal Spread 🚀"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}