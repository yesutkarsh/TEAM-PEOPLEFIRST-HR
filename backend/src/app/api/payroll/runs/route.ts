import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { payrollRuns, payrollEntries, employees, employeeSalaries, salaryStructures, salaryStructureComponents, salaryComponents, attendanceRecords } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { uid } from "@/lib/utils";
import { authenticate, corsHeaders, handleOptions } from "@/lib/auth";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request) {
  try {
    const payload = authenticate(req);
    if (!payload) {
      return NextResponse.json({ data: null, error: { message: "Unauthorized" } }, { status: 401, headers: corsHeaders() });
    }

    const list = await db.query.payrollRuns.findMany({
      where: (pr, { eq }) => eq(pr.tenantId, payload.tenantId),
      orderBy: (pr, { desc }) => [desc(pr.year), desc(pr.month)],
    });

    return NextResponse.json({ data: list, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error fetching payroll runs:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}

export async function POST(req: Request) {
  try {
    const payload = authenticate(req);
    if (!payload) {
      return NextResponse.json({ data: null, error: { message: "Unauthorized" } }, { status: 401, headers: corsHeaders() });
    }

    const body = await req.json();
    const { month, year } = body;

    if (!month || !year) {
      return NextResponse.json({ data: null, error: { message: "Month and year are required" } }, { status: 400, headers: corsHeaders() });
    }

    // Check if a run already exists for this month/year
    const existing = await db.query.payrollRuns.findFirst({
      where: and(
        eq(payrollRuns.tenantId, payload.tenantId),
        eq(payrollRuns.month, month),
        eq(payrollRuns.year, year)
      ),
    });

    if (existing) {
      return NextResponse.json({ data: null, error: { message: `Payroll run for ${month}/${year} already exists.` } }, { status: 400, headers: corsHeaders() });
    }

    const runId = uid("prun_");
    
    // 1. Fetch active employees of the tenant
    const emps = await db.query.employees.findMany({
      where: (e, { eq, and }) => and(eq(e.tenantId, payload.tenantId), eq(e.employmentStatus, "active")),
    });

    if (emps.length === 0) {
      return NextResponse.json({ data: null, error: { message: "No active employees found to process payroll." } }, { status: 400, headers: corsHeaders() });
    }

    // Fetch salary structures and components
    const structures = await db.query.salaryStructures.findMany({
      where: (ss, { eq }) => eq(ss.tenantId, payload.tenantId),
    });
    const defaultStruct = structures.find((s) => s.isDefault) || structures[0];

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;
    let totalEmployerCost = 0;

    const entriesToInsert = [];

    for (const emp of emps) {
      // Find employee's salary record
      const salary = await db.query.employeeSalaries.findFirst({
        where: (es, { eq }) => eq(es.employeeId, emp.id),
      });

      const annualCtc = salary?.annualCtc || emp.ctcAnnual || 600000; // default 6L CTC
      const monthlyCtc = annualCtc / 12;

      // Find structure
      const struct = structures.find((s) => s.id === salary?.structureId) || defaultStruct;
      
      // Look up attendance for the month to calculate LOP days
      const daysInMonth = new Date(year, month, 0).getDate();
      const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
      
      const attendance = await db.query.attendanceRecords.findMany({
        where: (ar, { eq, and, like }) => and(
          eq(ar.employeeId, emp.id),
          like(ar.date, `${monthPrefix}-%`)
        ),
      });

      const absentCount = attendance.filter((a) => a.status === "absent").length;
      const halfDayCount = attendance.filter((a) => a.status === "half_day").length;
      const lopDays = absentCount + halfDayCount * 0.5;
      const lopAmount = Math.round((monthlyCtc / daysInMonth) * lopDays);

      // Perform standard calculations for basic components:
      // Basic: 50% of CTC
      const basic = Math.round(monthlyCtc * 0.5);
      // HRA: 40% of Basic
      const hra = Math.round(basic * 0.4);
      
      // PF (Statutory Employee): 12% of basic up to ₹15k cap
      const pfBasic = Math.min(basic, 15000);
      const pf = Math.round(pfBasic * 0.12);

      // Professional Tax (Statutory): ₹200 if monthly basic > 15k
      const pt = basic > 15000 ? 200 : 0;

      // Special Allowance (balance)
      const specialAllowance = Math.max(0, Math.round(monthlyCtc - (basic + hra) - lopAmount));

      const gross = basic + hra + specialAllowance;
      const deductionsSum = pf + pt;
      const netPay = gross - deductionsSum;

      totalGross += gross;
      totalDeductions += deductionsSum;
      totalNetPay += netPay;
      totalEmployerCost += monthlyCtc;

      entriesToInsert.push({
        id: uid("pentry_"),
        tenantId: payload.tenantId,
        runId,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        employeeCode: emp.employeeCode,
        departmentId: emp.departmentId,
        structureId: struct?.id || "default",
        structureName: struct?.name || "Standard Salary Structure",
        monthlyCtc,
        annualCtc,
        lopDays,
        lopAmount,
        workingDays: daysInMonth,
        daysWorked: daysInMonth - lopDays,
        grossEarnings: gross,
        totalDeductions: deductionsSum,
        netPay,
        totalCost: monthlyCtc,
        ytdGross: gross,
        ytdDeductions: deductionsSum,
        ytdNetPay: netPay,
        isManuallyEdited: false,
        payslipGenerated: true,
        earnings: [
          { componentId: "basic", componentName: "Basic Salary", componentCode: "BASIC", amount: basic, isManualOverride: false },
          { componentId: "hra", componentName: "House Rent Allowance", componentCode: "HRA", amount: hra, isManualOverride: false },
          { componentId: "special", componentName: "Special Allowance", componentCode: "SPECIAL", amount: specialAllowance, isManualOverride: false },
        ],
        deductions: [
          { componentId: "pf", componentName: "Provident Fund (Employee)", componentCode: "PF_EE", amount: pf, isManualOverride: false },
          { componentId: "pt", componentName: "Professional Tax", componentCode: "PT", amount: pt, isManualOverride: false },
        ],
        employerContribs: [
          { componentId: "pf_er", componentName: "Provident Fund (Employer)", componentCode: "PF_ER", amount: pf, isManualOverride: false },
        ],
        flags: lopDays > 0 ? ["prorated" as const] : [],
        bankName: salary?.bankName || emp.bankName || "HDFC Bank",
        bankAccountNumber: salary?.bankAccountNumber || emp.bankAccountNumber || "XXXXXX",
        bankIfsc: salary?.bankIfsc || emp.bankIfsc || "HDFC00001",
      });
    }

    // 2. Insert run summary
    const run = {
      id: runId,
      tenantId: payload.tenantId,
      month,
      year,
      status: "draft" as const,
      employeeCount: emps.length,
      totalGross,
      totalDeductions,
      totalNetPay,
      totalEmployerCost,
      initiatedBy: payload.fullName,
      initiatedAt: new Date().toISOString(),
      validationIssues: [],
      notes: `Generated draft payroll run for ${month}/${year}`,
      log: [
        {
          id: uid("log_"),
          at: new Date().toISOString(),
          actor: payload.fullName,
          message: "Payroll run initiated as draft.",
        },
      ],
    };

    await db.insert(payrollRuns).values(run);

    // 3. Insert all individual employee entries
    if (entriesToInsert.length > 0) {
      await db.insert(payrollEntries).values(entriesToInsert);
    }

    return NextResponse.json({ data: run, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error creating payroll run:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}

export async function PUT(req: Request) {
  // Update/Finalize payroll run
  try {
    const payload = authenticate(req);
    if (!payload) {
      return NextResponse.json({ data: null, error: { message: "Unauthorized" } }, { status: 401, headers: corsHeaders() });
    }

    const body = await req.json();
    const { id, action } = body; // action is "finalised" or "paid"

    if (!id || !action) {
      return NextResponse.json({ data: null, error: { message: "id and action are required" } }, { status: 400, headers: corsHeaders() });
    }

    const run = await db.query.payrollRuns.findFirst({
      where: (pr, { eq, and }) => and(eq(pr.id, id), eq(pr.tenantId, payload.tenantId)),
    });

    if (!run) {
      return NextResponse.json({ data: null, error: { message: "Payroll run not found" } }, { status: 404, headers: corsHeaders() });
    }

    const updatedLog = [
      ...((run.log as any[]) || []),
      {
        id: uid("log_"),
        at: new Date().toISOString(),
        actor: payload.fullName,
        message: `Payroll status updated to ${action}.`,
      },
    ];

    const updates: Partial<typeof payrollRuns.$inferInsert> = {
      status: action,
      log: updatedLog,
    };

    if (action === "finalised") {
      updates.finalisedBy = payload.fullName;
      updates.finalisedAt = new Date().toISOString();
    } else if (action === "paid") {
      updates.paidAt = new Date().toISOString();
    }

    await db.update(payrollRuns).set(updates).where(eq(payrollRuns.id, id));

    return NextResponse.json({ data: true, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error updating payroll run:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
