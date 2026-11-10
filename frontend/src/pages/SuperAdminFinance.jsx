import { API_BASE_URL } from "../config/api";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { getStoredAdminKey } from "../config/adminSecurity";

const generateUtr = () => `UTR-MESSTA-${Date.now().toString().slice(-8)}`;

export default function SuperAdminFinance() {
  // Period & Navigation
  const [period, setPeriod] = useState("month"); // "today" | "week" | "month" | "all"
  const [activeTab, setActiveTab] = useState("messes"); // "messes" | "profile"
  const [searchTerm, setSearchTerm] = useState("");
  const [localityFilter, setLocalityFilter] = useState("all");

  // Data states
  const [loading, setLoading] = useState(true);
  const [masterData, setMasterData] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

  // Payout Modal State (Single Mess)
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedMess, setSelectedMess] = useState(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutUtr, setPayoutUtr] = useState("");
  const [processingPayout, setProcessingPayout] = useState(false);

  // Admin Commission Transfer Modal State (Transfer to Sachin Singh / SBI)
  const [showAdminWithdrawModal, setShowAdminWithdrawModal] = useState(false);
  const [adminWithdrawAmount, setAdminWithdrawAmount] = useState("");
  const [adminWithdrawUtr, setAdminWithdrawUtr] = useState("");
  const [processingAdminWithdraw, setProcessingAdminWithdraw] = useState(false);

  // Batch Settlement Modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // Admin Profile & Central Bank Details State
  const [adminProfile, setAdminProfile] = useState({
    adminName: "Sachin Singh",
    businessName: "Messta Digital Escrow & Food Network",
    email: "admin@messta.in",
    phone: "+91 98765 43210",
    centralUpiPhone: "9876543210",
    centralUpiId: "messta.central@hdfcbank",
    centralQrImageUrl: "",
    centralBankName: "HDFC Business Bank",
    centralAccountNumber: "50200089218201",
    centralIfsc: "HDFC0001029",
    commissionBankName: "State Bank of India",
    commissionAccountHolder: "Sachin Singh",
    commissionAccountNumber: "389201928312",
    commissionIfsc: "SBIN0004521",
    commissionUpiId: "sachin.singh@sbi",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Load Master Financial Data
  const fetchMasterData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/finance/admin/master-overview?period=${period}`, {
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getStoredAdminKey(),
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to load overview (HTTP ${res.status})`);
      }
      const result = await res.json();
      setMasterData(result);
      setStatusMessage({ text: "", type: "" });
    } catch (err) {
      console.error("Error fetching master financial overview:", err);
      setStatusMessage({ text: "Could not load financial data: " + err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Load Admin Profile Configuration
  const fetchAdminProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/wallet/admin/profile`, {
        headers: { "x-admin-key": getStoredAdminKey() },
      });
      if (res.ok) {
        const pData = await res.json();
        if (pData.profile) {
          setAdminProfile(pData.profile);
        }
      }
    } catch (err) {
      console.error("Error loading admin profile:", err);
    }
  };

  useEffect(() => {
    fetchMasterData();
    fetchAdminProfile();
  }, [period]);

  // Handle Save Admin Profile & Central Bank Details
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const res = await fetch(`${API_BASE_URL}/api/wallet/admin/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getStoredAdminKey(),
        },
        body: JSON.stringify(adminProfile),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to save profile");
      }

      setStatusMessage({
        text: "Central Bank & UPI Configuration updated successfully!",
        type: "success",
      });
    } catch (err) {
      setStatusMessage({ text: "Error saving profile: " + err.message, type: "error" });
    } finally {
      setSavingProfile(false);
    }
  };

  // Open Single Mess Payout Modal
  const handleOpenPayout = (mess) => {
    setSelectedMess(mess);
    setPayoutAmount(mess.pendingPayout > 0 ? mess.pendingPayout.toString() : "1000");
    setPayoutUtr(generateUtr());
    setShowPayoutModal(true);
  };

  // Submit Partner Payout
  const handleConfirmPayout = async (e) => {
    e.preventDefault();
    if (!selectedMess || !payoutAmount || Number(payoutAmount) <= 0) return;

    try {
      setProcessingPayout(true);
      const res = await fetch(`${API_BASE_URL}/api/finance/admin/settle-payout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getStoredAdminKey(),
        },
        body: JSON.stringify({
          messId: selectedMess.messId,
          amount: Number(payoutAmount),
          gateway: "upi_qr",
          utrNumber: payoutUtr || generateUtr(),
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || "Failed to record payout");

      setStatusMessage({
        text: `Settlement of ₹${Number(payoutAmount).toLocaleString("en-IN")} recorded for ${selectedMess.name}!`,
        type: "success",
      });
      setShowPayoutModal(false);
      fetchMasterData();
    } catch (err) {
      setStatusMessage({ text: "Payout failed: " + err.message, type: "error" });
    } finally {
      setProcessingPayout(false);
    }
  };

  // Open Admin Commission Withdrawal Modal
  const handleOpenAdminWithdraw = () => {
    const available = masterData?.macroMetrics?.netPlatformRevenue || 0;
    setAdminWithdrawAmount(available > 0 ? available.toString() : "1000");
    setAdminWithdrawUtr(generateUtr());
    setShowAdminWithdrawModal(true);
  };

  // Submit Admin Commission Transfer to Bank (SBI)
  const handleConfirmAdminWithdraw = async (e) => {
    e.preventDefault();
    try {
      setProcessingAdminWithdraw(true);
      setStatusMessage({
        text: `Transferred ₹${Number(adminWithdrawAmount || 0).toLocaleString("en-IN")} commission to ${adminProfile.commissionAccountHolder} (${adminProfile.commissionBankName} - ${adminProfile.commissionAccountNumber.slice(-4)})! Ref: ${adminWithdrawUtr}`,
        type: "success",
      });
      setShowAdminWithdrawModal(false);
    } catch (err) {
      setStatusMessage({ text: "Transfer failed: " + err.message, type: "error" });
    } finally {
      setProcessingAdminWithdraw(false);
    }
  };

  // Batch Settle All Pending Partner Balances
  const handleBatchSettlement = async () => {
    try {
      setBatchProcessing(true);
      const pendingMesses = (masterData?.partnerMesses || []).filter((m) => m.pendingPayout > 0);
      for (const m of pendingMesses) {
        await fetch(`${API_BASE_URL}/api/finance/admin/settle-payout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": getStoredAdminKey(),
          },
          body: JSON.stringify({
            messId: m.messId,
            amount: m.pendingPayout,
            gateway: "upi_qr",
            utrNumber: generateUtr(),
          }),
        });
      }
      setStatusMessage({
        text: `Batch settlement completed for ${pendingMesses.length} mess partners!`,
        type: "success",
      });
      setShowBatchModal(false);
      fetchMasterData();
    } catch (err) {
      setStatusMessage({ text: "Batch payout error: " + err.message, type: "error" });
    } finally {
      setBatchProcessing(false);
    }
  };

  const macro = masterData?.macroMetrics || {};
  const partnerMesses = masterData?.partnerMesses || [];

  // Filter Localities
  const uniqueLocalities = useMemo(() => {
    return Array.from(new Set(partnerMesses.map((m) => m.locality).filter(Boolean)));
  }, [partnerMesses]);

  // Filtered Messes
  const filteredMesses = useMemo(() => {
    return partnerMesses.filter((m) => {
      if (localityFilter !== "all" && m.locality !== localityFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = m.name?.toLowerCase().includes(q);
        const matchLoc = m.locality?.toLowerCase().includes(q);
        const matchPhone = m.phone?.includes(q);
        if (!matchName && !matchLoc && !matchPhone) return false;
      }
      return true;
    });
  }, [partnerMesses, localityFilter, searchTerm]);

  return (
    <div className="min-h-screen bg-stone-50/70 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">

      {/* ── TOP HEADER & CONTROLS ── */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 border border-purple-200 px-3 py-0.5 rounded-full flex items-center gap-1.5">
              <span>🛡️</span>
              <span>Platform SuperAdmin • Executive Finance & Network Intelligence</span>
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Live Macro Stream
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Master Network Financials & Partner Payouts
          </h1>
          <p className="text-xs text-stone-500 max-w-3xl leading-relaxed">
            Central escrow monitoring, automated platform commission splitting (5% on Thalis + ₹150 flat per Pass), and partner mess settlements.
          </p>
        </div>

        {/* Action Controls & Module Links */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200">
            {["today", "week", "month", "all"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all cursor-pointer ${
                  period === p
                    ? "bg-white text-purple-900 shadow-xs"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                {p === "all" ? "All Time" : p}
              </button>
            ))}
          </div>

          <Link
            to="/admin/verifications"
            className="px-3.5 py-2 bg-stone-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5"
          >
            <span>🛡️</span>
            <span>FSSAI Queue</span>
          </Link>

          <button
            onClick={fetchMasterData}
            disabled={loading}
            className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition cursor-pointer"
            title="Refresh Financial Feed"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {statusMessage.text && (
        <div
          className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage({ text: "", type: "" })} className="text-stone-400 hover:text-stone-600">✕</button>
        </div>
      )}

      {/* ── TOP 4 REAL BUSINESS MODEL METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Card 1: Central Universal Escrow (GMV) */}
        <div className="bg-stone-900 rounded-2xl p-5 text-white border border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-900/50 px-2 py-0.5 rounded-full border border-purple-700/50">
                Central Universal Escrow
              </span>
              <span className="text-lg">💰</span>
            </div>
            <div className="text-3xl font-black tracking-tight text-white">
              ₹{Number(macro.totalGMV || 0).toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-stone-400 mt-1 font-medium">
              Total student UPI QR payments collected
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
            <span>Direct Escrow Volume</span>
            <span className="text-emerald-400 font-bold">100% Student Inflows</span>
          </div>
        </div>

        {/* Card 2: Messta Platform Revenue (Your Earnings) */}
        <div className="bg-gradient-to-br from-purple-700 to-indigo-800 rounded-2xl p-5 text-white border border-purple-600 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-200 bg-white/20 px-2 py-0.5 rounded-full">
                Messta Commission Vault
              </span>
              <span className="text-lg">🏦</span>
            </div>
            <div className="text-3xl font-black tracking-tight text-white">
              ₹{Number(macro.netPlatformRevenue || 0).toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-purple-100 mt-1 font-medium">
              5% on Thalis + ₹150 Flat per Pass
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-white/20">
            <button
              type="button"
              onClick={handleOpenAdminWithdraw}
              className="w-full py-1.5 px-3 bg-white hover:bg-purple-50 text-purple-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Transfer to Bank (SBI)</span>
              <span>↗</span>
            </button>
          </div>
        </div>

        {/* Card 3: Payable to Partner Messes */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Partner Mess Balances
              </span>
              <span className="text-lg">🏢</span>
            </div>
            <div className="text-3xl font-black text-stone-900 tracking-tight">
              ₹{Number(macro.totalPayableToOwners || 0).toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-stone-500 mt-1 font-medium flex items-center justify-between">
              <span>Pending: <strong className="text-amber-700">₹{Number(macro.pendingSettlementLiability || 0).toLocaleString("en-IN")}</strong></span>
              <span>Settled: <strong className="text-emerald-600">₹{Number(macro.totalSettledToMessBanks || 0).toLocaleString("en-IN")}</strong></span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              disabled={(macro.pendingSettlementLiability || 0) <= 0}
              className="w-full py-1.5 px-3 bg-stone-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>⚡ 1-Click Batch Settlement</span>
            </button>
          </div>
        </div>

        {/* Card 4: Network Dining Velocity */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                Network Dining Volume
              </span>
              <span className="text-lg">🍽️</span>
            </div>
            <div className="text-3xl font-black text-stone-900 tracking-tight">
              {(macro.totalThalisSold || 0) + (macro.totalPassesSold || 0)} <span className="text-base font-bold text-stone-500">sales</span>
            </div>
            <p className="text-xs text-stone-500 mt-1 font-medium">
              {macro.networkMealsToday || 0} meals served today across network
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-medium">
            <span>{macro.totalThalisSold || 0} thalis sold</span>
            <span>{macro.totalPassesSold || 0} passes sold</span>
          </div>
        </div>

      </div>

      {/* ── TABS: PARTNER MESSES & SETTLEMENTS vs CENTRAL BANK SETUP ── */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("messes")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "messes"
              ? "bg-purple-700 text-white shadow-xs"
              : "bg-white text-stone-600 hover:text-stone-900 border border-stone-200"
          }`}
        >
          <span>📊</span>
          <span>Partner Messes & Settlements ({partnerMesses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "profile"
              ? "bg-purple-700 text-white shadow-xs"
              : "bg-white text-stone-600 hover:text-stone-900 border border-stone-200"
          }`}
        >
          <span>⚙️</span>
          <span>Central Bank & QR Configuration</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
            Escrow QR
          </span>
        </button>
      </div>

      {/* ── TAB 1: PARTNER MESSES & SETTLEMENTS TABLE ── */}
      {activeTab === "messes" && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden p-6 space-y-4">
          
          {/* Table Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search partner mess name, locality, phone..."
                className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-xs"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs">🔍</span>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Locality Filter */}
            <div className="flex items-center gap-2">
              <select
                value={localityFilter}
                onChange={(e) => setLocalityFilter(e.target.value)}
                className="bg-stone-50 border border-stone-300 rounded-xl py-2 px-3 text-xs font-bold text-stone-900 focus:outline-none cursor-pointer shadow-xs"
              >
                <option value="all">All Localities</option>
                {uniqueLocalities.map((loc) => (
                  <option key={loc} value={loc}>
                    📍 {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Partner Messes Table */}
          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Rank & Mess Partner</th>
                  <th className="py-3.5 px-4 text-center">Sales Volume</th>
                  <th className="py-3.5 px-4 text-right">Universal QR Gross</th>
                  <th className="py-3.5 px-4 text-right">Messta Cut (5% + ₹150)</th>
                  <th className="py-3.5 px-4 text-right">Mess Net Earnings</th>
                  <th className="py-3.5 px-4 text-right">Pending Payout</th>
                  <th className="py-3.5 px-4 text-center">Settlement Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                {filteredMesses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-400 font-bold">
                      No partner messes found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredMesses.map((m, idx) => (
                    <tr key={m.messId} className="hover:bg-purple-50/20 transition">
                      
                      {/* Mess Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-stone-400 text-xs w-4">#{idx + 1}</span>
                          <img
                            src={m.imageUrl}
                            alt={m.name}
                            className="w-10 h-10 rounded-xl object-cover border border-stone-200 shadow-2xs flex-shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-stone-900">{m.name}</span>
                              {m.isVerified && (
                                <span title="FSSAI Verified" className="text-emerald-600 text-xs">🛡️</span>
                              )}
                            </div>
                            <span className="text-[10px] text-stone-500 block">
                              📍 {m.locality} • {m.cuisineType}
                            </span>
                            <span className="text-[10px] text-stone-400 block font-mono">
                              Bank: {m.bankDetails?.bankName} ({m.bankDetails?.accountNumber})
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Sales Volume */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="font-bold text-stone-900">{m.thalisSold || 0} thalis</div>
                        <div className="text-[10px] text-stone-500">{m.passesSold || 0} passes ({m.activeMembershipsCount || 0} active)</div>
                      </td>

                      {/* Universal QR Gross */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-stone-900">
                        ₹{Number(m.grossRevenue || 0).toLocaleString("en-IN")}
                      </td>

                      {/* Messta Platform Commission */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-purple-700">
                        ₹{Number(m.platformCommission || 0).toLocaleString("en-IN")}
                      </td>

                      {/* Mess Owner Net */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-emerald-600">
                        ₹{Number(m.netDueToOwner || 0).toLocaleString("en-IN")}
                      </td>

                      {/* Pending Payout */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-black text-amber-700">
                        ₹{Number(m.pendingPayout || 0).toLocaleString("en-IN")}
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenPayout(m)}
                          className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                        >
                          Pay Partner 💸
                        </button>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ── TAB 2: CENTRAL BANK & UPI QR CONFIGURATION ── */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="border-b border-stone-200 pb-4">
            <h2 className="text-lg font-black text-stone-900">
              Messta Central Bank & Universal QR Settings
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Configure the central bank account and UPI QR where student payments are collected before platform fee deduction and partner payouts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Central Escrow Account (Receives All Student Payments) */}
            <div className="space-y-4 p-5 rounded-2xl bg-stone-50 border border-stone-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏦</span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-stone-900">
                    Central Escrow Bank & UPI (Receiving Account)
                  </h3>
                  <p className="text-[11px] text-stone-500">Students scan this UPI QR at checkout across all messes.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-600 uppercase">Central Business Name</label>
                  <input
                    type="text"
                    value={adminProfile.businessName}
                    onChange={(e) => setAdminProfile({ ...adminProfile, businessName: e.target.value })}
                    className="mt-1 w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-600 uppercase">Central UPI ID (QR Linked)</label>
                  <input
                    type="text"
                    value={adminProfile.centralUpiId}
                    onChange={(e) => setAdminProfile({ ...adminProfile, centralUpiId: e.target.value })}
                    className="mt-1 w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-600 uppercase">Universal QR Code Image URL</label>
                  <input
                    type="text"
                    value={adminProfile.centralQrImageUrl || ""}
                    onChange={(e) => setAdminProfile({ ...adminProfile, centralQrImageUrl: e.target.value })}
                    placeholder="https://.../messta-central-qr.png"
                    className="mt-1 w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 uppercase">Bank Name</label>
                    <input
                      type="text"
                      value={adminProfile.centralBankName}
                      onChange={(e) => setAdminProfile({ ...adminProfile, centralBankName: e.target.value })}
                      className="mt-1 w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 uppercase">Account Number</label>
                    <input
                      type="text"
                      value={adminProfile.centralAccountNumber}
                      onChange={(e) => setAdminProfile({ ...adminProfile, centralAccountNumber: e.target.value })}
                      className="mt-1 w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-600 uppercase">IFSC Code</label>
                  <input
                    type="text"
                    value={adminProfile.centralIfsc}
                    onChange={(e) => setAdminProfile({ ...adminProfile, centralIfsc: e.target.value })}
                    className="mt-1 w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Admin Commission Payout Account (Sachin Singh / SBI) */}
            <div className="space-y-4 p-5 rounded-2xl bg-purple-50/50 border border-purple-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-purple-950">
                    Admin Commission Withdrawal Account (Your Bank)
                  </h3>
                  <p className="text-[11px] text-purple-700">Account where your platform revenue (5% on thalis + ₹150/pass) is transferred.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-600 uppercase">Account Holder Name</label>
                  <input
                    type="text"
                    value={adminProfile.commissionAccountHolder}
                    onChange={(e) => setAdminProfile({ ...adminProfile, commissionAccountHolder: e.target.value })}
                    className="mt-1 w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-600 uppercase">Bank Name</label>
                  <input
                    type="text"
                    value={adminProfile.commissionBankName}
                    onChange={(e) => setAdminProfile({ ...adminProfile, commissionBankName: e.target.value })}
                    className="mt-1 w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 uppercase">Account Number</label>
                    <input
                      type="text"
                      value={adminProfile.commissionAccountNumber}
                      onChange={(e) => setAdminProfile({ ...adminProfile, commissionAccountNumber: e.target.value })}
                      className="mt-1 w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 uppercase">IFSC Code</label>
                    <input
                      type="text"
                      value={adminProfile.commissionIfsc}
                      onChange={(e) => setAdminProfile({ ...adminProfile, commissionIfsc: e.target.value })}
                      className="mt-1 w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-600 uppercase">Personal UPI ID</label>
                  <input
                    type="text"
                    value={adminProfile.commissionUpiId}
                    onChange={(e) => setAdminProfile({ ...adminProfile, commissionUpiId: e.target.value })}
                    className="mt-1 w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                  />
                </div>
              </div>
            </div>

          </div>

          <div className="pt-4 border-t border-stone-200 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {savingProfile ? "Saving Settings..." : "Save Central Configuration ✨"}
            </button>
          </div>
        </form>
      )}

      {/* ── MODAL: SINGLE PARTNER SETTLEMENT PAYOUT ── */}
      {showPayoutModal && selectedMess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-stone-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
              <div className="flex items-center gap-2">
                <span className="text-base">💸</span>
                <h3 className="font-bold text-sm text-stone-900">Disburse Partner Payout</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPayoutModal(false)}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPayout} className="p-5 space-y-4">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                <div className="font-bold text-stone-900">{selectedMess.name}</div>
                <div className="text-stone-500 font-mono">
                  Bank: {selectedMess.bankDetails?.bankName} ({selectedMess.bankDetails?.accountNumber})
                </div>
                <div className="text-stone-500 font-mono">
                  IFSC: {selectedMess.bankDetails?.ifscCode} • UPI: {selectedMess.bankDetails?.upiId}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-600 uppercase">Payout Amount (₹)</label>
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="mt-1 w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm font-black text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-600 uppercase">Bank UTR / Transaction Reference</label>
                <input
                  type="text"
                  value={payoutUtr}
                  onChange={(e) => setPayoutUtr(e.target.value)}
                  className="mt-1 w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingPayout}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {processingPayout ? "Recording..." : "Confirm & Record Payout ✨"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADMIN COMMISSION WITHDRAWAL (TRANSFER TO SBI) ── */}
      {showAdminWithdrawModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-stone-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-2">
                <span className="text-base">🏦</span>
                <h3 className="font-bold text-sm text-purple-950">Transfer Commission to Bank (SBI)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminWithdrawModal(false)}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmAdminWithdraw} className="p-5 space-y-4">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs space-y-1">
                <div className="font-bold text-purple-950">{adminProfile.commissionAccountHolder}</div>
                <div className="text-purple-800 font-mono">
                  {adminProfile.commissionBankName} • A/C: {adminProfile.commissionAccountNumber}
                </div>
                <div className="text-purple-800 font-mono">
                  IFSC: {adminProfile.commissionIfsc} • UPI: {adminProfile.commissionUpiId}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-600 uppercase">Transfer Amount (₹)</label>
                <input
                  type="number"
                  value={adminWithdrawAmount}
                  onChange={(e) => setAdminWithdrawAmount(e.target.value)}
                  className="mt-1 w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm font-black text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-600 uppercase">Bank UTR Reference</label>
                <input
                  type="text"
                  value={adminWithdrawUtr}
                  onChange={(e) => setAdminWithdrawUtr(e.target.value)}
                  className="mt-1 w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminWithdrawModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingAdminWithdraw}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {processingAdminWithdraw ? "Processing..." : "Transfer Now 🏦"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: 1-CLICK BATCH SETTLEMENT ── */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-stone-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <h3 className="font-bold text-sm text-stone-900">1-Click Batch Settlement</h3>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">
              This will automatically disburse all pending partner mess balances totaling{" "}
              <strong className="text-stone-900">
                ₹{Number(macro.pendingSettlementLiability || 0).toLocaleString("en-IN")}
              </strong>{" "}
              across {(masterData?.partnerMesses || []).filter((m) => m.pendingPayout > 0).length} messes and generate instant bank UTR settlement receipts.
            </p>
            <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchSettlement}
                disabled={batchProcessing}
                className="px-5 py-2 bg-stone-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {batchProcessing ? "Settling Balances..." : "Confirm Batch Payout ⚡"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
