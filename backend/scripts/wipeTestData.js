// ─────────────────────────────────────────────────────────────────────────────
// MESSTA PRODUCTION DATABASE CLEANUP & RESET UTILITY
// ─────────────────────────────────────────────────────────────────────────────
// Usage: node backend/scripts/wipeTestData.js --confirm
//
// CAUTION: This will delete ALL test data (messes, orders, subscriptions, staff,
// inventory, transactions, settlements) from MongoDB Atlas and reset master wallets
// to ₹0.00 for a pristine, clean production launch.
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");

// Import all models
const Mess = require("../src/models/mess");
const Order = require("../src/models/order");
const Subscription = require("../src/models/Subscription");
const Staff = require("../src/models/Staff");
const StaffAttendance = require("../src/models/StaffAttendance");
const InventoryItem = require("../src/models/InventoryItem");
const InventoryTransaction = require("../src/models/InventoryTransaction");
const FinanceTransaction = require("../src/models/FinanceTransaction");
const SettlementPayout = require("../src/models/SettlementPayout");
const DailyEodSettlement = require("../src/models/DailyEodSettlement");
const PartnerWallet = require("../src/models/PartnerWallet");
const WalletLedgerTransaction = require("../src/models/WalletLedgerTransaction");
const MessBroadcast = require("../src/models/MessBroadcast");
const MessPlan = require("../src/models/MessPlan");
const MasterPlatformWallet = require("../src/models/MasterPlatformWallet");
const AdminProfile = require("../src/models/AdminProfile");

async function wipeDatabase() {
  const args = process.argv.slice(2);
  const isConfirmed = args.includes("--confirm") || args.includes("--force");

  console.log("\n========================================================");
  console.log("   MESSTA PRODUCTION CLEANUP & RESET ENGINE");
  console.log("========================================================\n");

  if (!process.env.MONGO_URI) {
    console.error("❌ ERROR: MONGO_URI is missing in backend/.env!");
    process.exit(1);
  }

  if (!isConfirmed) {
    console.log("⚠️  SAFETY CHECK REQUIRED:");
    console.log("   To prevent accidental data loss, you must supply the --confirm flag.");
    console.log("   Example: node backend/scripts/wipeTestData.js --confirm\n");
    process.exit(0);
  }

  try {
    console.log("📡 Connecting to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected successfully to MongoDB.\n");

    console.log("🧹 Purging test records from all operational collections...");

    const collectionsToPurge = [
      { name: "Orders (Single-meal bookings)", model: Order },
      { name: "Subscriptions (Student monthly passes)", model: Subscription },
      { name: "Partner Mess Outlets (Listings)", model: Mess },
      { name: "Staff Members", model: Staff },
      { name: "Staff Attendance Records", model: StaffAttendance },
      { name: "Inventory Items", model: InventoryItem },
      { name: "Inventory Transactions (Stock logs)", model: InventoryTransaction },
      { name: "Finance Transactions (Expenses & Inflows)", model: FinanceTransaction },
      { name: "Settlement Payouts", model: SettlementPayout },
      { name: "Daily EOD Settlements", model: DailyEodSettlement },
      { name: "Partner Wallets", model: PartnerWallet },
      { name: "Wallet Ledger Transactions", model: WalletLedgerTransaction },
      { name: "Mess Community Broadcasts", model: MessBroadcast },
      { name: "Custom Mess Plans", model: MessPlan },
    ];

    const results = [];
    for (const item of collectionsToPurge) {
      const countBefore = await item.model.countDocuments();
      const deleteRes = await item.model.deleteMany({});
      results.push({
        Collection: item.name,
        "Records Purged": deleteRes.deletedCount,
        "Remaining Count": await item.model.countDocuments(),
      });
    }

    console.table(results);

    // Reset Master Platform Escrow Vault to pristine zero
    console.log("🏦 Resetting Master Platform Escrow Vault to ₹0.00...");
    await MasterPlatformWallet.findOneAndUpdate(
      { key: "primary" },
      {
        key: "primary",
        totalMasterCollections: 0,
        totalPlatformCommissionEarned: 0,
        totalCommissionWithdrawn: 0,
        totalPartnerFundsDisbursed: 0,
        currentEscrowFloat: 0,
        totalTransactionsCount: 0,
        lastReconciledAt: new Date(),
      },
      { upsert: true, new: true }
    );
    console.log("✓ Master Platform Wallet reset to ₹0.00.");

    // Ensure pristine Admin Profile
    console.log("👑 Initializing clean SuperAdmin Profile...");
    await AdminProfile.findOneAndUpdate(
      { key: "superadmin_config" },
      {
        key: "superadmin_config",
        adminName: "Sachin Singh",
        businessName: "Messta Digital Food Escrow",
        email: "admin@messta.in",
        phone: "+91 98765 43210",
        centralUpiPhone: "9876543210",
        centralUpiId: "messta.central@hdfcbank",
        centralQrImageUrl: "",
        centralBankName: "HDFC Business Bank",
        commissionBankName: "State Bank of India",
        commissionAccountHolder: "Sachin Singh",
        commissionAccountNumber: "",
        commissionIfsc: "",
        commissionUpiId: "",
        commissionPerPlate: 4.0, // 4%
        commissionMembershipTokensRate: 1.0, // ₹1 / token
      },
      { upsert: true, new: true }
    );
    console.log("✓ SuperAdmin Profile verified.\n");

    console.log("========================================================");
    console.log("✨ DATABASE IS NOW PRISTINE AND READY FOR PRODUCTION LAUNCH!");
    console.log("========================================================\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Cleanup failed with error:", err.message);
    process.exit(1);
  }
}

wipeDatabase();
