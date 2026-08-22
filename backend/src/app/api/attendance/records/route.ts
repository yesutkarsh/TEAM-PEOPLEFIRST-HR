import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { attendanceRecords, employees } from "@/db/schema";
import { eq, and, inArray, gte, lte } from "drizzle-orm";
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

    const { searchParams } = new URL(req.url);
    const employeeIdsStr = searchParams.get("employeeIds"); // comma separated
    const from = searchParams.get("from"); // YYYY-MM-DD
    const to = searchParams.get("to"); // YYYY-MM-DD
    const departmentId = searchParams.get("departmentId");

    const conditions = [eq(attendanceRecords.tenantId, payload.tenantId)];

    if (employeeIdsStr) {
      const employeeIds = employeeIdsStr.split(",");
      conditions.push(inArray(attendanceRecords.employeeId, employeeIds));
    }

    if (from) {
      conditions.push(gte(attendanceRecords.date, from));
    }

    if (to) {
      conditions.push(lte(attendanceRecords.date, to));
    }

    if (departmentId && departmentId !== "all") {
      conditions.push(eq(attendanceRecords.departmentId, departmentId));
    }

    const list = await db.query.attendanceRecords.findMany({
      where: and(...conditions),
      orderBy: (rec, { desc }) => desc(rec.date),
    });

    return NextResponse.json({ data: list, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error fetching attendance records:", error);
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
    
    // We can receive a single record or an array of records (e.g. for bulk import)
    const items = Array.isArray(body) ? body : [body];
    const results = [];

    for (const item of items) {
      const {
        id,
        employeeId,
        date,
        clockIn,
        clockOut,
        breaks,
        status,
        source,
        ip,
        note,
        workedMinutes,
        breakMinutes,
        overtimeMinutes,
        lateMinutes,
        earlyExitMinutes,
      } = item;

      if (!employeeId || !date || !status) {
        continue;
      }

      // Fetch employee name and department
      const employee = await db.query.employees.findFirst({
        where: (emp, { eq }) => eq(emp.id, employeeId),
      });

      if (!employee) continue;

      const recordId = id || `att_${employeeId}_${date}`;

      // Check if record already exists
      const existing = await db.query.attendanceRecords.findFirst({
        where: (rec, { eq, and }) => and(eq(rec.id, recordId), eq(rec.tenantId, payload.tenantId)),
      });

      const values = {
        id: recordId,
        tenantId: payload.tenantId,
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        departmentId: employee.departmentId,
        date,
        shiftId: employee.shiftId || null,
        clockIn: clockIn || null,
        clockOut: clockOut || null,
        breaks: breaks || [],
        workedMinutes: workedMinutes || 0,
        breakMinutes: breakMinutes || 0,
        overtimeMinutes: overtimeMinutes || 0,
        lateMinutes: lateMinutes || 0,
        earlyExitMinutes: earlyExitMinutes || 0,
        status,
        source: source || "manual",
        ip: ip || null,
        note: note || null,
      };

      if (existing) {
        await db.update(attendanceRecords)
          .set(values)
          .where(eq(attendanceRecords.id, recordId));
      } else {
        await db.insert(attendanceRecords).values(values);
      }

      results.push(values);
    }

    return NextResponse.json({ data: Array.isArray(body) ? results : results[0], error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error saving attendance record:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
