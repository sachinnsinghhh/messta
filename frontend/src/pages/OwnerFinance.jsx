import { API_BASE_URL } from "../config/api";
import { useState, useEffect, useMemo, Fragment } from "react";
import { Link } from "react-router-dom";
import { useActiveMess } from "../context/useActiveMess";

const EXPENSE_CATEGORIES = [
  { key: "lpg_gas", label: "Commercial LPG Gas", color: "bg-stone-50 text-stone-700 border-stone-200" },
  { key: "electricity", label: "Electricity & Power", color: "bg-stone-50 text-stone-700 border-stone-200" },
  { key: "rent", label: "Mess Premises Rent", color: "bg-stone-50 text-stone-700 border-stone-200" },
  { key: "inventory_purchase", label: "Vegetables & Kitchen Rations", color: "bg-stone-50 text-stone-700 border-stone-200" },
  { key: "staff_payroll", label: "Staff Payroll & Wages", color: "bg-stone-50 text-stone-700 border-stone-200" },
  { key: "kitchen_maintenance", label: "Equipment & Burner Repair", color: "bg-stone-50 text-stone-700 border-stone-200" },
  { key: "water_supply", label: "Water Tanker & RO Service", color: "bg-stone-50 text-stone-700 border-stone-200" },
  { key: "packaging_disposables", label: "Takeaway Boxes & Disposables", color: "bg-stone-50 text-stone-700 border-stone-200" },
  { key: "misc_overhead", label: "General & Miscellaneous Overhead", color: "bg-stone-50 text-stone-700 border-stone-200" },
];

export default function OwnerFinance() {
  const { allMesses, activeMessId, activeMess, loadingMesses, switchMess } = useActiveMess();

  // Evaluation Period: Primary evaluation on Monthly and Yearly basis
  const [evalPeriod, setEvalPeriod] = useState("month"); // "month" | "year"
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // e.g. "2026-10"
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString()); // e.g. "2026"

  // Active Navigation Tab
  // "overview" | "expenses" | "revenue" | "daily-log" | "settlements"
  const [activeTab, setActiveTab] = useState("overview");

  // Data States
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [dailyLog, setDailyLog] = useState([]);
  const [monthlyTrajectory, setMonthlyTrajectory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [walletInfo, setWalletInfo] = useState(null);
  const [walletLedger, setWalletLedger] = useState([]);

  // Filter States
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");
  const [expenseSourceFilter, setExpenseSourceFilter] = useState("all");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [dailyLogSearch, setDailyLogSearch] = useState("");
  const [expandedDay, setExpandedDay] = useState(null);
  const [daySubTab, setDaySubTab] = useState({});

  // Modal States: Add Expenditure
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("lpg_gas");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseTax, setExpenseTax] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [expensePaymentMode, setExpensePaymentMode] = useState("upi_qr");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: "", type: "" });

  // Generate Month Options for Evaluated Month Selector (Past 18 Months)
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

  // Year options for Yearly Evaluation
  const yearOptions = ["2026", "2025", "2024"];

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
        year: selectedYear,
      });

      const [summaryRes, ledgerRes, settlementRes, walletRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/finance/mess/${activeMessId}/summary?${queryParams.toString()}`),
        fetch(`${API_BASE_URL}/api/finance/mess/${activeMessId}/transactions`),
        fetch(`${API_BASE_URL}/api/finance/mess/${activeMessId}/settlements`),
        fetch(`${API_BASE_URL}/api/wallet/mess/${activeMessId}`).catch(() => null),
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data.summary || null);
        setDailyLog(data.dailyLog || []);
        setMonthlyTrajectory(data.monthlyTrajectory || []);
      }

      if (ledgerRes.ok) {
        const data = await ledgerRes.json();
        setTransactions(data.transactions || []);
      }

      if (settlementRes.ok) {
        const data = await settlementRes.json();
        setSettlements(data.settlements || []);
      }

      if (walletRes && walletRes.ok) {
        const wData = await walletRes.json();
        setWalletInfo(wData.wallet);
        setWalletLedger(wData.ledger || []);
      }
    } catch (err) {
      console.error("Failed to load finance data:", err);
      setFeedback({ text: "Could not sync finance data with server.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, [activeMessId, evalPeriod, selectedMonth, selectedYear]);

  // Handle Add Expenditure
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseAmount || Number(expenseAmount) <= 0) {
      setFeedback({ text: "Please enter a valid title and expenditure amount.", type: "error" });
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/finance/mess/${activeMessId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: expenseTitle.trim(),
          category: expenseCategory,
          grossAmount: Number(expenseAmount),
          taxAmount: Number(expenseTax || 0),
          transactionDate: expenseDate,
          paymentMode: expensePaymentMode,
          description: expenseDescription.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ text: `Expenditure "${expenseTitle}" recorded successfully! ✨`, type: "success" });
        setShowExpenseModal(false);
        setExpenseTitle("");
        setExpenseAmount("");
        setExpenseTax("");
        setExpenseDescription("");
        setExpenseDate(new Date().toISOString().split("T")[0]);
        await loadFinanceData();
      } else {
        setFeedback({ text: data.message || "Failed to record expenditure.", type: "error" });
      }
    } catch (err) {
      console.error("Failed to log expense:", err);
      setFeedback({ text: "Server error logging expenditure.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Preset Clicker for Expenditures
  const handleApplyPreset = (preset) => {
    setExpenseTitle(preset.title);
    setExpenseCategory(preset.category);
    setExpenseAmount(preset.amount);
    setExpensePaymentMode(preset.paymentMode);
    setExpenseDescription(preset.desc);
  };

  // Delete transaction
  const handleDeleteTransaction = async (txId, title) => {
    if (!window.confirm(`Are you sure you want to void the expense "${title || 'this transaction'}"?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/finance/mess/${activeMessId}/transactions/${txId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFeedback({ text: "Expense voided from ledger.", type: "success" });
        loadFinanceData();
      }
    } catch (err) {
      console.error("Failed to delete transaction:", err);
    }
  };

  // Export P&L report as CSV
  const handleExportCSV = () => {
    if (!dailyLog.length && !transactions.length) return;
    const headers = ["Date", "Day", "Revenue (₹)", "Expenditure (₹)", "Net Cashflow (₹)", "Plates Served", "Details"];
    const rows = dailyLog.map((d) => [
      d.date,
      d.dayName,
      d.totalRevenue,
      d.totalExpense,
      d.netCashflow,
      d.platesCount || 0,
      `"${(d.events || []).join("; ").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Messta_Financials_${activeMess?.name || "Mess"}_${evalPeriod === "month" ? selectedMonth : selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Consolidated Expenditures List: includes auto-synced Staff & Inventory alongside manual entries
  const consolidatedExpenditures = useMemo(() => {
    const list = [];

    // Auto-synced row: Staff Payroll
    if (summary?.staffPayrollExpense) {
      list.push({
        _id: "auto_staff_payroll",
        isAuto: true,
        sourceLabel: "Staff Records",
        category: "staff_payroll",
        title: `Staff Payroll & Wages (${evalPeriod === "month" ? "Monthly Total" : "Yearly Total"})`,
        description: `${summary?.staffCount || 4} Active Personnel (${summary?.monthlyStaffCount || 0} Monthly Fixed + ${summary?.dailyWageStaffCount || 0} Daily Wage Helpers)`,
        netAmount: summary.staffPayrollExpense,
        paymentMode: "bank_neft",
        transactionDate: `${selectedMonth}-01`,
      });
    }

    // Auto-synced row: Kitchen Inventory Procurement
    if (summary?.inventoryProcurementExpense) {
      list.push({
        _id: "auto_inventory_procurement",
        isAuto: true,
        sourceLabel: "Inventory Records",
        category: "inventory_purchase",
        title: `Kitchen Inventory & Rations (${evalPeriod === "month" ? "Monthly Total" : "Yearly Total"})`,
        description: `${summary?.inventoryRestockCount || 6} Mandi & Grocery Restock Purchases Accounted`,
        netAmount: summary.inventoryProcurementExpense,
        paymentMode: "cash",
        transactionDate: `${selectedMonth}-01`,
      });
    }

    // Manual transactions
    transactions
      .filter((t) => t.type === "outflow")
      .forEach((t) => {
        list.push({
          ...t,
          isAuto: false,
          sourceLabel: "Manual Entry",
        });
      });

    return list;
  }, [summary, transactions, evalPeriod, selectedMonth]);

  // Filtered Expenditures
  const filteredExpenditures = useMemo(() => {
    return consolidatedExpenditures.filter((item) => {
      const matchesCategory = expenseCategoryFilter === "all" || item.category === expenseCategoryFilter;
      const matchesSource =
        expenseSourceFilter === "all" ||
        (expenseSourceFilter === "auto" && item.isAuto) ||
        (expenseSourceFilter === "manual" && !item.isAuto);

      const q = expenseSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q);

      return matchesCategory && matchesSource && matchesSearch;
    });
  }, [consolidatedExpenditures, expenseCategoryFilter, expenseSourceFilter, expenseSearch]);

  // Filtered Daily Log
  const filteredDailyLog = useMemo(() => {
    if (!dailyLogSearch.trim()) return dailyLog;
    const q = dailyLogSearch.toLowerCase().trim();
    return dailyLog.filter(
      (d) =>
        d.date?.includes(q) ||
        d.dayName?.toLowerCase().includes(q) ||
        (d.events || []).some((ev) => ev.toLowerCase().includes(q))
    );
  }, [dailyLog, dailyLogSearch]);

  return (
    <div className="min-h-screen bg-stone-50/60 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      
      {/* ── TOP HEADER & EVALUATION TIME CONTROLLER ── */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wide">
              {activeMess?.name || "Active Mess"} • Commercial Ledger
            </span>
            {loading && (
              <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                Updating...
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            Finances & Cash Flow
          </h1>
          <p className="text-xs text-stone-500 max-w-2xl">
            Unified monthly and annual performance. Track dining receipts, log daily expenditures, and review bank payouts.
          </p>
        </div>

        {/* Evaluation Period Selector (Monthly vs Yearly) & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Multi-Mess Outlet Switcher */}
          <div className="relative">
            <select
              value={activeMessId}
              onChange={(e) => switchMess(e.target.value)}
              disabled={loadingMesses}
              className="bg-stone-50 border border-stone-300 rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer"
            >
              {allMesses.map((m) => (
                <option key={m.id || m._id} value={m.id || m._id}>
                  {m.name} ({m.locality})
                </option>
              ))}
            </select>
          </div>

          {/* Period Mode Toggle: Monthly vs Yearly */}
          <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs">
            <button
              type="button"
              onClick={() => setEvalPeriod("month")}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                evalPeriod === "month" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setEvalPeriod("year")}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                evalPeriod === "year" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Yearly
            </button>
          </div>

          {/* If Monthly Mode: Month Dropdown + Steppers */}
          {evalPeriod === "month" ? (
            <div className="flex items-center gap-1 bg-stone-50 border border-stone-300 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => handleStepMonth(-1)}
                className="w-6 h-6 flex items-center justify-center rounded-md text-stone-600 hover:bg-stone-200 transition"
                title="Previous Month"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none text-stone-900 font-medium text-xs py-1 px-1.5 focus:outline-none cursor-pointer"
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
                className="w-6 h-6 flex items-center justify-center rounded-md text-stone-600 hover:bg-stone-200 transition"
                title="Next Month"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ) : (
            /* If Yearly Mode: Year Dropdown */
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-stone-50 border border-stone-300 text-stone-900 font-medium text-xs rounded-lg py-2 pl-3 pr-8 focus:outline-none"
              >
                {yearOptions.map((yr) => (
                  <option key={yr} value={yr}>
                    Year {yr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Action: Add Expenditure */}
          <button
            type="button"
            onClick={() => {
              setExpenseTitle("");
              setExpenseAmount("");
              setExpenseTax("");
              setExpenseDescription("");
              setExpenseDate(new Date().toISOString().split("T")[0]);
              setShowExpenseModal(true);
            }}
            className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-medium text-xs rounded-lg shadow-xs transition flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Record Expense</span>
          </button>

          {/* Export Report */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-medium text-xs rounded-lg transition flex items-center gap-1.5"
            title="Download CSV report"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* ── FEEDBACK ALERT ── */}
      {feedback.text && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback({ text: "", type: "" })} className="text-stone-400 hover:text-stone-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── TOP 4 EXECUTIVE KPI CARDS (EVALUATED FOR MONTH / YEAR) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Revenue (Inflow) */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2.5">
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-[10px] font-medium uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Total Inflow
            </span>
          </div>
          <div>
            <span className="text-2xl font-bold text-stone-900 block font-mono">
              ₹{(summary?.totalRevenue || 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-stone-500">
              Net Inflow: ₹{(summary?.netRevenue || 0).toLocaleString()}
            </span>
          </div>
          <div className="pt-2 border-t border-stone-100 text-[11px] space-y-0.5">
            <div className="flex justify-between text-stone-600">
              <span>Membership Passes:</span>
              <span className="text-stone-900 font-mono font-medium">₹{(summary?.membershipRevenue || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Walk-in Per-Plate:</span>
              <span className="text-stone-900 font-mono font-medium">₹{(summary?.perPlateRevenue || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Operating Expenditures (Outflow) */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2.5">
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
            <span className="text-[10px] font-medium uppercase text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
              Total Outflow
            </span>
          </div>
          <div>
            <span className="text-2xl font-bold text-stone-900 block font-mono">
              ₹{(summary?.totalExpenditures || 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-stone-500">
              {evalPeriod === "month" ? "Monthly Expenditure" : "Yearly Expenditure"}
            </span>
          </div>
          <div className="pt-2 border-t border-stone-100 text-[11px] space-y-0.5">
            <div className="flex justify-between text-stone-600">
              <span>Staff Wages:</span>
              <span className="font-mono font-medium text-stone-900">₹{(summary?.staffPayrollExpense || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Kitchen Stock:</span>
              <span className="font-mono font-medium text-stone-900">₹{(summary?.inventoryProcurementExpense || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Rent & Overheads:</span>
              <span className="font-mono font-medium text-stone-900">₹{(summary?.manualOverheadsExpense || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Real Net Bottom Line Profit */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2.5">
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center border border-stone-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span
              className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-md border ${
                (summary?.netProfit || 0) >= 0
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              {(summary?.netProfit || 0) >= 0 ? "Net Profit" : "Net Deficit"}
            </span>
          </div>
          <div>
            <span
              className={`text-2xl font-bold block font-mono ${
                (summary?.netProfit || 0) >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {(summary?.netProfit || 0) >= 0 ? "+" : ""}₹{(summary?.netProfit || 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-stone-500">
              Net Bottom Line
            </span>
          </div>
          <div className="pt-2 border-t border-stone-100 text-[11px] space-y-0.5">
            <div className="flex justify-between text-stone-600">
              <span>Profit Margin:</span>
              <span className="font-mono font-medium text-emerald-700">+{summary?.profitMargin || 0}%</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Financial Status:</span>
              <span className="font-medium text-stone-800">{summary?.healthStatus || "Healthy"}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Escrow & Cleared to Bank */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2.5">
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <span className="text-[10px] font-medium uppercase text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
              Bank Settlements
            </span>
          </div>
          <div>
            <span className="text-2xl font-bold text-stone-900 block font-mono">
              ₹{(summary?.settledToBank || 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-stone-500">
              Settled to Bank Account
            </span>
          </div>
          <div className="pt-2 border-t border-stone-100 text-[11px] space-y-0.5">
            <div className="flex justify-between text-stone-600">
              <span>Pending Settlement:</span>
              <span className="font-mono font-medium text-amber-700">₹{(summary?.pendingSettlement || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Gateway Fees:</span>
              <span className="font-mono text-stone-700">₹{(summary?.gatewayFees || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── 5 NAVIGATION TABS ── */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-2">
        {[
          { key: "overview", label: "P&L Statement", count: null },
          { key: "expenses", label: "Expenditures", count: filteredExpenditures.length },
          { key: "revenue", label: "Revenue Ledger", count: null },
          { key: "daily-log", label: "Daily Activity Log", count: `${dailyLog.length} Days` },
          { key: "settlements", label: "Wallet & Settlements", count: settlements.length },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
              activeTab === tab.key
                ? "bg-stone-900 text-white shadow-xs"
                : "bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  activeTab === tab.key ? "bg-stone-700 text-stone-200" : "bg-stone-100 text-stone-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: P&L STATEMENT & REVENUE/EXPENDITURE STREAMS ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Side-by-Side Inflow vs Outflow Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Column 1: Earnings & Inflow Streams */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                    Gross Inflows
                  </span>
                  <h3 className="text-lg font-black text-gray-900">Earnings & Revenue Streams</h3>
                </div>
                <span className="text-xs font-mono font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                  ₹{(summary?.totalRevenue || 0).toLocaleString()} Total
                </span>
              </div>

              <div className="space-y-3">
                {/* Stream 1: Subscriptions */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 bg-white rounded-xl border border-gray-100">🎫</span>
                    <div>
                      <h4 className="text-xs font-black text-gray-900">Membership Passes & Subscriptions</h4>
                      <p className="text-[11px] text-gray-500">
                        {summary?.membershipSubscribersCount || 0} Active Student Meal Passholders
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-gray-900 font-mono block">
                      ₹{(summary?.membershipRevenue || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">
                      {Math.round(((summary?.membershipRevenue || 0) / (summary?.totalRevenue || 1)) * 100)}% of Inflow
                    </span>
                  </div>
                </div>

                {/* Stream 2: Per-Plate Meals */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 bg-white rounded-xl border border-gray-100">🍽️</span>
                    <div>
                      <h4 className="text-xs font-black text-gray-900">Per-Plate Walk-In Meals & Counter Sales</h4>
                      <p className="text-[11px] text-gray-500">
                        {summary?.perPlateCount || 0} Direct QR & Cash Thali Sales
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-gray-900 font-mono block">
                      ₹{(summary?.perPlateRevenue || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">
                      {Math.round(((summary?.perPlateRevenue || 0) / (summary?.totalRevenue || 1)) * 100)}% of Inflow
                    </span>
                  </div>
                </div>
              </div>

              {/* Net realization note */}
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-[11px] text-emerald-950 flex items-center justify-between">
                <span>Net Inflow (After 2.36% Gateway / UPI Settle):</span>
                <strong className="font-mono font-black text-emerald-800">₹{(summary?.netRevenue || 0).toLocaleString()}</strong>
              </div>
            </div>

            {/* Column 2: Expenditures & Outflow Streams */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">
                    Operational Costs
                  </span>
                  <h3 className="text-lg font-black text-gray-900">Expenditure Streams</h3>
                </div>
                <span className="text-xs font-mono font-black text-rose-700 bg-rose-50 px-3 py-1 rounded-xl border border-rose-200">
                  ₹{(summary?.totalExpenditures || 0).toLocaleString()} Total
                </span>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                
                {/* Outflow 1: Staff Payroll (Auto-Calculated) */}
                <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-200/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl p-1.5 bg-white rounded-xl border border-purple-100">👥</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-gray-900">Staff Payroll & Daily Wages</h4>
                        <span className="text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                          ⚡ Auto-Synced
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        {summary?.staffCount || 4} Staff ({summary?.monthlyStaffCount || 0} Monthly + {summary?.dailyWageStaffCount || 0} Daily Helpers)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-purple-950 font-mono block">
                      ₹{(summary?.staffPayrollExpense || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 block">
                      Wages & Payroll
                    </span>
                  </div>
                </div>

                {/* Outflow 2: Kitchen Stock Procurement (Auto-Calculated) */}
                <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl p-1.5 bg-white rounded-xl border border-emerald-100">🥦</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-gray-900">Kitchen Ration & Vegetable Stock</h4>
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                          ⚡ Auto-Synced
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        {summary?.inventoryRestockCount || 6} Mandi & Grocery Invoices Accounted
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-950 font-mono block">
                      ₹{(summary?.inventoryProcurementExpense || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 block">
                      Rations & Groceries
                    </span>
                  </div>
                </div>

                {/* Outflow 3: Mess Rent */}
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200/70 flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-800 flex items-center gap-1.5">
                    <span>🏬</span> Mess Premises Rent:
                  </span>
                  <span className="font-mono font-black text-gray-900">₹{(summary?.rentExpense || 0).toLocaleString()}</span>
                </div>

                {/* Outflow 4: Commercial LPG & Power */}
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200/70 flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-800 flex items-center gap-1.5">
                    <span>⛽</span> Commercial LPG Gas Cylinders:
                  </span>
                  <span className="font-mono font-black text-gray-900">₹{(summary?.lpgGasExpense || 0).toLocaleString()}</span>
                </div>

                {/* Outflow 5: Electricity & Power */}
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200/70 flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-800 flex items-center gap-1.5">
                    <span>⚡</span> Electricity & Power Bill:
                  </span>
                  <span className="font-mono font-black text-gray-900">₹{(summary?.electricityExpense || 0).toLocaleString()}</span>
                </div>

                {/* Outflow 6: Water & Repairs */}
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200/70 flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-800 flex items-center gap-1.5">
                    <span>🔧</span> Water, Maintenance & Packaging:
                  </span>
                  <span className="font-mono font-black text-gray-900">
                    ₹{(
                      (summary?.waterExpense || 0) +
                      (summary?.maintenanceExpense || 0) +
                      (summary?.packagingExpense || 0) +
                      (summary?.miscExpense || 0)
                    ).toLocaleString()}
                  </span>
                </div>

              </div>
            </div>

          </div>

          {/* Yearly 12-Month Trajectory (if Year Selected) */}
          {evalPeriod === "year" && monthlyTrajectory.length > 0 && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">
                    12-Month Annual Financial Performance
                  </span>
                  <h3 className="text-lg font-black text-gray-900">Year {selectedYear} Trajectory</h3>
                </div>
                <span className="text-xs font-bold text-gray-500">
                  Month-by-Month Earnings vs Outflows
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-[10px] font-black uppercase text-gray-400">
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3 text-right">Revenue (Inflow)</th>
                      <th className="py-2.5 px-3 text-right">Expenditures</th>
                      <th className="py-2.5 px-3 text-right">Net Profit</th>
                      <th className="py-2.5 px-3 text-right">Margin %</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {monthlyTrajectory.map((m) => (
                      <tr key={m.monthCode} className={`hover:bg-gray-50 transition ${m.isCurrent ? "bg-orange-50/40" : ""}`}>
                        <td className="py-3 px-3 font-bold text-gray-900 flex items-center gap-1.5">
                          <span>{m.monthName}</span>
                          {m.isCurrent && (
                            <span className="text-[9px] font-black uppercase bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded">
                              Current
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                          ₹{(m.revenue || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                          ₹{(m.expenditure || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-gray-900">
                          +₹{(m.netProfit || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-gray-700">
                          +{m.profitMargin || 0}%
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                            ✓ Positive
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: EXPENDITURES & ADD EXPENSE MANAGEMENT ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "expenses" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header Action Banner */}
          <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 p-6 rounded-3xl border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-100 px-2.5 py-0.5 rounded-full">
                Expenditure Accounting
              </span>
              <h3 className="text-xl font-black text-gray-900 mt-1">
                Unified Mess Expenditures
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Staff wages & inventory purchases are automatically synced. Record premises rent, electricity, commercial LPG, and maintenance below.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setExpenseTitle("");
                setExpenseAmount("");
                setExpenseTax("");
                setExpenseDescription("");
                setExpenseDate(new Date().toISOString().split("T")[0]);
                setShowExpenseModal(true);
              }}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-black text-xs uppercase rounded-2xl shadow-xs transition flex items-center gap-1.5"
            >
              <span>✏️</span>
              <span>+ Record New Expenditure</span>
            </button>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase text-gray-400">Category:</span>
              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="p-1.5 px-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-800"
              >
                <option value="all">All Categories</option>
                <option value="staff_payroll">Staff Payroll</option>
                <option value="inventory_purchase">Kitchen Inventory</option>
                <option value="rent">Mess Rent</option>
                <option value="lpg_gas">LPG Gas</option>
                <option value="electricity">Electricity</option>
                <option value="water_supply">Water Tanker</option>
                <option value="kitchen_maintenance">Maintenance</option>
                <option value="packaging_disposables">Packaging</option>
                <option value="misc_overhead">Miscellaneous</option>
              </select>

              <span className="text-xs text-stone-500 font-medium ml-2">Source:</span>
              <select
                value={expenseSourceFilter}
                onChange={(e) => setExpenseSourceFilter(e.target.value)}
                className="p-1.5 px-2.5 text-xs bg-white border border-stone-300 rounded-lg text-stone-800"
              >
                <option value="all">All Sources</option>
                <option value="auto">Auto-Calculated Only</option>
                <option value="manual">Manual Entries Only</option>
              </select>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search expenditures..."
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                className="w-full p-2 text-xs bg-gray-50 border border-gray-200 rounded-xl font-bold focus:bg-white"
              />
            </div>
          </div>

          {/* Expenditures Table */}
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-gray-700">
                Expenditures Log ({filteredExpenditures.length} Items)
              </span>
              <span className="text-xs font-mono font-black text-rose-700">
                Total: ₹{(summary?.totalExpenditures || 0).toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Expenditure Item</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredExpenditures.map((item) => {
                    const catObj = EXPENSE_CATEGORIES.find((c) => c.key === item.category) || {
                      label: item.category,
                      color: "bg-gray-100 text-gray-700 border-gray-200",
                    };

                    return (
                      <tr key={item._id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-gray-700 whitespace-nowrap">
                          {item.transactionDate ? item.transactionDate.slice(0, 10) : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-gray-900 block leading-tight">{item.title}</span>
                          {item.description && (
                            <span className="text-[11px] text-gray-500 mt-0.5 block">{item.description}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${catObj.color}`}>
                            {catObj.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {item.isAuto ? (
                            <span className="text-[9px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                              <span>⚡</span>
                              <span>{item.sourceLabel}</span>
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 uppercase text-[10px] font-extrabold text-gray-600">
                          {item.paymentMode || "Cash"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-rose-600 whitespace-nowrap">
                          ₹{Number(item.netAmount || item.grossAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.isAuto ? (
                            item.actionLink ? (
                              <Link
                                to={item.actionLink}
                                className="px-2 py-1 bg-gray-100 hover:bg-orange-100 text-orange-700 text-[10px] font-bold rounded-lg transition"
                              >
                                Manage ➔
                              </Link>
                            ) : (
                              <span className="text-[10px] font-bold text-gray-400">
                                Auto
                              </span>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(item._id, item.title)}
                              className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition"
                              title="Void expense"
                            >
                              🗑️
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: EARNINGS & REVENUE LEDGER ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "revenue" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Revenue Stream Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl p-2 bg-white/20 rounded-xl backdrop-blur-xs">🎫</span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                  Subscription Engine
                </span>
              </div>
              <div>
                <span className="text-3xl font-black block font-mono">
                  ₹{(summary?.membershipRevenue || 0).toLocaleString()}
                </span>
                <h3 className="text-sm font-black text-emerald-100 mt-1">
                  Membership Passes & Recurring Plans
                </h3>
              </div>
              <p className="text-xs text-emerald-100">
                {summary?.membershipSubscribersCount || 0} enrolled student passholders enjoying daily token allotments.
              </p>
              <div className="pt-2 border-t border-white/20 flex justify-between items-center text-xs">
                <span>Plan CRM & Subscribers:</span>
                <Link to="/owner/plans" className="font-extrabold underline hover:text-emerald-200">
                  Open CRM ➔
                </Link>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl p-2 bg-white/20 rounded-xl backdrop-blur-xs">🍽️</span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                  Walk-In Counter
                </span>
              </div>
              <div>
                <span className="text-3xl font-black block font-mono">
                  ₹{(summary?.perPlateRevenue || 0).toLocaleString()}
                </span>
                <h3 className="text-sm font-black text-orange-100 mt-1">
                  Per-Plate Meals & Walk-In QR Sales
                </h3>
              </div>
              <p className="text-xs text-orange-100">
                {summary?.perPlateCount || 0} direct per-plate meals served to non-subscription visitors & walk-ins.
              </p>
              <div className="pt-2 border-t border-white/20 flex justify-between items-center text-xs">
                <span>Live Counter QR Scanner:</span>
                <Link to="/owner" className="font-extrabold underline hover:text-orange-200">
                  Open Scanner ➔
                </Link>
              </div>
            </div>

          </div>

          {/* Revenue Ledger Table */}
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-gray-700">
                Recent Revenue Inflow Records
              </span>
              <span className="text-xs font-mono font-black text-emerald-700">
                Gross Inflow: ₹{(summary?.totalRevenue || 0).toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Revenue Stream</th>
                    <th className="py-3 px-4">Source Title</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4 text-right">Gross Amount</th>
                    <th className="py-3 px-4 text-right">Net Cleared</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-gray-700">{selectedMonth}-01</td>
                    <td className="py-3 px-4">
                      <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                        🎫 Membership Passes
                      </span>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-gray-900">
                      All Monthly Student Pass Renewals ({summary?.membershipSubscribersCount || 0} Students)
                    </td>
                    <td className="py-3 px-4 text-gray-500 font-bold uppercase text-[10px]">Messta Gateway</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                      ₹{(summary?.membershipRevenue || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-700">
                      ₹{Math.round((summary?.membershipRevenue || 0) * 0.9764).toLocaleString()}
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-gray-700">{selectedMonth}-15</td>
                    <td className="py-3 px-4">
                      <span className="text-[9px] font-black uppercase bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 rounded-full">
                        🍽️ Walk-In Meals
                      </span>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-gray-900">
                      Direct Single-Thali Sales ({summary?.perPlateCount || 0} Plates)
                    </td>
                    <td className="py-3 px-4 text-gray-500 font-bold uppercase text-[10px]">UPI QR / Cash</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                      ₹{(summary?.perPlateRevenue || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-700">
                      ₹{Math.round((summary?.perPlateRevenue || 0) * 0.9764).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: DAY-BY-DAY FINANCIAL ACTIVITY LOG ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "daily-log" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header Explanation */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                Daily Financial Ledger
              </span>
              <h3 className="text-xl font-black text-gray-900 mt-1">
                Day-by-Day Activity Log ({evalPeriod === "month" ? summary?.evaluatedMonthName || selectedMonth : selectedYear})
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Every calendar day itemizes walk-in & pass earnings, auto-calculated staff shifts, inventory stock additions, and net daily cashflow.
              </p>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search day or activity..."
                value={dailyLogSearch}
                onChange={(e) => setDailyLogSearch(e.target.value)}
                className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl font-bold focus:bg-white"
              />
            </div>
          </div>

          {/* Daily Log Table */}
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-gray-700">
                Daily Ledger Records ({filteredDailyLog.length} Days)
              </span>
              <span className="text-[11px] font-bold text-gray-500">
                Showing newest calendar days first • Click any row to expand activities
              </span>
            </div>

            <div className="overflow-x-auto max-h-[65vh]">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 sticky top-0 text-[10px] font-black uppercase text-gray-400 border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Date & Day</th>
                    <th className="py-3 px-4">Revenue (Inflow)</th>
                    <th className="py-3 px-4">Expenditures</th>
                    <th className="py-3 px-4 text-center">Net Daily Cashflow</th>
                    <th className="py-3 px-4 text-right">Plates Served</th>
                    <th className="py-3 px-4 text-center">Activities & Highlights</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDailyLog.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-gray-400 font-bold">
                        No daily activity records found for this period.
                      </td>
                    </tr>
                  ) : (
                    filteredDailyLog.map((day) => {
                      const net = Number(day.netCashflow) || 0;
                      const isPositive = net >= 0;
                      const isExpanded = expandedDay === day.date;

                      return (
                        <Fragment key={day.date}>
                          <tr
                            onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                            className="hover:bg-orange-50/40 cursor-pointer transition"
                          >
                            <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                              <span className="font-extrabold text-gray-900 block">{day.formattedDate || day.date}</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase">{day.dayName}</span>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-mono font-black text-emerald-700 block text-xs">
                                +₹{(day.totalRevenue || 0).toLocaleString()}
                              </span>
                              <span className="text-[10px] text-gray-400 font-bold">
                                ₹{(day.perPlateRevenue || 0).toLocaleString()} walk-in • ₹{(day.membershipRevenue || 0).toLocaleString()} pass
                              </span>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-mono font-black text-rose-600 block text-xs">
                                -₹{(day.totalExpense || 0).toLocaleString()}
                              </span>
                              <span className="text-[10px] text-gray-400 font-bold">
                                ₹{(day.inventoryExpense || 0).toLocaleString()} stock • ₹{(day.staffExpense || 0).toLocaleString()} staff
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-mono font-black border ${
                                  isPositive
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-red-50 text-red-800 border-red-200"
                                }`}
                              >
                                {isPositive ? "+" : ""}₹{net.toLocaleString()}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right font-mono font-extrabold text-gray-800 whitespace-nowrap">
                              {day.platesCount || 0} plates
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 text-[10px] font-bold transition flex items-center gap-1 mx-auto"
                              >
                                <span>{isExpanded ? "▲ Hide" : "▼ Details"}</span>
                              </button>
                            </td>
                          </tr>

                          {/* Expandable Daily Activity Details Drawer */}
                          {isExpanded && (
                            <tr className="bg-orange-50/20">
                              <td colSpan={6} className="p-4 sm:px-6 border-y border-orange-100">
                                <div className="bg-white p-5 rounded-3xl border border-orange-200/90 shadow-sm space-y-4">
                                  
                                  {/* Drawer Header & Sub-Tabs */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                                    <div>
                                      <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">
                                        Day Ledger Inspection
                                      </span>
                                      <h4 className="text-sm font-black text-gray-900">
                                        Itemized Activity for {day.formattedDate || day.date}
                                      </h4>
                                    </div>

                                    {/* Sub-Tab Navigation inside Day Drawer */}
                                    <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl border border-gray-200/80 shadow-2xs">
                                      <button
                                        type="button"
                                        onClick={() => setDaySubTab({ ...daySubTab, [day.date]: "payments" })}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                                          (daySubTab[day.date] || "payments") === "payments"
                                            ? "bg-emerald-600 text-white shadow-2xs"
                                            : "text-gray-700 hover:text-gray-900"
                                        }`}
                                      >
                                        <span>💰</span>
                                        <span>Customer Payments ({day.paymentDetails?.length || 0})</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setDaySubTab({ ...daySubTab, [day.date]: "expenses" })}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                                          daySubTab[day.date] === "expenses"
                                            ? "bg-rose-600 text-white shadow-2xs"
                                            : "text-gray-700 hover:text-gray-900"
                                        }`}
                                      >
                                        <span>💸</span>
                                        <span>Day Expenses ({day.expenseDetails?.length || 0})</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setDaySubTab({ ...daySubTab, [day.date]: "highlights" })}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                                          daySubTab[day.date] === "highlights"
                                            ? "bg-orange-600 text-white shadow-2xs"
                                            : "text-gray-700 hover:text-gray-900"
                                        }`}
                                      >
                                        <span>📋</span>
                                        <span>Summary Notes</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* SUB-VIEW 1: ITEM-BY-ITEM CUSTOMER PAYMENTS (WHO PAID & HOW MUCH) */}
                                  {(daySubTab[day.date] || "payments") === "payments" && (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                                        <span>Individual Student & Walk-In Payments Received:</span>
                                        <span className="font-mono font-black text-emerald-700">
                                          Total: +₹{(day.totalRevenue || 0).toLocaleString()}
                                        </span>
                                      </div>

                                      {!day.paymentDetails || day.paymentDetails.length === 0 ? (
                                        <p className="text-xs text-gray-400 py-6 text-center">
                                          No individual payments recorded for this day.
                                        </p>
                                      ) : (
                                        <div className="overflow-x-auto rounded-2xl border border-gray-200">
                                          <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b border-gray-200">
                                              <tr>
                                                <th className="py-2.5 px-3">Time</th>
                                                <th className="py-2.5 px-3">Student / Payer</th>
                                                <th className="py-2.5 px-3">Meal / Pass Item</th>
                                                <th className="py-2.5 px-3">Stream</th>
                                                <th className="py-2.5 px-3">Channel / Mode</th>
                                                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                                                <th className="py-2.5 px-3 text-center">Status</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                              {day.paymentDetails.map((pay) => (
                                                <tr key={pay.id} className="hover:bg-emerald-50/20 transition">
                                                  <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-gray-800">
                                                    {pay.time || "12:30 PM"}
                                                  </td>
                                                  <td className="py-2.5 px-3">
                                                    <span className="font-black text-gray-900 block">{pay.customerName}</span>
                                                    {pay.customerEmail && (
                                                      <span className="text-[10px] text-gray-400 font-mono block">
                                                        {pay.customerEmail}
                                                      </span>
                                                    )}
                                                  </td>
                                                  <td className="py-2.5 px-3 font-extrabold text-gray-800">
                                                    <span>{pay.itemTitle}</span>
                                                    {pay.mealSlot && (
                                                      <span className="text-[10px] text-gray-400 block font-normal">
                                                        {pay.mealSlot}
                                                      </span>
                                                    )}
                                                  </td>
                                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <span
                                                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                                        pay.type === "subscription"
                                                          ? "bg-purple-50 text-purple-700 border-purple-200"
                                                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                                      }`}
                                                    >
                                                      {pay.typeLabel || "🍽️ Walk-In"}
                                                    </span>
                                                  </td>
                                                  <td className="py-2.5 px-3 text-[10px] font-extrabold text-gray-600 whitespace-nowrap">
                                                    {pay.paymentMode || "UPI QR"}
                                                  </td>
                                                  <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 whitespace-nowrap text-xs">
                                                    +₹{(pay.amount || 0).toLocaleString()}
                                                  </td>
                                                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                      ✓ Cleared
                                                    </span>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                            <tfoot className="bg-emerald-50/60 border-t border-emerald-200 font-bold text-xs text-emerald-950">
                                              <tr>
                                                <td colSpan={5} className="py-2.5 px-3">
                                                  Total Payments Collected ({day.paymentDetails.length} transactions):
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800">
                                                  +₹{(day.totalRevenue || 0).toLocaleString()}
                                                </td>
                                                <td></td>
                                              </tr>
                                            </tfoot>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* SUB-VIEW 2: ITEM-BY-ITEM EXPENDITURES RECORDED */}
                                  {daySubTab[day.date] === "expenses" && (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                                        <span>Expenditures Incurred on {day.formattedDate || day.date}:</span>
                                        <span className="font-mono font-black text-rose-700">
                                          Total: -₹{(day.totalExpense || 0).toLocaleString()}
                                        </span>
                                      </div>

                                      {!day.expenseDetails || day.expenseDetails.length === 0 ? (
                                        <p className="text-xs text-gray-400 py-6 text-center">
                                          No operational expenses recorded for this day.
                                        </p>
                                      ) : (
                                        <div className="overflow-x-auto rounded-2xl border border-gray-200">
                                          <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b border-gray-200">
                                              <tr>
                                                <th className="py-2.5 px-3">Expense Item / Payee</th>
                                                <th className="py-2.5 px-3">Category</th>
                                                <th className="py-2.5 px-3">Payment Channel</th>
                                                <th className="py-2.5 px-3">Notes / Purpose</th>
                                                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                              {day.expenseDetails.map((exp) => (
                                                <tr key={exp.id} className="hover:bg-rose-50/20 transition">
                                                  <td className="py-2.5 px-3 font-extrabold text-gray-900">
                                                    {exp.title}
                                                  </td>
                                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md border bg-gray-100 text-gray-700 border-gray-200">
                                                      {exp.categoryLabel || exp.category}
                                                    </span>
                                                  </td>
                                                  <td className="py-2.5 px-3 text-[10px] font-extrabold text-gray-600">
                                                    {exp.paymentMode || "Cash in Hand"}
                                                  </td>
                                                  <td className="py-2.5 px-3 text-gray-500 text-[11px]">
                                                    {exp.notes || "—"}
                                                  </td>
                                                  <td className="py-2.5 px-3 text-right font-mono font-black text-rose-600 whitespace-nowrap text-xs">
                                                    -₹{(exp.amount || 0).toLocaleString()}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                            <tfoot className="bg-rose-50/60 border-t border-rose-200 font-bold text-xs text-rose-950">
                                              <tr>
                                                <td colSpan={4} className="py-2.5 px-3">
                                                  Total Expenditures for Day:
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono font-black text-rose-800">
                                                  -₹{(day.totalExpense || 0).toLocaleString()}
                                                </td>
                                              </tr>
                                            </tfoot>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* SUB-VIEW 3: OPERATIONAL SUMMARY BULLETS */}
                                  {daySubTab[day.date] === "highlights" && (
                                    <div className="space-y-2">
                                      <span className="text-[10px] font-black uppercase text-gray-400 block">
                                        Summary Activity Log:
                                      </span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        {(day.events || []).map((ev, idx) => (
                                          <div key={idx} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200/70 font-medium text-gray-800">
                                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                            <span>{ev}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Day Net Cashflow Bar */}
                                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                    <span className="text-gray-600 font-bold">
                                      Day Net Summary:
                                    </span>
                                    <div className="flex items-center gap-3 font-mono font-black text-xs">
                                      <span className="text-emerald-700">Collected: +₹{(day.totalRevenue || 0).toLocaleString()}</span>
                                      <span className="text-gray-300">|</span>
                                      <span className="text-rose-600">Spent: -₹{(day.totalExpense || 0).toLocaleString()}</span>
                                      <span className="text-gray-300">|</span>
                                      <span className={net >= 0 ? "text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md" : "text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md"}>
                                        Net: {net >= 0 ? "+" : ""}₹{net.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 5: MESSTA VIRTUAL WALLET & BANK SETTLEMENTS ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "settlements" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Master Virtual Wallet Summary Card */}
          <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-purple-950 rounded-3xl p-6 sm:p-8 text-white border border-gray-800 shadow-md space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-900/60 px-3 py-0.5 rounded-full border border-purple-700/60 flex items-center gap-1.5">
                    <span>💼</span>
                    <span>Messta Multi-Tenant Virtual Escrow</span>
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                    Auto-Credited
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {walletInfo?.messName || activeMess?.name || "Partner Mess"} Virtual Wallet
                </h3>
              </div>

              <div className="p-3 bg-white/10 rounded-2xl border border-white/10 text-xs font-mono text-purple-200 flex items-center gap-2">
                <span>🏦</span>
                <span>{walletInfo?.payoutBankDetails?.bankName || "HDFC Bank"} •••• {walletInfo?.payoutBankDetails?.accountNumber?.slice(-4) || "4821"}</span>
              </div>
            </div>

            {/* Wallet Metric Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 space-y-1">
                <span className="text-[10px] font-black uppercase text-purple-300">Withdrawable Wallet Balance</span>
                <div className="text-3xl font-black text-white font-mono tracking-tight">
                  ₹{(walletInfo?.balance ?? summary?.pendingSettlement ?? 24500).toLocaleString("en-IN")}
                </div>
                <span className="text-[10px] text-amber-300 font-bold block">
                  Pending disbursement in next bank batch
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-400">Lifetime Gross Credited</span>
                <div className="text-2xl font-black text-white font-mono tracking-tight">
                  ₹{(walletInfo?.totalEarned ?? summary?.totalRevenue ?? 385000).toLocaleString("en-IN")}
                </div>
                <span className="text-[10px] text-gray-400 font-bold block">
                  Net credits after platform share
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-400">Total Payouts Disbursed</span>
                <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                  ₹{(walletInfo?.totalWithdrawn ?? summary?.settledToBank ?? 310500).toLocaleString("en-IN")}
                </div>
                <span className="text-[10px] text-emerald-300 font-bold block">
                  Cleared to registered account
                </span>
              </div>
            </div>

            {/* Educational Banner */}
            <div className="p-4 bg-purple-900/40 rounded-2xl border border-purple-700/50 text-xs text-purple-200 leading-relaxed space-y-1">
              <span className="font-black text-white block">💡 How your Messta Virtual Wallet operates:</span>
              <p className="text-[11px] text-purple-200/90">
                All student payments (monthly passes and per-plate walk-ins) made via the Messta Universal UPI QR arrive in our central escrow account. The system automatically slices Messta's platform commission (₹2 per plate or 4% on passes) and immediately credits your net share to this Virtual Wallet. The platform administrator triggers direct bank payouts to your registered bank account on a recurring schedule.
              </p>
            </div>
          </div>

          {/* Real-Time Split Passbook */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">
                  Real-Time Credit Passbook
                </span>
                <h3 className="text-lg font-black text-gray-900">
                  Student Meal QR Scans & Wallet Credits
                </h3>
                <p className="text-xs text-gray-500">
                  Every meal token and membership purchase credited to your digital wallet with itemized commission deduction.
                </p>
              </div>

              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-xl">
                {walletLedger.length} Ledger Records
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    <th className="py-3 px-4">Time & Student</th>
                    <th className="py-3 px-4">Payment Source</th>
                    <th className="py-3 px-4 text-right">Gross Paid</th>
                    <th className="py-3 px-4 text-right">Platform Cut (Fee)</th>
                    <th className="py-3 px-4 text-right">Credited to Wallet</th>
                    <th className="py-3 px-4 text-right">Running Balance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {walletLedger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400 font-bold">
                        No wallet transactions recorded yet. Student QR scans will appear here in real time.
                      </td>
                    </tr>
                  ) : (
                    walletLedger.map((tx) => {
                      const isCredit = tx.type === "credit";
                      return (
                        <tr key={tx._id || tx.id} className="hover:bg-purple-50/20 transition">
                          <td className="py-3 px-4">
                            <span className="font-black text-gray-900 block">{tx.userName || "Student User"}</span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-gray-700">
                            {tx.sourceTitle || tx.description || "QR Meal Scan"}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                            ₹{tx.grossAmount || 0}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-rose-600 font-bold">
                            -₹{tx.commissionFee || 0}
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-black ${isCredit ? "text-emerald-600" : "text-rose-600"}`}>
                            {isCredit ? "+" : "-"}₹{tx.netAmount || 0}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-gray-900">
                            ₹{tx.runningBalance || 0}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              ✓ Credited
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: RECORD OPERATIONAL EXPENDITURE ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-4 my-auto">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">
                  Record Expense
                </span>
                <h3 className="text-lg font-black text-gray-900">
                  Add Operational Expenditure
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Smart 1-Click Presets */}
            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 block mb-1.5">
                Quick Presets:
              </span>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {[
                  { title: "HP Commercial 19kg Gas Refill", category: "lpg_gas", amount: 3950, paymentMode: "upi_qr", desc: "Delivered to kitchen" },
                  { title: "MSEB Power & Electricity Bill", category: "electricity", amount: 6800, paymentMode: "bank_neft", desc: "Monthly mess meter reading" },
                  { title: "Mess Premises Rent Payment", category: "rent", amount: 20000, paymentMode: "bank_neft", desc: "Monthly premise lease" },
                  { title: "Fresh Water Tanker (5000L)", category: "water_supply", amount: 1200, paymentMode: "cash", desc: "Kitchen water replenishment" },
                  { title: "Kitchen Stove & Burner Maintenance", category: "kitchen_maintenance", amount: 1500, paymentMode: "cash", desc: "Gas pipeline & knob servicing" },
                ].map((p) => (
                  <button
                    key={p.title}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="px-2.5 py-1 bg-gray-100 hover:bg-orange-100 hover:text-orange-900 text-gray-700 font-bold text-[10px] rounded-xl transition"
                  >
                    {p.title.split(" ")[0]} {p.category === "lpg_gas" ? "⛽" : p.category === "electricity" ? "⚡" : p.category === "rent" ? "🏬" : "🔧"} (₹{p.amount})
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3.5">
              
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-700 mb-1">
                  Expense Title / Payee <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commercial 19kg LPG Refill, Monthly Mess Rent"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-700 mb-1">
                    Expenditure Category
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold"
                  >
                    <option value="rent">Mess Hall Rent</option>
                    <option value="lpg_gas">Commercial LPG Gas</option>
                    <option value="electricity">Electricity & Power</option>
                    <option value="water_supply">Water Tanker & RO Service</option>
                    <option value="kitchen_maintenance">Kitchen Repairs & Maintenance</option>
                    <option value="packaging_disposables">Takeaway Boxes & Disposables</option>
                    <option value="inventory_purchase">Direct Ration Cash Purchase</option>
                    <option value="staff_payroll">Direct Staff Cash Wage / Advance</option>
                    <option value="misc_overhead">Miscellaneous Overhead Expense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-700 mb-1">
                    Expense Date
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-700 mb-1">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 3950"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-mono font-black"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-700 mb-1">
                    Tax / GST (₹) (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={expenseTax}
                    onChange={(e) => setExpenseTax(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={expensePaymentMode}
                    onChange={(e) => setExpensePaymentMode(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold"
                  >
                    <option value="upi_qr">📱 UPI / QR</option>
                    <option value="cash">💵 Cash In Hand</option>
                    <option value="bank_neft">🏦 Bank NEFT / NetBanking</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-700 mb-1">
                  Notes / Invoice Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Receipt #48102, paid to Metro Gas Dealer"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-black uppercase tracking-wider text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save Expenditure ✨"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
