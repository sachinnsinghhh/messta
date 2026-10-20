import { API_BASE_URL } from "../config/api";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useActiveMess } from "../context/useActiveMess";

const ROLE_CONFIG = {
  head_chef: {
    label: "Head Chef / Kitchen Manager",
    icon: "👨‍🍳",
    color: "bg-amber-100 text-amber-800 border-amber-300",
    defaultShift: "06:30 AM – 03:00 PM (Kitchen Prep & Production)",
    defaultSalary: 26000,
    salaryType: "monthly",
    permissions: { canScanQR: false, canManageInventory: true, canManageMeals: true, canViewFinance: false, canManageStaff: false },
  },
  counter_operator: {
    label: "Counter Operator / Cashier",
    icon: "📱",
    color: "bg-orange-100 text-orange-800 border-orange-300",
    defaultShift: "07:00 AM – 02:30 PM & 05:00 PM – 10:30 PM",
    defaultSalary: 17000,
    salaryType: "monthly",
    permissions: { canScanQR: true, canManageInventory: false, canManageMeals: false, canViewFinance: false, canManageStaff: false },
  },
  delivery_staff: {
    label: "Tiffin & Doorstep Delivery Partner",
    icon: "🛵",
    color: "bg-blue-100 text-blue-800 border-blue-300",
    defaultShift: "11:30 AM – 02:00 PM & 07:30 PM – 09:30 PM",
    defaultSalary: 600,
    salaryType: "daily_wage",
    permissions: { canScanQR: true, canManageInventory: false, canManageMeals: false, canViewFinance: false, canManageStaff: false },
  },
  kitchen_helper: {
    label: "Kitchen Assistant / Line Cook",
    icon: "🔪",
    color: "bg-emerald-100 text-emerald-800 border-emerald-300",
    defaultShift: "07:00 AM – 03:30 PM (Prep & Cleaning)",
    defaultSalary: 13000,
    salaryType: "monthly",
    permissions: { canScanQR: false, canManageInventory: true, canManageMeals: false, canViewFinance: false, canManageStaff: false },
  },
  admin: {
    label: "Administrator / Co-Owner",
    icon: "🛡️",
    color: "bg-purple-100 text-purple-800 border-purple-300",
    defaultShift: "Full Day Operational Oversight",
    defaultSalary: 32000,
    salaryType: "monthly",
    permissions: { canScanQR: true, canManageInventory: true, canManageMeals: true, canViewFinance: true, canManageStaff: true },
  },
};

export default function OwnerStaff() {
  const { currentUser } = useAuth();
  const { allMesses, activeMessId, activeMess, loadingMesses, switchMess } = useActiveMess(currentUser);

  const [activeTab, setActiveTab] = useState("directory"); // "directory" | "roster" | "audit" | "payroll"
  const [roleFilter, setRoleFilter] = useState("all");
  const [staffList, setStaffList] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [payrollSummary, setPayrollSummary] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: "", type: "" });

  // Daily Attendance Log Search & Filter States
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceDateFilter, setAttendanceDateFilter] = useState("");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("all");

  // Staff Member Working Days & Attendance History Modal States
  const [selectedStaffForHistory, setSelectedStaffForHistory] = useState(null);
  const [showStaffHistoryModal, setShowStaffHistoryModal] = useState(false);
  const [staffHistoryRecords, setStaffHistoryRecords] = useState([]);
  const [staffHistorySummary, setStaffHistorySummary] = useState(null);
  const [staffHistoryLoading, setStaffHistoryLoading] = useState(false);
  const [historyMonthFilter, setHistoryMonthFilter] = useState("all");

  // Manual Working Day Form States
  const [showManualAttendanceForm, setShowManualAttendanceForm] = useState(false);
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [manualCheckIn, setManualCheckIn] = useState("07:00");
  const [manualCheckOut, setManualCheckOut] = useState("14:30");
  const [manualStatus, setManualStatus] = useState("present");
  const [manualShift, setManualShift] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  // Custom Roles Management States
  const [customRoles, setCustomRoles] = useState([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleIcon, setNewRoleIcon] = useState("💼");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newRoleShift, setNewRoleShift] = useState("09:00 AM – 06:00 PM (Desk Service)");
  const [newRoleSalaryType, setNewRoleSalaryType] = useState("monthly");
  const [newRoleSalaryAmount, setNewRoleSalaryAmount] = useState(16000);
  const [newRolePermissions, setNewRolePermissions] = useState({
    canScanQR: true,
    canManageInventory: false,
    canManageMeals: false,
    canViewFinance: false,
    canManageStaff: false,
  });

  // Add/Edit Staff Modal State
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [staffName, setStaffName] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState("counter_operator");
  const [staffRoleTitle, setStaffRoleTitle] = useState("");
  const [staffPin, setStaffPin] = useState("1234");
  const [staffShift, setStaffShift] = useState("morning");
  const [staffShiftTiming, setStaffShiftTiming] = useState("");
  const [staffSalaryType, setStaffSalaryType] = useState("monthly");
  const [staffSalaryAmount, setStaffSalaryAmount] = useState(17000);
  const [staffPermissions, setStaffPermissions] = useState(ROLE_CONFIG.counter_operator.permissions);

  // Dynamic role dictionary (Built-in + Custom Roles)
  const allRolesMap = useMemo(() => {
    const map = { ...ROLE_CONFIG };
    (customRoles || []).forEach((cr) => {
      map[cr.id] = {
        label: cr.name,
        icon: cr.icon || "💼",
        color: "bg-indigo-50 text-indigo-800 border-indigo-200",
        defaultShift: cr.defaultShift || "General Shift",
        defaultSalary: cr.defaultSalary || 15000,
        salaryType: cr.salaryType || "monthly",
        permissions: cr.permissions || {},
        isCustom: true,
      };
    });
    return map;
  }, [customRoles]);

  // Load Staff Data for active mess outlet
  const loadStaffData = async () => {
    if (!activeMessId) return;
    try {
      const [staffRes, attendanceRes, auditRes, payrollRes, rolesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/staff/mess/${activeMessId}`),
        fetch(`${API_BASE_URL}/api/staff/mess/${activeMessId}/attendance`),
        fetch(`${API_BASE_URL}/api/staff/mess/${activeMessId}/audit-trail`),
        fetch(`${API_BASE_URL}/api/staff/mess/${activeMessId}/payroll`),
        fetch(`${API_BASE_URL}/api/staff/mess/${activeMessId}/roles`),
      ]);

      if (staffRes.ok) {
        const data = await staffRes.json();
        setStaffList(data.data || []);
      }
      if (attendanceRes.ok) {
        const data = await attendanceRes.json();
        setAttendanceRecords(data.data || []);
      }
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditTrail(data.data || []);
      }
      if (payrollRes.ok) {
        const data = await payrollRes.json();
        setPayrollSummary(data.data || null);
      }
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setCustomRoles(rolesData.customRoles || []);
      }
    } catch {
      setFeedback({ text: "Could not sync staff directory with server.", type: "error" });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStaffData();
    }, 0);
    return () => clearTimeout(timer);
  }, [activeMessId]);

  // Apply Role Preset to Form
  const handleApplyPreset = (roleKey) => {
    const preset = allRolesMap[roleKey] || ROLE_CONFIG[roleKey];
    if (!preset) return;
    setStaffRole(roleKey);
    setStaffRoleTitle(preset.label);
    setStaffShiftTiming(preset.defaultShift);
    setStaffSalaryType(preset.salaryType || "monthly");
    setStaffSalaryAmount(preset.defaultSalary || 15000);
    setStaffPermissions(preset.permissions || {});
  };

  // Create a Custom Role (Desk Job, Table Service, etc.)
  const handleCreateCustomRole = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      setFeedback({ text: "Role name is required (e.g. Desk Job, Table Service).", type: "error" });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/staff/mess/${activeMessId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoleName.trim(),
          icon: newRoleIcon.trim() || "💼",
          description: newRoleDescription.trim(),
          defaultShift: newRoleShift.trim(),
          defaultSalary: Number(newRoleSalaryAmount),
          salaryType: newRoleSalaryType,
          permissions: newRolePermissions,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ text: `Custom role "${newRoleName}" created successfully!`, type: "success" });
        setNewRoleName("");
        setNewRoleDescription("");
        setCustomRoles(data.customRoles || []);
        setShowRoleModal(false);
      } else {
        setFeedback({ text: data.message || "Failed to create role.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Server error creating custom role.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete a Custom Role
  const handleDeleteCustomRole = async (roleId, roleName) => {
    if (!window.confirm(`Are you sure you want to remove role "${roleName}" from this mess?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/staff/mess/${activeMessId}/roles/${roleId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ text: `Role "${roleName}" removed.`, type: "success" });
        setCustomRoles(data.customRoles || []);
        if (roleFilter === roleId) setRoleFilter("all");
      } else {
        setFeedback({ text: data.message || "Failed to delete role.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Server error deleting role.", type: "error" });
    }
  };

  // Open Modal to Add Staff
  const handleOpenAddModal = () => {
    setEditingStaffId(null);
    setStaffName("");
    setStaffPhone("");
    setStaffEmail("");
    setStaffPin(String(Math.floor(1000 + Math.random() * 9000)));
    handleApplyPreset("counter_operator");
    setShowStaffModal(true);
  };

  // Open Modal to Edit Staff
  const handleOpenEditModal = (staff) => {
    setEditingStaffId(staff._id || staff.id);
    setStaffName(staff.name || "");
    setStaffPhone(staff.phone || "");
    setStaffEmail(staff.email || "");
    setStaffRole(staff.role || "counter_operator");
    setStaffRoleTitle(staff.roleTitle || allRolesMap[staff.role]?.label || "");
    setStaffPin(staff.pin || "1234");
    setStaffShift(staff.shift || "morning");
    setStaffShiftTiming(staff.shiftTiming || "");
    setStaffSalaryType(staff.salaryType || "monthly");
    setStaffSalaryAmount(staff.salaryAmount || 15000);
    setStaffPermissions(staff.permissions || ROLE_CONFIG.counter_operator.permissions);
    setShowStaffModal(true);
  };

  // Save Staff (Create / Update)
  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffName.trim() || !staffPhone.trim()) {
      setFeedback({ text: "Name and phone number are required.", type: "error" });
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        messId: activeMessId,
        name: staffName.trim(),
        phone: staffPhone.trim(),
        email: staffEmail.trim(),
        role: staffRole,
        roleTitle: staffRoleTitle,
        pin: staffPin.trim(),
        shift: staffShift,
        shiftTiming: staffShiftTiming,
        salaryType: staffSalaryType,
        salaryAmount: Number(staffSalaryAmount),
        permissions: staffPermissions,
      };

      let res;
      if (editingStaffId) {
        res = await fetch(`${API_BASE_URL}/api/staff/${editingStaffId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE_URL}/api/staff`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          text: editingStaffId ? "Staff member updated successfully!" : "New staff member hired successfully!",
          type: "success",
        });
        setShowStaffModal(false);
        await loadStaffData();
      } else {
        setFeedback({ text: data.message || "Operation failed.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Server error saving staff details.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Staff Member
  const handleDeleteStaff = async (staffId, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from this mess outlet?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/staff/${staffId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ text: `Staff member "${name}" removed.`, type: "success" });
        await loadStaffData();
      } else {
        setFeedback({ text: data.message || "Failed to delete staff member.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Server error removing staff member.", type: "error" });
    }
  };

  // Clock in / Check out Attendance
  const handleToggleAttendance = async (staff) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/staff/${staff._id || staff.id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "present",
          shift: staff.shiftTiming || staff.shift,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ text: `Attendance logged for ${staff.name}!`, type: "success" });
        await loadStaffData();
      } else {
        setFeedback({ text: data.message || "Failed to log attendance.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Error logging attendance.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Attendance Time & Duration Helpers
  const calculateDuration = (checkInTime, checkOutTime) => {
    if (!checkInTime) return "—";
    if (!checkOutTime) return "Active Now 🟢";

    const inDate = new Date(checkInTime);
    const outDate = new Date(checkOutTime);
    const diffMs = outDate.getTime() - inDate.getTime();

    if (diffMs <= 0) return "0m";

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const formatTimeOnly = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "—";
    }
  };

  const formatDateWithDay = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        weekday: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Filtered Daily Attendance Records (Search + Date + Status)
  const filteredAttendanceRecords = useMemo(() => {
    return attendanceRecords.filter((rec) => {
      const query = attendanceSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        rec.staffName?.toLowerCase().includes(query) ||
        rec.shift?.toLowerCase().includes(query) ||
        rec.date?.includes(query) ||
        rec.notes?.toLowerCase().includes(query);

      const matchesDate = !attendanceDateFilter || rec.date === attendanceDateFilter;
      const matchesStatus = attendanceStatusFilter === "all" || rec.status === attendanceStatusFilter;

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [attendanceRecords, attendanceSearch, attendanceDateFilter, attendanceStatusFilter]);

  // Open Detailed Staff Member Working Days & Times History Modal
  const handleOpenStaffHistory = async (staff) => {
    if (!staff) return;
    setSelectedStaffForHistory(staff);
    setShowStaffHistoryModal(true);
    setStaffHistoryLoading(true);
    setShowManualAttendanceForm(false);
    setHistoryMonthFilter("all");
    setManualDate(new Date().toISOString().split("T")[0]);
    setManualShift(staff.shiftTiming || staff.shift || "Morning Shift");
    setManualCheckIn("07:00");
    setManualCheckOut("14:30");
    setManualStatus("present");
    setManualNotes("");

    try {
      const staffId = staff._id || staff.id;
      const res = await fetch(`${API_BASE_URL}/api/staff/${staffId}/attendance`);
      const data = await res.json();
      if (res.ok && data.success) {
        setStaffHistoryRecords(data.data || []);
        setStaffHistorySummary(data.summary || null);
      } else {
        setStaffHistoryRecords([]);
        setStaffHistorySummary(null);
      }
    } catch {
      setStaffHistoryRecords([]);
      setStaffHistorySummary(null);
    } finally {
      setStaffHistoryLoading(false);
    }
  };

  // Filter staff history by month
  const filteredStaffHistory = useMemo(() => {
    if (historyMonthFilter === "all") return staffHistoryRecords;
    return staffHistoryRecords.filter((r) => r.date?.startsWith(historyMonthFilter));
  }, [staffHistoryRecords, historyMonthFilter]);

  // Available months from staff history records
  const availableHistoryMonths = useMemo(() => {
    const set = new Set();
    staffHistoryRecords.forEach((r) => {
      if (r.date && r.date.length >= 7) {
        set.add(r.date.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [staffHistoryRecords]);

  const formatMonthName = (yearMonth) => {
    if (!yearMonth || yearMonth === "all") return "All Time";
    try {
      const [year, month] = yearMonth.split("-");
      const d = new Date(Number(year), Number(month) - 1, 1);
      return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    } catch {
      return yearMonth;
    }
  };

  // Manual Working Day Submission / Correction
  const handleSaveManualAttendance = async (e) => {
    e.preventDefault();
    if (!selectedStaffForHistory) return;

    setActionLoading(true);
    try {
      let checkInDate = null;
      let checkOutDate = null;

      if (manualCheckIn) {
        checkInDate = new Date(`${manualDate}T${manualCheckIn}:00`);
      }
      if (manualCheckOut) {
        checkOutDate = new Date(`${manualDate}T${manualCheckOut}:00`);
      }

      const staffId = selectedStaffForHistory._id || selectedStaffForHistory.id;
      const res = await fetch(`${API_BASE_URL}/api/staff/${staffId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: manualDate,
          checkInTime: checkInDate,
          checkOutTime: checkOutDate,
          status: manualStatus,
          shift: manualShift || selectedStaffForHistory.shiftTiming || selectedStaffForHistory.shift,
          notes: manualNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          text: `Working day logged for ${selectedStaffForHistory.name} on ${manualDate}! ✨`,
          type: "success",
        });
        setShowManualAttendanceForm(false);
        await handleOpenStaffHistory(selectedStaffForHistory);
        await loadStaffData();
      } else {
        setFeedback({ text: data.message || "Failed saving working day.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Server error saving working day.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // 1-Click Starter: Seed Sample 12-day attendance history
  const handleSeedSampleAttendance = async () => {
    if (!activeMessId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/staff/mess/${activeMessId}/seed-attendance`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ text: data.message || "12 days of working history seeded! 🚀", type: "success" });
        await loadStaffData();
        if (selectedStaffForHistory) {
          await handleOpenStaffHistory(selectedStaffForHistory);
        }
      } else {
        setFeedback({ text: data.message || "Could not seed attendance logs.", type: "error" });
      }
    } catch {
      setFeedback({ text: "Server error seeding attendance records.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    if (roleFilter === "all") return staffList;
    return staffList.filter((s) => s.role === roleFilter);
  }, [staffList, roleFilter]);

  // Aggregate Metrics
  const activeStaffCount = staffList.filter((s) => s.status === "active").length;
  const totalMealsServedToday = staffList.reduce((sum, s) => sum + Number(s.todayMealsServed || 0), 0);
  const totalMonthlyPayroll = payrollSummary?.projectedMonthlyPayroll ||
    staffList.reduce((sum, s) => {
      const amt = Number(s.salaryAmount || 0);
      return sum + (s.salaryType === "monthly" ? amt : amt * 26);
    }, 0);

  return (
    <div className="min-h-screen bg-gray-50/70 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* ── TOP OUTLET HEADER & BRANCH PICKER ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-[11px] font-black uppercase tracking-wider text-orange-600">
              Staff Directory & Shift Operations • {activeMess?.name || "Active Mess"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Mess Personnel & Role Security
          </h1>
          <p className="text-xs text-gray-500 max-w-2xl">
            Control role-based access, track shift accountability during Lunch and Dinner rushes, eliminate redemption fraud, and automatically calculate payroll expenses.
          </p>
        </div>

        {/* Branch Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={activeMessId}
              onChange={(e) => switchMess(e.target.value)}
              disabled={loadingMesses}
              className="appearance-none bg-gray-50 border border-gray-300 rounded-2xl py-2.5 pl-4 pr-10 text-xs font-bold text-gray-800 shadow-2xs hover:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {allMesses.map((m) => (
                <option key={m.id || m._id} value={m.id || m._id}>
                  📍 {m.name} ({m.locality})
                </option>
              ))}
            </select>
            <span className="absolute right-3.5 top-3 text-[10px] pointer-events-none text-gray-400">▼</span>
          </div>

          <button
            type="button"
            onClick={() => setShowRoleModal(true)}
            className="px-4 py-2.5 bg-white border border-gray-300 hover:border-orange-500 hover:text-orange-600 active:scale-95 text-gray-700 font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-xs transition flex items-center gap-2"
          >
            <span>🏷️</span>
            <span>Add / Manage Roles</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-xs transition flex items-center gap-2"
          >
            <span>+</span>
            <span>Hire Staff Member</span>
          </button>
        </div>
      </div>

      {/* ── TOP KPI SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Card 1: Active Roster */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-2xl p-2.5 bg-orange-50 rounded-2xl border border-orange-100">👥</span>
            <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {activeStaffCount} Active
            </span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-gray-900 block font-mono">
              {staffList.length}
            </span>
            <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wide">
              Total Staff Members
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Head chefs, cashiers, helpers & delivery</p>
        </div>

        {/* Card 2: Shift Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-2xl p-2.5 bg-amber-50 rounded-2xl border border-amber-100">☀️</span>
            <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Shift Roster
            </span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-gray-900 block font-mono">
              {staffList.filter((s) => s.shift === "morning").length} / {staffList.filter((s) => s.shift === "evening").length}
            </span>
            <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wide">
              Morning vs Evening Crew
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Balanced for lunch rush & dinner prep</p>
        </div>

        {/* Card 3: Today's Redemptions Tracked */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-2xl p-2.5 bg-emerald-50 rounded-2xl border border-emerald-100">🍽️</span>
            <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Accountability
            </span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 block font-mono">
              {totalMealsServedToday}
            </span>
            <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wide">
              Meals Served Today
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Logged under verified staff PINs</p>
        </div>

        {/* Card 4: Monthly Payroll Liability */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-2xl p-2.5 bg-purple-50 rounded-2xl border border-purple-100">💰</span>
            <span className="text-[10px] font-black uppercase text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              Finance Ready
            </span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-gray-900 block font-mono">
              ₹{totalMonthlyPayroll.toLocaleString()}
            </span>
            <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wide">
              Est. Monthly Payroll
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Integrated raw wage expenditure</p>
        </div>

      </div>

      {/* ── FEEDBACK ALERT ── */}
      {feedback.text && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback({ text: "", type: "" })}
            className="text-gray-400 hover:text-gray-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── TABS NAVIGATION ── */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("directory")}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "directory"
              ? "bg-gray-900 text-white shadow-xs"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80"
          }`}
        >
          <span>👥</span>
          <span>Staff Directory & Roles ({staffList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("roster")}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "roster"
              ? "bg-gray-900 text-white shadow-xs"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80"
          }`}
        >
          <span>⏱️</span>
          <span>Shift Rosters & Attendance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "audit"
              ? "bg-gray-900 text-white shadow-xs"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80"
          }`}
        >
          <span>🔍</span>
          <span>Counter Audit Trail ({auditTrail.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("payroll")}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "payroll"
              ? "bg-gray-900 text-white shadow-xs"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80"
          }`}
        >
          <span>💼</span>
          <span>Payroll & Wage Liability</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: STAFF DIRECTORY & ROLE HIERARCHY ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "directory" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase text-gray-400">Filter By Role:</span>
              <button
                type="button"
                onClick={() => setRoleFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  roleFilter === "all"
                    ? "bg-orange-600 text-white shadow-2xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All Staff
              </button>

              {Object.entries(allRolesMap).map(([roleKey, cfg]) => (
                <button
                  key={roleKey}
                  type="button"
                  onClick={() => setRoleFilter(roleKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    roleFilter === roleKey
                      ? "bg-orange-600 text-white shadow-2xs"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {cfg.icon || "💼"} {cfg.label || roleKey}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setShowRoleModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition flex items-center gap-1 shadow-2xs"
                title="Configure custom mess roles"
              >
                <span>+</span>
                <span>Role</span>
              </button>
            </div>

            <span className="text-xs font-bold text-gray-500">
              Showing {filteredStaff.length} of {staffList.length} Personnel
            </span>
          </div>

          {/* Staff Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.length === 0 ? (
              <div className="col-span-full py-16 text-center space-y-3 bg-white rounded-3xl border border-dashed border-gray-200 p-8">
                <span className="text-4xl">👥</span>
                <h3 className="text-base font-black text-gray-800">No Staff Members Found</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Hire staff members or assign existing personnel to this mess outlet to manage daily shifts.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="px-5 py-2.5 bg-orange-600 text-white text-xs font-black uppercase rounded-xl shadow-xs"
                >
                  + Add First Staff Member
                </button>
              </div>
            ) : (
              filteredStaff.map((staff) => {
                const config = allRolesMap[staff.role] || {
                  label: staff.roleTitle || staff.role,
                  icon: "💼",
                  color: "bg-indigo-50 text-indigo-700 border-indigo-200"
                };
                return (
                  <div
                    key={staff._id || staff.id}
                    className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs hover:border-orange-300 transition-all duration-200 space-y-4 flex flex-col justify-between"
                  >
                    {/* Top Row: Icon, Name & Status */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-2xl shadow-2xs">
                          {config.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenStaffHistory(staff)}
                              className="text-left group"
                              title="Click to view all working days & hours"
                            >
                              <h3 className="text-base font-black text-gray-900 leading-tight group-hover:text-orange-600 transition">
                                {staff.name}
                              </h3>
                            </button>
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                staff.status === "active"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-gray-100 text-gray-600 border-gray-300"
                              }`}
                            >
                              {staff.status}
                            </span>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md inline-block mt-1 border ${config.color}`}>
                            {staff.roleTitle || config.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Shift & Wage Details */}
                    <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-500 font-bold uppercase text-[9px]">Shift Window:</span>
                        <span className="font-extrabold text-gray-800 truncate max-w-[180px]">
                          {staff.shiftTiming || config.defaultShift}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-500 font-bold uppercase text-[9px]">Compensation:</span>
                        <span className="font-black text-emerald-700">
                          ₹{Number(staff.salaryAmount || 0).toLocaleString()} / {staff.salaryType === "daily_wage" ? "day" : "month"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-200/60">
                        <span className="text-gray-500 font-bold uppercase text-[9px]">Counter PIN:</span>
                        <span className="font-mono font-black text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200 tracking-wider">
                          **** ({staff.pin})
                        </span>
                      </div>
                    </div>

                    {/* Role Permissions Tags */}
                    <div>
                      <span className="text-[9px] font-black uppercase text-gray-400 block mb-1.5">
                        Role Capabilities:
                      </span>
                      <div className="flex flex-wrap gap-1 text-[9px] font-extrabold">
                        {staff.permissions?.canScanQR && (
                          <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded-md border border-orange-200">
                            ✓ Scan QR Passes
                          </span>
                        )}
                        {staff.permissions?.canManageInventory && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md border border-amber-200">
                            ✓ Kitchen Stock
                          </span>
                        )}
                        {staff.permissions?.canManageMeals && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md border border-emerald-200">
                            ✓ Daily Thalis
                          </span>
                        )}
                        {staff.permissions?.canViewFinance && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-800 rounded-md border border-purple-200">
                            ✓ Finance & P&L
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Performance & Actions */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-gray-400 font-bold block">Meals Served:</span>
                        <span className="font-black text-gray-900 font-mono">
                          {staff.mealsServedCount || 0} total • <strong className="text-orange-600">{staff.todayMealsServed || 0} today</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenStaffHistory(staff)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[10px] uppercase rounded-lg transition flex items-center gap-1"
                          title="View all working days & hours history"
                        >
                          <span>📅</span>
                          <span>Working Days</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(staff)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-800 font-bold text-[10px] uppercase rounded-lg transition"
                          title="Log attendance / shift check-in"
                        >
                          Check In ⏱️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(staff)}
                          className="p-1.5 bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-800 font-bold text-xs rounded-lg transition"
                          title="Edit details"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(staff._id || staff.id, staff.name)}
                          className="p-1.5 bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-600 font-bold text-xs rounded-lg transition"
                          title="Remove staff"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: SHIFT ROSTERING & LIVE ATTENDANCE ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "roster" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Shift Division Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Morning Shift Column */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 p-6 rounded-3xl border border-amber-200 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-900 flex items-center justify-center text-2xl font-black">
                    ☀️
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">
                      Shift Block #1
                    </span>
                    <h3 className="text-xl font-black text-gray-900">Morning Shift & Lunch Rush</h3>
                    <p className="text-xs text-gray-600">07:00 AM – 02:30 PM (Kitchen Prep + Lunch Counter)</p>
                  </div>
                </div>
                <span className="text-xs font-black px-3 py-1 bg-white text-orange-700 rounded-xl border border-orange-200 shadow-2xs font-mono">
                  {staffList.filter((s) => s.shift === "morning").length} Staff Assigned
                </span>
              </div>

              <div className="space-y-2.5">
                {staffList.filter((s) => s.shift === "morning").length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">No staff assigned to morning shift.</p>
                ) : (
                  staffList
                    .filter((s) => s.shift === "morning")
                    .map((s) => (
                      <div
                        key={s._id || s.id}
                        className="p-3 bg-white rounded-2xl border border-amber-200/80 shadow-2xs flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{ROLE_CONFIG[s.role]?.icon || "👤"}</span>
                          <div>
                            <button
                              type="button"
                              onClick={() => handleOpenStaffHistory(s)}
                              className="font-extrabold text-gray-900 block hover:text-orange-600 transition text-left"
                              title="Click to view all working days and times"
                            >
                              {s.name}
                            </button>
                            <span className="text-[10px] text-gray-500">{s.roleTitle}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-gray-500">
                            PIN: {s.pin}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleAttendance(s)}
                            className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-[10px] uppercase rounded-lg transition"
                          >
                            Clock In / Out
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Evening Shift Column */}
            <div className="bg-gradient-to-br from-slate-900 to-gray-800 text-white p-6 rounded-3xl border border-gray-700 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center text-2xl font-black">
                    🌙
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-orange-400 tracking-wider">
                      Shift Block #2
                    </span>
                    <h3 className="text-xl font-black text-white">Evening Shift & Dinner Rush</h3>
                    <p className="text-xs text-gray-400">04:30 PM – 10:30 PM (Snacks Prep + Dinner Counter)</p>
                  </div>
                </div>
                <span className="text-xs font-black px-3 py-1 bg-gray-800 text-emerald-400 rounded-xl border border-gray-700 shadow-2xs font-mono">
                  {staffList.filter((s) => s.shift === "evening").length} Staff Assigned
                </span>
              </div>

              <div className="space-y-2.5">
                {staffList.filter((s) => s.shift === "evening").length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">No staff assigned to evening shift.</p>
                ) : (
                  staffList
                    .filter((s) => s.shift === "evening")
                    .map((s) => (
                      <div
                        key={s._id || s.id}
                        className="p-3 bg-gray-800/80 rounded-2xl border border-gray-700 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{ROLE_CONFIG[s.role]?.icon || "👤"}</span>
                          <div>
                            <button
                              type="button"
                              onClick={() => handleOpenStaffHistory(s)}
                              className="font-extrabold text-white block hover:text-orange-400 transition text-left"
                              title="Click to view all working days and times"
                            >
                              {s.name}
                            </button>
                            <span className="text-[10px] text-gray-400">{s.roleTitle}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-gray-400">
                            PIN: {s.pin}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleAttendance(s)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase rounded-lg transition"
                          >
                            Clock In / Out
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

          </div>

          {/* Daily Attendance Log Table with Search & Date Filters */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-black text-gray-900">
                  Daily Attendance Log ({filteredAttendanceRecords.length})
                </h3>
                <p className="text-xs text-gray-500">Live timestamps of check-ins, check-outs, shift durations, and wage logs.</p>
              </div>
              <div className="flex items-center gap-2">
                {import.meta.env.DEV && (
                  <button
                    type="button"
                    onClick={handleSeedSampleAttendance}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-black rounded-xl border border-orange-200 transition"
                    title="Seed past 12 days attendance history for staff (Dev Only)"
                  >
                    ⚡ Seed 12 Days History
                  </button>
                )}
                <button
                  type="button"
                  onClick={loadStaffData}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
                >
                  Refresh Log 🔄
                </button>
              </div>
            </div>

            {/* Attendance Search & Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-200/70">
              {/* Text Search */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Search staff name, shift, notes..."
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-white text-xs border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={attendanceDateFilter}
                  onChange={(e) => setAttendanceDateFilter(e.target.value)}
                  className="w-full p-2 bg-white text-xs border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setAttendanceDateFilter(new Date().toISOString().split("T")[0])}
                  className="px-2.5 py-2 bg-white hover:bg-gray-100 text-gray-700 text-[10px] font-black uppercase rounded-xl border border-gray-300 transition"
                  title="Filter today's attendance"
                >
                  Today
                </button>
                {attendanceDateFilter && (
                  <button
                    type="button"
                    onClick={() => setAttendanceDateFilter("")}
                    className="p-2 text-gray-400 hover:text-gray-600 font-bold text-xs"
                    title="Clear date filter"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={attendanceStatusFilter}
                  onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                  className="w-full p-2 bg-white text-xs border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Attendance Statuses</option>
                  <option value="present">✓ Present (Full Shift)</option>
                  <option value="late">⚠️ Late Check-In</option>
                  <option value="half_day">🌓 Half Day</option>
                  <option value="absent">✕ Absent</option>
                </select>

                {(attendanceSearch || attendanceDateFilter || attendanceStatusFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setAttendanceSearch("");
                      setAttendanceDateFilter("");
                      setAttendanceStatusFilter("all");
                    }}
                    className="px-2.5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10px] font-bold uppercase rounded-xl transition shrink-0"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredAttendanceRecords.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <span className="text-3xl block">📋</span>
                  <p className="text-xs text-gray-400 font-bold">
                    {attendanceRecords.length === 0
                      ? "No attendance check-ins recorded yet. Click 'Seed 12 Days History' or 'Clock In / Out' above!"
                      : "No attendance logs match your search filters."}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-black uppercase text-gray-400">
                      <th className="py-2.5 px-2">Date & Day</th>
                      <th className="py-2.5 px-2">Staff Member (Click for History)</th>
                      <th className="py-2.5 px-2">Shift Window</th>
                      <th className="py-2.5 px-2">Check-In</th>
                      <th className="py-2.5 px-2">Check-Out</th>
                      <th className="py-2.5 px-2">Total Duration</th>
                      <th className="py-2.5 px-2">Status</th>
                      <th className="py-2.5 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAttendanceRecords.map((att) => {
                      const duration = calculateDuration(att.checkInTime, att.checkOutTime);
                      const isLate = att.status === "late";
                      const isHalf = att.status === "half_day";
                      const isAbsent = att.status === "absent";
                      const matchedStaff = staffList.find(
                        (s) => (s._id || s.id) === att.staffId || s.name === att.staffName
                      ) || {
                        _id: att.staffId,
                        name: att.staffName,
                        roleTitle: att.shift,
                        shiftTiming: att.shift,
                        shift: "morning",
                        status: "active",
                      };

                      return (
                        <tr key={att._id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-2 font-mono font-bold text-gray-700">
                            {formatDateWithDay(att.date)}
                          </td>
                          <td className="py-3 px-2">
                            <button
                              type="button"
                              onClick={() => handleOpenStaffHistory(matchedStaff)}
                              className="font-extrabold text-gray-900 hover:text-orange-600 transition flex items-center gap-1.5 text-left group"
                              title="Click to view all working days & hours for this staff member"
                            >
                              <span>{att.staffName}</span>
                              <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">
                                📅 History
                              </span>
                            </button>
                          </td>
                          <td className="py-3 px-2 text-gray-600 truncate max-w-[170px]">{att.shift}</td>
                          <td className="py-3 px-2 font-mono text-gray-800 font-bold">
                            {formatTimeOnly(att.checkInTime)}
                          </td>
                          <td className="py-3 px-2 font-mono text-gray-800 font-bold">
                            {att.checkOutTime ? (
                              formatTimeOnly(att.checkOutTime)
                            ) : (
                              <span className="text-emerald-700 font-black animate-pulse">Active Now 🟢</span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <span className="font-mono font-black px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-[11px]">
                              {duration}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span
                              className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full border ${
                                isAbsent
                                  ? "bg-red-50 text-red-800 border-red-200"
                                  : isLate
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : isHalf
                                  ? "bg-blue-50 text-blue-800 border-blue-200"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
                              }`}
                            >
                              {isAbsent ? "✕ Absent" : isLate ? "⚠️ Late" : isHalf ? "🌓 Half Day" : "✓ Present"}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenStaffHistory(matchedStaff)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[10px] font-black uppercase transition"
                              title="View all working days and times"
                            >
                              Working Days ➔
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: COUNTER REDEMPTION AUDIT TRAIL ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "audit" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header Explanation */}
          <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 p-6 rounded-3xl border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-100 px-2.5 py-0.5 rounded-full">
                Zero-Fraud Accountability
              </span>
              <h3 className="text-xl font-black text-gray-900 mt-1">
                Counter Scanner Audit Trail
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Every scanned token and QR redemption is permanently stamped with the responsible cashier operator to eliminate fraud.
              </p>
            </div>
            <Link
              to="/owner"
              className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase rounded-2xl shadow-xs transition"
            >
              Open Live Scanner 📱
            </Link>
          </div>

          {/* Audit Trail List */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
            <h4 className="text-sm font-extrabold uppercase text-gray-900 tracking-wide">
              Recent Counter Redemptions ({auditTrail.length})
            </h4>

            {auditTrail.length === 0 ? (
              <p className="text-xs text-gray-400 py-12 text-center">
                No meal redemptions recorded yet today. Scanned meals will appear here in real time.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-black uppercase text-gray-400">
                      <th className="py-2.5">Time</th>
                      <th className="py-2.5">Token Code</th>
                      <th className="py-2.5">Student Name</th>
                      <th className="py-2.5">Thali / Dish</th>
                      <th className="py-2.5">Meal Slot</th>
                      <th className="py-2.5">Operator Staff</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditTrail.map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50/80">
                        <td className="py-3 font-mono text-[11px] text-gray-500">
                          {new Date(order.redeemedAt || order.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-3 font-mono font-black text-gray-900">
                          {order.token}
                        </td>
                        <td className="py-3 font-bold text-gray-900">
                          {order.userName}
                        </td>
                        <td className="py-3 font-semibold text-gray-800">
                          {order.thaliName || "Standard Meal"}
                        </td>
                        <td className="py-3 uppercase text-[10px] font-bold text-orange-600">
                          {order.mealType}
                        </td>
                        <td className="py-3">
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-900 rounded-lg border border-amber-200 font-extrabold text-[10px]">
                            👤 {order.scannedByStaffName || "Counter Desk"}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-black text-[9px] uppercase">
                            ✓ Served
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: PAYROLL & WAGE LIABILITY (FINANCE INTEGRATION) ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === "payroll" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 p-6 rounded-3xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                Finance Module Connector
              </span>
              <h3 className="text-xl font-black text-gray-900 mt-1">
                Personnel Wage & Salary Expenditure
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Feeds directly into upcoming Profit & Loss reports to calculate true net margin after subtracting staff payroll.
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-purple-900 block font-mono">
                ₹{totalMonthlyPayroll.toLocaleString()}
              </span>
              <span className="text-[10px] uppercase font-bold text-purple-600">
                Monthly Net Payroll Liability
              </span>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
            <h4 className="text-sm font-extrabold uppercase text-gray-900 tracking-wide">
              Active Compensation Roster ({staffList.length} Personnel)
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-black uppercase text-gray-400">
                    <th className="py-2.5">Staff Member</th>
                    <th className="py-2.5">Role</th>
                    <th className="py-2.5">Pay Structure</th>
                    <th className="py-2.5">Base Rate</th>
                    <th className="py-2.5">Monthly Projection</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {staffList.map((staff) => {
                    const isMonthly = staff.salaryType === "monthly";
                    const monthlyEquiv = isMonthly
                      ? Number(staff.salaryAmount || 0)
                      : Number(staff.salaryAmount || 0) * 26;

                    return (
                      <tr key={staff._id || staff.id} className="hover:bg-gray-50/80">
                        <td className="py-3 font-extrabold text-gray-900">{staff.name}</td>
                        <td className="py-3 text-gray-600">{staff.roleTitle}</td>
                        <td className="py-3 uppercase text-[10px] font-bold text-gray-500">
                          {isMonthly ? "Fixed Monthly Salary" : "Daily Wage Rate"}
                        </td>
                        <td className="py-3 font-mono font-bold text-gray-800">
                          ₹{Number(staff.salaryAmount || 0).toLocaleString()} {isMonthly ? "/mo" : "/day"}
                        </td>
                        <td className="py-3 font-mono font-black text-emerald-700">
                          ₹{monthlyEquiv.toLocaleString()} / mo
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full border ${
                              staff.status === "active"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-gray-100 text-gray-600 border-gray-300"
                            }`}
                          >
                            {staff.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: HIRE / EDIT STAFF MEMBER ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 relative max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                  {editingStaffId ? "Edit Staff Details" : "New Mess Personnel"}
                </span>
                <h3 className="text-xl font-black text-gray-900 mt-1">
                  {editingStaffId ? `Update ${staffName}` : "Hire Staff Member"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure role permissions, counter PIN code, shift timings, and wage rates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStaffModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Quick Role Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-gray-400">
                  Select Role & Auto-Fill Presets:
                </span>
                <button
                  type="button"
                  onClick={() => setShowRoleModal(true)}
                  className="text-[11px] font-extrabold text-orange-600 hover:text-orange-700 underline flex items-center gap-1"
                >
                  <span>+</span>
                  <span>Create Custom Role</span>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(allRolesMap).map(([roleKey, p]) => (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => handleApplyPreset(roleKey)}
                    className={`p-2 rounded-xl text-left text-xs font-bold border transition ${
                      staffRole === roleKey
                        ? "bg-orange-50 text-orange-700 border-orange-300 ring-2 ring-orange-400/30"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {p.icon || "💼"} {p.label || roleKey}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                    Staff Member Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="staff@messta.com"
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                    4-Digit Counter PIN
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={staffPin}
                    onChange={(e) => setStaffPin(e.target.value)}
                    className="w-full p-2.5 text-center font-mono font-black text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Shift Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                    Assigned Shift
                  </label>
                  <select
                    value={staffShift}
                    onChange={(e) => setStaffShift(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold"
                  >
                    <option value="morning">☀️ Morning Shift (Lunch Rush)</option>
                    <option value="evening">🌙 Evening Shift (Dinner Rush)</option>
                    <option value="fullday">⚡ Full Day Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                    Shift Timing Window
                  </label>
                  <input
                    type="text"
                    value={staffShiftTiming}
                    onChange={(e) => setStaffShiftTiming(e.target.value)}
                    placeholder="e.g. 07:00 AM – 02:30 PM"
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Wage & Salary Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                    Compensation Structure
                  </label>
                  <select
                    value={staffSalaryType}
                    onChange={(e) => setStaffSalaryType(e.target.value)}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold"
                  >
                    <option value="monthly">Monthly Fixed Salary (₹/month)</option>
                    <option value="daily_wage">Daily Wage Rate (₹/day)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                    Rate Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={staffSalaryAmount}
                    onChange={(e) => setStaffSalaryAmount(Number(e.target.value))}
                    className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Role Permissions Checkboxes */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <span className="text-[10px] font-black uppercase text-gray-500 block">
                  Permissions & Dashboard Access
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={staffPermissions.canScanQR}
                      onChange={(e) => setStaffPermissions({ ...staffPermissions, canScanQR: e.target.checked })}
                      className="rounded text-orange-600"
                    />
                    <span>Counter QR Scanning</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={staffPermissions.canManageInventory}
                      onChange={(e) => setStaffPermissions({ ...staffPermissions, canManageInventory: e.target.checked })}
                      className="rounded text-orange-600"
                    />
                    <span>Kitchen Inventory</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={staffPermissions.canManageMeals}
                      onChange={(e) => setStaffPermissions({ ...staffPermissions, canManageMeals: e.target.checked })}
                      className="rounded text-orange-600"
                    />
                    <span>Daily Thalis & Pricing</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={staffPermissions.canViewFinance}
                      onChange={(e) => setStaffPermissions({ ...staffPermissions, canViewFinance: e.target.checked })}
                      className="rounded text-orange-600"
                    />
                    <span>Finance & Profit Reports</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-xs font-bold text-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black uppercase tracking-wider shadow-xs transition disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : editingStaffId ? "Update Personnel" : "Hire Staff Member 🚀"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ── MODAL: MANAGE & ADD CUSTOM ROLES ── */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                  Mess Role Management
                </span>
                <h3 className="text-xl font-black text-gray-900 mt-1">
                  Add & Configure Staff Roles
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Define specialized positions like Front Desk, Table Service, Dishwashing, or Storekeeper for <span className="font-bold text-gray-700">{activeMess?.name}</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Quick Role Inspiration Templates */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase text-gray-400">
                Quick Role Templates (Click to Auto-Fill):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    name: "Desk Job / Counter Front",
                    icon: "🛎️",
                    desc: "Student check-in, token validation, front counter reception",
                    shift: "morning",
                    salaryType: "monthly",
                    salary: 14000,
                    perms: { canScanQR: true, canManageInventory: false, canManageMeals: false, canViewFinance: false, canManageStaff: false }
                  },
                  {
                    name: "Floor & Table Service",
                    icon: "🍽️",
                    desc: "Dining hall service, table clearance, student seating & water assistance",
                    shift: "morning",
                    salaryType: "daily_wage",
                    salary: 450,
                    perms: { canScanQR: false, canManageInventory: false, canManageMeals: false, canViewFinance: false, canManageStaff: false }
                  },
                  {
                    name: "Storekeeper & Pantry",
                    icon: "📦",
                    desc: "Manages dry rations, vegetable intake, kitchen stock audits",
                    shift: "morning",
                    salaryType: "monthly",
                    salary: 13000,
                    perms: { canScanQR: false, canManageInventory: true, canManageMeals: false, canViewFinance: false, canManageStaff: false }
                  },
                  {
                    name: "Sanitation & Hygiene",
                    icon: "🧼",
                    desc: "Utensil sterilization, kitchen dishwashing, waste disposal",
                    shift: "evening",
                    salaryType: "daily_wage",
                    salary: 400,
                    perms: { canScanQR: false, canManageInventory: false, canManageMeals: false, canViewFinance: false, canManageStaff: false }
                  }
                ].map((tpl) => (
                  <button
                    key={tpl.name}
                    type="button"
                    onClick={() => {
                      setNewRoleName(tpl.name);
                      setNewRoleIcon(tpl.icon);
                      setNewRoleDescription(tpl.desc);
                      setNewRoleShift(tpl.shift);
                      setNewRoleSalaryType(tpl.salaryType);
                      setNewRoleSalaryAmount(tpl.salary);
                      setNewRolePermissions(tpl.perms);
                    }}
                    className="p-2.5 rounded-2xl bg-gray-50 border border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 text-left transition flex flex-col gap-1 group"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">{tpl.icon}</span>
                    <span className="text-xs font-black text-gray-800 leading-tight">{tpl.name}</span>
                    <span className="text-[10px] text-gray-500 font-bold">
                      {tpl.salaryType === "monthly" ? `₹${tpl.salary}/mo` : `₹${tpl.salary}/day`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Role Creation Form */}
            <form onSubmit={handleCreateCustomRole} className="p-4 sm:p-5 bg-orange-50/40 rounded-3xl border border-orange-100 space-y-4">
              <span className="text-xs font-black text-orange-950 uppercase tracking-wide flex items-center gap-1.5">
                <span>✨</span> Create New Role
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                    Role Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="e.g. Desk Operator, Table Waiter, Storekeeper"
                    className="w-full p-2.5 text-xs bg-white border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                    Icon / Emoji
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={newRoleIcon}
                      onChange={(e) => setNewRoleIcon(e.target.value)}
                      className="w-12 p-2.5 text-center text-lg bg-white border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-orange-500"
                    />
                    <div className="flex gap-1 overflow-x-auto py-1">
                      {["🛎️", "🍽️", "🧼", "📦", "🧹", "🛵", "📋"].map((ico) => (
                        <button
                          key={ico}
                          type="button"
                          onClick={() => setNewRoleIcon(ico)}
                          className="px-1.5 py-1 text-sm bg-white rounded-lg border border-gray-200 hover:bg-orange-100"
                        >
                          {ico}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                  Description / Responsibilities (Optional)
                </label>
                <input
                  type="text"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="e.g. Cleans dining tables and guides incoming students"
                  className="w-full p-2.5 text-xs bg-white border border-gray-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                    Default Shift
                  </label>
                  <select
                    value={newRoleShift}
                    onChange={(e) => setNewRoleShift(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-gray-300 rounded-xl font-bold"
                  >
                    <option value="morning">☀️ Morning (Lunch Rush)</option>
                    <option value="evening">🌙 Evening (Dinner Rush)</option>
                    <option value="fullday">⚡ Full Day Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                    Wage Type
                  </label>
                  <select
                    value={newRoleSalaryType}
                    onChange={(e) => setNewRoleSalaryType(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-gray-300 rounded-xl font-bold"
                  >
                    <option value="monthly">Monthly Fixed (₹)</option>
                    <option value="daily_wage">Daily Wage (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                    Default Rate (₹)
                  </label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    value={newRoleSalaryAmount}
                    onChange={(e) => setNewRoleSalaryAmount(Number(e.target.value))}
                    className="w-full p-2.5 text-xs bg-white border border-gray-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Permissions for this role */}
              <div className="p-3 bg-white rounded-2xl border border-orange-200/80 space-y-2">
                <span className="text-[10px] font-black uppercase text-gray-600 block">
                  Default Permissions for this Role:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={newRolePermissions.canScanQR}
                      onChange={(e) => setNewRolePermissions({ ...newRolePermissions, canScanQR: e.target.checked })}
                      className="rounded text-orange-600"
                    />
                    <span>Counter QR Scanning</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={newRolePermissions.canManageInventory}
                      onChange={(e) => setNewRolePermissions({ ...newRolePermissions, canManageInventory: e.target.checked })}
                      className="rounded text-orange-600"
                    />
                    <span>Kitchen Inventory</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={newRolePermissions.canManageMeals}
                      onChange={(e) => setNewRolePermissions({ ...newRolePermissions, canManageMeals: e.target.checked })}
                      className="rounded text-orange-600"
                    />
                    <span>Daily Thalis & Pricing</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={newRolePermissions.canViewFinance}
                      onChange={(e) => setNewRolePermissions({ ...newRolePermissions, canViewFinance: e.target.checked })}
                      className="rounded text-orange-600"
                    />
                    <span>Finance & Profits</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={newRolePermissions.canManageStaff}
                      onChange={(e) => setNewRolePermissions({ ...newRolePermissions, canManageStaff: e.target.checked })}
                      className="rounded text-orange-600"
                    />
                    <span>Manage Staff</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {actionLoading ? "Creating..." : "Save Role Designation ✨"}
                </button>
              </div>
            </form>

            {/* List of Custom Roles */}
            <div className="space-y-3">
              <span className="text-xs font-black uppercase text-gray-500 block">
                Active Custom Roles ({customRoles.length})
              </span>

              {customRoles.length === 0 ? (
                <div className="p-4 text-center bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-500">
                  No custom roles created for this mess outlet yet. Use the form or quick templates above to add roles like Desk Job, Service, or Storekeeper.
                </div>
              ) : (
                <div className="space-y-2">
                  {customRoles.map((role) => (
                    <div
                      key={role.id}
                      className="p-3.5 bg-white rounded-2xl border border-gray-200 flex items-center justify-between gap-3 shadow-2xs hover:border-gray-300"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl p-2 bg-gray-50 rounded-xl border border-gray-100">
                          {role.icon || "💼"}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-gray-900">{role.name}</span>
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                              {role.salaryType === "monthly" ? `₹${role.defaultSalary}/mo` : `₹${role.defaultSalary}/day`}
                            </span>
                          </div>
                          {role.description && (
                            <p className="text-[11px] text-gray-500 mt-0.5">{role.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-black uppercase text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                              {role.defaultShift} shift
                            </span>
                            {role.permissions?.canScanQR && (
                              <span className="text-[9px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                QR Scanner
                              </span>
                            )}
                            {role.permissions?.canManageInventory && (
                              <span className="text-[9px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                Inventory
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteCustomRole(role.id)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition flex items-center gap-1"
                        title="Delete this custom role"
                      >
                        <span>🗑️</span>
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: STAFF MEMBER WORKING DAYS & ATTENDANCE HISTORY ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showStaffHistoryModal && selectedStaffForHistory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border-b border-orange-100/80 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white border border-orange-200 flex items-center justify-center text-2xl shadow-xs">
                  {allRolesMap[selectedStaffForHistory.role]?.icon || "👤"}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
                      {selectedStaffForHistory.name}
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                      {selectedStaffForHistory.roleTitle || allRolesMap[selectedStaffForHistory.role]?.label || selectedStaffForHistory.role}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        selectedStaffForHistory.status === "active"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-gray-100 text-gray-600 border-gray-300"
                      }`}
                    >
                      {selectedStaffForHistory.status || "active"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600 flex-wrap">
                    {selectedStaffForHistory.phone && (
                      <span className="flex items-center gap-1 font-bold">
                        <span>📞</span> {selectedStaffForHistory.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-medium">
                      <span>⏰ Shift:</span>{" "}
                      <strong className="text-gray-900 font-extrabold">
                        {selectedStaffForHistory.shiftTiming || selectedStaffForHistory.shift || "Morning Shift"}
                      </strong>
                    </span>
                    {selectedStaffForHistory.salaryAmount ? (
                      <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        ₹{Number(selectedStaffForHistory.salaryAmount).toLocaleString()} /{" "}
                        {selectedStaffForHistory.salaryType === "daily_wage" ? "day" : "month"}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowStaffHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-gray-900 flex items-center justify-center text-sm font-bold shadow-xs transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Scrollable Area */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              
              {/* Top 4 KPI Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-orange-50/70 rounded-2xl border border-orange-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-800 block">
                    Working Days Logged
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-gray-900 font-mono">
                      {staffHistorySummary?.totalWorkingDays ?? filteredStaffHistory.length}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">days</span>
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 block">
                    Total Hours Logged
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-blue-950 font-mono">
                      {staffHistorySummary?.totalHoursWorked ?? "0"}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">hrs</span>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                    Punctual / Late
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-lg font-black text-emerald-700 font-mono">
                      {staffHistorySummary?.presentDays ?? filteredStaffHistory.filter((r) => r.status === "present").length}✓
                    </span>
                    <span className="text-xs text-gray-300">/</span>
                    <span className="text-lg font-black text-amber-700 font-mono">
                      {staffHistorySummary?.lateDays ?? filteredStaffHistory.filter((r) => r.status === "late").length}⚠️
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">late</span>
                  </div>
                </div>

                <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 block">
                    Meals Handled
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-purple-950 font-mono">
                      {filteredStaffHistory.reduce((sum, r) => sum + (r.mealsServedDuringShift || 0), 0) ||
                        selectedStaffForHistory.mealsServedCount ||
                        0}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">served</span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50/80 p-3 rounded-2xl border border-gray-200/80">
                
                {/* Month Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-600 whitespace-nowrap">
                    📅 Filter Month:
                  </span>
                  <select
                    value={historyMonthFilter}
                    onChange={(e) => setHistoryMonthFilter(e.target.value)}
                    className="p-1.5 px-2.5 text-xs bg-white border border-gray-300 rounded-xl font-bold text-gray-800 shadow-2xs"
                  >
                    <option value="all">All Working Days (All Time)</option>
                    {availableHistoryMonths.map((ym) => (
                      <option key={ym} value={ym}>
                        {formatMonthName(ym)} ({ym})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {import.meta.env.DEV && staffHistoryRecords.length === 0 && (
                    <button
                      type="button"
                      onClick={handleSeedSampleAttendance}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-2xs disabled:opacity-50"
                      title="Seed 12 days sample attendance history (Dev Only)"
                    >
                      <span>🌱</span>
                      <span>Seed Demo Data</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggleAttendance(selectedStaffForHistory)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1 shadow-xs disabled:opacity-50"
                    title="Toggle today's check-in or clock-out"
                  >
                    <span>⏱️</span>
                    <span>Clock In / Out Today</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowManualAttendanceForm(!showManualAttendanceForm)}
                    className={`px-3 py-1.5 text-xs font-black rounded-xl transition flex items-center gap-1 shadow-2xs ${
                      showManualAttendanceForm
                        ? "bg-gray-800 text-white"
                        : "bg-orange-600 hover:bg-orange-700 text-white"
                    }`}
                  >
                    <span>{showManualAttendanceForm ? "✕ Close Form" : "✏️ + Log / Adjust Day"}</span>
                  </button>
                </div>
              </div>

              {/* Manual Working Day Entry & Adjustment Form */}
              {showManualAttendanceForm && (
                <form
                  onSubmit={handleSaveManualAttendance}
                  className="p-4 sm:p-5 bg-gradient-to-br from-orange-50/80 to-amber-50/50 rounded-2xl border border-orange-200 space-y-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-orange-950 flex items-center gap-1.5">
                      <span>✏️</span> Log or Adjust Working Day Record
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold">
                      Add missed check-in times or adjust past shifts
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                        Working Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                        className="w-full p-2 text-xs bg-white border border-gray-300 rounded-xl font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                        Shift Window
                      </label>
                      <input
                        type="text"
                        value={manualShift}
                        onChange={(e) => setManualShift(e.target.value)}
                        placeholder="e.g. 07:00 AM – 03:00 PM"
                        className="w-full p-2 text-xs bg-white border border-gray-300 rounded-xl font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                        Check-In Time
                      </label>
                      <input
                        type="time"
                        value={manualCheckIn}
                        onChange={(e) => setManualCheckIn(e.target.value)}
                        className="w-full p-2 text-xs bg-white border border-gray-300 rounded-xl font-bold font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                        Check-Out Time
                      </label>
                      <input
                        type="time"
                        value={manualCheckOut}
                        onChange={(e) => setManualCheckOut(e.target.value)}
                        className="w-full p-2 text-xs bg-white border border-gray-300 rounded-xl font-bold font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                        Attendance Status
                      </label>
                      <select
                        value={manualStatus}
                        onChange={(e) => setManualStatus(e.target.value)}
                        className="w-full p-2 text-xs bg-white border border-gray-300 rounded-xl font-bold"
                      >
                        <option value="present">✓ Present (On Time)</option>
                        <option value="late">⚠️ Late (Delayed Arrival)</option>
                        <option value="half_day">🌓 Half Day</option>
                        <option value="absent">✕ Absent</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                        Remarks / Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={manualNotes}
                        onChange={(e) => setManualNotes(e.target.value)}
                        placeholder="e.g. Worked evening rush overtime, lunch counter"
                        className="w-full p-2 text-xs bg-white border border-gray-300 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowManualAttendanceForm(false)}
                      className="px-3.5 py-1.5 text-xs font-bold text-gray-600 bg-white hover:bg-gray-100 rounded-xl border border-gray-200 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-1.5 text-xs font-black uppercase tracking-wider text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs transition disabled:opacity-50"
                    >
                      {actionLoading ? "Saving..." : "Save Working Day Entry ✨"}
                    </button>
                  </div>
                </form>
              )}

              {/* Working Days & Times History Table */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
                <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-gray-700">
                    Working Days Ledger ({filteredStaffHistory.length} Records)
                  </span>
                  <span className="text-[10px] text-gray-500 font-bold">
                    Sorted by newest working date first
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[46vh]">
                  {staffHistoryLoading ? (
                    <div className="py-12 text-center text-xs text-gray-400">
                      Loading staff attendance history...
                    </div>
                  ) : filteredStaffHistory.length === 0 ? (
                    <div className="py-12 text-center space-y-2">
                      <span className="text-3xl">📅</span>
                      <p className="text-xs font-bold text-gray-700">No working records for this period</p>
                      <p className="text-[11px] text-gray-400">
                        Use the "Log / Adjust Day" button above to record working hours for {selectedStaffForHistory.name}.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50/60 sticky top-0 border-b border-gray-100 text-[10px] font-black uppercase text-gray-400">
                        <tr>
                          <th className="py-3 px-3">Working Date</th>
                          <th className="py-3 px-3">Shift Window</th>
                          <th className="py-3 px-3">In-Time</th>
                          <th className="py-3 px-3">Out-Time</th>
                          <th className="py-3 px-3">Duration</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3 text-right">Meals Served</th>
                          <th className="py-3 px-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredStaffHistory.map((rec) => {
                          const duration = calculateDuration(rec.checkInTime, rec.checkOutTime);
                          const isLate = rec.status === "late";
                          const isHalf = rec.status === "half_day";
                          const isAbsent = rec.status === "absent";

                          return (
                            <tr key={rec._id || rec.id || `${rec.date}-${rec.checkInTime}`} className="hover:bg-orange-50/30 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                                {formatDateWithDay(rec.date)}
                              </td>
                              <td className="py-2.5 px-3 text-gray-600 truncate max-w-[160px]">
                                {rec.shift || "Regular Shift"}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-gray-800 whitespace-nowrap">
                                {formatTimeOnly(rec.checkInTime)}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-gray-800 whitespace-nowrap">
                                {rec.checkOutTime ? (
                                  formatTimeOnly(rec.checkOutTime)
                                ) : (
                                  <span className="text-emerald-700 font-black animate-pulse">Active Now 🟢</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="font-mono font-black px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-[11px]">
                                  {duration}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full border ${
                                    isAbsent
                                      ? "bg-red-50 text-red-800 border-red-200"
                                      : isLate
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : isHalf
                                      ? "bg-blue-50 text-blue-800 border-blue-200"
                                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  }`}
                                >
                                  {isAbsent ? "✕ Absent" : isLate ? "⚠️ Late" : isHalf ? "🌓 Half Day" : "✓ Present"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-800">
                                {rec.mealsServedDuringShift ?? 0}
                              </td>
                              <td className="py-2.5 px-3 text-gray-500 italic truncate max-w-[180px]">
                                {rec.notes || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-bold">
                Showing all registered working days & timestamps for <strong>{selectedStaffForHistory.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowStaffHistoryModal(false)}
                className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition"
              >
                Close Ledger
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
