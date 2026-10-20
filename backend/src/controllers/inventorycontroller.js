const mongoose = require("mongoose");
const InventoryItem = require("../models/InventoryItem");
const InventoryTransaction = require("../models/InventoryTransaction");
const Subscription = require("../models/Subscription");
const Order = require("../models/order");
const Mess = require("../models/mess");

// Standard Mess Culinary Ratios (per student meal) for automated calculation & forecasting
const DEFAULT_RECIPE_RATIOS = [
  { keywords: ["rice", "chawal", "jeera rice"], ingredientKey: "Rice", amountKg: 0.15, unit: "kg" },
  { keywords: ["roti", "chapati", "atta", "wheat"], ingredientKey: "Atta", amountKg: 0.10, unit: "kg" },
  { keywords: ["dal", "tadka", "fry", "toor"], ingredientKey: "Toor Dal", amountKg: 0.08, unit: "kg" },
  { keywords: ["paneer"], ingredientKey: "Paneer", amountKg: 0.12, unit: "kg" },
  { keywords: ["oil", "tel", "cooking oil"], ingredientKey: "Cooking Oil", amountKg: 0.02, unit: "litre" },
  { keywords: ["potato", "aloo", "sabzi", "vegetable"], ingredientKey: "Potatoes", amountKg: 0.12, unit: "kg" },
  { keywords: ["milk", "doodh", "curd", "dahi"], ingredientKey: "Milk", amountKg: 0.10, unit: "litre" },
  { keywords: ["container", "box", "takeaway"], ingredientKey: "Takeaway Containers", amountKg: 1, unit: "pcs" },
];

// @desc    Get all inventory items and KPI summary for a mess outlet
// @route   GET /api/inventory/:messId
// @access  Owner
exports.getMessInventory = async (req, res) => {
  try {
    const { messId } = req.params;
    if (!messId || !mongoose.Types.ObjectId.isValid(messId)) {
      return res.status(400).json({ success: false, message: "Valid Mess ID is required." });
    }

    const items = await InventoryItem.find({ messId }).sort({ name: 1 });

    // Calculate real-time KPI metrics
    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let expiringSoonCount = 0; // <= 2 days left
    let expiredCount = 0; // < 0 days left
    const categoryCounts = { perishables: 0, staples: 0, dairy: 0, packaging: 0 };
    const now = new Date();

    const itemsWithStatus = items.map((item) => {
      const obj = item.toObject();
      const value = (obj.currentStock || 0) * (obj.costPerUnit || 0);
      totalValue += value;

      let status = "in_stock";
      if (obj.currentStock <= 0) {
        status = "out_of_stock";
        outOfStockCount++;
      } else if (obj.currentStock <= obj.minThreshold) {
        status = "low_stock";
        lowStockCount++;
      }
      obj.stockStatus = status;
      obj.stockValue = Math.round(value * 100) / 100;

      // Shelf life & Expiry calculation
      let expDate = obj.expiryDate ? new Date(obj.expiryDate) : null;
      if (!expDate && obj.shelfLifeDays) {
        const baseDate = obj.lastRestockedAt ? new Date(obj.lastRestockedAt) : new Date(obj.createdAt || now);
        expDate = new Date(baseDate.getTime() + obj.shelfLifeDays * 24 * 60 * 60 * 1000);
      }

      if (expDate) {
        const diffMs = expDate.getTime() - now.getTime();
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        obj.daysLeft = daysLeft;
        obj.calculatedExpiryDate = expDate;

        if (obj.currentStock > 0) {
          if (daysLeft < 0) {
            obj.expiryStatus = "expired";
            expiredCount++;
          } else if (daysLeft <= 2) {
            obj.expiryStatus = "expiring_soon"; // 1 or 2 days left
            expiringSoonCount++;
          } else if (daysLeft <= 5) {
            obj.expiryStatus = "expiring_warning";
          } else {
            obj.expiryStatus = "fresh";
          }
        } else {
          obj.expiryStatus = "depleted";
        }
      } else {
        obj.daysLeft = null;
        obj.expiryStatus = "unknown";
      }

      if (categoryCounts[obj.category] !== undefined) {
        categoryCounts[obj.category]++;
      }
      return obj;
    });

    // Sort: Depleted first, then Low Stock, then In Stock (and prioritize items expiring soon)
    itemsWithStatus.sort((a, b) => {
      const order = { out_of_stock: 0, low_stock: 1, in_stock: 2 };
      if (order[a.stockStatus] !== order[b.stockStatus]) {
        return order[a.stockStatus] - order[b.stockStatus];
      }
      const expOrder = { expired: 0, expiring_soon: 1, expiring_warning: 2, fresh: 3, depleted: 4, unknown: 5 };
      return (expOrder[a.expiryStatus] ?? 5) - (expOrder[b.expiryStatus] ?? 5);
    });

    return res.status(200).json({
      success: true,
      count: itemsWithStatus.length,
      metrics: {
        totalItems: itemsWithStatus.length,
        totalInventoryValue: Math.round(totalValue),
        lowStockCount,
        outOfStockCount,
        expiringSoonCount,
        expiredCount,
        categoryCounts,
      },
      data: itemsWithStatus,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a new inventory item
// @route   POST /api/inventory/:messId/items
// @access  Owner
exports.createItem = async (req, res) => {
  try {
    const { messId } = req.params;
    const {
      name,
      category,
      unit,
      currentStock,
      minThreshold,
      idealStock,
      costPerUnit,
      primaryVendor,
      shelfLifeDays,
      expiryDate,
      notes,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Item name is required." });
    }

    // Check if item already exists
    const existing = await InventoryItem.findOne({
      messId,
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An inventory item named "${existing.name}" already exists for this outlet.`,
      });
    }

    // Determine smart shelf life default by category if not explicitly provided
    const cat = category || "staples";
    const sLife = Number(shelfLifeDays) || (
      cat === "dairy" ? 3 :
      cat === "perishables" ? 5 :
      cat === "packaging" ? 365 : 90
    );

    let finalExpDate = expiryDate ? new Date(expiryDate) : null;
    if (!finalExpDate && sLife) {
      finalExpDate = new Date(Date.now() + sLife * 24 * 60 * 60 * 1000);
    }

    const newItem = new InventoryItem({
      messId,
      name: name.trim(),
      category: cat,
      unit: unit || "kg",
      currentStock: Number(currentStock) || 0,
      minThreshold: Number(minThreshold) || 10,
      idealStock: Number(idealStock) || 50,
      costPerUnit: Number(costPerUnit) || 0,
      primaryVendor: primaryVendor || { name: "", phone: "" },
      shelfLifeDays: sLife,
      expiryDate: finalExpDate,
      notes: notes || "",
      lastRestockedAt: Number(currentStock) > 0 ? new Date() : null,
    });

    const saved = await newItem.save();

    // If initial stock was provided, log an initial stock transaction
    if (Number(currentStock) > 0) {
      await InventoryTransaction.create({
        messId,
        itemId: saved._id,
        itemName: saved.name,
        transactionType: "purchase",
        quantity: Number(currentStock),
        unit: saved.unit,
        previousStock: 0,
        resultingStock: Number(currentStock),
        unitCost: Number(costPerUnit) || 0,
        totalCost: Number(currentStock) * (Number(costPerUnit) || 0),
        reason: "Initial Stock Setup",
        vendor: { name: primaryVendor?.name || "Opening Stock" },
        loggedBy: "Mess Owner",
      });
    }

    return res.status(201).json({
      success: true,
      message: `Item "${saved.name}" added to kitchen inventory.`,
      data: saved,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update inventory item details or par levels
// @route   PUT /api/inventory/items/:id
// @access  Owner
exports.updateItem = async (req, res) => {
  try {
    const updated = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Inventory item not found." });
    }

    return res.status(200).json({
      success: true,
      message: `Item "${updated.name}" updated successfully.`,
      data: updated,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete an inventory item
// @route   DELETE /api/inventory/items/:id
// @access  Owner
exports.deleteItem = async (req, res) => {
  try {
    const deleted = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Item not found." });
    }

    // Clean up related transactions
    await InventoryTransaction.deleteMany({ itemId: req.params.id });

    return res.status(200).json({
      success: true,
      message: `Item "${deleted.name}" removed from inventory.`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Log Stock Inflow (Purchase from Vendor)
// @route   POST /api/inventory/:messId/purchase
// @access  Owner
exports.recordPurchase = async (req, res) => {
  try {
    const { messId } = req.params;
    const {
      itemId,
      quantity,
      unitCost,
      vendorName,
      invoiceNo,
      vendorPhone,
      shelfLifeDays,
      expiryDate,
      notes,
    } = req.body;

    const qty = Number(quantity);
    if (!itemId || !qty || qty <= 0) {
      return res.status(400).json({ success: false, message: "Valid item and quantity are required." });
    }

    const item = await InventoryItem.findOne({ _id: itemId, messId });
    if (!item) {
      return res.status(404).json({ success: false, message: "Inventory item not found." });
    }

    const previousStock = item.currentStock;
    const resultingStock = previousStock + qty;
    const cost = Number(unitCost) || item.costPerUnit || 0;
    const totalCost = qty * cost;

    item.currentStock = resultingStock;
    item.costPerUnit = cost;
    item.lastRestockedAt = new Date();

    if (shelfLifeDays) item.shelfLifeDays = Number(shelfLifeDays);
    if (expiryDate) {
      item.expiryDate = new Date(expiryDate);
    } else if (item.shelfLifeDays) {
      // Refresh expiry date based on fresh batch arrival
      item.expiryDate = new Date(Date.now() + item.shelfLifeDays * 24 * 60 * 60 * 1000);
    }

    if (vendorName) item.primaryVendor.name = vendorName;
    if (vendorPhone) item.primaryVendor.phone = vendorPhone;
    await item.save();

    const transaction = await InventoryTransaction.create({
      messId,
      itemId: item._id,
      itemName: item.name,
      transactionType: "purchase",
      quantity: qty,
      unit: item.unit,
      previousStock,
      resultingStock,
      unitCost: cost,
      totalCost,
      vendor: {
        name: vendorName || item.primaryVendor?.name || "Wholesale Mandi",
        invoiceNo: invoiceNo || `INV-${Date.now().toString().slice(-6)}`,
        phone: vendorPhone || item.primaryVendor?.phone || "",
      },
      reason: notes || "Supplier Restock Inflow",
      loggedBy: "Mess Partner",
    });

    return res.status(201).json({
      success: true,
      message: `Restocked ${qty} ${item.unit} of ${item.name}! New stock: ${resultingStock} ${item.unit}.`,
      data: {
        item,
        transaction,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Log Manual Adjustment (Kitchen tasting, staff meal, spillage, or spoilage)
// @route   POST /api/inventory/:messId/adjust
// @access  Owner
exports.recordAdjustment = async (req, res) => {
  try {
    const { messId } = req.params;
    const {
      itemId,
      adjustmentType, // "spoilage_waste" | "manual_adjustment"
      quantity,
      reason,
      notes,
    } = req.body;

    const qty = Number(quantity);
    if (!itemId || !qty || qty <= 0) {
      return res.status(400).json({ success: false, message: "Valid item and quantity are required." });
    }

    const item = await InventoryItem.findOne({ _id: itemId, messId });
    if (!item) {
      return res.status(404).json({ success: false, message: "Inventory item not found." });
    }

    const previousStock = item.currentStock;
    const resultingStock = Math.max(0, previousStock - qty);
    const type = adjustmentType === "spoilage_waste" ? "spoilage_waste" : "manual_adjustment";

    item.currentStock = resultingStock;
    await item.save();

    const transaction = await InventoryTransaction.create({
      messId,
      itemId: item._id,
      itemName: item.name,
      transactionType: type,
      quantity: qty,
      unit: item.unit,
      previousStock,
      resultingStock,
      unitCost: item.costPerUnit,
      totalCost: qty * (item.costPerUnit || 0),
      reason: reason || notes || (type === "spoilage_waste" ? "Kitchen Spoilage / Expired" : "Kitchen Internal Use"),
      loggedBy: "Mess Kitchen Staff",
    });

    return res.status(200).json({
      success: true,
      message: `Deducted ${qty} ${item.unit} from ${item.name}. Remaining: ${resultingStock} ${item.unit}.`,
      data: {
        item,
        transaction,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record Daily / Meal Ingredient Usage (automatically deducts from stock master)
// @route   POST /api/inventory/:messId/usage
// @access  Owner
exports.recordUsage = async (req, res) => {
  try {
    const { messId } = req.params;
    const {
      mealSession = "Lunch Service",
      date,
      notes = "",
      items = [],
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one ingredient and quantity used.",
      });
    }

    const processedItems = [];
    const createdTransactions = [];

    for (const entry of items) {
      const qty = Number(entry.quantity);
      if (!entry.itemId || isNaN(qty) || qty <= 0) continue;

      const item = await InventoryItem.findOne({ _id: entry.itemId, messId });
      if (!item) continue;

      const previousStock = item.currentStock;
      const resultingStock = Math.max(0, Math.round((previousStock - qty) * 100) / 100);

      item.currentStock = resultingStock;
      await item.save();

      const reasonText = notes
        ? `${mealSession}: ${notes}`
        : `${mealSession} Cooking Usage`;

      const transaction = await InventoryTransaction.create({
        messId,
        itemId: item._id,
        itemName: item.name,
        transactionType: "daily_usage",
        quantity: qty,
        unit: item.unit,
        previousStock,
        resultingStock,
        unitCost: item.costPerUnit,
        totalCost: qty * (item.costPerUnit || 0),
        reason: reasonText,
        loggedBy: "Kitchen Chef / Owner",
        createdAt: date ? new Date(date) : new Date(),
      });

      processedItems.push({
        id: item._id,
        name: item.name,
        deducted: qty,
        unit: item.unit,
        remaining: resultingStock,
      });
      createdTransactions.push(transaction);
    }

    if (processedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid ingredients or quantities were processed.",
      });
    }

    const summaryStr = processedItems
      .map((p) => `${p.deducted} ${p.unit} ${p.name}`)
      .join(", ");

    return res.status(200).json({
      success: true,
      message: `Usage recorded for ${mealSession}! Deducted ${summaryStr} from Stock Master.`,
      data: {
        processedItems,
        transactions: createdTransactions,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Inflow & Outflow Transaction Audit Ledger
// @route   GET /api/inventory/:messId/transactions
// @access  Owner
exports.getTransactions = async (req, res) => {
  try {
    const { messId } = req.params;
    const { type, limit = 50 } = req.query;

    const query = { messId };
    if (type && type !== "all") {
      query.transactionType = type;
    }

    const transactions = await InventoryTransaction.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Zero Wastage & Production Forecasting Calculator
// @route   GET /api/inventory/:messId/forecast
// @access  Owner
exports.getProductionForecast = async (req, res) => {
  try {
    const { messId } = req.params;
    const today = new Date().toISOString().split("T")[0];

    // 1. Count active subscribers enrolled in this mess
    const activeSubscribers = await Subscription.countDocuments({
      messId,
      status: "active",
      remainingTokens: { $gt: 0 },
    });

    // 2. Count today's one-off per-plate meal orders
    const todayBookings = await Order.countDocuments({
      messId,
      bookingDate: today,
      paymentStatus: "paid",
      tokenStatus: { $ne: "cancelled" },
    });

    // Estimated expected dining headcount today (Lunch + Dinner)
    // Average student eats 1.8 meals per day
    const expectedHeadcountTotal = Math.max(20, Math.round(activeSubscribers * 1.8) + todayBookings);
    const expectedLunchCount = Math.round(expectedHeadcountTotal * 0.55);
    const expectedDinnerCount = Math.round(expectedHeadcountTotal * 0.45);

    // 3. Fetch current inventory stock for this mess
    const currentItems = await InventoryItem.find({ messId });

    // 4. Calculate required raw materials based on mess culinary production ratios
    const forecastItems = DEFAULT_RECIPE_RATIOS.map((recipe) => {
      // Find matching item in inventory
      const matchedItem = currentItems.find((inv) =>
        recipe.keywords.some((kw) => inv.name.toLowerCase().includes(kw))
      );

      const requiredToday = Math.round(expectedHeadcountTotal * recipe.amountKg * 10) / 10;
      const currentStock = matchedItem ? matchedItem.currentStock : 0;
      const deficit = Math.max(0, Math.round((requiredToday - currentStock) * 10) / 10);
      const surplus = Math.max(0, Math.round((currentStock - requiredToday) * 10) / 10);
      const isDeficit = currentStock < requiredToday;

      return {
        key: recipe.ingredientKey,
        name: matchedItem ? matchedItem.name : recipe.ingredientKey,
        unit: matchedItem ? matchedItem.unit : recipe.unit,
        inStock: currentStock,
        requiredToday,
        deficit,
        surplus,
        status: isDeficit ? "DEFICIT_WARNING" : "SAFE_BUFFER",
        matchedItemId: matchedItem ? matchedItem._id : null,
      };
    });

    const totalDeficits = forecastItems.filter((f) => f.status === "DEFICIT_WARNING").length;

    return res.status(200).json({
      success: true,
      headcount: {
        activeSubscribers,
        todayBookings,
        expectedLunchCount,
        expectedDinnerCount,
        expectedHeadcountTotal,
      },
      forecastAlerts: totalDeficits,
      data: forecastItems,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Seed 12 Realistic College Mess Kitchen Staples (1-Click Starter)
// @route   POST /api/inventory/:messId/seed-defaults
// @access  Owner
exports.seedDefaultInventory = async (req, res) => {
  try {
    const { messId } = req.params;

    const nowMs = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const defaults = [
      {
        name: "Basmati / Kolam Rice",
        category: "staples",
        unit: "kg",
        currentStock: 45,
        minThreshold: 20,
        idealStock: 75,
        costPerUnit: 65,
        shelfLifeDays: 180,
        expiryDate: new Date(nowMs + 180 * DAY),
        primaryVendor: { name: "Shree Ganesh Grain Wholesalers", phone: "+91 98220 11223" },
        notes: "Daily lunch & dinner staple steamed rice.",
      },
      {
        name: "Sharbati Wheat Flour (Atta)",
        category: "staples",
        unit: "kg",
        currentStock: 35,
        minThreshold: 25,
        idealStock: 60,
        costPerUnit: 42,
        shelfLifeDays: 90,
        expiryDate: new Date(nowMs + 90 * DAY),
        primaryVendor: { name: "Shree Ganesh Grain Wholesalers", phone: "+91 98220 11223" },
        notes: "Fresh rotis and parathas dough.",
      },
      {
        name: "Toor Dal (Arhar Dal)",
        category: "staples",
        unit: "kg",
        currentStock: 18,
        minThreshold: 15,
        idealStock: 40,
        costPerUnit: 140,
        shelfLifeDays: 180,
        expiryDate: new Date(nowMs + 180 * DAY),
        primaryVendor: { name: "Shree Ganesh Grain Wholesalers", phone: "+91 98220 11223" },
        notes: "Daily dal tadka and sambar pulse.",
      },
      {
        name: "Fresh Malai Paneer",
        category: "dairy",
        unit: "kg",
        currentStock: 6,
        minThreshold: 8, // Triggers Low Stock Alert
        idealStock: 20,
        costPerUnit: 360,
        shelfLifeDays: 3,
        lastRestockedAt: new Date(nowMs - 1 * DAY),
        expiryDate: new Date(nowMs + 2 * DAY), // Triggers 2-day shelf life warning!
        primaryVendor: { name: "Amul / Mother Dairy Depot", phone: "+91 98230 44556" },
        notes: "Special paneer butter masala & matar paneer thalis.",
      },
      {
        name: "Refined Sunflower Cooking Oil",
        category: "staples",
        unit: "litre",
        currentStock: 22,
        minThreshold: 15,
        idealStock: 45,
        costPerUnit: 125,
        shelfLifeDays: 180,
        expiryDate: new Date(nowMs + 180 * DAY),
        primaryVendor: { name: "Pooja Oil Traders", phone: "+91 98225 77889" },
        notes: "Kitchen deep fry and daily tadka oil.",
      },
      {
        name: "Fresh Cow Milk",
        category: "dairy",
        unit: "litre",
        currentStock: 12,
        minThreshold: 15, // Triggers Low Stock Alert
        idealStock: 30,
        costPerUnit: 58,
        shelfLifeDays: 2,
        lastRestockedAt: new Date(nowMs - 1 * DAY),
        expiryDate: new Date(nowMs + 1 * DAY), // Triggers 1-day shelf life warning!
        primaryVendor: { name: "Katraj Dairy Route Agent", phone: "+91 98221 99001" },
        notes: "Morning tea, curd set, and dessert preparations.",
      },
      {
        name: "Fresh Potatoes (Aloo)",
        category: "perishables",
        unit: "kg",
        currentStock: 28,
        minThreshold: 15,
        idealStock: 50,
        costPerUnit: 28,
        shelfLifeDays: 14,
        expiryDate: new Date(nowMs + 10 * DAY),
        primaryVendor: { name: "Market Yard Mandi Vendor", phone: "+91 98229 33445" },
        notes: "Aloo sabzi, aloo jeera, mix veg sides.",
      },
      {
        name: "Red Onions (Kanda)",
        category: "perishables",
        unit: "kg",
        currentStock: 14,
        minThreshold: 15, // Triggers Low Stock Alert
        idealStock: 40,
        costPerUnit: 35,
        shelfLifeDays: 14,
        expiryDate: new Date(nowMs + 11 * DAY),
        primaryVendor: { name: "Market Yard Mandi Vendor", phone: "+91 98229 33445" },
        notes: "Base gravies, salad bowls, and tadkas.",
      },
      {
        name: "Fresh Tomatoes (Tamatar)",
        category: "perishables",
        unit: "kg",
        currentStock: 12,
        minThreshold: 10,
        idealStock: 25,
        costPerUnit: 32,
        shelfLifeDays: 5,
        lastRestockedAt: new Date(nowMs - 3 * DAY),
        expiryDate: new Date(nowMs + 2 * DAY), // Triggers 2-day shelf life warning!
        primaryVendor: { name: "Market Yard Mandi Vendor", phone: "+91 98229 33445" },
        notes: "Gravies, rasam, and fresh salads.",
      },
      {
        name: "Garam Masala & Spices Mix",
        category: "staples",
        unit: "kg",
        currentStock: 4,
        minThreshold: 2,
        idealStock: 10,
        costPerUnit: 450,
        shelfLifeDays: 180,
        expiryDate: new Date(nowMs + 180 * DAY),
        primaryVendor: { name: "Everest / Badshah Wholesale", phone: "+91 98223 66778" },
        notes: "Haldi, mirchi, dhania powder, garam masala.",
      },
      {
        name: "Takeaway Meal Foil Containers",
        category: "packaging",
        unit: "pcs",
        currentStock: 120,
        minThreshold: 50,
        idealStock: 300,
        costPerUnit: 4,
        shelfLifeDays: 365,
        expiryDate: new Date(nowMs + 365 * DAY),
        primaryVendor: { name: "Packaging Mart Pune", phone: "+91 98231 11222" },
        notes: "Student parcel and takeaway lunch boxes.",
      },
      {
        name: "Commercial LPG Gas Cylinders",
        category: "packaging",
        unit: "cylinders",
        currentStock: 3,
        minThreshold: 2,
        idealStock: 6,
        costPerUnit: 1850,
        shelfLifeDays: 60,
        expiryDate: new Date(nowMs + 45 * DAY),
        primaryVendor: { name: "Bharat Gas Commercial Agency", phone: "+91 98233 44111" },
        notes: "Kitchen commercial heavy burners gas supply.",
      },
    ];

    let insertedCount = 0;
    for (const def of defaults) {
      const exists = await InventoryItem.findOne({ messId, name: def.name });
      if (!exists) {
        await InventoryItem.create({ ...def, messId });
        insertedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully seeded ${insertedCount} starter kitchen ingredients and Par Levels!`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Helper: Automated Stock Deduction Engine on Counter QR Scan
//          Deducts ingredient recipe ratios when student meal is marked as Served
exports.deductRecipeStockFromInventory = async ({
  messId,
  thaliName,
  items = [],
  orderId,
  subscriptionId,
  studentName,
}) => {
  try {
    if (!messId) return;

    // Fetch existing inventory items for this mess
    const inventoryItems = await InventoryItem.find({ messId });
    if (!inventoryItems || inventoryItems.length === 0) return;

    // Use customized items if provided in thali, else standard default breakdown
    const recipeItemsToDeduct =
      items && items.length > 0
        ? items
        : [
            { name: "Rice", quantity: 150, unit: "g" },
            { name: "Roti", quantity: 3, unit: "pcs" },
            { name: "Dal", quantity: 80, unit: "g" },
            { name: "Vegetables", quantity: 120, unit: "g" },
          ];

    for (const recipeItem of recipeItemsToDeduct) {
      const rName = (recipeItem.name || "").toLowerCase();
      const rQty = Number(recipeItem.quantity) || 1;
      const rUnit = (recipeItem.unit || "g").toLowerCase();

      // Find best match in inventory
      const matched = inventoryItems.find((inv) => {
        const invName = inv.name.toLowerCase();
        return (
          invName.includes(rName) ||
          rName.includes(invName) ||
          (rName.includes("paneer") && invName.includes("paneer")) ||
          (rName.includes("roti") && invName.includes("atta")) ||
          (rName.includes("rice") && invName.includes("rice")) ||
          (rName.includes("dal") && invName.includes("dal")) ||
          (rName.includes("chicken") && invName.includes("chicken")) ||
          (rName.includes("sabzi") && invName.includes("potato"))
        );
      });

      if (matched) {
        // Convert units to inventory standard
        let deductionQty = rQty;
        if (matched.unit === "kg" && rUnit === "g") {
          deductionQty = rQty / 1000;
        } else if (matched.unit === "litre" && rUnit === "ml") {
          deductionQty = rQty / 1000;
        } else if (matched.unit === "kg" && rName.includes("roti")) {
          // 3 rotis ~ 0.09 kg atta
          deductionQty = (rQty * 30) / 1000;
        }

        const previousStock = matched.currentStock;
        const resultingStock = Math.max(0, Math.round((previousStock - deductionQty) * 1000) / 1000);

        matched.currentStock = resultingStock;
        await matched.save();

        await InventoryTransaction.create({
          messId,
          itemId: matched._id,
          itemName: matched.name,
          transactionType: "recipe_consumption",
          quantity: deductionQty,
          unit: matched.unit,
          previousStock,
          resultingStock,
          unitCost: matched.costPerUnit,
          totalCost: Math.round(deductionQty * (matched.costPerUnit || 0) * 100) / 100,
          reason: `Auto-Deducted via Counter QR Scan: ${thaliName || "Standard Meal"} served to ${studentName || "student"}`,
          orderId: orderId || null,
          subscriptionId: subscriptionId || null,
          loggedBy: "Counter QR Scanner Engine",
        });
      }
    }
  } catch (err) {
    console.warn("Automated inventory recipe deduction notice:", err.message);
  }
};
