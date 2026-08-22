import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { payrollEntries, employees } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json({ data: null, error: { message: "employeeId is required" } }, { status: 400, headers: corsHeaders() });
    }

    // Fetch entries for this employee where payslip is generated
    const entries = await db.query.payrollEntries.findMany({
      where: and(
        eq(payrollEntries.tenantId, payload.tenantId),
        eq(payrollEntries.employeeId, employeeId),
        eq(payrollEntries.payslipGenerated, true)
      ),
    });

    const payslips = [];
    for (const entry of entries) {
      // Find employee details to populate designation
      const employee = await db.query.employees.findFirst({
        where: (e, { eq }) => eq(e.id, employeeId),
      });

      // Get run info to verify month and year
      const run = await db.query.payrollRuns.findFirst({
        where: (pr, { eq }) => eq(pr.id, entry.runId),
      });

      if (!run) continue;

      payslips.push({
        id: `ps_${entry.id}`,
        entryId: entry.id,
        employeeId: entry.employeeId,
        runId: entry.runId,
        month: run.month,
        year: run.year,
        employeeName: entry.employeeName,
        employeeCode: entry.employeeCode,
        designation: "Employee", // default designation or fetch from designation id
        department: "Operations", // fetch from department id
        dateOfJoining: employee?.dateOfJoining || undefined,
        panNumber: employee?.panNumber || undefined,
        bankName: entry.bankName || undefined,
        bankAccountNumber: entry.bankAccountNumber || undefined,
        earnings: entry.earnings,
        deductions: entry.deductions,
        employerContribs: entry.employerContribs,
        grossEarnings: entry.grossEarnings,
        totalDeductions: entry.totalDeductions,
        netPay: entry.netPay,
        ytdGross: entry.ytdGross,
        ytdDeductions: entry.ytdDeductions,
        ytdNetPay: entry.ytdNetPay,
        generatedAt: run.finalisedAt || new Date().toISOString(),
      });
    }

    return NextResponse.json({ data: payslips, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error fetching payslips:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
