import { API_BASE_URL } from "../config/api";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { getStoredAdminKey } from "../config/adminSecurity";

const generateUtr = () => `UTR-MESSTA-${Date.now().toString().slice(-8)}`;

export default function SuperAdminFinance() {

  // State Management
  const [period, setPeriod] = useState("month"); // "today" | "week" | "month" | "all"
  const [activeTab, setActiveTab] = useState("all"); // "all" | "leaderboard" | "pending" | "anomalies"
  const [searchTerm, setSearchTerm] = useState("");
  const [localityFilter, setLocalityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

  // Financial X-Ray Modal State
  const [selectedMess, setSelectedMess] = useState(null);
  const [showXRayModal, setShowXRayModal] = useState(false);

  // Settlement Payout Modal State (Single Mess)
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutGateway, setPayoutGateway] = useState("razorpay");
  const [customUtr, setCustomUtr] = useState("");
  const [processingPayout, setProcessingPayout] = useState(false);

  // Admin Commission Transfer Modal State (Transfer to Sachin Singh / SBI)
  const [showAdminWithdrawModal, setShowAdminWithdrawModal] = useState(false);
  const [adminWithdrawAmount, setAdminWithdrawAmount] = useState("");
  const [adminWithdrawUtr, setAdminWithdrawUtr] = useState("");
  const [processingAdminWithdraw, setProcessingAdminWithdraw] = useState(false);

  // Primary Admin Section View: "financials" | "profile"
  const [adminView, setAdminView] = useState("financials");

  // Virtual Wallet & Escrow Ledger State
  const [walletData, setWalletData] = useState(null);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [walletTab, setWalletTab] = useState("wallets"); // "wallets" | "ledger"
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
    commissionPerPlate: 2.0,
    commissionMembershipPct: 4.0,
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Fetch Master Overview Data
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
        throw new Error(errJson.message || `Failed to load telemetry (HTTP ${res.status})`);
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching master financial overview:", err);
      setStatusMessage({ text: "Could not load financial data: " + err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Virtual Wallet & Escrow Stream Data
  const fetchWalletOverview = async () => {
    try {
      setLoadingWallets(true);
      const res = await fetch(`${API_BASE_URL}/api/wallet/admin/overview`, {
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getStoredAdminKey(),
        },
      });

      if (!res.ok) throw new Error("Failed to load wallet escrow data.");
      const result = await res.json();
      setWalletData(result);
    } catch (err) {
      console.error("Error fetching wallet escrow overview:", err);
    } finally {
      setLoadingWallets(false);
    }
  };

  // Fetch Admin Profile Configuration
  const fetchAdminProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/wallet/admin/profile`, {
        headers: { "x-admin-key": getStoredAdminKey() },
      });
      if (res.ok) {
        const d = await res.json();
        if (d.profile) setAdminProfile(d.profile);
      }
    } catch (err) {
      console.error("Error loading admin profile:", err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMasterData();
      fetchWalletOverview();
      fetchAdminProfile();
    }, 0);
    return () => clearTimeout(timer);
  }, [period]);

  // Handle Save Admin Registration & Central Bank Config
  const handleSaveAdminProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/wallet/admin/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getStoredAdminKey(),
        },
        body: JSON.stringify(adminProfile),
      });
      const d = await res.json();
      if (res.ok) {
        setStatusMessage({ text: "✅ " + d.message, type: "success" });
        setAdminProfile(d.profile);
      } else {
        setStatusMessage({ text: d.message || "Failed to update profile.", type: "error" });
      }
    } catch (err) {
      setStatusMessage({ text: err.message, type: "error" });
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle 1-Click Batch Settlement Payout
  const handleConfirmBatchPayout = async () => {
    try {
      setBatchProcessing(true);
      const res = await fetch(`${API_BASE_URL}/api/wallet/admin/disburse-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getStoredAdminKey(),
        },
        body: JSON.stringify({ gateway: "razorpay" }),
      });

      const resData = await res.json();
      if (res.ok) {
        setShowBatchModal(false);
        setStatusMessage({
          text: `⚡ ${resData.message}`,
          type: "success",
        });
        fetchWalletOverview();
        fetchMasterData();
      } else {
        setStatusMessage({ text: resData.message || "Failed to process batch settlement.", type: "error" });
      }
    } catch (err) {
      console.error("Error running batch payout:", err);
      setStatusMessage({ text: err.message, type: "error" });
    } finally {
      setBatchProcessing(false);
    }
  };

  // Handle Disbursing Payout (Single Mess to Partner Bank)
  const handleOpenPayout = (mess) => {
    setSelectedMess(mess);
    const pending = mess.pendingPayout || mess.balance || mess.pendingPayoutToMess || 0;
    setPayoutAmount(pending || "");
    setCustomUtr(generateUtr());
    setShowPayoutModal(true);
  };

  const handleConfirmPayout = async (e) => {
    e.preventDefault();
    if (!selectedMess || !payoutAmount || Number(payoutAmount) <= 0) return;

    try {
      setProcessingPayout(true);
      const targetMessId = selectedMess.messId || selectedMess._id;
      const res = await fetch(`${API_BASE_URL}/api/wallet/admin/disburse-single`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getStoredAdminKey(),
        },
        body: JSON.stringify({
          messId: targetMessId,
          amount: Number(payoutAmount),
          gateway: payoutGateway,
          utrNumber: customUtr,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setShowPayoutModal(false);
        setStatusMessage({
          text: `✅ Disbursed ₹${Number(payoutAmount).toLocaleString("en-IN")} from Universal Escrow to ${selectedMess.name || selectedMess.messName}! (UTR: ${customUtr})`,
          type: "success",
        });
        fetchMasterData();
        fetchWalletOverview();
        if (showXRayModal && selectedMess) {
          setSelectedMess((prev) => ({
            ...prev,
            pendingPayout: Math.max(0, (prev.pendingPayout || prev.balance || 0) - Number(payoutAmount)),
            settledAmount: (prev.settledAmount || prev.totalWithdrawn || 0) + Number(payoutAmount),
          }));
        }
      } else {
        setStatusMessage({ text: resData.message || "Failed to process settlement.", type: "error" });
      }
    } catch (err) {
      console.error("Error processing settlement:", err);
      setStatusMessage({ text: err.message, type: "error" });
    } finally {
      setProcessingPayout(false);
    }
  };

  // Handle Opening Admin Personal Commission Withdrawal Modal (Transfer to SBI)
  const handleOpenAdminWithdraw = () => {
    const available = walletData?.masterWallet?.availableCommissionFloat ||
      Math.max(0, (walletData?.masterWallet?.totalPlatformCommissionEarned || 0) - (walletData?.masterWallet?.totalCommissionWithdrawn || 0));
    setAdminWithdrawAmount(available > 0 ? available : 18500);
    setAdminWithdrawUtr(`UTR-ADMIN-${Date.now().toString().slice(-8)}`);
    setShowAdminWithdrawModal(true);
  };

  // Handle Confirming Admin Personal Commission Transfer
  const handleConfirmAdminWithdraw = async (e) => {
    e.preventDefault();
    if (!adminWithdrawAmount || Number(adminWithdrawAmount) <= 0) return;

    try {
      setProcessingAdminWithdraw(true);
      const res = await fetch(`${API_BASE_URL}/api/wallet/admin/withdraw-commission`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getStoredAdminKey(),
        },
        body: JSON.stringify({
          amount: Number(adminWithdrawAmount),
          utrNumber: adminWithdrawUtr,
        }),
      });

      const d = await res.json();
      if (res.ok) {
        setShowAdminWithdrawModal(false);
        setStatusMessage({
          text: `🏦 ${d.message}`,
          type: "success",
        });
        fetchWalletOverview();
        fetchMasterData();
      } else {
        setStatusMessage({ text: d.message || "Failed to transfer commission.", type: "error" });
      }
    } catch (err) {
      setStatusMessage({ text: err.message, type: "error" });
    } finally {
      setProcessingAdminWithdraw(false);
    }
  };

  // Filtered Messes Computation
  const filteredMesses = useMemo(() => {
    if (!data?.partnerMesses) return [];
    let list = [...data.partnerMesses];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(term) ||
          m.locality.toLowerCase().includes(term) ||
          m.cuisineType.toLowerCase().includes(term) ||
          m.phone.includes(term)
      );
    }

    // Locality filter
    if (localityFilter !== "all") {
      list = list.filter((m) => m.locality === localityFilter);
    }

    // Tab filter
    if (activeTab === "leaderboard") {
      list.sort((a, b) => b.grossRevenue - a.grossRevenue);
    } else if (activeTab === "pending") {
      list = list.filter((m) => m.pendingPayout > 5000);
      list.sort((a, b) => b.pendingPayout - a.pendingPayout);
    } else if (activeTab === "anomalies") {
      list = list.filter((m) => m.anomalyAlert?.status === "warning");
    }

    return list;
  }, [data, searchTerm, localityFilter, activeTab]);

  // Unique Localities for dropdown
  const uniqueLocalities = useMemo(() => {
    if (!data?.partnerMesses) return [];
    return Array.from(new Set(data.partnerMesses.map((m) => m.locality))).filter(Boolean);
  }, [data]);

  const macro = data?.macroMetrics || {
    totalGMV: 1845200,
    netPlatformRevenue: 84520,
    perPlateCommissionTotal: 46200,
    membershipCommissionTotal: 38320,
    activePartnerCount: 4,
    networkMealsToday: 1480,
    networkMealsAllTime: 42890,
    totalMessExpenditures: 1125000,
    totalPendingSettlement: 142800,
  };

  return (
    <div className="min-h-screen bg-gray-50/70 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* ── SUPERADMIN HEADER & CONTEXT SWITCHER ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 border border-purple-200 px-3 py-0.5 rounded-full flex items-center gap-1.5">
              <span>🛡️</span>
              <span>Platform SuperAdmin • Executive Finance & Network Intelligence</span>
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Live Macro Stream
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Master Network Financials & Partner Ledger
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 max-w-3xl leading-relaxed">
            Central financial observatory aggregating network Gross Merchandise Value (GMV), per-plate & membership commission streams, partner mess expenditure X-rays, and automated settlement payouts.
          </p>
        </div>

        {/* Action Controls & Module Links */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex p-1 bg-gray-100 rounded-2xl border border-gray-200">
            {["today", "week", "month", "all"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl capitalize transition-all cursor-pointer ${
                  period === p
                    ? "bg-white text-purple-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {p === "all" ? "All Time" : p}
              </button>
            ))}
          </div>

          <Link
            to="/admin/verifications"
            className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition active:scale-95 flex items-center gap-2"
          >
            <span>🛡️</span>
            <span>FSSAI Queue</span>
          </Link>

          <button
            onClick={fetchMasterData}
            disabled={loading}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition cursor-pointer"
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
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage({ text: "", type: "" })} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {/* ── MASTER NAVIGATION SWITCHER (FINANCIALS / EOD / PROFILE) ── */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() => setAdminView("financials")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
            adminView === "financials"
              ? "bg-purple-700 text-white shadow-sm"
              : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <span>📊</span>
          <span>Network Financials & Wallets</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminView("profile")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
            adminView === "profile"
              ? "bg-purple-700 text-white shadow-sm"
              : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          <span>⚙️</span>
          <span>Admin Registration & Central Bank Setup</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
            Central QR & Bank
          </span>
        </button>
      </div>

      {adminView === "financials" && (
        <>
          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ── SECTION 1: MACRO COMMAND CENTER (THE TOP-LEVEL PLATFORM VIEW) ── */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Gross Merchandise Value */}
            <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-purple-950 rounded-3xl p-6 text-white border border-gray-800 shadow-md space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-900/50 px-2.5 py-1 rounded-full border border-purple-700/50">
                  Universal QR Gross Volume
                </span>
                <span className="text-xl">💰</span>
              </div>
              <div>
                <div className="text-3xl font-black tracking-tight">
                  ₹{(macro.totalGMV || walletData?.masterWallet?.totalMasterCollections || 1845200).toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-purple-200/80 mt-1 font-medium">
                  Total student payments collected in Central Universal Escrow
                </p>
              </div>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-purple-300 font-semibold">
                <span>Network Kitchen Costs:</span>
                <span className="text-white font-bold">₹{(macro.totalMessExpenditures || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Card 2: Net Platform Revenue (Your Commission Earnings) */}
            <div className="bg-gradient-to-br from-purple-700 via-indigo-700 to-purple-800 rounded-3xl p-6 text-white border border-purple-600 shadow-md space-y-3 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-200 bg-white/20 px-2.5 py-1 rounded-full border border-white/20">
                    My Commission Vault (Your Cut)
                  </span>
                  <span className="text-xl">🏦</span>
                </div>
                <div className="mt-2">
                  <div className="text-3xl font-black tracking-tight">
                    ₹{(walletData?.masterWallet?.totalPlatformCommissionEarned || macro.netPlatformRevenue || 84520).toLocaleString("en-IN")}
                  </div>
                  <p className="text-xs text-purple-100 mt-1 font-medium">
                    (Tokens × ₹1 on Passes) + (4% on Walk-in Plates)
                  </p>
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-purple-200 mt-2">
                  <span>Walk-in (4%): ₹{(macro.perPlateCommissionTotal || 46200).toLocaleString("en-IN")}</span>
                  <span>Passes (₹1/T): ₹{(macro.membershipCommissionTotal || 38320).toLocaleString("en-IN")}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenAdminWithdraw}
                className="mt-3 w-full py-2 bg-white hover:bg-purple-50 text-purple-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>🏦</span>
                <span>Transfer to My Bank (SBI)</span>
              </button>
            </div>

            {/* Card 3: Network-Wide Meal Velocity */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                  Dining Scan Velocity
                </span>
                <span className="text-xl">🍽️</span>
              </div>
              <div>
                <div className="text-3xl font-black text-gray-900 tracking-tight">
                  {(macro.networkMealsToday || 0).toLocaleString("en-IN")}
                  <span className="text-sm font-bold text-gray-400 ml-1.5">meals today</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  {(macro.networkMealsAllTime || 0).toLocaleString("en-IN")} total meals redeemed on network
                </p>
              </div>
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600 font-semibold">
                <span>Active Student Passholders:</span>
                <span className="text-orange-600 font-black">
                  {data?.partnerMesses?.reduce((acc, m) => acc + (m.activeMembershipsCount || 0), 0) || 0} students
                </span>
              </div>
            </div>

            {/* Card 4: Active Partner Network & Settlement Balance */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Partner Outlets & Payouts
                </span>
                <span className="text-xl">🏢</span>
              </div>
              <div>
                <div className="text-3xl font-black text-gray-900 tracking-tight">
                  {data?.partnerMesses?.length || walletData?.partnerWallets?.length || 0}
                  <span className="text-sm font-bold text-gray-400 ml-1.5">mess outlets</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  FSSAI verified partner messes across Pune
                </p>
              </div>
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600 font-semibold">
                <span>Pending to Mess Banks:</span>
                <span className="text-amber-700 font-black">
                  ₹{(walletData?.masterWallet?.currentEscrowFloat || walletData?.totalPendingWalletsBalance || macro.totalPendingSettlement || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ── CENTRALIZED VIRTUAL WALLET & MULTI-TENANT ESCROW HUB ── */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-3xl border border-gray-200/90 shadow-xs overflow-hidden p-6 sm:p-8 space-y-6">
            
            {/* 4 Golden Vault Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-gray-900 text-white border border-gray-800 space-y-1 relative overflow-hidden">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Master Account Collections</span>
                <div className="text-2xl font-black tracking-tight">
                  ₹{(walletData?.masterWallet?.totalMasterCollections || 1845200).toLocaleString("en-IN")}
                </div>
                <p className="text-[11px] text-gray-400">Total gross funds received via Universal QR</p>
              </div>

              <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">Messta Profit Vault</span>
                    <span className="text-[10px] font-extrabold bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">Your Cut</span>
                  </div>
                  <div className="text-2xl font-black text-purple-900 tracking-tight mt-1">
                    ₹{(walletData?.masterWallet?.totalPlatformCommissionEarned || 84520).toLocaleString("en-IN")}
                  </div>
                  <p className="text-[11px] text-purple-700">Pass: Tokens × ₹1 + Plate: 4%</p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAdminWithdraw}
                  className="py-1.5 px-3 bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition cursor-pointer text-center"
                >
                  Withdraw to Bank 🏦
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Current Escrow Float</span>
                    <span className="text-[10px] font-extrabold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full animate-pulse">Pending</span>
                  </div>
                  <div className="text-2xl font-black text-amber-900 tracking-tight mt-1">
                    ₹{(walletData?.masterWallet?.currentEscrowFloat || walletData?.totalPendingWalletsBalance || 142800).toLocaleString("en-IN")}
                  </div>
                  <p className="text-[11px] text-amber-700">Partner funds held ready for mess bank payout</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBatchModal(true)}
                  disabled={(walletData?.masterWallet?.currentEscrowFloat || 0) <= 0}
                  className="py-1.5 px-3 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition cursor-pointer text-center disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>1-Click Batch Settlement</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Total Disbursed to Messes</span>
                <div className="text-2xl font-black text-emerald-900 tracking-tight">
                  ₹{(walletData?.masterWallet?.totalPartnerFundsDisbursed || 1617880).toLocaleString("en-IN")}
                </div>
                <p className="text-[11px] text-emerald-700">Settled directly to mess partner bank accounts</p>
              </div>
            </div>

        {/* Sub-Tabs: Wallets vs Split Stream */}
        <div className="border-t border-gray-100 pt-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="inline-flex p-1 bg-gray-100 rounded-2xl border border-gray-200 text-xs">
              <button
                onClick={() => setWalletTab("wallets")}
                className={`px-3.5 py-1.5 font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  walletTab === "wallets" ? "bg-white text-purple-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>💼</span>
                <span>Partner Virtual Wallets ({walletData?.partnerWallets?.length || 0})</span>
              </button>
              <button
                onClick={() => setWalletTab("ledger")}
                className={`px-3.5 py-1.5 font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  walletTab === "ledger" ? "bg-white text-purple-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>📜</span>
                <span>Real-Time Split Passbook ({walletData?.recentLedger?.length || 0})</span>
              </button>
            </div>

            <button
              onClick={fetchWalletOverview}
              disabled={loadingWallets}
              className="text-xs font-bold text-gray-500 hover:text-purple-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span className={loadingWallets ? "animate-spin" : ""}>🔄</span>
              <span>Refresh Vault</span>
            </button>
          </div>

          {/* Subtab View 1: Partner Virtual Wallets Grid */}
          {walletTab === "wallets" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(walletData?.partnerWallets || []).map((w, idx) => (
                <div
                  key={w._id || w.messId || idx}
                  className="bg-gray-50/80 rounded-2xl border border-gray-200 p-4 space-y-3 hover:border-purple-300 hover:bg-purple-50/20 transition group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-gray-400">Wallet #{idx + 1}</span>
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {w.status || "Active"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {w.messInfo?.imageUrl ? (
                        <img
                          src={w.messInfo.imageUrl}
                          alt={w.messName}
                          className="w-9 h-9 rounded-xl object-cover border border-gray-200 shadow-2xs"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-purple-200 text-purple-800 font-bold flex items-center justify-center text-xs">
                          {w.messName?.charAt(0) || "M"}
                        </div>
                      )}
                      <div className="truncate">
                        <strong className="text-xs font-black text-gray-900 block truncate">
                          {w.messName}
                        </strong>
                        <span className="text-[10px] text-gray-500 block truncate">
                          📍 {w.messInfo?.locality || "Pune"}
                        </span>
                      </div>
                    </div>

                    {/* Pending Payout Balance */}
                    <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-0.5 shadow-2xs">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Pending Payout Balance</span>
                      <div className="text-xl font-black text-gray-900">
                        ₹{(w.balance || 0).toLocaleString("en-IN")}
                      </div>
                      <span className="text-[10px] text-amber-700 font-semibold block">
                        {(w.balance || 0) > 0 ? "Ready to disburse to bank" : "Fully settled"}
                      </span>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="space-y-1 text-[11px] text-gray-600 pt-1">
                      <div className="flex justify-between">
                        <span>Universal QR Gross:</span>
                        <strong className="text-gray-900 font-mono">
                          ₹{(w.totalGrossCollected || (w.totalEarned + (w.totalCommissionEarned || 0))).toLocaleString("en-IN")}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>My Commission Section:</span>
                        <strong className="text-purple-700 font-mono">
                          ₹{(w.totalCommissionEarned || Math.round((w.totalGrossCollected || w.totalEarned * 1.05) * 0.045)).toLocaleString("en-IN")}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Mess Owner Net Income:</span>
                        <strong className="text-emerald-700 font-mono">
                          ₹{(w.totalEarned || 0).toLocaleString("en-IN")}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Paid to Mess Bank:</span>
                        <strong className="text-gray-800 font-mono">
                          ₹{(w.totalWithdrawn || 0).toLocaleString("en-IN")}
                        </strong>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-200">
                        <span>Bank A/C:</span>
                        <span className="font-mono font-bold text-gray-700">
                          {w.payoutBankDetails?.bankName} ••••{w.payoutBankDetails?.accountNumber?.slice(-4) || "4821"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Disburse Button */}
                  <button
                    onClick={() => handleOpenPayout({
                      messId: w.messId,
                      name: w.messName,
                      pendingPayout: w.balance,
                      bankDetails: w.payoutBankDetails || {
                        bankName: "HDFC Bank",
                        accountNumber: "4821",
                        ifscCode: "HDFC0001029",
                        accountHolderName: w.messName,
                      },
                    })}
                    disabled={(w.balance || 0) <= 0}
                    className="w-full py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs active:scale-95"
                  >
                    Pay Mess Owner 💳
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Subtab View 2: Live Split Ledger Passbook */}
          {walletTab === "ledger" && (
            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    <th className="py-3 px-4">Time & Student</th>
                    <th className="py-3 px-4">Target Partner Mess</th>
                    <th className="py-3 px-4">Source Event</th>
                    <th className="py-3 px-4 text-right">Gross Paid</th>
                    <th className="py-3 px-4 text-right">Messta Cut (Fee)</th>
                    <th className="py-3 px-4 text-right">Mess Credit / Debit</th>
                    <th className="py-3 px-4 text-right">Running Wallet</th>
                    <th className="py-3 px-4 text-center">Status & Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(walletData?.recentLedger || []).map((tx) => {
                    const isCredit = tx.type === "credit";
                    return (
                      <tr key={tx._id || tx.id} className="hover:bg-purple-50/30 transition">
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[10px] text-gray-400 block font-bold">
                            {new Date(tx.transactionDate || tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="font-black text-gray-900 block text-xs">
                            {tx.studentName || tx.title}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-800 block text-xs">
                            {tx.messName}
                          </span>
                          <span className="text-[10px] text-gray-400 block font-mono">
                            {tx.orderId || "—"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                            {tx.source === "per_plate_booking"
                              ? "🍽️ Per-Plate Scan"
                              : tx.source === "membership_pass"
                              ? "🎫 Membership Pass"
                              : "🏦 Bank Settlement"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-800">
                          ₹{(tx.grossAmount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-mono font-black text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            +₹{(tx.platformCommission || 0).toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`font-mono font-black text-xs ${
                              isCredit ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {isCredit ? "+" : "-"}₹{(tx.netAmount || 0).toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-600">
                          ₹{(tx.runningBalance || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Cleared ✅
                          </span>
                          {tx.payoutReference && (
                            <span className="text-[9px] font-mono text-gray-400 block mt-0.5">
                              {tx.payoutReference}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── COLLABORATED PARTNER FINANCIAL MATRIX & LEADERBOARD ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-gray-200/90 shadow-xs overflow-hidden space-y-6 p-6 sm:p-8">
        
        {/* Table Top Controls: Search, Tabs, Locality Picker */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>🏆</span>
              <span>Collaborated Partner Financial Master Matrix</span>
            </h2>
            <p className="text-xs text-gray-500">
              Live breakdown of gross turnover, plate vs. membership revenue, kitchen expenses, and platform fees for each mess.
            </p>
          </div>

          {/* Tab Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 bg-gray-100 rounded-2xl border border-gray-200 text-xs">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 font-bold rounded-xl transition cursor-pointer ${
                  activeTab === "all" ? "bg-white text-purple-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All Messes ({data?.partnerMesses?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("leaderboard")}
                className={`px-3 py-1.5 font-bold rounded-xl transition cursor-pointer flex items-center gap-1 ${
                  activeTab === "leaderboard" ? "bg-white text-purple-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>🏆</span>
                <span>Top Earners</span>
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-3 py-1.5 font-bold rounded-xl transition cursor-pointer flex items-center gap-1 ${
                  activeTab === "pending" ? "bg-white text-amber-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>⏳</span>
                <span>Pending Payout</span>
              </button>
              <button
                onClick={() => setActiveTab("anomalies")}
                className={`px-3 py-1.5 font-bold rounded-xl transition cursor-pointer flex items-center gap-1 ${
                  activeTab === "anomalies" ? "bg-white text-red-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>⚠️</span>
                <span>Anomalies</span>
              </button>
            </div>

            {/* Locality Dropdown */}
            <select
              value={localityFilter}
              onChange={(e) => setLocalityFilter(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-800 text-xs font-bold py-2 px-3 rounded-xl focus:ring-2 focus:ring-purple-500 cursor-pointer"
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

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Mess Name, Locality, Cuisine, or Phone..."
            className="w-full bg-gray-50 border border-gray-300 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500 transition"
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Master Financial Table */}
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-200">
                <th className="py-3.5 px-4">Rank & Mess Partner</th>
                <th className="py-3.5 px-4">Registered Bank Account</th>
                <th className="py-3.5 px-4 text-right">Universal QR Gross</th>
                <th className="py-3.5 px-4 text-right">My Commission Section 💰</th>
                <th className="py-3.5 px-4 text-right">Mess Owner Net Income</th>
                <th className="py-3.5 px-4 text-right">Paid to Mess Bank</th>
                <th className="py-3.5 px-4 text-right">Pending Payout</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMesses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-bold">
                    No partner messes found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredMesses.map((m, idx) => {
                  const hasAnomaly = m.anomalyAlert?.status === "warning";
                  const messNetIncome = m.netDueToOwner || (m.grossRevenue - m.platformCommission);
                  return (
                    <tr
                      key={m.messId}
                      className={`hover:bg-purple-50/30 transition-colors ${
                        hasAnomaly ? "bg-red-50/30" : ""
                      }`}
                    >
                      {/* Mess Identity */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-gray-400 text-xs w-4">#{idx + 1}</span>
                          <img
                            src={m.imageUrl}
                            alt={m.name}
                            className="w-10 h-10 rounded-xl object-cover border border-gray-200 shadow-2xs flex-shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-gray-900">{m.name}</span>
                              {m.isVerified && (
                                <span title="FSSAI Verified" className="text-emerald-600">🛡️</span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-500 block">
                              📍 {m.locality} • {m.cuisineType}
                            </span>
                            {hasAnomaly && (
                              <span className="text-[9px] font-extrabold uppercase tracking-wider text-red-700 bg-red-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                ⚠️ Velocity Spike
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Registered Bank Account */}
                      <td className="py-4 px-4">
                        <span className="font-bold text-gray-900 block text-xs">
                          🏦 {m.bankDetails?.bankName || "HDFC Bank"}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono block">
                          A/C: {m.bankDetails?.accountNumber || "••••4821"}
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono block">
                          IFSC: {m.bankDetails?.ifscCode || "HDFC0001029"}
                        </span>
                      </td>

                      {/* Universal QR Gross Volume */}
                      <td className="py-4 px-4 text-right">
                        <span className="font-black text-gray-900 block text-sm">
                          ₹{m.grossRevenue.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold block">
                          +₹{m.todayRevenue.toLocaleString("en-IN")} today
                        </span>
                        <span className="text-[9px] text-gray-400 block font-mono">
                          {m.totalTokensServed} meals served
                        </span>
                      </td>

                      {/* Platform Commission (Your Cut) */}
                      <td className="py-4 px-4 text-right">
                        <span className="font-black text-purple-900 block text-sm bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200 inline-block font-mono">
                          +₹{m.platformCommission.toLocaleString("en-IN")}
                        </span>
                        <div className="text-[9px] text-purple-700 font-semibold mt-0.5 space-y-0.5">
                          <span className="block">Pass: ₹{m.membershipCommission} ({m.activeMembershipsCount * 60}T × ₹1)</span>
                          <span className="block">Plate: ₹{m.perPlateCommission} (4%)</span>
                        </div>
                      </td>

                      {/* Mess Owner Net Income */}
                      <td className="py-4 px-4 text-right">
                        <span className="font-black text-emerald-700 block text-sm font-mono">
                          ₹{messNetIncome.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-gray-500 block">
                          Gross minus Messta cut
                        </span>
                      </td>

                      {/* Paid to Mess Bank */}
                      <td className="py-4 px-4 text-right">
                        <span className="font-bold text-gray-800 block text-xs font-mono">
                          ₹{m.settledAmount.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          Direct Bank Disbursed
                        </span>
                      </td>

                      {/* Pending Payout */}
                      <td className="py-4 px-4 text-right">
                        <span className="font-black text-amber-700 block text-sm font-mono">
                          ₹{m.pendingPayout.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-amber-600 font-bold block">
                          Awaiting Transfer
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenPayout(m)}
                            disabled={m.pendingPayout <= 0}
                            className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition cursor-pointer shadow-2xs active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Disburse Payout from Universal Escrow to Mess Bank"
                          >
                            Pay Mess 💳
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMess(m);
                              setShowXRayModal(true);
                            }}
                            className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 font-black text-[11px] uppercase tracking-wider rounded-xl transition border border-purple-200 cursor-pointer shadow-2xs"
                            title="Open Financial X-Ray Deep Dive"
                          >
                            🔍
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── VIEW 2: ADMIN REGISTRATION & BANK INFRASTRUCTURE CONFIG ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {adminView === "profile" && (
        <form onSubmit={handleSaveAdminProfile} className="space-y-8 animate-in fade-in duration-200">
          
          {/* Header */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-3 py-0.5 rounded-full border border-purple-200">
                ⚙️ Master Administrator Infrastructure
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                Admin Registration & Central Payment Setup
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 max-w-2xl leading-relaxed">
                Configure your administrator profile, Central UPI Account (whose QR code & phone number are shown to students for meal tokens and passes), and your personal commission bank account for receiving daily profits.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-3 bg-purple-700 hover:bg-purple-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-2 self-start md:self-auto"
            >
              {savingProfile ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <span>💾 Save Admin & Bank Settings</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* ── CARD 1: PLATFORM ADMINISTRATOR IDENTITY ── */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                <span className="text-xl">🛡️</span>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                    1. Administrator Identity & Business Profile
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Your platform administrative credentials and official legal name
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    SuperAdmin Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={adminProfile.adminName}
                    onChange={(e) => setAdminProfile({ ...adminProfile, adminName: e.target.value })}
                    className="w-full bg-gray-50/70 border border-gray-200 rounded-xl px-3.5 py-2 font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g. Sachin Singh"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Platform Business / Entity Name
                  </label>
                  <input
                    type="text"
                    required
                    value={adminProfile.businessName}
                    onChange={(e) => setAdminProfile({ ...adminProfile, businessName: e.target.value })}
                    className="w-full bg-gray-50/70 border border-gray-200 rounded-xl px-3.5 py-2 font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g. Messta Digital Escrow & Food Network"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Admin Email
                    </label>
                    <input
                      type="email"
                      required
                      value={adminProfile.email}
                      onChange={(e) => setAdminProfile({ ...adminProfile, email: e.target.value })}
                      className="w-full bg-gray-50/70 border border-gray-200 rounded-xl px-3.5 py-2 font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
                      placeholder="admin@messta.in"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Admin Contact Phone
                    </label>
                    <input
                      type="text"
                      required
                      value={adminProfile.phone}
                      onChange={(e) => setAdminProfile({ ...adminProfile, phone: e.target.value })}
                      className="w-full bg-gray-50/70 border border-gray-200 rounded-xl px-3.5 py-2 font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── CARD 4: PLATFORM COMMISSION RATES & AUTOMATION ── */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                <span className="text-xl">💰</span>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                    2. Platform Commission & Slicing Rules
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Defines your automated platform fee deducted from every meal & pass
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-1">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-purple-900">
                      Per-Plate Cut (₹ / Plate)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-purple-800">₹</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        required
                        value={adminProfile.commissionPerPlate}
                        onChange={(e) => setAdminProfile({ ...adminProfile, commissionPerPlate: Number(e.target.value) })}
                        className="w-full bg-white border border-purple-300 rounded-xl px-3 py-1.5 font-black text-sm text-purple-950 focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <span className="text-[10px] text-purple-700 block">
                      Retained from every single-plate walk-in QR booking
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-1">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-indigo-900">
                      Membership Pass Cut (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="25"
                        required
                        value={adminProfile.commissionMembershipPct}
                        onChange={(e) => setAdminProfile({ ...adminProfile, commissionMembershipPct: Number(e.target.value) })}
                        className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-1.5 font-black text-sm text-indigo-950 focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-base font-bold text-indigo-800">%</span>
                    </div>
                    <span className="text-[10px] text-indigo-700 block">
                      Retained from student monthly / semester pass subscriptions
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
                  <div>
                    <strong className="text-gray-900 text-xs block">Automated Nightly EOD Clearing</strong>
                    <span className="text-[10px] text-gray-500">
                      Automatically execute daily bank payouts at 11:59 PM every night
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={adminProfile.autoEodSettlementEnabled ?? true}
                    onChange={(e) => setAdminProfile({ ...adminProfile, autoEodSettlementEnabled: e.target.checked })}
                    className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* ── CARD 2: CENTRAL STUDENT PAYMENT ACCOUNT (SHOWN TO STUDENTS) ── */}
            <div className="bg-white rounded-3xl p-6 border-2 border-purple-300 shadow-sm space-y-4 lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">📱</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                        3. Central Student Payment Account (UPI QR & Phone)
                      </h3>
                      <span className="text-[10px] font-black uppercase text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                        Shown to Students
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      The UPI Phone number, Bank account, and QR code configured here are shown to students whenever they book a meal or buy a membership pass
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Form fields */}
                <div className="md:col-span-2 space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[11px] font-semibold flex items-center gap-2">
                    <span>💡</span>
                    <span>
                      When students scan the QR or pay to this phone number, the money arrives in this Central Account. At the end of the day, the EOD engine splits it to the mess owners and sends your commission profit to your personal account.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Central UPI Mobile Number (Shown to Students)
                      </label>
                      <input
                        type="text"
                        required
                        value={adminProfile.centralUpiPhone}
                        onChange={(e) => setAdminProfile({ ...adminProfile, centralUpiPhone: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 font-mono font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="9876543210"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Central UPI ID / VPA
                      </label>
                      <input
                        type="text"
                        required
                        value={adminProfile.centralUpiId}
                        onChange={(e) => setAdminProfile({ ...adminProfile, centralUpiId: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 font-mono font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder="messta.central@hdfcbank"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Central Bank Name
                      </label>
                      <input
                        type="text"
                        required
                        value={adminProfile.centralBankName}
                        onChange={(e) => setAdminProfile({ ...adminProfile, centralBankName: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
                        placeholder="HDFC Business Bank"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Central Account Number
                      </label>
                      <input
                        type="text"
                        required
                        value={adminProfile.centralAccountNumber}
                        onChange={(e) => setAdminProfile({ ...adminProfile, centralAccountNumber: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 font-mono font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
                        placeholder="50200089218201"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Central Bank IFSC
                      </label>
                      <input
                        type="text"
                        required
                        value={adminProfile.centralIfsc}
                        onChange={(e) => setAdminProfile({ ...adminProfile, centralIfsc: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 font-mono font-semibold text-gray-900 uppercase focus:bg-white focus:ring-2 focus:ring-purple-500"
                        placeholder="HDFC0001029"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Static QR Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={adminProfile.centralQrImageUrl}
                      onChange={(e) => setAdminProfile({ ...adminProfile, centralQrImageUrl: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
                      placeholder="https://example.com/my-merchant-upi-qr.png (leave blank for auto dynamic QR)"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Leave blank to automatically generate dynamic UPI payment QRs for Google Pay, PhonePe, and Paytm.
                    </span>
                  </div>
                </div>

                {/* Live Student QR Preview */}
                <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-b from-gray-50 to-purple-50/40 border border-purple-200 text-center space-y-3">
                  <span className="text-[10px] font-black uppercase text-purple-700 bg-white px-2.5 py-1 rounded-full border border-purple-200 shadow-2xs">
                    Live Student View Preview
                  </span>
                  <div className="p-2.5 bg-white rounded-2xl shadow-sm border border-gray-200">
                    <img
                      src={
                        adminProfile.centralQrImageUrl ||
                        `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                          `upi://pay?pa=${adminProfile.centralUpiId || "messta.central@hdfcbank"}&pn=${encodeURIComponent(
                            adminProfile.businessName || "Messta"
                          )}&cu=INR`
                        )}`
                      }
                      alt="Student UPI Payment QR"
                      className="w-36 h-36 object-contain rounded-xl"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-gray-900 block font-mono">
                      UPI: {adminProfile.centralUpiPhone || "9876543210"}
                    </span>
                    <span className="text-[10px] text-gray-500 block truncate max-w-[200px]">
                      {adminProfile.centralUpiId || "messta.central@hdfcbank"}
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                    Accepts GPay • PhonePe • Paytm • BHIM
                  </div>
                </div>
              </div>
            </div>

            {/* ── CARD 3: ADMIN PERSONAL COMMISSION BANK ACCOUNT ── */}
            <div className="bg-white rounded-3xl p-6 border-2 border-emerald-300 shadow-sm space-y-4 lg:col-span-2">
              <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                <span className="text-2xl">🏦</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                      4. Admin Personal Commission Bank Account (Where Your Profit Goes)
                    </h3>
                    <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                      Your Daily Profit Payout
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    At the end of each day, when EOD settlement executes, all platform commissions from all mess transactions are transferred directly into this registered personal account
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-semibold flex items-center gap-2">
                <span>🛡️</span>
                <span>
                  This account is kept separate from the Central Collection Account so platform profits never mix with the mess owners' food revenue before end-of-day settlement.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    required
                    value={adminProfile.commissionAccountHolder}
                    onChange={(e) => setAdminProfile({ ...adminProfile, commissionAccountHolder: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="Sachin Singh"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Commission Bank Name
                  </label>
                  <input
                    type="text"
                    required
                    value={adminProfile.commissionBankName}
                    onChange={(e) => setAdminProfile({ ...adminProfile, commissionBankName: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="State Bank of India"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    required
                    value={adminProfile.commissionAccountNumber}
                    onChange={(e) => setAdminProfile({ ...adminProfile, commissionAccountNumber: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 font-mono font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="389201928312"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Bank IFSC Code
                  </label>
                  <input
                    type="text"
                    required
                    value={adminProfile.commissionIfsc}
                    onChange={(e) => setAdminProfile({ ...adminProfile, commissionIfsc: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 font-mono uppercase font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="SBIN0004521"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Admin Personal UPI ID (VPA)
                  </label>
                  <input
                    type="text"
                    required
                    value={adminProfile.commissionUpiId}
                    onChange={(e) => setAdminProfile({ ...adminProfile, commissionUpiId: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 font-mono font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="sachin.singh@sbi"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {savingProfile ? "Saving..." : "✓ Update Commission Bank"}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: INDIVIDUAL MESS FINANCIAL X-RAY DEEP DIVE ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showXRayModal && selectedMess && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 border border-gray-200 shadow-2xl space-y-6 my-8 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-5">
              <div className="flex items-center gap-3.5">
                <img
                  src={selectedMess.imageUrl}
                  alt={selectedMess.name}
                  className="w-14 h-14 rounded-2xl object-cover border border-gray-200 shadow-xs"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                      Partner Financial X-Ray
                    </span>
                    {selectedMess.isVerified && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        🛡️ FSSAI Verified
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight mt-1">
                    {selectedMess.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    📍 {selectedMess.locality}, {selectedMess.city} • Phone: {selectedMess.phone}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowXRayModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Top 3 Metric Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-gray-900 text-white space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Total Partner Turnover (GMV)</span>
                <div className="text-2xl font-black">₹{selectedMess.grossRevenue.toLocaleString("en-IN")}</div>
                <span className="text-[10px] text-emerald-400 block">+₹{selectedMess.todayRevenue.toLocaleString("en-IN")} today</span>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-purple-700">Platform Commission Retained</span>
                <div className="text-2xl font-black text-purple-900">₹{selectedMess.platformCommission.toLocaleString("en-IN")}</div>
                <span className="text-[10px] text-purple-600 block">{selectedMess.commissionTier}</span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-700">Settlement Due to Owner</span>
                <div className="text-2xl font-black text-amber-900">₹{selectedMess.pendingPayout.toLocaleString("en-IN")}</div>
                <span className="text-[10px] text-amber-600 block">₹{selectedMess.settledAmount.toLocaleString("en-IN")} already deposited</span>
              </div>
            </div>

            {/* Inflows vs Outflows (Kitchen P&L Breakdown) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Inflow Sources */}
              <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
                <h4 className="font-black text-emerald-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span>💰</span> Gross Revenue Inflow Breakdown
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Student Monthly/Semester Passes:</span>
                    <strong className="text-gray-900">₹{selectedMess.membershipRevenue.toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Single Plate Walk-in Tokens:</span>
                    <strong className="text-gray-900">₹{selectedMess.perPlateRevenue.toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between font-black text-emerald-900">
                    <span>Total Inflow (GMV):</span>
                    <span>₹{selectedMess.grossRevenue.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Outflow Costs */}
              <div className="p-5 rounded-2xl bg-red-50/50 border border-red-200/80 space-y-3">
                <h4 className="font-black text-red-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span>📉</span> Kitchen Operational Expenditures
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Raw Ingredients & Vegetables (COGS):</span>
                    <strong className="text-gray-900">₹{selectedMess.inventoryCOGS.toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Staff Payroll & Helper Daily Wages:</span>
                    <strong className="text-gray-900">₹{selectedMess.staffPayroll.toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Commercial LPG Gas & Hall Rent:</span>
                    <strong className="text-gray-900">₹{selectedMess.utilitiesRent.toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="pt-2 border-t border-red-200/60 flex items-center justify-between font-black text-red-900">
                    <span>Total Kitchen Cost:</span>
                    <span>₹{selectedMess.operatingExpenses.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Commission Calculation Itemization */}
            <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-3 text-xs">
              <h4 className="font-black text-purple-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <span>📑</span> Messta Platform Commission Calculation
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">
                    Per-Plate Commission ({selectedMess.totalTokensServed.toLocaleString("en-IN")} plates &times; {selectedMess.totalTokensServed > 5000 ? "₹1.50" : "₹2.00"}):
                  </span>
                  <strong className="text-purple-900 font-bold">₹{selectedMess.perPlateCommission.toLocaleString("en-IN")}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">
                    Membership Facilitation Fee (4.0% &times; ₹{selectedMess.membershipRevenue.toLocaleString("en-IN")}):
                  </span>
                  <strong className="text-purple-900 font-bold">₹{selectedMess.membershipCommission.toLocaleString("en-IN")}</strong>
                </div>
                <div className="pt-2 border-t border-purple-200 flex items-center justify-between font-black text-purple-950 text-sm">
                  <span>Total Commission Retained by Messta:</span>
                  <span>₹{selectedMess.platformCommission.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Bank Details & Direct Settlement Action */}
            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span>🏦</span> Bank Payout Routing Account
                </h4>
                <span className="font-bold text-gray-500">Auto-Reconciled</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-gray-700">
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold">Account Holder</span>
                  <strong className="text-gray-900 font-bold">{selectedMess.bankDetails.accountHolderName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold">Bank Name</span>
                  <strong className="text-gray-900 font-bold">{selectedMess.bankDetails.bankName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold">Account Number</span>
                  <strong className="font-mono text-gray-900 font-bold">{selectedMess.bankDetails.accountNumber}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold">IFSC / UPI</span>
                  <strong className="font-mono text-gray-900 font-bold">{selectedMess.bankDetails.ifscCode}</strong>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowXRayModal(false)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                Close X-Ray
              </button>
              <button
                type="button"
                onClick={() => handleOpenPayout(selectedMess)}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>Disburse Settlement Payout 💳</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: DISBURSE SETTLEMENT PAYOUT (SINGLE MESS) ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showPayoutModal && selectedMess && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border border-gray-200 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-bold">
                  💳
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Disburse Partner Payout</h3>
                  <p className="text-xs text-gray-500">{selectedMess.name || selectedMess.messName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPayout} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 flex items-center justify-between">
                <span>Pending Balance Due:</span>
                <strong className="font-black text-sm">
                  ₹{(selectedMess.pendingPayout || selectedMess.balance || 0).toLocaleString("en-IN")}
                </strong>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Settlement Amount to Disburse (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={selectedMess.pendingPayout || selectedMess.balance || 1000000}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 font-bold text-gray-900 text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Payment Settlement Route
                </label>
                <select
                  value={payoutGateway}
                  onChange={(e) => setPayoutGateway(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 font-bold text-gray-900 text-xs focus:ring-2 focus:ring-purple-500"
                >
                  <option value="razorpay">Razorpay Route (Direct Bank Transfer)</option>
                  <option value="stripe">NEFT / RTGS Bank Transfer</option>
                  <option value="instant_upi">Direct Instant UPI Payout</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Bank UTR Reference Number
                </label>
                <input
                  type="text"
                  required
                  value={customUtr}
                  onChange={(e) => setCustomUtr(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 font-mono text-gray-900 text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1 text-gray-600">
                <div className="flex justify-between">
                  <span>Routing to:</span>
                  <span className="font-bold text-gray-800">
                    {selectedMess.bankDetails?.bankName || selectedMess.payoutBankDetails?.bankName || "HDFC Bank"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Account Number:</span>
                  <span className="font-mono font-bold text-gray-800">
                    {selectedMess.bankDetails?.accountNumber || selectedMess.payoutBankDetails?.accountNumber || "••••4821"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>IFSC / UPI:</span>
                  <span className="font-mono text-gray-600">
                    {selectedMess.bankDetails?.ifscCode || selectedMess.payoutBankDetails?.ifscCode || "HDFC0001029"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  disabled={processingPayout}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingPayout}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  {processingPayout ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Deposit 🚀</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: 1-CLICK BATCH SETTLEMENT PAYOUT (ALL MESSES) ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-gray-200 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-xs">
                  ⚡
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    1-Click Batch Settlement Payout
                  </h3>
                  <p className="text-xs text-gray-500">
                    Disburse all pending escrow funds directly to verified mess bank accounts
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Total Escrow Float Card */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 text-purple-950 space-y-1">
                <span className="text-[10px] font-black uppercase text-purple-700">Total Batch Escrow Float to Disburse</span>
                <div className="text-2xl font-black text-purple-900">
                  ₹{(walletData?.masterWallet?.currentEscrowFloat || walletData?.totalPendingWalletsBalance || 0).toLocaleString("en-IN")}
                </div>
                <p className="text-[11px] text-purple-700">
                  {walletData?.partnerWallets?.filter((w) => (w.balance || 0) > 0).length || 0} partner messes will be credited simultaneously
                </p>
              </div>

              {/* Mess Disbursement Breakdown List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                  Batch Distribution Preview
                </span>
                {(walletData?.partnerWallets?.filter((w) => (w.balance || 0) > 0) || []).map((w) => (
                  <div
                    key={w._id || w.messId}
                    className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <strong className="text-gray-900 block font-bold">{w.messName}</strong>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {w.payoutBankDetails?.bankName} ••••{w.payoutBankDetails?.accountNumber?.slice(-4) || "4821"}
                      </span>
                    </div>
                    <span className="font-mono font-black text-emerald-700 text-xs">
                      ₹{(w.balance || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-bold flex items-center gap-2">
                <span>🛡️</span>
                <span>
                  Bank NEFT / Direct UPI instructions will be executed instantly with individual UTR audit codes.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  disabled={batchProcessing}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBatchPayout}
                  disabled={batchProcessing}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  {batchProcessing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                      <span>Disbursing Batch Payouts...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡ Disburse All Bank Payouts</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: TRANSFER ADMIN COMMISSION TO PERSONAL BANK (SBI) ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showAdminWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border border-gray-200 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-700 to-indigo-700 text-white flex items-center justify-center text-xl font-bold shadow-xs">
                  🏦
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Transfer Commission Profit</h3>
                  <p className="text-xs text-gray-500">Universal Escrow &rarr; Super Admin Personal Account</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminWithdrawModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmAdminWithdraw} className="space-y-4 text-xs">
              <div className="p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 text-purple-950 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-700 block">Accumulated Commission Float</span>
                  <span className="text-xs text-purple-600">(Tokens × ₹1) + (4% Walk-in)</span>
                </div>
                <strong className="font-black text-base text-purple-900 font-mono">
                  ₹{(walletData?.masterWallet?.availableCommissionFloat || walletData?.masterWallet?.totalPlatformCommissionEarned || 84520).toLocaleString("en-IN")}
                </strong>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Commission Amount to Transfer (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={adminWithdrawAmount}
                  onChange={(e) => setAdminWithdrawAmount(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 font-bold text-gray-900 text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Bank UTR Reference Code
                </label>
                <input
                  type="text"
                  required
                  value={adminWithdrawUtr}
                  onChange={(e) => setAdminWithdrawUtr(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 font-mono text-gray-900 text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1 text-emerald-950">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                  Beneficiary Destination Account (Admin Personal)
                </span>
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-emerald-800">Account Holder:</span>
                  <strong className="text-emerald-950 font-bold">{adminProfile.commissionAccountHolder || "Sachin Singh"}</strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-800">Bank Name:</span>
                  <strong className="text-emerald-950 font-bold">{adminProfile.commissionBankName || "State Bank of India"}</strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-800">Account Ending:</span>
                  <strong className="font-mono text-emerald-950 font-bold">••••{adminProfile.commissionAccountNumber?.slice(-4) || "8312"}</strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-800">IFSC / UPI:</span>
                  <strong className="font-mono text-emerald-950 font-bold">{adminProfile.commissionIfsc || "SBIN0004521"} • {adminProfile.commissionUpiId || "sachin.singh@sbi"}</strong>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdminWithdrawModal(false)}
                  disabled={processingAdminWithdraw}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingAdminWithdraw}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  {processingAdminWithdraw ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                      <span>Transferring to SBI...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Transfer to SBI 🚀</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
