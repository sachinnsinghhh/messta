const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventorycontroller");

// Get all inventory items & KPI metrics for an outlet
router.get("/:messId", inventoryController.getMessInventory);

// Add new inventory item to an outlet
router.post("/:messId/items", inventoryController.createItem);

// Update inventory item details or par level thresholds
router.put("/items/:id", inventoryController.updateItem);

// Delete an inventory item
router.delete("/items/:id", inventoryController.deleteItem);

// Stock Inflow: Log supplier purchase and increment stock
router.post("/:messId/purchase", inventoryController.recordPurchase);

// Outflow / Audit: Log manual adjustment or kitchen spoilage/wastage
router.post("/:messId/adjust", inventoryController.recordAdjustment);

// Stock Outflow: Record daily meal ingredient usage
router.post("/:messId/usage", inventoryController.recordUsage);

// Transaction History & Audit Ledger
router.get("/:messId/transactions", inventoryController.getTransactions);

// Zero Wastage & Production Forecasting Calculator
router.get("/:messId/forecast", inventoryController.getProductionForecast);

// Seed 12 starter kitchen staples with Par Levels
router.post("/:messId/seed-defaults", inventoryController.seedDefaultInventory);

module.exports = router;
