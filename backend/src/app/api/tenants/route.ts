import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { tenants, departments, designations, shifts, workCalendars, attendanceSettings, leaveTypes, leavePolicies, leavePolicyAllocations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { uid } from "@/lib/utils";
import { corsHeaders, handleOptions } from "@/lib/auth";

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { settings, theme } = body;

    if (!settings || !settings.hrContactEmail) {
      return NextResponse.json({ data: null, error: { message: "Contact email is required" } }, { status: 400, headers: corsHeaders() });
    }

    // Check if workspace contact email already exists
    const existing = await db.query.tenants.findFirst({
      where: (t, { eq }) => eq(t.domain, settings.domain),
    });

    if (existing) {
      return NextResponse.json({ data: null, error: { message: "A workspace with this domain already exists." } }, { status: 400, headers: corsHeaders() });
    }

    const tenantId = uid("tn_");
    const newTenant = {
      id: tenantId,
      name: settings.companyName,
      domain: settings.domain,
      settings,
      theme,
    };

    // Insert tenant
    await db.insert(tenants).values(newTenant);

    // Bootstrap default structures for this tenant:
    // 1. Departments
    const deptPplId = `d_ppl_${tenantId}`;
    const deptEngId = `d_eng_${tenantId}`;
    const deptDesId = `d_des_${tenantId}`;
    const deptSalId = `d_sal_${tenantId}`;
    
    await db.insert(departments).values([
      { id: deptPplId, tenantId, name: "People Operations", parentId: null, headName: "Jordan Reyes", employeeCount: 1 },
      { id: deptEngId, tenantId, name: "Engineering", parentId: null, headName: "Maya Singh", employeeCount: 0 },
      { id: deptDesId, tenantId, name: "Design", parentId: null, headName: "Theo Park", employeeCount: 0 },
      { id: deptSalId, tenantId, name: "Sales", parentId: null, headName: "Riley Chen", employeeCount: 0 },
    ]);

    // 2. Designations
    const desigAeId = `g_ae_${tenantId}`;
    await db.insert(designations).values([
      { id: `g_sse_${tenantId}`, tenantId, name: "Senior Software Engineer", grade: "L4", departmentIds: [deptEngId], employeeCount: 0 },
      { id: `g_se_${tenantId}`, tenantId, name: "Software Engineer", grade: "L3", departmentIds: [deptEngId], employeeCount: 0 },
      { id: `g_pd_${tenantId}`, tenantId, name: "Product Designer", grade: "L3", departmentIds: [deptDesId], employeeCount: 0 },
      { id: desigAeId, tenantId, name: "Account Executive", grade: "Band 2", departmentIds: [deptSalId], employeeCount: 0 },
    ]);

    // 3. Shifts
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

    // 4. Work Calendar
    await db.insert(workCalendars).values({
      id: uid("wc_"),
      tenantId,
      workingDays: [1, 2, 3, 4, 5],
    });

    // 5. Attendance Settings
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

    // 6. Seed default Leave Types & Policies
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

    return NextResponse.json({ data: newTenant, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error creating tenant:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ data: null, error: { message: "Email parameter is required" } }, { status: 400, headers: corsHeaders() });
    }

    const tenant = await db.query.tenants.findFirst({
      where: (t, { sql }) => sql`settings->>'hrContactEmail' = ${email}`,
    });

    if (!tenant) {
      return NextResponse.json({ data: null, error: { message: "Workspace not found" } }, { status: 404, headers: corsHeaders() });
    }

    return NextResponse.json({ data: tenant, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error looking up tenant:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
