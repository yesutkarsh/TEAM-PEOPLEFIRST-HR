import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { attendanceRecords } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
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
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!employeeId || !from || !to) {
      return NextResponse.json({ data: null, error: { message: "employeeId, from, and to are required" } }, { status: 400, headers: corsHeaders() });
    }

    const records = await db.query.attendanceRecords.findMany({
      where: and(
        eq(attendanceRecords.tenantId, payload.tenantId),
        eq(attendanceRecords.employeeId, employeeId),
        gte(attendanceRecords.date, from),
        lte(attendanceRecords.date, to)
      ),
    });

    const summary = {
      totalDays: records.length,
      present: 0,
      late: 0,
      halfDay: 0,
      absent: 0,
      onLeave: 0,
      weekOff: 0,
      holiday: 0,
      notMarked: 0,
      workedMinutes: 0,
      avgWorkedMinutes: 0,
      overtimeMinutes: 0,
      attendancePct: 0,
    };

    records.forEach((r) => {
      summary.workedMinutes += r.workedMinutes;
      summary.overtimeMinutes += r.overtimeMinutes;

      switch (r.status) {
        case "present":
          summary.present++;
          break;
        case "late":
          summary.late++;
          break;
        case "half_day":
          summary.halfDay++;
          break;
        case "absent":
          summary.absent++;
          break;
        case "on_leave":
          summary.onLeave++;
          break;
        case "week_off":
          summary.weekOff++;
          break;
        case "holiday":
          summary.holiday++;
          break;
        default:
          summary.notMarked++;
          break;
      }
    });

    const activeWorkingDays = summary.present + summary.late + summary.halfDay + summary.absent + summary.notMarked;
    const attendedDays = summary.present + summary.late + summary.halfDay;

    summary.avgWorkedMinutes = attendedDays > 0 ? Math.round(summary.workedMinutes / attendedDays) : 0;
    summary.attendancePct = activeWorkingDays > 0 ? Math.round((attendedDays / activeWorkingDays) * 100) : 100;

    return NextResponse.json({ data: summary, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error calculating attendance summary:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
