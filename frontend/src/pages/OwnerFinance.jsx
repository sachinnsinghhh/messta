import { API_BASE_URL } from "../config/api";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useActiveMess } from "../context/useActiveMess";

export default function OwnerFinance() {
  const { allMesses, activeMessId, activeMess, loadingMesses, switchMess } = useActiveMess();

  // Period state: "month" | "today" | "all"
  const [evalPeriod, setEvalPeriod] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // e.g. "2026-11"

  // Active Tab: default to "daily" so the user immediately sees the Day-by-Day breakdown
  const [activeTab, setActiveTab] = useState("daily"); // "daily" | "thalis" | "passes"

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [mealFilter, setMealFilter] = useState("all"); // "all" | "lunch" | "dinner"

  // Data states
  const [loading, setLoading] = useState(true);
  const [financeData, setFinanceData] = useState(null);
  const [feedback, setFeedback] = useState({ text: "", type: "" });

  // Generate Month Options for past 18 months
  const monthOptions = useMemo(() => {
    const options = [];
    const d = new Date();
    for (let i = 0; i < 18; i++) {
      const yr = d.getFullYear();
      const mo = d.getMonth() + 1;
      const key = `${yr}-${String(mo).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      options.push({ key, label });
      d.setMonth(d.getMonth() - 1);
    }
    return options;
  }, []);

  // Step Month forwards / backwards
  const handleStepMonth = (direction) => {
    if (!selectedMonth) return;
    const [yr, mo] = selectedMonth.split("-").map(Number);
    const d = new Date(yr, mo - 1 + direction, 1);
    const nextKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(nextKey);
  };

  // Load Finance Data
  const loadFinanceData = async () => {
    if (!activeMessId) return;
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        period: evalPeriod,
        month: selectedMonth,
      });

      const res = await fetch(`${API_BASE_URL}/api/finance/mess/${activeMessId}/summary?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFinanceData(data);
      } else {
        setFeedback({ text: "Could not load sales data from server.", type: "error" });
      }
    } catch (err) {
      console.error("Failed to load finance data:", err);
      setFeedback({ text: "Network error loading sales data.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, [activeMessId, evalPeriod, selectedMonth]);

  const summary = financeData?.summary || null;
  const thaliOrders = financeData?.thaliOrders || [];
  const membershipSubscriptions = financeData?.membershipSubscriptions || [];
  const dailyBreakdown = financeData?.dailyBreakdown || [];

  // Filtered Thali Orders
  const filteredThaliOrders = useMemo(() => {
    return thaliOrders.filter((order) => {
      // Meal filter
      if (mealFilter !== "all" && order.mealType?.toLowerCase() !== mealFilter.toLowerCase()) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchToken = order.token?.toLowerCase().includes(q);
        const matchCustomer =
          order.customerName?.toLowerCase().includes(q) || order.customerEmail?.toLowerCase().includes(q);
        const matchThali = order.thaliName?.toLowerCase().includes(q);
        if (!matchToken && !matchCustomer && !matchThali) return false;
      }
      return true;
    });
  }, [thaliOrders, mealFilter, searchQuery]);

  // Filtered Membership Passes
  const filteredPasses = useMemo(() => {
    return membershipSubscriptions.filter((sub) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = sub.passCode?.toLowerCase().includes(q);
        const matchCustomer =
          sub.customerName?.toLowerCase().includes(q) ||
          sub.customerPhone?.toLowerCase().includes(q) ||
          sub.customerEmail?.toLowerCase().includes(q);
        const matchPlan = sub.planName?.toLowerCase().includes(q);
        if (!matchCode && !matchCustomer && !matchPlan) return false;
      }
      return true;
    });
  }, [membershipSubscriptions, searchQuery]);

  const todayDateStr = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-stone-50/60 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">

      {/* ── TOP HEADER & CONTROLS ── */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
              {activeMess?.name || "Active Mess"} {activeMess?.locality ? `• ${activeMess.locality}` : ""}
            </span>
            {loading && (
              <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                Updating...
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">
            Sales & Income Dashboard
          </h1>
          <p className="text-xs text-stone-500 max-w-2xl">
            Real-time sales from daily thali walk-ins and student monthly passes. Simple, transparent tracking of what you sold, what was received, and what you earned.
          </p>
        </div>

        {/* Filter Controls: Outlet, Mode, and Month Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Multi-Mess Outlet Switcher */}
          <div className="relative">
            <select
              value={activeMessId}
              onChange={(e) => switchMess(e.target.value)}
              disabled={loadingMesses}
              className="bg-stone-50 border border-stone-300 rounded-xl py-2 pl-3 pr-8 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer shadow-xs"
            >
              {allMesses.map((m) => (
                <option key={m.id || m._id} value={m.id || m._id}>
                  {m.name} ({m.locality || "Pune"})
                </option>
              ))}
            </select>
          </div>

          {/* Period Mode Toggle */}
          <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setEvalPeriod("month")}
              className={`px-3 py-1.5 rounded-lg transition ${
                evalPeriod === "month"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setEvalPeriod("today")}
              className={`px-3 py-1.5 rounded-lg transition ${
                evalPeriod === "today"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setEvalPeriod("all")}
              className={`px-3 py-1.5 rounded-lg transition ${
                evalPeriod === "all"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              All Time
            </button>
          </div>

          {/* Month Stepper & Picker (only when period is "month") */}
          {evalPeriod === "month" && (
            <div className="flex items-center gap-1 bg-stone-50 border border-stone-300 rounded-xl p-1 shadow-xs">
              <button
                type="button"
                onClick={() => handleStepMonth(-1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-600 hover:bg-stone-200 transition"
                title="Previous Month"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none text-stone-900 font-bold text-xs py-1 px-2 focus:outline-none cursor-pointer"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleStepMonth(1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-600 hover:bg-stone-200 transition"
                title="Next Month"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── TOP STAT CARDS: THALI SOLD & MONEY RECEIVED | PASS SOLD & MONEY RECEIVED | TOTAL NET EARNING ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Card 1: Thali Sold & Money Received */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-stone-500 font-bold uppercase tracking-wider mb-2">
            <span>Thali Sold & Money Received</span>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-bold">
              Daily Thalis
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-stone-900 tracking-tight">
              {summary?.thaliSales?.platesSold || 0} <span className="text-lg font-bold text-stone-500">thalis sold</span>
            </div>
            <div className="mt-2 text-sm font-semibold text-stone-600 flex items-baseline gap-1.5">
              <span>Money Received:</span>
              <span className="text-xl font-black text-emerald-600">
                ₹{Number(summary?.thaliSales?.netEarned || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400 font-medium">
            <span>Gross: ₹{Number(summary?.thaliSales?.grossReceived || 0).toLocaleString("en-IN")}</span>
            <span>95% net payout (5% Messta fee)</span>
          </div>
        </div>

        {/* Card 2: Pass Sold & Money Received */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-stone-500 font-bold uppercase tracking-wider mb-2">
            <span>Pass Sold & Money Received</span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
              Membership Passes
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-stone-900 tracking-tight">
              {summary?.membershipSales?.passesSold || 0} <span className="text-lg font-bold text-stone-500">passes sold</span>
            </div>
            <div className="mt-2 text-sm font-semibold text-stone-600 flex items-baseline gap-1.5">
              <span>Money Received:</span>
              <span className="text-xl font-black text-emerald-600">
                ₹{Number(summary?.membershipSales?.totalEarned || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400 font-medium">
            <span>Active passholders: {summary?.membershipSales?.activePassholders || 0} students</span>
            <span>100% mess rate retained</span>
          </div>
        </div>

        {/* Card 3: Total Net Earning */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-stone-500 font-bold uppercase tracking-wider mb-2">
            <span>Total Net Earning</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
              Net Take-Home
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-600 tracking-tight">
              ₹{Number(summary?.totalNetEarned || 0).toLocaleString("en-IN")}
            </div>
            <div className="mt-2 text-xs font-medium text-stone-500">
              Total sales: <span className="font-bold text-stone-800">{summary?.totalUnitsSold || 0} units</span> (thalis + passes)
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400 font-medium">
            <span>Gross collected: ₹{Number(summary?.totalGrossReceived || 0).toLocaleString("en-IN")}</span>
            <span className="font-bold text-emerald-600">Total Take-Home</span>
          </div>
        </div>

      </div>

      {/* ── SIMPLE NAVIGATION TABS & SEARCH ── */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        
        {/* Navigation Tabs Header */}
        <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50/50">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => { setActiveTab("daily"); setSearchQuery(""); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === "daily"
                  ? "bg-white text-orange-600 shadow-xs border border-stone-200"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/70"
              }`}
            >
              <span>📅 Day-by-Day Breakdown</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === "daily" ? "bg-orange-100 text-orange-700" : "bg-stone-200 text-stone-700"
              }`}>
                {dailyBreakdown.length}d
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("thalis"); setSearchQuery(""); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === "thalis"
                  ? "bg-white text-orange-600 shadow-xs border border-stone-200"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/70"
              }`}
            >
              <span>🍽️ Daily Thali Orders</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === "thalis" ? "bg-orange-100 text-orange-700" : "bg-stone-200 text-stone-700"
              }`}>
                {filteredThaliOrders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("passes"); setSearchQuery(""); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === "passes"
                  ? "bg-white text-orange-600 shadow-xs border border-stone-200"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/70"
              }`}
            >
              <span>🎟️ Membership Passes</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === "passes" ? "bg-orange-100 text-orange-700" : "bg-stone-200 text-stone-700"
              }`}>
                {filteredPasses.length}
              </span>
            </button>
          </div>

          {/* Search bar & Tab-specific filters */}
          <div className="flex items-center gap-2.5">
            {activeTab === "thalis" && (
              <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMealFilter("all")}
                  className={`px-2.5 py-1 rounded-md transition ${mealFilter === "all" ? "bg-white text-stone-900 shadow-xs" : "text-stone-500 hover:text-stone-900"}`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setMealFilter("lunch")}
                  className={`px-2.5 py-1 rounded-md transition ${mealFilter === "lunch" ? "bg-white text-stone-900 shadow-xs" : "text-stone-500 hover:text-stone-900"}`}
                >
                  Lunch
                </button>
                <button
                  type="button"
                  onClick={() => setMealFilter("dinner")}
                  className={`px-2.5 py-1 rounded-md transition ${mealFilter === "dinner" ? "bg-white text-stone-900 shadow-xs" : "text-stone-500 hover:text-stone-900"}`}
                >
                  Dinner
                </button>
              </div>
            )}

            {(activeTab === "thalis" || activeTab === "passes") && (
              <div className="relative">
                <input
                  type="text"
                  placeholder={activeTab === "thalis" ? "Search token, customer, thali..." : "Search pass code, student..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 sm:w-64 bg-white border border-stone-300 rounded-xl py-1.5 pl-3 pr-8 text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── TAB 1: DAY-BY-DAY BREAKDOWN TABLE (BLUE CIRCLE COLUMNS) ── */}
        {activeTab === "daily" && (
          <div className="overflow-x-auto">
            {dailyBreakdown.length === 0 ? (
              <div className="py-16 text-center text-stone-400">
                <div className="text-4xl mb-3">📅</div>
                <div className="text-sm font-bold text-stone-700">No Daily Breakdown Available</div>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Date & Day</th>
                    <th className="py-3.5 px-4 text-center">Thali Sold</th>
                    <th className="py-3.5 px-4 text-right">Income from Thali</th>
                    <th className="py-3.5 px-4 text-center">Passes Sold</th>
                    <th className="py-3.5 px-4 text-right">Income from Passes</th>
                    <th className="py-3.5 px-4 text-right">Total Earning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                  {dailyBreakdown.map((row) => {
                    const isToday = row.date === todayDateStr;
                    return (
                      <tr key={row.date} className={`transition ${isToday ? "bg-amber-50/50 font-bold" : "hover:bg-stone-50/80"}`}>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900">{row.dayLabel}</span>
                            {isToday && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-800 text-[9px] font-black uppercase">
                                Today
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-stone-800">
                          {row.platesSold > 0 ? `${row.platesSold}` : <span className="text-stone-300 font-normal">—</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                          {row.thaliNet > 0 ? `₹${Number(row.thaliNet).toLocaleString("en-IN")}` : <span className="text-stone-300 font-normal">—</span>}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-stone-800">
                          {row.passesSold > 0 ? `${row.passesSold}` : <span className="text-stone-300 font-normal">—</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-blue-600">
                          {row.passEarned > 0 ? `₹${Number(row.passEarned).toLocaleString("en-IN")}` : <span className="text-stone-300 font-normal">—</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">
                          {row.totalEarned > 0 ? `₹${Number(row.totalEarned).toLocaleString("en-IN")}` : <span className="text-stone-300 font-normal">₹0</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── TAB 2: DAILY THALI ORDERS TABLE ── */}
        {activeTab === "thalis" && (
          <div className="overflow-x-auto">
            {filteredThaliOrders.length === 0 ? (
              <div className="py-16 text-center text-stone-400">
                <div className="text-4xl mb-3">🍽️</div>
                <div className="text-sm font-bold text-stone-700">No Daily Thali Orders Found</div>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                  {searchQuery ? "No orders match your search keyword." : "No single plate orders recorded for this mess during this period yet."}
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date & Slot</th>
                    <th className="py-3 px-4">Token Code</th>
                    <th className="py-3 px-4">Thali Name</th>
                    <th className="py-3 px-4">Student Diner</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-right">Messta Fee (5%)</th>
                    <th className="py-3 px-4 text-right">You Earn (95%)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                  {filteredThaliOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-stone-50/80 transition">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-stone-900">{ord.date}</div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                          <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                            ord.mealType?.toLowerCase() === "dinner" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {ord.mealType}
                          </span>
                          {ord.timeSlot && <span>{ord.timeSlot}</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold bg-stone-100 px-2 py-0.5 rounded border border-stone-200 text-stone-900">
                          {ord.token}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900">{ord.thaliName}</div>
                        <div className="text-[10px] text-stone-500">{ord.thaliCategory}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-900">{ord.customerName}</div>
                        <div className="text-[10px] text-stone-400">{ord.customerEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-stone-900">
                        ₹{ord.sellingPrice}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap text-stone-400 text-[11px]">
                        -₹{ord.platformFee}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-black text-emerald-600 text-sm">
                        ₹{ord.netEarned}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Paid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── TAB 3: MEMBERSHIP PASSES TABLE ── */}
        {activeTab === "passes" && (
          <div className="overflow-x-auto">
            {filteredPasses.length === 0 ? (
              <div className="py-16 text-center text-stone-400">
                <div className="text-4xl mb-3">🎟️</div>
                <div className="text-sm font-bold text-stone-700">No Membership Passes Found</div>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                  {searchQuery ? "No membership passes match your search keyword." : "No monthly passes purchased for this mess during this period yet."}
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date Sold</th>
                    <th className="py-3 px-4">Pass Code</th>
                    <th className="py-3 px-4">Dining Plan</th>
                    <th className="py-3 px-4">Student Details</th>
                    <th className="py-3 px-4 text-center">Tokens</th>
                    <th className="py-3 px-4 text-right">Mess Income</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                  {filteredPasses.map((sub) => (
                    <tr key={sub.id} className="hover:bg-stone-50/80 transition">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-stone-900">{sub.date}</div>
                        <div className="text-[10px] text-stone-400">Monthly Pass</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                          {sub.passCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900">{sub.planName}</div>
                        <div className="text-[10px] text-stone-500 uppercase font-semibold">{sub.category}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-900">{sub.customerName}</div>
                        <div className="text-[10px] text-stone-500">{sub.customerPhone || sub.customerEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="font-bold text-stone-900">{sub.totalTokens}</span>
                        <span className="text-[10px] text-stone-400"> ({sub.remainingTokens} left)</span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-black text-emerald-600 text-sm">
                        ₹{Number(sub.priceEarned || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sub.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-stone-100 text-stone-600 border border-stone-200"
                        }`}>
                          {sub.status === "active" ? "Active" : sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
