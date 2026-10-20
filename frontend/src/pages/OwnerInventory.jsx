import { API_BASE_URL } from "../config/api";
import { useState, useEffect, useMemo, useId } from "react";
import { useAuth } from "../context/useAuth";
import { useActiveMess } from "../context/useActiveMess";

export default function OwnerInventory() {
  const { currentUser } = useAuth();
  const {
    allMesses,
    activeMessId,
    activeMess,
    switchMess,
  } = useActiveMess(currentUser);

  // Active Management Tab: "catalog" | "inflow" | "forecast" | "transactions"
  const [activeTab, setActiveTab] = useState("catalog");

  // Inventory Data States
  const [items, setItems] = useState([]);
  const [metrics, setMetrics] = useState({
    totalItems: 0,
    totalInventoryValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    expiringSoonCount: 0,
    expiredCount: 0,
    categoryCounts: { perishables: 0, staples: 0, dairy: 0, packaging: 0 },
  });
  const [transactions, setTransactions] = useState([]);
  const [forecast, setForecast] = useState(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [expiringSoonOnly, setExpiringSoonOnly] = useState(false);

  // Loading & Feedback States
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: "", type: "" });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals States
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState(null);

  // Form States: New Item
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("staples");
  const [newItemUnit, setNewItemUnit] = useState("kg");
  const [newItemCurrentStock, setNewItemCurrentStock] = useState("");
  const [newItemMinThreshold, setNewItemMinThreshold] = useState(15);
  const [newItemIdealStock, setNewItemIdealStock] = useState(50);
  const [newItemCostPerUnit, setNewItemCostPerUnit] = useState("");
  const [newItemShelfLifeDays, setNewItemShelfLifeDays] = useState(90);
  const [newItemExpiryDate, setNewItemExpiryDate] = useState("");
  const [newItemVendorName, setNewItemVendorName] = useState("");
  const [newItemVendorPhone, setNewItemVendorPhone] = useState("");
  const [newItemNotes, setNewItemNotes] = useState("");

  // Form States: Restock Purchase
  const [restockItemId, setRestockItemId] = useState("");
  const [restockQty, setRestockQty] = useState("");
  const [restockCostPerUnit, setRestockCostPerUnit] = useState("");
  const [restockVendor, setRestockVendor] = useState("");
  const [restockInvoice, setRestockInvoice] = useState("");
  const [restockShelfLifeDays, setRestockShelfLifeDays] = useState("");
  const [restockExpiryDate, setRestockExpiryDate] = useState("");
  const [restockNotes, setRestockNotes] = useState("");

  // Form States: Adjustment / Spoilage
  const [adjustItemId, setAdjustItemId] = useState("");
  const [adjustType, setAdjustType] = useState("spoilage_waste"); // "spoilage_waste" | "manual_adjustment"
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("Vegetables / Perishables Spoiled");
  const [adjustNotes, setAdjustNotes] = useState("");

  // Form States: Daily / Meal Ingredient Usage Outflow
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usageMealSession, setUsageMealSession] = useState("Lunch Service");
  const [usageDate, setUsageDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [usageNotes, setUsageNotes] = useState("");
  const [usageRows, setUsageRows] = useState([{ itemId: "", quantity: "" }]);

  // Accessible unique IDs for form controls
  const purchaseItemSelectId = useId();
  const adjustItemSelectId = useId();

  // Load Inventory Data, Transactions, and Forecasting for Active Mess Outlet
  useEffect(() => {
    if (!activeMessId) return;
    let isCancelled = false;

    async function fetchInventoryData() {
      try {
        setLoading(true);

        const [invRes, txRes, fcRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/inventory/${activeMessId}`),
          fetch(`${API_BASE_URL}/api/inventory/${activeMessId}/transactions`),
          fetch(`${API_BASE_URL}/api/inventory/${activeMessId}/forecast`),
        ]);

        const [invData, txData, fcData] = await Promise.all([
          invRes.json(),
          txRes.json(),
          fcRes.json(),
        ]);

        if (!isCancelled) {
          if (invData.success) {
            setItems(invData.data || []);
            setMetrics(
              invData.metrics || {
                totalItems: 0,
                totalInventoryValue: 0,
                lowStockCount: 0,
                outOfStockCount: 0,
                expiringSoonCount: 0,
                expiredCount: 0,
                categoryCounts: { perishables: 0, staples: 0, dairy: 0, packaging: 0 },
              }
            );
          }
          if (txData.success) {
            setTransactions(txData.data || []);
          }
          if (fcData.success) {
            setForecast(fcData);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn("Failed fetching inventory data:", err.message);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchInventoryData();
    return () => {
      isCancelled = true;
    };
  }, [activeMessId, refreshTrigger]);

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  // Filtered Items memo
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.primaryVendor?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;

      const matchesLowStock = !lowStockOnly || item.stockStatus !== "in_stock";

      const matchesExpiringSoon = !expiringSoonOnly || (item.expiryStatus === "expiring_soon" || item.expiryStatus === "expired");

      return matchesSearch && matchesCategory && matchesLowStock && matchesExpiringSoon;
    });
  }, [items, searchQuery, selectedCategory, lowStockOnly, expiringSoonOnly]);

  // Handle Create New Item
  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim() || !activeMessId) return;

    setActionLoading(true);
    setFeedback({ text: "", type: "" });

    try {
      const res = await fetch(`${API_BASE_URL}/api/inventory/${activeMessId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItemName,
          category: newItemCategory,
          unit: newItemUnit,
          currentStock: Number(newItemCurrentStock) || 0,
          minThreshold: Number(newItemMinThreshold) || 10,
          idealStock: Number(newItemIdealStock) || 50,
          costPerUnit: Number(newItemCostPerUnit) || 0,
          primaryVendor: {
            name: newItemVendorName,
            phone: newItemVendorPhone,
          },
          shelfLifeDays: Number(newItemShelfLifeDays) || 7,
          expiryDate: newItemExpiryDate || undefined,
          notes: newItemNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          text: `"${newItemName}" added to kitchen inventory successfully! 📦`,
          type: "success",
        });
        setShowAddItemModal(false);
        // Reset form
        setNewItemName("");
        setNewItemCurrentStock("");
        setNewItemCostPerUnit("");
        setNewItemVendorName("");
        setNewItemVendorPhone("");
        setNewItemShelfLifeDays(90);
        setNewItemExpiryDate("");
        setNewItemNotes("");
        triggerRefresh();
      } else {
        setFeedback({ text: data.message || "Failed to create item.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Network error adding item.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle 1-Click Seed Starter Staples
  const handleSeedDefaults = async () => {
    if (!activeMessId) return;
    setActionLoading(true);
    setFeedback({ text: "", type: "" });

    try {
      const res = await fetch(`${API_BASE_URL}/api/inventory/${activeMessId}/seed-defaults`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          text: data.message || "12 standard mess staples seeded with Par Levels! 🚀",
          type: "success",
        });
        triggerRefresh();
      } else {
        setFeedback({ text: data.message || "Failed seeding inventory.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Network error seeding starter items.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Quick Restock Purchase Submission
  const handleRecordPurchase = async (e) => {
    e.preventDefault();
    const targetItemId = restockItemId || selectedItemForAction?._id;
    if (!targetItemId || !restockQty || !activeMessId) return;

    setActionLoading(true);
    setFeedback({ text: "", type: "" });

    try {
      const res = await fetch(`${API_BASE_URL}/api/inventory/${activeMessId}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: targetItemId,
          quantity: Number(restockQty),
          unitCost: Number(restockCostPerUnit),
          vendorName: restockVendor,
          invoiceNo: restockInvoice,
          shelfLifeDays: restockShelfLifeDays ? Number(restockShelfLifeDays) : undefined,
          expiryDate: restockExpiryDate || undefined,
          notes: restockNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ text: data.message, type: "success" });
        setShowRestockModal(false);
        setSelectedItemForAction(null);
        setRestockQty("");
        setRestockCostPerUnit("");
        setRestockVendor("");
        setRestockInvoice("");
        setRestockShelfLifeDays("");
        setRestockExpiryDate("");
        setRestockNotes("");
        triggerRefresh();
      } else {
        setFeedback({ text: data.message || "Restock failed.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Network error logging purchase.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Log Spoilage / Wastage Submission
  const handleRecordAdjustment = async (e) => {
    e.preventDefault();
    const targetItemId = adjustItemId || selectedItemForAction?._id;
    if (!targetItemId || !adjustQty || !activeMessId) return;

    setActionLoading(true);
    setFeedback({ text: "", type: "" });

    try {
      const res = await fetch(`${API_BASE_URL}/api/inventory/${activeMessId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: targetItemId,
          adjustmentType: adjustType,
          quantity: Number(adjustQty),
          reason: adjustReason,
          notes: adjustNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ text: data.message, type: "success" });
        setShowAdjustModal(false);
        setSelectedItemForAction(null);
        setAdjustQty("");
        setAdjustNotes("");
        triggerRefresh();
      } else {
        setFeedback({ text: data.message || "Adjustment failed.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Network error logging adjustment.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // ── DAILY / MEAL USAGE HANDLERS ──
  const handleAddUsageRow = () => {
    setUsageRows((prev) => [...prev, { itemId: "", quantity: "" }]);
  };

  const handleRemoveUsageRow = (index) => {
    setUsageRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleUsageRowChange = (index, field, value) => {
    setUsageRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRecordUsage = async (e) => {
    e.preventDefault();
    if (!activeMessId) return;

    const validRows = usageRows.filter((r) => r.itemId && Number(r.quantity) > 0);
    if (validRows.length === 0) {
      setFeedback({ text: "Please select at least one ingredient and specify the quantity used.", type: "error" });
      return;
    }

    // Verify stock availability
    for (const r of validRows) {
      const found = items.find((i) => i._id === r.itemId);
      if (found && Number(r.quantity) > found.currentStock) {
        setFeedback({
          text: `Cannot deduct ${r.quantity} ${found.unit} from ${found.name}. Current in-stock is only ${found.currentStock} ${found.unit}.`,
          type: "error",
        });
        return;
      }
    }

    setActionLoading(true);
    setFeedback({ text: "", type: "" });

    try {
      const res = await fetch(`${API_BASE_URL}/api/inventory/${activeMessId}/usage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealSession: usageMealSession,
          date: usageDate,
          notes: usageNotes,
          items: validRows.map((r) => ({
            itemId: r.itemId,
            quantity: Number(r.quantity),
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          text: data.message || `Usage recorded for ${usageMealSession}! Quantities deducted from Stock Master. 🍳`,
          type: "success",
        });
        setShowUsageModal(false);
        setUsageNotes("");
        setUsageRows([{ itemId: "", quantity: "" }]);
        triggerRefresh();
      } else {
        setFeedback({ text: data.message || "Failed to record usage.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Network error recording ingredient usage.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Item
  const handleDeleteItem = async (itemId, itemName) => {
    if (!window.confirm(`Are you sure you want to remove "${itemName}" from kitchen inventory?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/inventory/items/${itemId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ text: `"${itemName}" removed from inventory.`, type: "success" });
        triggerRefresh();
      } else {
        setFeedback({ text: data.message || "Failed deleting item.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Network error deleting item.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for Category Styling
  const getCategoryBadge = (cat) => {
    switch (cat) {
      case "perishables":
        return { label: "🥦 Perishables", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" };
      case "staples":
        return { label: "🌾 Dry Staples", bg: "bg-amber-50 text-amber-800 border-amber-200" };
      case "dairy":
        return { label: "🥛 Dairy & Cold", bg: "bg-blue-50 text-blue-800 border-blue-200" };
      case "packaging":
        return { label: "📦 Packaging & Gas", bg: "bg-purple-50 text-purple-800 border-purple-200" };
      default:
        return { label: cat, bg: "bg-gray-100 text-gray-700 border-gray-300" };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/70 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* ── TOP OUTLET COMMAND & SWITCHER BAR ── */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-[11px] font-black uppercase tracking-wider text-orange-600">
              Kitchen Operations & Supply Chain • {activeMess?.name || "Mess Outlet"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Inventory & Zero Wastage OS
          </h1>
          <p className="text-xs text-gray-500">
            Real-time stock tracking, Par Level safety warnings, supplier logs, and QR automated consumption.
          </p>
        </div>

        {/* Multi-Outlet Context Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {allMesses.length > 1 && (
            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-200">
              <span className="text-[10px] font-bold uppercase text-gray-400 pl-2">Branch:</span>
              <select
                value={activeMessId || ""}
                onChange={(e) => switchMess(e.target.value)}
                className="bg-white text-xs font-black text-gray-800 py-1.5 px-3 rounded-xl border border-gray-200 shadow-2xs focus:ring-2 focus:ring-orange-500 cursor-pointer"
              >
                {allMesses.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.locality || m.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowUsageModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition active:scale-95 flex items-center gap-1.5"
            >
              <span>🍳</span> Record Meal Usage
            </button>
            <button
              type="button"
              onClick={() => setShowAddItemModal(true)}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition active:scale-95 flex items-center gap-1.5"
            >
              <span>+</span> Add Kitchen Item
            </button>
          </div>
        </div>
      </div>

      {/* ── FEEDBACK ALERTS ── */}
      {feedback.text && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all shadow-2xs ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-red-50 text-red-900 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{feedback.type === "success" ? "✓" : "⚠️"}</span>
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback({ text: "", type: "" })}
            className="text-gray-400 hover:text-gray-600 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── LOW STOCK EMERGENCY PAR LEVEL BANNER ── */}
      {(metrics.lowStockCount > 0 || metrics.outOfStockCount > 0) && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 rounded-3xl p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">
                Critical Kitchen Stock Warning ({metrics.lowStockCount + metrics.outOfStockCount} Items Below Safety Par Level)
              </h3>
              <p className="text-xs text-red-100 mt-0.5">
                {metrics.outOfStockCount > 0 && (
                  <strong className="underline decoration-white mr-2">
                    {metrics.outOfStockCount} items completely depleted!
                  </strong>
                )}
                {metrics.lowStockCount} items below safety thresholds. Restock immediately to prevent counter shortages during peak meal service.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setLowStockOnly(true);
                setActiveTab("catalog");
              }}
              className="px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-black uppercase tracking-wider backdrop-blur-xs transition"
            >
              Filter Low Stock
            </button>
            <button
              type="button"
              onClick={() => {
                setShowRestockModal(true);
                setSelectedItemForAction(null);
              }}
              className="px-4 py-2 bg-white text-red-700 hover:bg-gray-100 rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition"
            >
              + Quick Restock
            </button>
          </div>
        </div>
      )}

      {/* ── SHELF LIFE EXPIRATION WARNING BANNER (1-2 DAYS ALERT) ── */}
      {(metrics.expiringSoonCount > 0 || metrics.expiredCount > 0) && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 rounded-3xl p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">⏰</span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">
                Shelf Life Expiry Alert ({metrics.expiringSoonCount + metrics.expiredCount} Items Requiring Urgent Priority)
              </h3>
              <p className="text-xs text-amber-100 mt-0.5">
                {metrics.expiredCount > 0 && (
                  <strong className="underline decoration-white mr-2">
                    {metrics.expiredCount} item(s) have passed safe shelf life!
                  </strong>
                )}
                {metrics.expiringSoonCount > 0 && (
                  <span>
                    <strong>{metrics.expiringSoonCount} ingredient(s)</strong> will spoil within the next 24-48 hours (1 to 2 days). Prioritize using them in today's lunch or dinner cooking (First In, First Out) to prevent food waste!
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setExpiringSoonOnly(!expiringSoonOnly);
                setActiveTab("catalog");
              }}
              className="px-4 py-2 bg-white text-orange-700 hover:bg-gray-100 rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition active:scale-95"
            >
              {expiringSoonOnly ? "Show All Items" : "Filter Expiring (<48h) ➔"}
            </button>
          </div>
        </div>
      )}

      {/* ── TOP KPI METRIC CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* Total Stock Items */}
        <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
              Stocked Ingredients
            </span>
            <span className="p-2 rounded-xl bg-orange-50 text-orange-600 text-sm">📦</span>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-gray-900">{metrics.totalItems}</h2>
            <span className="text-[11px] font-bold text-gray-500">SKUs tracked</span>
          </div>
          <div className="text-[10px] text-gray-400 font-medium">
            {metrics.categoryCounts.perishables} Perishables • {metrics.categoryCounts.staples} Dry Staples
          </div>
        </div>

        {/* Total Inventory Asset Value */}
        <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
              Kitchen Asset Value
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 text-sm">₹</span>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-emerald-700">₹{metrics.totalInventoryValue.toLocaleString("en-IN")}</h2>
            <span className="text-[11px] font-bold text-emerald-800">Total Capital</span>
          </div>
          <div className="text-[10px] text-gray-400 font-medium">
            Tied into raw kitchen inventory
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          className={`p-5 rounded-3xl border shadow-xs space-y-2 transition-all ${
            metrics.lowStockCount > 0
              ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20"
              : "bg-white border-gray-200/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
              Low Stock Warnings
            </span>
            <span className="p-2 rounded-xl bg-amber-100 text-amber-700 text-sm">⚠️</span>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className={`text-2xl font-black ${metrics.lowStockCount > 0 ? "text-amber-700" : "text-gray-900"}`}>
              {metrics.lowStockCount}
            </h2>
            <span className="text-[11px] font-bold text-amber-800">Below Par Level</span>
          </div>
          <div className="text-[10px] text-amber-900/70 font-medium">
            Requires immediate restock
          </div>
        </div>

        {/* Shelf Life Expiry Alerts (1-2 days) */}
        <div
          className={`p-5 rounded-3xl border shadow-xs space-y-2 transition-all ${
            metrics.expiringSoonCount > 0
              ? "bg-orange-50/70 border-orange-300 ring-2 ring-orange-500/20"
              : "bg-white border-gray-200/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
              Shelf Life Alerts
            </span>
            <span className="p-2 rounded-xl bg-orange-100 text-orange-700 text-sm">⏰</span>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className={`text-2xl font-black ${metrics.expiringSoonCount > 0 ? "text-orange-600" : "text-gray-900"}`}>
              {metrics.expiringSoonCount || 0}
            </h2>
            <span className="text-[11px] font-bold text-orange-800">Expiring &lt;48h</span>
          </div>
          <div className="text-[10px] text-orange-900/70 font-medium">
            {metrics.expiredCount > 0 ? `${metrics.expiredCount} expired past shelf life` : "Use first in today's menu (FIFO)"}
          </div>
        </div>

        {/* Expected Production Headcount Today */}
        <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
              Today's Production Demand
            </span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 text-sm">👥</span>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-blue-700">
              {forecast?.headcount?.expectedHeadcountTotal || 0}
            </h2>
            <span className="text-[11px] font-bold text-blue-800">Est. Meals Today</span>
          </div>
          <div className="text-[10px] text-gray-400 font-medium">
            {forecast?.headcount?.expectedLunchCount || 0} Lunch • {forecast?.headcount?.expectedDinnerCount || 0} Dinner
          </div>
        </div>
      </div>

      {/* ── NAVIGATION TABS ── */}
      <div className="flex border-b border-gray-200 gap-2">
        {[
          { key: "catalog", label: "📦 Stock Master & Par Levels", count: items.length },
          { key: "inflow", label: "🛒 Stock Inflow (Purchases)", count: null },
          { key: "forecast", label: "👥 Crowd Record", count: forecast?.headcount?.expectedHeadcountTotal ?? 0 },
          { key: "transactions", label: "📜 Kitchen Audit & Consumption Log", count: transactions.length },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 px-3 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border-b-2 ${
              activeTab === tab.key
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  activeTab === tab.key
                    ? "bg-orange-100 text-orange-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: STOCK MASTER & INVENTORY CATALOG ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          
          {/* Controls: Search, Category Filters, and Action Bar */}
          <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Search ingredients, staples, suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 font-bold"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: "all", label: "All Items" },
                { key: "staples", label: "🌾 Grains & Staples" },
                { key: "perishables", label: "🥦 Veggies / Daily" },
                { key: "dairy", label: "🥛 Dairy" },
                { key: "packaging", label: "📦 Packaging & Gas" },
              ].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setSelectedCategory(c.key)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase transition-all ${
                    selectedCategory === c.key
                      ? "bg-orange-600 text-white shadow-2xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {c.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase transition-all flex items-center gap-1 border ${
                  lowStockOnly
                    ? "bg-red-500 text-white border-red-500 shadow-2xs"
                    : "bg-white text-red-600 border-red-200 hover:bg-red-50"
                }`}
              >
                <span>⚠️</span>
                <span>Low Stock Only</span>
              </button>

              <button
                type="button"
                onClick={() => setExpiringSoonOnly(!expiringSoonOnly)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase transition-all flex items-center gap-1 border ${
                  expiringSoonOnly
                    ? "bg-amber-500 text-white border-amber-500 shadow-2xs"
                    : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
                }`}
              >
                <span>⏰</span>
                <span>Expiring Soon ({metrics.expiringSoonCount || 0})</span>
              </button>
            </div>
          </div>

          {/* Empty State / Starter Seed Helper */}
          {items.length === 0 && !loading && (
            <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-gray-300 text-center space-y-4 max-w-xl mx-auto">
              <span className="text-4xl block">🍳</span>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-gray-900">
                  Kitchen Inventory is Empty
                </h3>
                <p className="text-xs text-gray-500">
                  You haven't added any raw kitchen ingredients for this mess outlet yet. Seed standard Indian mess staples in 1 click or add custom items.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSeedDefaults}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? "Seeding..." : "⚡ Seed 12 Mess Kitchen Staples"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(true)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs uppercase tracking-wider rounded-xl transition"
                >
                  + Add Custom Item
                </button>
              </div>
            </div>
          )}

          {/* Inventory Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const catBadge = getCategoryBadge(item.category);
              const isLow = item.stockStatus === "low_stock";
              const isOut = item.stockStatus === "out_of_stock";
              const isExpired = item.expiryStatus === "expired";
              const isExpiringSoon = item.expiryStatus === "expiring_soon";
              const percentOfMin = Math.min(100, Math.round((item.currentStock / (item.idealStock || item.minThreshold * 2)) * 100));

              return (
                <div
                  key={item._id}
                  className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between space-y-4 hover:shadow-xs relative overflow-hidden ${
                    isExpired
                      ? "border-red-500 bg-red-50/20 ring-1 ring-red-500/40"
                      : isExpiringSoon
                      ? "border-amber-400 bg-amber-50/20 ring-1 ring-amber-400/30"
                      : isOut
                      ? "border-red-400 bg-red-50/10 ring-1 ring-red-400/30"
                      : isLow
                      ? "border-amber-300 bg-amber-50/10 ring-1 ring-amber-400/20"
                      : "border-gray-200/80 hover:border-gray-300"
                  }`}
                >
                  {/* Top Bar: Category & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md border ${catBadge.bg}`}>
                      {catBadge.label}
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {item.daysLeft !== null && item.daysLeft !== undefined && item.currentStock > 0 && (
                        item.daysLeft < 0 ? (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-red-100 text-red-900 border-red-300">
                            🚨 Expired
                          </span>
                        ) : item.daysLeft <= 2 ? (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-amber-100 text-amber-900 border-amber-300 animate-pulse">
                            ⏰ {item.daysLeft === 0 ? "Expires Today" : `Expires in ${item.daysLeft}d`}
                          </span>
                        ) : null
                      )}

                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isOut
                            ? "bg-red-100 text-red-800 border-red-300 animate-pulse"
                            : isLow
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-emerald-100 text-emerald-800 border-emerald-300"
                        }`}
                      >
                        {isOut ? "● Out of Stock" : isLow ? "⚠️ Low Stock" : "✓ In Stock"}
                      </span>
                    </div>
                  </div>

                  {/* Item Details */}
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-base text-gray-900 leading-tight">
                      {item.name}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      Est. Price: <strong>₹{item.costPerUnit}</strong> / {item.unit} • Total Asset: <strong>₹{item.stockValue?.toLocaleString("en-IN") || 0}</strong>
                    </p>
                  </div>

                  {/* Stock Level Bar & Par Level Threshold */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="flex items-baseline justify-between text-xs font-bold">
                      <span className="text-gray-500 text-[11px]">Current Stock:</span>
                      <span className={`text-base font-black ${isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-gray-900"}`}>
                        {item.currentStock} {item.unit}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all rounded-full ${
                          isOut
                            ? "w-0 bg-red-600"
                            : isLow
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${percentOfMin}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                      <span>Par Min: {item.minThreshold} {item.unit}</span>
                      <span>Target: {item.idealStock || item.minThreshold * 2} {item.unit}</span>
                    </div>
                  </div>

                  {/* Shelf Life & Expiry Alert Badge */}
                  {item.daysLeft !== null && item.daysLeft !== undefined && (
                    <div className="pt-0.5">
                      {item.daysLeft < 0 ? (
                        <div className="p-2 rounded-xl bg-red-100 border border-red-300 text-red-900 text-[11px] font-black flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <span>🚨</span> EXPIRED ({Math.abs(item.daysLeft)} days ago)
                          </span>
                          <span className="text-[10px] uppercase font-bold text-red-700">Audit / Spoilage</span>
                        </div>
                      ) : item.daysLeft === 0 ? (
                        <div className="p-2 rounded-xl bg-red-100/90 border border-red-300 text-red-900 text-[11px] font-black flex items-center justify-between animate-pulse">
                          <span className="flex items-center gap-1">
                            <span>⚠️</span> EXPIRES TODAY!
                          </span>
                          <span className="text-[10px] uppercase font-bold text-red-800">Use Immediately</span>
                        </div>
                      ) : item.daysLeft === 1 ? (
                        <div className="p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 text-[11px] font-black flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <span>⏰</span> EXPIRES IN 1 DAY!
                          </span>
                          <span className="text-[10px] uppercase font-bold text-amber-800">Cook Today (FIFO)</span>
                        </div>
                      ) : item.daysLeft === 2 ? (
                        <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-extrabold flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <span>⏰</span> Expires in 2 days
                          </span>
                          <span className="text-[10px] font-bold text-amber-700">
                            Exp: {new Date(item.calculatedExpiryDate || item.expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-gray-500 flex items-center justify-between px-1">
                          <span className="flex items-center gap-1 text-emerald-700 font-bold">
                            <span>🌿</span> Shelf Life: {item.shelfLifeDays || 7}d
                          </span>
                          <span className="text-gray-400 font-medium">
                            {item.daysLeft} days remaining ({new Date(item.calculatedExpiryDate || item.expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Vendor / Supplier Snippet */}
                  {item.primaryVendor?.name && (
                    <div className="text-[11px] text-gray-500 flex items-center justify-between border-t border-gray-100 pt-2">
                      <span className="font-bold">Vendor: {item.primaryVendor.name}</span>
                      <span className="text-gray-400">{item.primaryVendor.phone || "No phone"}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItemForAction(item);
                        setRestockItemId(item._id);
                        setRestockCostPerUnit(item.costPerUnit || "");
                        setRestockVendor(item.primaryVendor?.name || "");
                        setRestockShelfLifeDays(item.shelfLifeDays || "");
                        setShowRestockModal(true);
                      }}
                      className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-[11px] font-black uppercase tracking-wider text-center transition"
                    >
                      + Restock
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItemForAction(item);
                        setAdjustItemId(item._id);
                        setShowAdjustModal(true);
                      }}
                      className="py-1.5 px-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[11px] font-black uppercase tracking-wider text-center transition"
                    >
                      Waste / Adj
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item._id, item.name)}
                      className="py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-[11px] font-black uppercase tracking-wider text-center transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: STOCK INFLOW (PURCHASE ENTRY & VENDOR BILLS) ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "inflow" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Purchase Log Form */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                Stock Inflow
              </span>
              <h2 className="text-lg font-black text-gray-900 mt-1">
                Log Supplier Purchase
              </h2>
              <p className="text-xs text-gray-500">
                Record new ingredient deliveries from wholesale mandis and vendors to increment live inventory.
              </p>
            </div>

            <form onSubmit={handleRecordPurchase} className="space-y-4">
              <div>
                <label htmlFor={purchaseItemSelectId} className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Select Kitchen Item *
                </label>
                <select
                  id={purchaseItemSelectId}
                  required
                  value={restockItemId}
                  onChange={(e) => {
                    setRestockItemId(e.target.value);
                    const matched = items.find((i) => i._id === e.target.value);
                    if (matched) {
                      setRestockCostPerUnit(matched.costPerUnit || "");
                      setRestockVendor(matched.primaryVendor?.name || "");
                      setRestockShelfLifeDays(matched.shelfLifeDays || "");
                    }
                  }}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">-- Choose Ingredient --</option>
                  {items.map((i) => (
                    <option key={i._id} value={i._id}>
                      {i.name} (Current: {i.currentStock} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Quantity Received *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    placeholder="e.g. 50"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-black text-gray-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Cost Price / Unit (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 65"
                    value={restockCostPerUnit}
                    onChange={(e) => setRestockCostPerUnit(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Batch Shelf Life (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 5"
                    value={restockShelfLifeDays}
                    onChange={(e) => setRestockShelfLifeDays(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Batch Expiry Date
                  </label>
                  <input
                    type="date"
                    value={restockExpiryDate}
                    onChange={(e) => setRestockExpiryDate(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white"
                  />
                </div>
              </div>

              {/* Total Purchase Amount Preview */}
              {restockQty && restockCostPerUnit && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex justify-between items-center font-bold">
                  <span>Total Purchase Expenditure:</span>
                  <span className="text-base font-black">
                    ₹{(Number(restockQty) * Number(restockCostPerUnit)).toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Supplier / Vendor Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shree Ganesh Grain Wholesalers"
                  value={restockVendor}
                  onChange={(e) => setRestockVendor(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Invoice / Mandi Bill No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. BILL-90214"
                  value={restockInvoice}
                  onChange={(e) => setRestockInvoice(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Batch / Quality Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fresh mandi morning lot, 50kg bag"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? "Logging Delivery..." : "Record Inflow & Restock Stock 🚀"}
              </button>
            </form>
          </div>

          {/* Recent Deliveries Table */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                  Recent Purchase Inflow History
                </h3>
                <p className="text-xs text-gray-500">Audit trail of deliveries received from wholesalers.</p>
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {transactions.filter((t) => t.transactionType === "purchase").length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  No supplier purchases recorded yet. Log your first delivery on the left!
                </div>
              ) : (
                transactions
                  .filter((t) => t.transactionType === "purchase")
                  .map((tx) => (
                    <div
                      key={tx._id}
                      className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200/80 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-gray-900">{tx.itemName}</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black">
                            +{tx.quantity} {tx.unit}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          Vendor: <strong>{tx.vendor?.name || "Direct Mandi"}</strong> • Invoice: {tx.vendor?.invoiceNo || "N/A"}
                        </p>
                      </div>

                      <div className="text-right space-y-0.5">
                        <div className="font-black text-emerald-700">₹{tx.totalCost?.toLocaleString("en-IN") || 0}</div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: KITCHEN CROWD RECORD & HEADCOUNT ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "forecast" && (
        <div className="space-y-6">
          
          {/* Headcount Context Card */}
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 rounded-3xl p-6 text-white shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                  Kitchen Headcount Tracker
                </span>
                <h2 className="text-2xl font-black mt-1">
                  Today's Kitchen Crowd Record
                </h2>
                <p className="text-xs text-orange-100 max-w-xl mt-0.5">
                  Expected lunch and dinner student headcount based on active subscribers and meal reservations.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center shrink-0">
                <span className="text-3xl font-black block">
                  {forecast?.headcount?.expectedHeadcountTotal || 0}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-200">
                  Total Projected Meals Today
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/20 text-xs">
              <div>
                <span className="text-orange-200 block text-[10px] font-bold uppercase">Active Enrolled Subscribers</span>
                <span className="text-base font-black">{forecast?.headcount?.activeSubscribers || 0} Students</span>
              </div>
              <div>
                <span className="text-orange-200 block text-[10px] font-bold uppercase">One-Off Meal Bookings</span>
                <span className="text-base font-black">{forecast?.headcount?.todayBookings || 0} Plates</span>
              </div>
              <div>
                <span className="text-orange-200 block text-[10px] font-bold uppercase">Estimated Lunch Crowd</span>
                <span className="text-base font-black">{forecast?.headcount?.expectedLunchCount || 0} Meals</span>
              </div>
              <div>
                <span className="text-orange-200 block text-[10px] font-bold uppercase">Estimated Dinner Crowd</span>
                <span className="text-base font-black">{forecast?.headcount?.expectedDinnerCount || 0} Meals</span>
              </div>
            </div>
          </div>

          {/* Lunch & Dinner Service Headcount Projection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lunch Service Card */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl font-black">
                    ☀️
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md">
                      Afternoon Service
                    </span>
                    <h3 className="text-lg font-black text-gray-900 mt-1">
                      Lunch Meal Crowd
                    </h3>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-orange-600 block">
                    {forecast?.headcount?.expectedLunchCount || 0}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-gray-400">
                    Projected Meals
                  </span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-bold">Projected Attendance:</span>
                <span className="font-extrabold text-gray-900">
                  {forecast?.headcount?.expectedLunchCount || 0} of {forecast?.headcount?.expectedHeadcountTotal || 0} Total Daily Meals
                </span>
              </div>
            </div>

            {/* Dinner Service Card */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl font-black">
                    🌙
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                      Evening Service
                    </span>
                    <h3 className="text-lg font-black text-gray-900 mt-1">
                      Dinner Meal Crowd
                    </h3>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-indigo-600 block">
                    {forecast?.headcount?.expectedDinnerCount || 0}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-gray-400">
                    Projected Meals
                  </span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-bold">Projected Attendance:</span>
                <span className="font-extrabold text-gray-900">
                  {forecast?.headcount?.expectedDinnerCount || 0} of {forecast?.headcount?.expectedHeadcountTotal || 0} Total Daily Meals
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: KITCHEN AUDIT & CONSUMPTION LOG ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "transactions" && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                Complete Kitchen Stock Audit Ledger ({transactions.length})
              </h3>
              <p className="text-xs text-gray-500">
                Real-time log of supplier restocks, automated QR counter deductions, and manual kitchen spoilage entries.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowUsageModal(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition active:scale-95 flex items-center gap-1.5"
              >
                <span>🍳</span> + Record Daily / Meal Usage
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdjustModal(true);
                  setSelectedItemForAction(null);
                }}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider transition"
              >
                + Log Waste / Spoilage
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 uppercase font-black text-[10px] tracking-wider">
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Event Type</th>
                  <th className="py-3 px-3">Item</th>
                  <th className="py-3 px-3">Quantity Delta</th>
                  <th className="py-3 px-3">Resulting Stock</th>
                  <th className="py-3 px-3">Reason / Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-gray-400">
                      No transactions logged yet. Serve meals via QR scanner or log deliveries to see audit history.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isPurchase = tx.transactionType === "purchase";
                    const isConsumption = tx.transactionType === "recipe_consumption";
                    const isWaste = tx.transactionType === "spoilage_waste";
                    const isDailyUsage = tx.transactionType === "daily_usage";

                    return (
                      <tr key={tx._id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-3 text-gray-500 font-bold text-[11px]">
                          {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              isPurchase
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : isConsumption
                                ? "bg-blue-100 text-blue-800 border-blue-300"
                                : isDailyUsage
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : isWaste
                                ? "bg-red-100 text-red-800 border-red-300"
                                : "bg-gray-100 text-gray-800 border-gray-300"
                            }`}
                          >
                            {isPurchase
                              ? "Stock Inflow"
                              : isConsumption
                              ? "QR Consumption"
                              : isDailyUsage
                              ? "🍳 Meal Usage"
                              : isWaste
                              ? "Kitchen Spoilage"
                              : "Manual Adj"}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-extrabold text-gray-900">
                          {tx.itemName}
                        </td>
                        <td className="py-3.5 px-3 font-black">
                          <span className={isPurchase ? "text-emerald-700" : isDailyUsage ? "text-amber-800" : "text-red-600"}>
                            {isPurchase ? "+" : "-"}
                            {tx.quantity} {tx.unit}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-bold text-gray-700">
                          {tx.resultingStock} {tx.unit}
                        </td>
                        <td className="py-3.5 px-3 text-gray-600 font-medium">
                          {tx.reason}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: ADD NEW KITCHEN ITEM ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                  Ingredient Master
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-1">
                  Add New Kitchen Inventory Item
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Ingredient Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Rice, Toor Dal, Amul Paneer, Sunflower Oil"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => {
                      const cat = e.target.value;
                      setNewItemCategory(cat);
                      if (cat === "dairy") setNewItemShelfLifeDays(3);
                      else if (cat === "perishables") setNewItemShelfLifeDays(5);
                      else if (cat === "staples") setNewItemShelfLifeDays(90);
                      else if (cat === "packaging") setNewItemShelfLifeDays(365);
                    }}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white"
                  >
                    <option value="staples">Dry Staples (Grains/Pulses)</option>
                    <option value="perishables">Perishables (Veggies/Daily)</option>
                    <option value="dairy">Dairy & Cold Storage</option>
                    <option value="packaging">Packaging & Gas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Unit of Measurement *
                  </label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="g">Grams (g)</option>
                    <option value="litre">Litres (L)</option>
                    <option value="ml">Millilitres (ml)</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="packets">Packets</option>
                    <option value="cylinders">Cylinders</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Opening Stock
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 25"
                    value={newItemCurrentStock}
                    onChange={(e) => setNewItemCurrentStock(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-black text-gray-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Par Min Level *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    required
                    placeholder="e.g. 15"
                    value={newItemMinThreshold}
                    onChange={(e) => setNewItemMinThreshold(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Target Reorder
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    placeholder="e.g. 50"
                    value={newItemIdealStock}
                    onChange={(e) => setNewItemIdealStock(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Est. Purchase Cost per Unit (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 65"
                  value={newItemCostPerUnit}
                  onChange={(e) => setNewItemCostPerUnit(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white"
                />
              </div>

              {/* Shelf Life & Expiry Configuration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Shelf Life (Days) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 5"
                    value={newItemShelfLifeDays}
                    onChange={(e) => setNewItemShelfLifeDays(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-black text-gray-900 focus:bg-white"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    Alerts 1-2 days before expiration
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Specific Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newItemExpiryDate}
                    onChange={(e) => setNewItemExpiryDate(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    Overrides if printed on packaging
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Supplier / Vendor Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shree Ganesh Grain Wholesalers"
                    value={newItemVendorName}
                    onChange={(e) => setNewItemVendorName(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Vendor Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98220 11223"
                    value={newItemVendorPhone}
                    onChange={(e) => setNewItemVendorPhone(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? "Adding..." : "Add to Kitchen Inventory 📦"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: QUICK RESTOCK PURCHASE ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {showRestockModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Stock Inflow
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-1">
                  Quick Restock Delivery
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRestockModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPurchase} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Item to Restock *
                </label>
                <select
                  required
                  value={restockItemId || selectedItemForAction?._id || ""}
                  onChange={(e) => {
                    setRestockItemId(e.target.value);
                    const matched = items.find((i) => i._id === e.target.value);
                    if (matched) {
                      setRestockCostPerUnit(matched.costPerUnit || "");
                      setRestockVendor(matched.primaryVendor?.name || "");
                      setRestockShelfLifeDays(matched.shelfLifeDays || "");
                    }
                  }}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white"
                >
                  <option value="">-- Choose Item --</option>
                  {items.map((i) => (
                    <option key={i._id} value={i._id}>
                      {i.name} (Current: {i.currentStock} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Quantity Delivered *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    placeholder="e.g. 20"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-black text-gray-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Cost / Unit (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 65"
                    value={restockCostPerUnit}
                    onChange={(e) => setRestockCostPerUnit(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Vendor / Supplier
                </label>
                <input
                  type="text"
                  placeholder="e.g. Market Yard Mandi Wholesaler"
                  value={restockVendor}
                  onChange={(e) => setRestockVendor(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Batch Shelf Life (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 5"
                    value={restockShelfLifeDays}
                    onChange={(e) => setRestockShelfLifeDays(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Batch Expiry Date
                  </label>
                  <input
                    type="date"
                    value={restockExpiryDate}
                    onChange={(e) => setRestockExpiryDate(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? "Updating..." : "Add to Stock ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 3: LOG SPOILAGE / KITCHEN ADJUSTMENT ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                  Kitchen Outflow
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-1">
                  Log Spoilage or Adjustment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordAdjustment} className="space-y-3">
              <div>
                <label htmlFor={adjustItemSelectId} className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Ingredient *
                </label>
                <select
                  id={adjustItemSelectId}
                  required
                  value={adjustItemId || selectedItemForAction?._id || ""}
                  onChange={(e) => setAdjustItemId(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white"
                >
                  <option value="">-- Choose Item --</option>
                  {items.map((i) => (
                    <option key={i._id} value={i._id}>
                      {i.name} (Current: {i.currentStock} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white"
                  >
                    <option value="spoilage_waste">Rotten / Spoiled</option>
                    <option value="manual_adjustment">Staff / Tasting / Spillage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Quantity Deducted *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    placeholder="e.g. 2"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-black text-gray-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Reason / Source
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white"
                >
                  <option value="Perishable Rot / Expired">Perishable Rot / Expired</option>
                  <option value="Kitchen Tasting & Trial Prep">Kitchen Tasting & Trial Prep</option>
                  <option value="Spillage or Dropped Batch">Spillage or Dropped Batch</option>
                  <option value="Complimentary Staff Meal">Complimentary Staff Meal</option>
                  <option value="Physical Inventory Audit Reconciliation">Physical Inventory Audit Reconciliation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2kg tomatoes spoiled due to afternoon heat"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? "Deducting..." : "Deduct Waste from Stock ✕"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 4: RECORD DAILY / MEAL INGREDIENT USAGE ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {showUsageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Kitchen Consumption Outflow
                </span>
                <h2 className="text-lg font-black text-gray-900 mt-1">
                  🍳 Record Daily / Meal Ingredient Usage
                </h2>
                <p className="text-xs text-gray-500">
                  Select raw ingredients used for cooking this meal. Quantities will automatically be deducted from the main Stock Master.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUsageModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordUsage} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Meal Service Session *
                  </label>
                  <select
                    value={usageMealSession}
                    onChange={(e) => setUsageMealSession(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Lunch Service">🍛 Lunch Service</option>
                    <option value="Dinner Service">🍲 Dinner Service</option>
                    <option value="Breakfast Service">☕ Breakfast Service</option>
                    <option value="Snacks & Tea">🥪 Snacks & High Tea</option>
                    <option value="Daily Bulk Prep / Base Gravies">🥣 Daily Bulk Prep / Base Gravies</option>
                    <option value="Special Sunday Feast">✨ Special Sunday Feast</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Usage Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={usageDate}
                    onChange={(e) => setUsageDate(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Dynamic Ingredient Rows */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase text-gray-700">
                    Ingredients Used in this Meal *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddUsageRow}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-xl transition flex items-center gap-1 border border-amber-200"
                  >
                    <span>+</span> Add Another Ingredient
                  </button>
                </div>

                <div className="space-y-2.5">
                  {usageRows.map((row, index) => {
                    const selectedItem = items.find((i) => i._id === row.itemId);
                    const qtyNum = Number(row.quantity) || 0;
                    const isExceeding = selectedItem && qtyNum > selectedItem.currentStock;

                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-2xl border transition-all ${
                          isExceeding
                            ? "bg-red-50/40 border-red-300 ring-1 ring-red-400/20"
                            : "bg-gray-50/70 border-gray-200"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          {/* Item Dropdown */}
                          <div className="flex-1">
                            <select
                              value={row.itemId}
                              onChange={(e) => handleUsageRowChange(index, "itemId", e.target.value)}
                              className="w-full p-2 text-xs bg-white border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500 text-gray-800"
                            >
                              <option value="">-- Choose Stock Item --</option>
                              {items.map((it) => (
                                <option key={it._id} value={it._id}>
                                  {it.name} ({it.category}) — In Stock: {it.currentStock} {it.unit}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Quantity Input */}
                          <div className="w-full sm:w-44 flex items-center gap-1.5">
                            <input
                              type="number"
                              step="any"
                              min="0.01"
                              placeholder="Qty used"
                              value={row.quantity}
                              onChange={(e) => handleUsageRowChange(index, "quantity", e.target.value)}
                              className="w-full p-2 text-xs bg-white border border-gray-300 rounded-xl font-black text-gray-900 focus:ring-2 focus:ring-amber-500"
                            />
                            <span className="text-xs font-bold text-gray-600 min-w-10 text-center">
                              {selectedItem?.unit || "unit"}
                            </span>
                          </div>

                          {/* Remove Row Button */}
                          {usageRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveUsageRow(index)}
                              title="Remove item"
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition self-end sm:self-center"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* Stock Hint / Warning */}
                        {selectedItem && (
                          <div className="mt-1.5 flex items-center justify-between text-[11px] px-1">
                            <span className="text-gray-500">
                              Current Stock: <strong className="text-gray-800">{selectedItem.currentStock} {selectedItem.unit}</strong>
                            </span>
                            {isExceeding ? (
                              <span className="text-red-600 font-bold flex items-center gap-1">
                                ⚠️ Exceeds available stock by {(qtyNum - selectedItem.currentStock).toFixed(2)} {selectedItem.unit}
                              </span>
                            ) : qtyNum > 0 ? (
                              <span className="text-emerald-700 font-semibold">
                                Resulting: {(selectedItem.currentStock - qtyNum).toFixed(2)} {selectedItem.unit} remaining
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cooking Notes */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Kitchen Notes / Menu Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Prepared 120 Thalis: Dal Tadka, Paneer Butter Masala & Jeera Rice"
                  value={usageNotes}
                  onChange={(e) => setUsageNotes(e.target.value)}
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex justify-end items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowUsageModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>🍳</span>
                  <span>{actionLoading ? "Deducting Stock..." : "Record & Deduct from Stock"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
