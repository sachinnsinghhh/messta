const express = require("express");
const router = express.Router();
const financeController = require("../controllers/financecontroller");

// 1. KPI Summary (Revenue, Costs, Net Profit, Margins)
router.get("/mess/:messId/summary", financeController.getFinanceSummary);

// 2. Visualizers (Inflow/Outflow breakdowns & 30-day trajectory)
router.get("/mess/:messId/visualizers", financeController.getFinanceVisualizers);

// 3. Thali Unit Economics & Contribution Margins
router.get("/mess/:messId/unit-economics", financeController.getThaliUnitEconomics);

// 4. Financial Ledger Transactions (Paginated & Searchable)
router.get("/mess/:messId/transactions", financeController.getLedgerTransactions);

// 5. Add Manual Operational Expense (LPG, Power, Rent, Repairs)
router.post("/mess/:messId/transactions", financeController.addExpenseTransaction);

// 6. Delete Expense Transaction
router.delete("/mess/:messId/transactions/:transactionId", financeController.deleteExpenseTransaction);

// 7. Gateway Bank Settlements
router.get("/mess/:messId/settlements", financeController.getSettlements);

// 8. Export P&L Report Data
router.get("/mess/:messId/export-pnl", financeController.exportPnL);

// 9. SuperAdmin Master Network Financials (All Partner Messes & Commission Aggregations)
router.get("/admin/master-overview", financeController.getMasterAdminOverview);

// 10. SuperAdmin Disburse / Record Partner Settlement Payout
router.post("/admin/settle-payout", financeController.settlePartnerPayout);

module.exports = router;
