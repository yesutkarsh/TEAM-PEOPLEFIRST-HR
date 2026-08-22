import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { attendanceRecords, employees, shifts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { uid } from "@/lib/utils";
import { authenticate, corsHeaders, handleOptions } from "@/lib/auth";

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: Request) {
  try {
    const payload = authenticate(req);
    if (!payload) {
      return NextResponse.json({ data: null, error: { message: "Unauthorized" } }, { status: 401, headers: corsHeaders() });
    }

    const body = await req.json();
    const { employeeId, action, date, time, location, note, ip } = body;

    if (!employeeId || !action || !date || !time) {
      return NextResponse.json({ data: null, error: { message: "Missing required parameters" } }, { status: 400, headers: corsHeaders() });
    }

    // Get employee details
    const employee = await db.query.employees.findFirst({
      where: (emp, { eq }) => eq(emp.id, employeeId),
    });
    if (!employee) {
      return NextResponse.json({ data: null, error: { message: "Employee not found" } }, { status: 404, headers: corsHeaders() });
    }

    const recordId = `att_${employeeId}_${date}`;
    let record = await db.query.attendanceRecords.findFirst({
      where: (rec, { eq, and }) => and(eq(rec.id, recordId), eq(rec.tenantId, payload.tenantId)),
    });

    const nowIso = time; // Use passed time (ISO string)

    if (action === "clock_in") {
      if (record && record.clockIn) {
        return NextResponse.json({ data: null, error: { message: "Already clocked in today" } }, { status: 400, headers: corsHeaders() });
      }

      const values = {
        id: recordId,
        tenantId: payload.tenantId,
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        departmentId: employee.departmentId,
        date,
        shiftId: employee.shiftId || null,
        shiftName: "General Shift", // default or fetched
        clockIn: nowIso,
        breaks: [],
        status: "present",
        source: "web",
        clockInLocation: location || null,
        ip: ip || null,
        note: note || null,
        regularized: false,
      };

      if (record) {
        await db.update(attendanceRecords).set(values).where(eq(attendanceRecords.id, recordId));
      } else {
        await db.insert(attendanceRecords).values(values);
      }
      record = values as any;
    } else if (action === "clock_out") {
      if (!record || !record.clockIn) {
        return NextResponse.json({ data: null, error: { message: "Not clocked in today" } }, { status: 400, headers: corsHeaders() });
      }

      // Calculate worked minutes
      const start = new Date(record.clockIn);
      const end = new Date(nowIso);
      const grossMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
      
      const breakMinutes = ((record.breaks as any[]) || []).reduce((sum: number, b: any) => {
        if (b.start && b.end) {
          return sum + Math.round((new Date(b.end).getTime() - new Date(b.start).getTime()) / 60000);
        }
        return sum;
      }, 0);

      const workedMinutes = Math.max(0, grossMinutes - breakMinutes);

      const updates = {
        clockOut: nowIso,
        clockOutLocation: location || null,
        workedMinutes,
        breakMinutes,
        note: note || record.note,
        status: workedMinutes < 240 ? "half_day" : "present", // simple heuristic: <4h is half day
        ip: ip || record.ip,
      };

      await db.update(attendanceRecords).set(updates).where(eq(attendanceRecords.id, recordId));
      record = { ...record, ...updates } as any;
    } else if (action === "start_break") {
      if (!record || !record.clockIn || record.clockOut) {
        return NextResponse.json({ data: null, error: { message: "Must be clocked in and not clocked out" } }, { status: 400, headers: corsHeaders() });
      }

      const activeBreaks = (record.breaks as any[]) || [];
      const updatedBreaks = [...activeBreaks, { id: uid("brk_"), start: nowIso }];

      await db.update(attendanceRecords).set({ breaks: updatedBreaks }).where(eq(attendanceRecords.id, recordId));
      record = { ...record, breaks: updatedBreaks } as any;
    } else if (action === "end_break") {
      if (!record || !record.clockIn || record.clockOut) {
        return NextResponse.json({ data: null, error: { message: "Invalid state" } }, { status: 400, headers: corsHeaders() });
      }

      const activeBreaks = [...((record.breaks as any[]) || [])];
      const openBreak = activeBreaks.find((b: any) => !b.end);
      if (!openBreak) {
        return NextResponse.json({ data: null, error: { message: "No active break to end" } }, { status: 400, headers: corsHeaders() });
      }

      openBreak.end = nowIso;
      
      // Recompute break minutes
      const breakMinutes = activeBreaks.reduce((sum: number, b: any) => {
        if (b.start && b.end) {
          return sum + Math.round((new Date(b.end).getTime() - new Date(b.start).getTime()) / 60000);
        }
        return sum;
      }, 0);

      await db.update(attendanceRecords).set({ breaks: activeBreaks, breakMinutes }).where(eq(attendanceRecords.id, recordId));
      record = { ...record, breaks: activeBreaks, breakMinutes } as any;
    }

    return NextResponse.json({ data: record, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error in attendance clock endpoint:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
