import { NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  tenants,
  users,
  employees,
  departments,
  designations,
  shifts,
  workCalendars,
  attendanceSettings,
  leaveTypes,
  leavePolicies,
  leavePolicyAllocations,
  leaveBalances,
  attendanceRecords,
  leaveRequests,
  regularizationRequests,
  payrollRuns,
  payrollEntries,
} from "@/db/schema";
import { uid, dateKey } from "@/lib/utils";
import { hashPassword, corsHeaders, handleOptions } from "@/lib/auth";

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: Request) {
  try {
    const tenantId = "t_default";
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";

    // 1. Check if already seeded
    const tenantExists = await db.query.tenants.findFirst({
      where: (t, { eq }) => eq(t.id, tenantId),
    });

    if (tenantExists && !force) {
      return NextResponse.json(
        { data: { message: "Database already seeded. Use ?force=true parameter to reset and re-seed." }, error: null },
        { headers: corsHeaders() }
      );
    }

    if (tenantExists && force) {
      // Cascade delete existing tenant and all its relations to reset
      const { eq } = await import("drizzle-orm");
      await db.delete(tenants).where(eq(tenants.id, tenantId));
    }

    // 2. Create Tenant
    const tenantSettings = {
      companyName: "PeopleFirst Corp",
      domain: "peoplefirst",
      industry: "Technology",
      size: "51-200",
      country: "India",
      hrContactName: "Admin",
      hrContactEmail: "admin@example.com",
    };

    const tenantTheme = {
      primary: "#7C3AED",
      primaryForeground: "#FFFFFF",
      accent: "#F3F4F6",
      accentForeground: "#1F2937",
      sidebar: "#1F2937",
      sidebarForeground: "#F9FAFB",
    };

    await db.insert(tenants).values({
      id: tenantId,
      name: tenantSettings.companyName,
      domain: tenantSettings.domain,
      settings: tenantSettings,
      theme: tenantTheme,
    });

    // 3. Create Admin User
    const adminUserId = "u_admin";
    const hashedAdminPassword = await hashPassword("admin123");
    await db.insert(users).values({
      id: adminUserId,
      tenantId,
      fullName: "HR Admin",
      email: "admin@example.com",
      password: hashedAdminPassword,
      role: "hr_admin",
    });

    // 4. Create Departments
    const deptPplId = `d_ppl_${tenantId}`;
    const deptEngId = `d_eng_${tenantId}`;
    const deptDesId = `d_des_${tenantId}`;
    const deptSalId = `d_sal_${tenantId}`;

    await db.insert(departments).values([
      { id: deptPplId, tenantId, name: "People Operations", parentId: null, headName: "Jordan Reyes", employeeCount: 1 },
      { id: deptEngId, tenantId, name: "Engineering", parentId: null, headName: "Maya Singh", employeeCount: 2 },
      { id: deptDesId, tenantId, name: "Design", parentId: null, headName: "Theo Park", employeeCount: 0 },
      { id: deptSalId, tenantId, name: "Sales", parentId: null, headName: "Riley Chen", employeeCount: 1 },
    ]);

    // 5. Create Designations
    const desigAeId = `g_ae_${tenantId}`;
    const desigSseId = `g_sse_${tenantId}`;
    const desigSeId = `g_se_${tenantId}`;

    await db.insert(designations).values([
      { id: desigSseId, tenantId, name: "Senior Software Engineer", grade: "L4", departmentIds: [deptEngId], employeeCount: 1 },
      { id: desigSeId, tenantId, name: "Software Engineer", grade: "L3", departmentIds: [deptEngId], employeeCount: 1 },
      { id: `g_pd_${tenantId}`, tenantId, name: "Product Designer", grade: "L3", departmentIds: [deptDesId], employeeCount: 0 },
      { id: desigAeId, tenantId, name: "Account Executive", grade: "Band 2", departmentIds: [deptSalId], employeeCount: 1 },
    ]);

    // 6. Create Work Calendar & Shifts
    const shiftGenId = `sh_gen_${tenantId}`;
    await db.insert(shifts).values([
      {
        id: shiftGenId,
        tenantId,
        name: "General Shift",
        startTime: "09:30",
        endTime: "18:30",
        breakMinutes: 60,
        days: [1, 2, 3, 4, 5],
        graceMinutes: 15,
      },
    ]);

    await db.insert(workCalendars).values({
      id: uid("wc_"),
      tenantId,
      workingDays: [1, 2, 3, 4, 5],
    });

    await db.insert(attendanceSettings).values({
      id: uid("as_"),
      tenantId,
      captureMode: "web",
      enforceIp: false,
      allowedIps: ["192.168.0.0/16", "10.0.0.0/8"],
      enforceGeo: false,
      lateGraceMinutes: 15,
      halfDayMinutes: 240,
      fullDayMinutes: 480,
      overtimeAfterMinutes: 540,
      autoClockOutTime: "23:30",
      breakTrackingEnabled: true,
      allowRegularization: true,
      regularizationWindowDays: 30,
      maxRegularizationsPerMonth: 3,
    });

    // 7. Seed Leave Types & Policies
    const ltEarnedId = `lt_earned_${tenantId}`;
    const ltSickId = `lt_sick_${tenantId}`;
    const ltCasualId = `lt_casual_${tenantId}`;

    await db.insert(leaveTypes).values([
      { id: ltEarnedId, tenantId, name: "Annual Leave", code: "AL", category: "earned", isPaid: true, applicableGender: "all", allowHalfDay: true, documentRequired: "after_n_days", documentAfterDays: 3, minDaysPerRequest: 1, annualAllocation: 18, carryForwardMax: 10, encashmentAllowed: true, color: "#16A34A" },
      { id: ltSickId, tenantId, name: "Sick Leave", code: "SL", category: "statutory", isPaid: true, applicableGender: "all", allowHalfDay: true, documentRequired: "after_n_days", documentAfterDays: 2, minDaysPerRequest: 0.5, annualAllocation: 12, carryForwardMax: 0, encashmentAllowed: false, color: "#DC2626" },
      { id: ltCasualId, tenantId, name: "Casual Leave", code: "CL", category: "special", isPaid: true, applicableGender: "all", allowHalfDay: true, documentRequired: "never", minDaysPerRequest: 0.5, annualAllocation: 8, carryForwardMax: 0, encashmentAllowed: false, color: "#F59E0B" },
    ]);

    const policyId = uid("pol_");
    await db.insert(leavePolicies).values({
      id: policyId,
      tenantId,
      name: "Standard Leave Policy",
      description: "Default leave allocation policy for full-time employees",
      eligibility: { employmentTypes: ["full_time"] },
      isDefault: true,
    });

    await db.insert(leavePolicyAllocations).values([
      { id: uid("lpa_"), tenantId, policyId, leaveTypeId: ltEarnedId },
      { id: uid("lpa_"), tenantId, policyId, leaveTypeId: ltSickId },
      { id: uid("lpa_"), tenantId, policyId, leaveTypeId: ltCasualId },
    ]);

    // 8. Create Employee profiles
    const welcomeHash = await hashPassword("Welcome123");

    // Employee 1: HR Admin
    const emp1Id = "emp_admin";
    const user1Id = "u_admin_emp";
    await db.insert(users).values({
      id: user1Id,
      tenantId,
      fullName: "Jordan Reyes",
      email: "jordan@example.com",
      password: welcomeHash,
      role: "hr_admin",
    });
    await db.insert(employees).values({
      id: emp1Id,
      tenantId,
      userId: user1Id,
      employeeCode: "EMP001",
      firstName: "Jordan",
      lastName: "Reyes",
      workEmail: "jordan@example.com",
      phone: "9876543210",
      departmentId: deptPplId,
      designationId: desigAeId, // Placeholder designation
      employmentType: "full_time",
      employmentStatus: "active",
      dateOfJoining: "2025-01-15",
      role: "hr_admin",
      profileCompleteness: 85,
    });

    // Employee 2: Engineering Lead
    const emp2Id = "emp_maya";
    const user2Id = "u_maya";
    await db.insert(users).values({
      id: user2Id,
      tenantId,
      fullName: "Maya Singh",
      email: "maya@example.com",
      password: welcomeHash,
      role: "manager",
    });
    await db.insert(employees).values({
      id: emp2Id,
      tenantId,
      userId: user2Id,
      employeeCode: "EMP002",
      firstName: "Maya",
      lastName: "Singh",
      workEmail: "maya@example.com",
      phone: "9876543211",
      departmentId: deptEngId,
      designationId: desigSseId,
      employmentType: "full_time",
      employmentStatus: "active",
      dateOfJoining: "2025-02-01",
      role: "manager",
      profileCompleteness: 90,
    });

    // Employee 3: Software Engineer
    const emp3Id = "emp_alex";
    const user3Id = "u_alex";
    await db.insert(users).values({
      id: user3Id,
      tenantId,
      fullName: "Alex Smith",
      email: "alex@example.com",
      password: welcomeHash,
      role: "employee",
    });
    await db.insert(employees).values({
      id: emp3Id,
      tenantId,
      userId: user3Id,
      employeeCode: "EMP003",
      firstName: "Alex",
      lastName: "Smith",
      workEmail: "alex@example.com",
      phone: "9876543212",
      departmentId: deptEngId,
      designationId: desigSeId,
      employmentType: "full_time",
      employmentStatus: "active",
      dateOfJoining: "2025-03-01",
      role: "employee",
      profileCompleteness: 80,
    });

    // Initialize leave balances for seeded employees
    const empIds = [emp1Id, emp2Id, emp3Id];
    const currentYear = new Date().getFullYear();
    const lTypes = [ltEarnedId, ltSickId, ltCasualId];
    
    for (const eId of empIds) {
      await db.insert(leaveBalances).values([
        { id: uid("bal_"), tenantId, employeeId: eId, leaveTypeId: ltEarnedId, year: currentYear, allocated: 18, accrued: 18, used: 2, pending: 0, carried: 0, available: 16, encashed: 0 },
        { id: uid("bal_"), tenantId, employeeId: eId, leaveTypeId: ltSickId, year: currentYear, allocated: 12, accrued: 12, used: 1, pending: 0, carried: 0, available: 11, encashed: 0 },
        { id: uid("bal_"), tenantId, employeeId: eId, leaveTypeId: ltCasualId, year: currentYear, allocated: 8, accrued: 8, used: 0, pending: 0, carried: 0, available: 8, encashed: 0 },
      ]);
    }

    // 9. Seed 15 days of historical attendance for Alex Smith (EMP003)
    const today = new Date();
    const records = [];
    
    for (let i = 15; i >= 1; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      
      // Skip weekends
      if (d.getDay() === 0 || d.getDay() === 6) continue;

      const dateStr = dateKey(d);
      const recordId = `att_${emp3Id}_${dateStr}`;
      
      // Clock in: 09:15 - 09:40
      const checkInHour = 9;
      const checkInMin = Math.round(15 + Math.random() * 25);
      const inD = new Date(d);
      inD.setHours(checkInHour, checkInMin, 0, 0);

      // Clock out: 18:15 - 18:45
      const checkOutHour = 18;
      const checkOutMin = Math.round(15 + Math.random() * 30);
      const outD = new Date(d);
      outD.setHours(checkOutHour, checkOutMin, 0, 0);

      const workedMinutes = Math.round((outD.getTime() - inD.getTime()) / 60000) - 60; // 1h break

      records.push({
        id: recordId,
        tenantId,
        employeeId: emp3Id,
        employeeName: "Alex Smith",
        departmentId: deptEngId,
        date: dateStr,
        shiftId: shiftGenId,
        shiftName: "General Shift",
        clockIn: inD.toISOString(),
        clockOut: outD.toISOString(),
        breaks: [{ id: uid("brk_"), start: new Date(d.setHours(13, 0)).toISOString(), end: new Date(d.setHours(14, 0)).toISOString() }],
        workedMinutes,
        breakMinutes: 60,
        overtimeMinutes: Math.max(0, workedMinutes - 480),
        lateMinutes: checkInMin > 30 ? checkInMin - 30 : 0, // General shift starts at 09:30
        earlyExitMinutes: 0,
        status: checkInMin > 30 ? "late" : "present",
        source: "web",
        regularized: false,
      });
    }

    if (records.length > 0) {
      await db.insert(attendanceRecords).values(records);
    }

    // 10. Seed a pending regularization request
    await db.insert(regularizationRequests).values({
      id: uid("reg_"),
      tenantId,
      employeeId: emp3Id,
      employeeName: "Alex Smith",
      departmentId: deptEngId,
      date: dateKey(new Date(today.getTime() - 24 * 60 * 60 * 1000)),
      type: "missing_clock_out",
      requestedClockIn: "09:25",
      requestedClockOut: "18:35",
      reason: "Forgot to punch out before leaving the office.",
      status: "pending",
      appliedAt: new Date().toISOString(),
    });

    // 11. Seed a pending leave request
    await db.insert(leaveRequests).values({
      id: uid("lreq_"),
      tenantId,
      employeeId: emp3Id,
      employeeName: "Alex Smith",
      departmentId: deptEngId,
      leaveTypeId: ltEarnedId,
      startDate: dateKey(new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000)),
      endDate: dateKey(new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000)),
      isHalfDay: false,
      workingDays: 2,
      reason: "Family event in hometown.",
      status: "pending",
      appliedAt: new Date().toISOString(),
      twoLevel: false,
    });

    return NextResponse.json(
      {
        data: {
          message: "Database seeded successfully!",
          tenantId,
          adminEmail: "admin@example.com",
          employeePasswords: "Welcome123",
        },
        error: null,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error("Seeding error:", error);
    return NextResponse.json(
      { data: null, error: { message: "Seeding failed", details: error.message } },
      { status: 500, headers: corsHeaders() }
    );
  }
}
