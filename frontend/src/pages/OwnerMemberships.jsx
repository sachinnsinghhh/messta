import { API_BASE_URL } from "../config/api";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/useAuth";
import { useActiveMess } from "../context/useActiveMess";

export default function OwnerMemberships() {
  const { currentUser } = useAuth();
  const {
    allMesses,
    activeMessId,
    activeMess,
    loadingMesses,
    switchMess,
  } = useActiveMess(currentUser);

  const [plans, setPlans] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);

  // Form states for Flexible Membership Plan Creator (1 to 8 meals/day)
  const [newPlanName, setNewPlanName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newMealsPerDay, setNewMealsPerDay] = useState(2); // 1 to 8 meals per day
  const [newCategory, setNewCategory] = useState("veg");
  const [newTotalTokens, setNewTotalTokens] = useState(60);
  const [newDescription, setNewDescription] = useState("");

  // Broadcast note state
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastTag, setBroadcastTag] = useState("Daily Special");

  // CRM Search & Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: "", type: "" });
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Token Burn Rate calculation algorithm
  const estimatedDays = useMemo(() => {
    const tokens = Number(newTotalTokens) || 0;
    const meals = Number(newMealsPerDay) || 1;
    return Math.max(1, Math.ceil(tokens / meals));
  }, [newTotalTokens, newMealsPerDay]);

  // Load plans, subscribers, and broadcasts for active outlet via async effect
  useEffect(() => {
    if (!activeMessId) return;
    let isCancelled = false;

    async function fetchData() {
      try {
        setLoading(true);

        const [plansRes, subsRes, bRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/subscriptions/plans/${activeMessId}`),
          fetch(`${API_BASE_URL}/api/subscriptions?messId=${activeMessId}`),
          fetch(`${API_BASE_URL}/api/subscriptions/broadcasts/${activeMessId}`),
        ]);

        const [plansData, subsData, bData] = await Promise.all([
          plansRes.json(),
          subsRes.json(),
          bRes.json(),
        ]);

        if (!isCancelled) {
          if (plansData.success) setPlans(plansData.data || []);
          if (subsData.success) setSubscribers(subsData.data || []);
          if (bData.success) setBroadcasts(bData.data || []);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn("Failed loading outlet membership data:", err.message);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [activeMessId, reloadTrigger]);

  const triggerReload = () => setReloadTrigger((prev) => prev + 1);

  // Create Plan Handler
  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!activeMessId) {
      setFeedback({ text: "Please select an active mess outlet first.", type: "error" });
      return;
    }
    setActionLoading(true);
    setFeedback({ text: "", type: "" });

    try {
      const res = await fetch(`${API_BASE_URL}/api/subscriptions/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messId: activeMessId,
          planName: newPlanName,
          price: Number(newPrice),
          mealsPerDay: Number(newMealsPerDay),
          frequency: `${newMealsPerDay} meal${newMealsPerDay > 1 ? "s" : ""} / day`,
          category: newCategory,
          totalTokens: Number(newTotalTokens),
          description: newDescription,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ text: "Membership pass plan published successfully! 🚀", type: "success" });
        setNewPlanName("");
        setNewPrice("");
        setNewDescription("");
        triggerReload();
      } else {
        setFeedback({ text: data.message || "Failed to create plan.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Server error creating membership plan.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Plan Handler
  const handleDeletePlan = async (planId) => {
    if (!window.confirm("Are you sure you want to delete this membership plan?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/subscriptions/plans/${planId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        triggerReload();
      }
    } catch {
      alert("Failed to delete plan.");
    }
  };

  // Send Broadcast Note Handler
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMsg.trim() || !activeMessId) return;
    setActionLoading(true);

    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`${API_BASE_URL}/api/subscriptions/broadcasts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messId: activeMessId,
          ownerEmail: currentUser?.email || "owner@messta.com",
          message: broadcastMsg,
          tag: broadcastTag,
          date: today,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBroadcastMsg("");
        setFeedback({ text: "Announcement broadcasted to active student passes! 📢", type: "success" });
        triggerReload();
      } else {
        setFeedback({ text: data.message || "Failed to broadcast announcement.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Server error broadcasting message.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel/Discontinue Membership Handler
  const handleCancelSubscription = async (subId) => {
    if (!window.confirm("Cancel student membership? This will revoke active dining privileges.")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/subscriptions/${subId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ text: "Student membership cancelled.", type: "success" });
        triggerReload();
      }
    } catch {
      alert("Error cancelling membership.");
    }
  };

  // Filter subscribers based on search term & status
  const filteredSubscribers = useMemo(() => {
    return subscribers.filter((sub) => {
      const matchesSearch =
        sub.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.userPhone && sub.userPhone.includes(searchTerm)) ||
        sub.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.passCode && sub.passCode.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [subscribers, searchTerm, statusFilter]);

  // CRM Analytics Metrics
  const activeMembersCount = subscribers.filter((s) => s.status === "active").length;
  const totalTokensInCirculation = subscribers.reduce((acc, s) => acc + (s.remainingTokens || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50/70 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* ── TOP OUTLET SELECTION HEADER ── */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-[11px] font-black uppercase tracking-wider text-orange-600">
              Community CRM & Plans • {activeMess?.name || "Active Mess"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Membership Plan Creator & Student CRM
          </h1>
          <p className="text-xs text-gray-500">
            Build fine-grained token packages (1-8 meals/day), track subscribers, and broadcast live menu notes.
          </p>
        </div>

        {/* Outlet Selector Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-gray-600">Active Outlet:</label>
          <select
            value={activeMessId}
            onChange={(e) => switchMess(e.target.value)}
            disabled={loadingMesses || allMesses.length === 0}
            aria-label="Active Outlet Branch"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-xs font-bold py-2.5 px-4 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer shadow-2xs"
          >
            {allMesses.map((m) => (
              <option key={m._id || m.id} value={m._id || m.id}>
                📍 {m.name} ({m.locality})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metric Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">Active Students</span>
            <span className="text-2xl font-black text-gray-900">{activeMembersCount}</span>
          </div>
          <span className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl">
            🎓
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">Tokens in Pool</span>
            <span className="text-2xl font-black text-orange-600">{totalTokensInCirculation}</span>
          </div>
          <span className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
            🎟️
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">Published Plans</span>
            <span className="text-2xl font-black text-gray-900">{plans.length}</span>
          </div>
          <span className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
            📑
          </span>
        </div>
      </div>

      {/* Feedback Alert */}
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
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── CORE 2-COLUMN LAYOUT: PLAN CREATOR & CRM ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: FLEXIBLE MEMBERSHIP PLAN CREATOR & COMMUNITY BROADCAST */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 1. FLEXIBLE MEMBERSHIP PLAN CREATOR */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-200/80 shadow-xs space-y-5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                Plan Engine
              </span>
              <h2 className="text-lg font-black text-gray-900 mt-1">
                Flexible Plan Creator
              </h2>
              <p className="text-xs text-gray-500">
                Design custom token plans with fine-grained pricing and 1 to 8 meals/day frequencies.
              </p>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">
                  Plan Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Standard Pass"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="2400"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">
                    Total Tokens
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="365"
                    value={newTotalTokens}
                    onChange={(e) => setNewTotalTokens(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Frequencies (1 to 8 meals per day) & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">
                    Frequency (Meals/Day)
                  </label>
                  <select
                    value={newMealsPerDay}
                    onChange={(e) => setNewMealsPerDay(Number(e.target.value))}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? "Meal" : "Meals"} / day
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">
                    Diet Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="veg">Veg Only</option>
                    <option value="non_veg">Non-Veg Tier</option>
                    <option value="combo">Special / Combo</option>
                  </select>
                </div>
              </div>

              {/* Token Burn Rate Estimator Algorithm Display */}
              <div className="p-3 bg-orange-50/70 border border-orange-200/80 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-black block">Estimated Burn Rate</span>
                  <span className="font-extrabold text-orange-900">
                    ~{estimatedDays} Days of Dining
                  </span>
                </div>
                <span className="text-[11px] font-bold text-orange-700 bg-white px-2 py-1 rounded-lg border border-orange-200">
                  ₹{newPrice && newTotalTokens ? (Number(newPrice) / Number(newTotalTokens)).toFixed(1) : 0} / token
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">
                  Plan Description & Inclusions
                </label>
                <textarea
                  rows="2"
                  placeholder="Includes 2 meals daily with special Sunday dessert..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Publishing Plan..." : "Publish Membership Plan ✨"}
              </button>
            </form>
          </div>

          {/* 2. DAILY COMMUNITY BROADCAST */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                Live Broadcast
              </span>
              <h2 className="text-lg font-black text-gray-900 mt-1">
                Community Announcements
              </h2>
              <p className="text-xs text-gray-500">
                Broadcast daily menu specials directly to your active student pass holders.
              </p>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={broadcastTag}
                  onChange={(e) => setBroadcastTag(e.target.value)}
                  className="p-2 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-700"
                >
                  <option value="Daily Special">Daily Special</option>
                  <option value="Menu Note">Menu Note</option>
                  <option value="Timing Alert">Timing Alert</option>
                  <option value="Holiday Notice">Holiday Notice</option>
                </select>
              </div>

              <textarea
                rows="3"
                required
                placeholder="e.g. Special Paneer Butter Masala & Gulab Jamun tonight!"
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                className="w-full p-3 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
              />

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 bg-gray-900 hover:bg-black text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-xs disabled:opacity-50"
              >
                Broadcast to Community 📢
              </button>
            </form>

            {/* Broadcast History */}
            <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                Recent Broadcasts Sent
              </span>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {broadcasts.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center">No broadcasts sent yet.</p>
                ) : (
                  broadcasts.map((b) => (
                    <div key={b._id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                          {b.tag || "Special"}
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

        </div>

        {/* RIGHT COLUMN: SUBSCRIBER CRM TABLE & PUBLISHED PLANS */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 3. SUBSCRIBER CRM TABLE (Live Searchable + Token Meter) */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-200/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                  Active Pass Holders
                </span>
                <h2 className="text-lg font-black text-gray-900 mt-1">
                  Community CRM & Subscriber Table
                </h2>
                <p className="text-xs text-gray-500">Live monitoring of remaining tokens vs. plan allocation.</p>
              </div>

              {/* Filters & Search */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="p-2 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-700"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="exhausted">Exhausted</option>
                  <option value="paused">Paused</option>
                </select>

                <input
                  type="text"
                  placeholder="Search student, email, pass..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="p-2 text-xs bg-gray-50 border border-gray-300 rounded-xl w-full sm:w-48 focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    <th className="pb-3">Student & Pass</th>
                    <th className="pb-3">Opted Plan</th>
                    <th className="pb-3">Token Balance</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-400">Loading student passes...</td>
                    </tr>
                  ) : filteredSubscribers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-400">
                        No students matching search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredSubscribers.map((sub) => {
                      const percentLeft = Math.round((sub.remainingTokens / sub.totalTokens) * 100);
                      const isLow = percentLeft <= 20;

                      return (
                        <tr key={sub._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 pr-2">
                            <p className="font-extrabold text-gray-900">{sub.userName}</p>
                            <p className="text-[10px] text-gray-500">{sub.userEmail}</p>
                            {sub.passCode && (
                              <span className="font-mono text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.2 rounded">
                                {sub.passCode}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 pr-2">
                            <span className="font-bold text-gray-800 block">{sub.planName}</span>
                            <span className="text-[10px] text-gray-500 uppercase font-bold">
                              {sub.category} • {sub.frequency}
                            </span>
                          </td>

                          <td className="py-3.5 pr-2 min-w-[140px]">
                            <div className="flex justify-between items-center text-[11px] font-bold text-gray-700 mb-1">
                              <span>{sub.remainingTokens} / {sub.totalTokens}</span>
                              <span className={isLow ? "text-red-600 font-black" : "text-emerald-700"}>
                                {percentLeft}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isLow ? "bg-red-500" : percentLeft < 50 ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${percentLeft}%` }}
                              ></div>
                            </div>
                          </td>

                          <td className="py-3.5 pr-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                sub.status === "active"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : sub.status === "exhausted"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {sub.status}
                            </span>
                          </td>

                          <td className="py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleCancelSubscription(sub._id)}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-[10px] uppercase transition"
                            >
                              Discontinue
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. PUBLISHED PLANS LIST FOR THIS MESS */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-900">
                  Published Membership Plans ({plans.length})
                </h3>
                <p className="text-xs text-gray-500">Live passes available for students to purchase.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plans.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-gray-400 text-xs">
                  No plans published yet. Use the Plan Engine on the left to create your first package.
                </div>
              ) : (
                plans.map((p) => (
                  <div
                    key={p._id}
                    className="p-4 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-3 relative group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md">
                          {p.category}
                        </span>
                        <h4 className="font-extrabold text-sm text-gray-900 mt-1">{p.planName}</h4>
                      </div>
                      <span className="font-black text-orange-600 text-base">₹{p.price}</span>
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-2">{p.description || "Token-based mess plan."}</p>

                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-700 pt-2 border-t border-gray-200">
                      <span>{p.mealsPerDay || p.frequency}</span>
                      <span className="px-2 py-0.5 bg-white border border-gray-300 rounded-md text-orange-600 font-black">
                        {p.totalTokens} Tokens
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePlan(p._id)}
                      className="w-full mt-2 py-1 text-center text-[10px] font-bold text-red-500 hover:text-red-700 uppercase"
                    >
                      Delete Plan ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}