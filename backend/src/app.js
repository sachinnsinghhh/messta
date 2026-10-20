const express = require("express");
const cors = require("cors");

const messRoutes = require("./routes/messroutes");
const orderRoutes = require("./routes/orderroutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const inventoryRoutes = require("./routes/inventoryroutes");
const staffRoutes = require("./routes/staffroutes");
const financeRoutes = require("./routes/financeroutes");
const walletRoutes = require("./routes/walletroutes");

const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Messta backend is running");
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Messta Backend", timestamp: new Date().toISOString() });
});

// Mount endpoints
app.use("/api/mess", messRoutes);
app.use("/api/messes", messRoutes); // Alias for plural endpoint
app.use("/api/orders", orderRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/wallet", walletRoutes);

module.exports = app;
