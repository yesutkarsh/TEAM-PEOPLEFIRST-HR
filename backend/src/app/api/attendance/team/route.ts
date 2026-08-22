import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { employees, attendanceRecords, departments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { dateKey } from "@/lib/utils";
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
    const date = searchParams.get("date") || dateKey(new Date());

    // 1. Fetch all active employees of the tenant
    const emps = await db.query.employees.findMany({
      where: (emp, { eq, and }) => and(eq(emp.tenantId, payload.tenantId), eq(emp.employmentStatus, "active")),
    });

    // 2. Fetch today's attendance records
    const records = await db.query.attendanceRecords.findMany({
      where: (rec, { eq, and }) => and(eq(rec.tenantId, payload.tenantId), eq(rec.date, date)),
    });

    const recordMap = new Map(records.map((r) => [r.employeeId, r]));

    const teamToday = emps.map((emp) => {
      const rec = recordMap.get(emp.id);
      return {
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        departmentId: emp.departmentId,
        avatarUrl: emp.avatarUrl || null,
        status: rec ? rec.status : "not_marked",
        clockIn: rec ? rec.clockIn : null,
        clockOut: rec ? rec.clockOut : null,
        workedMinutes: rec ? rec.workedMinutes : 0,
        lateMinutes: rec ? rec.lateMinutes : 0,
      };
    });

    return NextResponse.json({ data: teamToday, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error fetching team attendance today:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
