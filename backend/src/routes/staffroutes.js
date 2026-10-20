const express = require("express");
const router = express.Router();
const {
  getStaffByMess,
  createStaff,
  updateStaff,
  deleteStaff,
  verifyStaffPin,
  logAttendance,
  getAttendanceHistory,
  getStaffAuditTrail,
  getPayrollSummary,
  getRoles,
  addCustomRole,
  deleteCustomRole,
  getStaffMemberAttendance,
  seedSampleAttendance,
} = require("../controllers/staffcontroller");

// Staff Directory CRUD
router.get("/mess/:messId", getStaffByMess);
router.post("/", createStaff);
router.put("/:id", updateStaff);
router.delete("/:id", deleteStaff);

// Role Hierarchy & Custom Roles (Desk Job, Service, Helper, etc.)
router.get("/mess/:messId/roles", getRoles);
router.post("/mess/:messId/roles", addCustomRole);
router.delete("/mess/:messId/roles/:roleId", deleteCustomRole);

// PIN-based fast counter operator authentication
router.post("/verify-pin", verifyStaffPin);

// Attendance & Shift Tracking
router.post("/:id/attendance", logAttendance);
router.get("/:id/attendance", getStaffMemberAttendance);
router.get("/mess/:messId/attendance", getAttendanceHistory);
router.post("/mess/:messId/seed-attendance", seedSampleAttendance);

// Performance & Counter Redemption Audit Trail
router.get("/mess/:messId/audit-trail", getStaffAuditTrail);

// Payroll Liability Summary (Finance integration)
router.get("/mess/:messId/payroll", getPayrollSummary);

module.exports = router;
