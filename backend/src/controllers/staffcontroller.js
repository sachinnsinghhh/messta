const Staff = require("../models/Staff");
const StaffAttendance = require("../models/StaffAttendance");
const Order = require("../models/order");
const Mess = require("../models/mess");
const mongoose = require("mongoose");

// Role presets with default permissions & titles
const ROLE_PRESETS = {
  head_chef: {
    roleTitle: "Head Chef / Kitchen Manager",
    shiftTiming: "06:30 AM – 03:00 PM (Kitchen Prep & Production)",
    salaryAmount: 24000,
    salaryType: "monthly",
    permissions: {
      canScanQR: false,
      canManageInventory: true,
      canManageMeals: true,
      canViewFinance: false,
      canManageStaff: false,
      canEditOutlet: false,
    },
  },
  counter_operator: {
    roleTitle: "Counter Operator / Cashier",
    shiftTiming: "11:00 AM – 03:00 PM & 06:30 PM – 10:30 PM (Peak Meal Rush)",
    salaryAmount: 16000,
    salaryType: "monthly",
    permissions: {
      canScanQR: true,
      canManageInventory: false,
      canManageMeals: false,
      canViewFinance: false,
      canManageStaff: false,
      canEditOutlet: false,
    },
  },
  delivery_staff: {
    roleTitle: "Doorstep & Tiffin Delivery Partner",
    shiftTiming: "11:30 AM – 02:00 PM & 07:30 PM – 09:30 PM (Delivery Dispatch)",
    salaryAmount: 500,
    salaryType: "daily_wage",
    permissions: {
      canScanQR: true,
      canManageInventory: false,
      canManageMeals: false,
      canViewFinance: false,
      canManageStaff: false,
      canEditOutlet: false,
    },
  },
  kitchen_helper: {
    roleTitle: "Kitchen Assistant / Line Cook",
    shiftTiming: "07:00 AM – 03:30 PM (Chopping, Cleaning & Stocking)",
    salaryAmount: 13000,
    salaryType: "monthly",
    permissions: {
      canScanQR: false,
      canManageInventory: true,
      canManageMeals: false,
      canViewFinance: false,
      canManageStaff: false,
      canEditOutlet: false,
    },
  },
  admin: {
    roleTitle: "Mess Administrator / Co-Owner",
    shiftTiming: "Full Day Operational Oversight",
    salaryAmount: 32000,
    salaryType: "monthly",
    permissions: {
      canScanQR: true,
      canManageInventory: true,
      canManageMeals: true,
      canViewFinance: true,
      canManageStaff: true,
      canEditOutlet: true,
    },
  },
};

// @desc    Get all staff members for a mess outlet
// @route   GET /api/staff/mess/:messId
exports.getStaffByMess = async (req, res) => {
  try {
    const { messId } = req.params;
    if (!messId || !mongoose.Types.ObjectId.isValid(messId)) {
      return res.status(400).json({ success: false, message: "Valid Mess ID is required" });
    }

    let staffMembers = await Staff.find({ messId }).sort({ createdAt: -1 });

    // If outlet has no staff yet, auto-seed starter team for immediate usability
    if (staffMembers.length === 0) {
      const defaultStaff = [
        {
          messId,
          name: "Ramesh Sharma",
          phone: "+91 98234 56781",
          email: "ramesh.chef@messta.com",
          role: "head_chef",
          roleTitle: ROLE_PRESETS.head_chef.roleTitle,
          pin: "1122",
          shift: "morning",
          shiftTiming: ROLE_PRESETS.head_chef.shiftTiming,
          salaryType: "monthly",
          salaryAmount: 26000,
          status: "active",
          permissions: ROLE_PRESETS.head_chef.permissions,
          mealsServedCount: 142,
          todayMealsServed: 18,
        },
        {
          messId,
          name: "Amit Patel",
          phone: "+91 97123 45672",
          email: "amit.counter@messta.com",
          role: "counter_operator",
          roleTitle: ROLE_PRESETS.counter_operator.roleTitle,
          pin: "2233",
          shift: "morning",
          shiftTiming: "07:00 AM – 02:30 PM (Morning & Lunch Service)",
          salaryType: "monthly",
          salaryAmount: 17000,
          status: "active",
          permissions: ROLE_PRESETS.counter_operator.permissions,
          mealsServedCount: 389,
          todayMealsServed: 34,
        },
        {
          messId,
          name: "Suresh Kumar",
          phone: "+91 96543 21890",
          email: "suresh.counter@messta.com",
          role: "counter_operator",
          roleTitle: "Evening Counter Cashier",
          pin: "3344",
          shift: "evening",
          shiftTiming: "04:30 PM – 10:30 PM (Dinner & Snacks Service)",
          salaryType: "monthly",
          salaryAmount: 16500,
          status: "active",
          permissions: ROLE_PRESETS.counter_operator.permissions,
          mealsServedCount: 295,
          todayMealsServed: 27,
        },
        {
          messId,
          name: "Vikram Das",
          phone: "+91 95432 10987",
          email: "vikram.delivery@messta.com",
          role: "delivery_staff",
          roleTitle: ROLE_PRESETS.delivery_staff.roleTitle,
          pin: "4455",
          shift: "fullday",
          shiftTiming: ROLE_PRESETS.delivery_staff.shiftTiming,
          salaryType: "daily_wage",
          salaryAmount: 600,
          status: "active",
          permissions: ROLE_PRESETS.delivery_staff.permissions,
          mealsServedCount: 88,
          todayMealsServed: 12,
        },
      ];

      staffMembers = await Staff.insertMany(defaultStaff);
    }

    return res.status(200).json({
      success: true,
      count: staffMembers.length,
      data: staffMembers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching mess staff",
      error: error.message,
    });
  }
};

// @desc    Create a new staff member
// @route   POST /api/staff
exports.createStaff = async (req, res) => {
  try {
    const {
      messId,
      name,
      phone,
      email,
      role = "counter_operator",
      roleTitle,
      pin,
      shift = "morning",
      shiftTiming,
      salaryType,
      salaryAmount,
      permissions,
    } = req.body;

    if (!messId || !name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Mess ID, staff name, and phone number are required.",
      });
    }

    const preset = ROLE_PRESETS[role] || ROLE_PRESETS.counter_operator;

    const newStaff = new Staff({
      messId,
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : "",
      role,
      roleTitle: roleTitle || preset.roleTitle,
      pin: pin ? pin.trim() : "1234",
      shift,
      shiftTiming: shiftTiming || preset.shiftTiming,
      salaryType: salaryType || preset.salaryType,
      salaryAmount: Number(salaryAmount ?? preset.salaryAmount),
      status: "active",
      permissions: permissions || preset.permissions,
    });

    const savedStaff = await newStaff.save();

    return res.status(201).json({
      success: true,
      message: `Staff member "${savedStaff.name}" added successfully.`,
      data: savedStaff,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error creating staff member",
      error: error.message,
    });
  }
};

// @desc    Update staff member details / permissions / wage
// @route   PUT /api/staff/:id
exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findById(id);

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found." });
    }

    const allowedUpdates = [
      "name",
      "phone",
      "email",
      "role",
      "roleTitle",
      "pin",
      "shift",
      "shiftTiming",
      "salaryType",
      "salaryAmount",
      "status",
      "permissions",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        staff[field] = req.body[field];
      }
    });

    staff.lastActiveAt = new Date();
    const updated = await staff.save();

    return res.status(200).json({
      success: true,
      message: "Staff member updated successfully.",
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error updating staff member",
      error: error.message,
    });
  }
};

// @desc    Delete a staff member
// @route   DELETE /api/staff/:id
exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findByIdAndDelete(id);

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found." });
    }

    return res.status(200).json({
      success: true,
      message: `Staff member "${staff.name}" removed from directory.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error deleting staff member",
      error: error.message,
    });
  }
};

// @desc    Verify 4-digit staff PIN for rapid counter shift login/switch
// @route   POST /api/staff/verify-pin
exports.verifyStaffPin = async (req, res) => {
  try {
    const { messId, pin } = req.body;
    if (!messId || !pin) {
      return res.status(400).json({
        success: false,
        message: "Mess ID and 4-digit PIN are required.",
      });
    }

    const staff = await Staff.findOne({
      messId,
      pin: String(pin).trim(),
      status: "active",
    });

    if (!staff) {
      return res.status(401).json({
        success: false,
        message: "Invalid Staff PIN. No active personnel matched.",
      });
    }

    staff.lastActiveAt = new Date();
    await staff.save();

    return res.status(200).json({
      success: true,
      message: `Operator verified: ${staff.name}`,
      data: staff,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error verifying staff PIN",
      error: error.message,
    });
  }
};

// @desc    Log / Toggle / Edit staff attendance (Check-in / Check-out / Manual Entry)
// @route   POST /api/staff/:id/attendance
exports.logAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status = "present",
      shift,
      notes,
      date,
      checkInTime,
      checkOutTime,
      mealsServedDuringShift,
    } = req.body;

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found." });
    }

    const targetDate = date || new Date().toISOString().split("T")[0];

    let attendance = await StaffAttendance.findOne({
      staffId: id,
      date: targetDate,
    });

    if (attendance) {
      // If manual times are provided
      if (checkInTime) attendance.checkInTime = new Date(checkInTime);
      if (checkOutTime !== undefined) {
        attendance.checkOutTime = checkOutTime ? new Date(checkOutTime) : null;
      } else if (!attendance.checkOutTime && !checkInTime) {
        // Toggle check-out for today
        attendance.checkOutTime = new Date();
      }

      if (status) attendance.status = status;
      if (shift) attendance.shift = shift;
      if (notes !== undefined) attendance.notes = notes;
      if (mealsServedDuringShift !== undefined) {
        attendance.mealsServedDuringShift = Number(mealsServedDuringShift);
      }
      await attendance.save();
    } else {
      // Create new working day record
      const inTime = checkInTime ? new Date(checkInTime) : new Date();
      const outTime = checkOutTime ? new Date(checkOutTime) : null;

      attendance = new StaffAttendance({
        messId: staff.messId,
        staffId: staff._id,
        staffName: staff.name,
        date: targetDate,
        shift: shift || staff.shiftTiming || staff.shift,
        status,
        checkInTime: inTime,
        checkOutTime: outTime,
        wagesEarned: staff.salaryType === "daily_wage" ? staff.salaryAmount : 0,
        mealsServedDuringShift: Number(mealsServedDuringShift) || 0,
        notes: notes || "",
      });
      await attendance.save();
    }

    return res.status(200).json({
      success: true,
      message: `Attendance updated for ${staff.name} on ${targetDate}`,
      data: attendance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error logging attendance",
      error: error.message,
    });
  }
};

// @desc    Get attendance records for a mess outlet with filters & search
// @route   GET /api/staff/mess/:messId/attendance
exports.getAttendanceHistory = async (req, res) => {
  try {
    const { messId } = req.params;
    const { date, staffId, status, search, limit = 500 } = req.query;

    const query = { messId };
    if (date) query.date = date;
    if (staffId) query.staffId = staffId;
    if (status && status !== "all") query.status = status;
    if (search && search.trim()) {
      query.$or = [
        { staffName: { $regex: new RegExp(search.trim(), "i") } },
        { shift: { $regex: new RegExp(search.trim(), "i") } },
        { notes: { $regex: new RegExp(search.trim(), "i") } },
      ];
    }

    const records = await StaffAttendance.find(query)
      .sort({ date: -1, checkInTime: -1 })
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching attendance records",
      error: error.message,
    });
  }
};

// @desc    Get full working day and time attendance history for a single staff member
// @route   GET /api/staff/:id/attendance
exports.getStaffMemberAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { month } = req.query;

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found." });
    }

    const query = { staffId: id };
    if (month && month !== "all") {
      query.date = { $regex: new RegExp(`^${month}`) }; // e.g. "2026-10"
    }

    const records = await StaffAttendance.find(query)
      .sort({ date: -1, checkInTime: -1 });

    // Compute comprehensive stats for this staff member
    const totalWorkingDays = records.length;
    const presentDays = records.filter((r) => r.status === "present").length;
    const lateDays = records.filter((r) => r.status === "late").length;
    const halfDays = records.filter((r) => r.status === "half_day").length;
    const absentDays = records.filter((r) => r.status === "absent").length;

    let totalMinutesWorked = 0;
    records.forEach((r) => {
      if (r.checkInTime && r.checkOutTime) {
        const diffMs = Math.max(0, new Date(r.checkOutTime).getTime() - new Date(r.checkInTime).getTime());
        totalMinutesWorked += Math.round(diffMs / (1000 * 60));
      }
    });

    const totalHoursWorked = (totalMinutesWorked / 60).toFixed(1);
    const avgHoursPerDay = totalWorkingDays > 0 ? (totalMinutesWorked / totalWorkingDays / 60).toFixed(1) : "0";

    return res.status(200).json({
      success: true,
      count: records.length,
      staff: {
        id: staff._id,
        name: staff.name,
        role: staff.role,
        roleTitle: staff.roleTitle,
        phone: staff.phone,
        email: staff.email,
        shift: staff.shift,
        shiftTiming: staff.shiftTiming,
        salaryType: staff.salaryType,
        salaryAmount: staff.salaryAmount,
        joiningDate: staff.joiningDate,
      },
      summary: {
        totalWorkingDays,
        presentDays,
        lateDays,
        halfDays,
        absentDays,
        totalHoursWorked,
        avgHoursPerDay,
        totalMinutesWorked,
      },
      data: records,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching staff attendance history",
      error: error.message,
    });
  }
};

// @desc    Seed sample 14-day realistic attendance records for outlet staff
// @route   POST /api/staff/mess/:messId/seed-attendance
exports.seedSampleAttendance = async (req, res) => {
  try {
    const { messId } = req.params;
    const staffMembers = await Staff.find({ messId });
    if (staffMembers.length === 0) {
      return res.status(400).json({ success: false, message: "No staff members found for this mess." });
    }

    const now = new Date();
    let seededCount = 0;

    for (const staff of staffMembers) {
      // Seed past 12 days of attendance
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split("T")[0];

        // Skip Sundays
        if (d.getDay() === 0) continue;

        const exists = await StaffAttendance.findOne({ staffId: staff._id, date: dateStr });
        if (!exists) {
          const isMorning = staff.shift === "morning";
          const inHour = isMorning ? (i === 3 ? 7 : 6) : 16;
          const inMin = isMorning ? (i === 3 ? 20 : 45 + (i % 10)) : 30 + (i % 10);
          const outHour = isMorning ? 14 : 22;
          const outMin = 30 + (i % 15);

          const checkIn = new Date(d);
          checkIn.setHours(inHour, inMin, 0, 0);

          let checkOut = null;
          // If it's today (i === 0), leave checkOut null if shift is active
          if (i > 0) {
            checkOut = new Date(d);
            checkOut.setHours(outHour, outMin, 0, 0);
          }

          const status = i === 3 ? "late" : i === 7 ? "half_day" : "present";
          const meals = 25 + (i * 3);

          await StaffAttendance.create({
            messId,
            staffId: staff._id,
            staffName: staff.name,
            date: dateStr,
            shift: staff.shiftTiming || staff.shift,
            status,
            checkInTime: checkIn,
            checkOutTime: checkOut,
            mealsServedDuringShift: meals,
            wagesEarned: staff.salaryType === "daily_wage" ? staff.salaryAmount : 0,
            notes: i === 3 ? "15 mins late due to traffic" : i === 7 ? "Half day approved by owner" : "Regular full shift",
          });
          seededCount++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Seeded ${seededCount} attendance logs across ${staffMembers.length} staff personnel!`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get live audit trail of meal redemptions attributed to staff
// @route   GET /api/staff/mess/:messId/audit-trail
exports.getStaffAuditTrail = async (req, res) => {
  try {
    const { messId } = req.params;

    const query = {
      messId,
      tokenStatus: "redeemed",
    };

    const redemptions = await Order.find(query)
      .sort({ updatedAt: -1, redeemedAt: -1 })
      .limit(50);

    // Group stats by staff name
    const staffStats = {};
    redemptions.forEach((order) => {
      const operator = order.scannedByStaffName || "Counter Desk";
      if (!staffStats[operator]) {
        staffStats[operator] = {
          count: 0,
          totalValue: 0,
          lastActive: order.redeemedAt || order.updatedAt,
        };
      }
      staffStats[operator].count += 1;
      staffStats[operator].totalValue += Number(order.amount || 0);
    });

    return res.status(200).json({
      success: true,
      count: redemptions.length,
      staffSummary: staffStats,
      data: redemptions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching staff audit trail",
      error: error.message,
    });
  }
};

// @desc    Get payroll & staff wage liability summary (Finance integration)
// @route   GET /api/staff/mess/:messId/payroll
exports.getPayrollSummary = async (req, res) => {
  try {
    const { messId } = req.params;
    const staffList = await Staff.find({ messId });

    let totalMonthlySalaries = 0;
    let totalDailyWages = 0;
    let activeStaffCount = 0;

    const roleBreakdown = {};

    staffList.forEach((s) => {
      if (s.status === "active") {
        activeStaffCount += 1;
        if (s.salaryType === "monthly") {
          totalMonthlySalaries += Number(s.salaryAmount || 0);
        } else if (s.salaryType === "daily_wage") {
          // Estimated 26 working days / month
          totalDailyWages += Number(s.salaryAmount || 0) * 26;
        } else {
          totalDailyWages += Number(s.salaryAmount || 0) * 26;
        }

        roleBreakdown[s.role] = (roleBreakdown[s.role] || 0) + 1;
      }
    });

    const projectedMonthlyPayroll = totalMonthlySalaries + totalDailyWages;

    return res.status(200).json({
      success: true,
      data: {
        activeStaffCount,
        totalStaffCount: staffList.length,
        fixedMonthlySalaries: totalMonthlySalaries,
        projectedDailyWages: totalDailyWages,
        projectedMonthlyPayroll,
        roleBreakdown,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error generating payroll summary",
      error: error.message,
    });
  }
};

// @desc    Get all roles (Default presets + Custom roles configured for this outlet)
// @route   GET /api/staff/mess/:messId/roles
exports.getRoles = async (req, res) => {
  try {
    const { messId } = req.params;
    let customRoles = [];

    if (messId && mongoose.Types.ObjectId.isValid(messId)) {
      const mess = await Mess.findById(messId);
      if (mess && mess.customStaffRoles) {
        customRoles = mess.customStaffRoles;
      }
    }

    return res.status(200).json({
      success: true,
      defaultRoles: ROLE_PRESETS,
      customRoles,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching roles",
      error: error.message,
    });
  }
};

// @desc    Add a custom role for a mess outlet (e.g. Desk Job, Table Service, Dishwashing)
// @route   POST /api/staff/mess/:messId/roles
exports.addCustomRole = async (req, res) => {
  try {
    const { messId } = req.params;
    const {
      name,
      icon = "💼",
      description = "",
      defaultShift = "General Shift",
      defaultSalary = 15000,
      salaryType = "monthly",
      permissions = {},
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Role name is required (e.g. Desk Job, Table Service, Floor Host).",
      });
    }

    const mess = await Mess.findById(messId);
    if (!mess) {
      return res.status(404).json({ success: false, message: "Mess outlet not found" });
    }

    const roleKey = `role_${name.toLowerCase().trim().replace(/[^a-z0-9]/g, "_")}_${Date.now().toString(36)}`;

    const newRole = {
      id: roleKey,
      name: name.trim(),
      icon: icon.trim() || "💼",
      description: description.trim(),
      defaultShift: defaultShift.trim() || "09:00 AM – 06:00 PM (General Shift)",
      defaultSalary: Number(defaultSalary || 15000),
      salaryType: salaryType || "monthly",
      permissions: {
        canScanQR: Boolean(permissions.canScanQR),
        canManageInventory: Boolean(permissions.canManageInventory),
        canManageMeals: Boolean(permissions.canManageMeals),
        canViewFinance: Boolean(permissions.canViewFinance),
        canManageStaff: Boolean(permissions.canManageStaff),
        canEditOutlet: Boolean(permissions.canEditOutlet),
      },
    };

    if (!mess.customStaffRoles) {
      mess.customStaffRoles = [];
    }

    mess.customStaffRoles.push(newRole);
    await mess.save();

    return res.status(201).json({
      success: true,
      message: `Role "${newRole.name}" created successfully!`,
      data: newRole,
      customRoles: mess.customStaffRoles,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error creating custom role",
      error: error.message,
    });
  }
};

// @desc    Delete a custom role from a mess outlet
// @route   DELETE /api/staff/mess/:messId/roles/:roleId
exports.deleteCustomRole = async (req, res) => {
  try {
    const { messId, roleId } = req.params;

    const mess = await Mess.findById(messId);
    if (!mess) {
      return res.status(404).json({ success: false, message: "Mess outlet not found" });
    }

    if (!mess.customStaffRoles) {
      mess.customStaffRoles = [];
    }

    mess.customStaffRoles = mess.customStaffRoles.filter((r) => r.id !== roleId);
    await mess.save();

    return res.status(200).json({
      success: true,
      message: "Custom role removed successfully.",
      customRoles: mess.customStaffRoles,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error deleting custom role",
      error: error.message,
    });
  }
};

