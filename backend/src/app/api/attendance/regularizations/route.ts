import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { regularizationRequests, attendanceRecords, employees } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
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
    const employeeId = searchParams.get("employeeId");
    const managerId = searchParams.get("managerId"); // manager acting on regularization
    const statusesStr = searchParams.get("statuses");

    const conditions = [eq(regularizationRequests.tenantId, payload.tenantId)];

    if (employeeId) {
      conditions.push(eq(regularizationRequests.employeeId, employeeId));
    }

    if (managerId) {
      // In a real system, the manager ID matches the reviewer or the employee's manager.
      // Let's filter by matching manager
      const teamEmployees = await db.query.employees.findMany({
        where: (emp, { eq, and }) => and(eq(emp.tenantId, payload.tenantId), eq(emp.reportingManagerId, managerId)),
      });
      const teamEmpIds = teamEmployees.map((e) => e.id);
      if (teamEmpIds.length > 0) {
        conditions.push(inArray(regularizationRequests.employeeId, teamEmpIds));
      } else {
        return NextResponse.json({ data: [], error: null }, { headers: corsHeaders() });
      }
    }

    if (statusesStr) {
      const statuses = statusesStr.split(",");
      conditions.push(inArray(regularizationRequests.status, statuses));
    }

    const list = await db.query.regularizationRequests.findMany({
      where: and(...conditions),
      orderBy: (req, { desc }) => desc(req.appliedAt),
    });

    return NextResponse.json({ data: list, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error listing regularization requests:", error);
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
    const { employeeId, date, type, requestedClockIn, requestedClockOut, reason } = body;

    if (!employeeId || !date || !type || !reason) {
      return NextResponse.json({ data: null, error: { message: "Missing required fields" } }, { status: 400, headers: corsHeaders() });
    }

    // Get employee details
    const employee = await db.query.employees.findFirst({
      where: (emp, { eq }) => eq(emp.id, employeeId),
    });
    if (!employee) {
      return NextResponse.json({ data: null, error: { message: "Employee not found" } }, { status: 404, headers: corsHeaders() });
    }

    const reqId = uid("reg_");
    const created = {
      id: reqId,
      tenantId: payload.tenantId,
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      departmentId: employee.departmentId,
      date,
      type,
      requestedClockIn: requestedClockIn || null,
      requestedClockOut: requestedClockOut || null,
      reason,
      status: "pending",
      appliedAt: new Date().toISOString(),
    };

    await db.insert(regularizationRequests).values(created);

    return NextResponse.json({ data: created, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error applying for regularization:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}

export async function PUT(req: Request) {
  try {
    const payload = authenticate(req);
    if (!payload) {
      return NextResponse.json({ data: null, error: { message: "Unauthorized" } }, { status: 401, headers: corsHeaders() });
    }

    const body = await req.json();
    const { id, action, reviewComment } = body; // action is "approved", "rejected", or "cancelled"

    if (!id || !action) {
      return NextResponse.json({ data: null, error: { message: "id and action are required" } }, { status: 400, headers: corsHeaders() });
    }

    const existing = await db.query.regularizationRequests.findFirst({
      where: (r, { eq, and }) => and(eq(r.id, id), eq(r.tenantId, payload.tenantId)),
    });

    if (!existing) {
      return NextResponse.json({ data: null, error: { message: "Request not found" } }, { status: 404, headers: corsHeaders() });
    }

    // Update regularization request status
    await db.update(regularizationRequests)
      .set({
        status: action,
        reviewedBy: payload.fullName,
        reviewedAt: new Date().toISOString(),
        reviewComment: reviewComment || null,
      })
      .where(eq(regularizationRequests.id, id));

    // If approved, update or create the daily attendance record
    if (action === "approved") {
      const recordId = `att_${existing.employeeId}_${existing.date}`;
      const record = await db.query.attendanceRecords.findFirst({
        where: (rec, { eq }) => eq(rec.id, recordId),
      });

      // Construct simulated ISO check-in times
      let clockInIso = null;
      let clockOutIso = null;

      if (existing.requestedClockIn) {
        const inD = new Date(existing.date);
        const [h, m] = existing.requestedClockIn.split(":");
        inD.setHours(parseInt(h), parseInt(m), 0, 0);
        clockInIso = inD.toISOString();
      }

      if (existing.requestedClockOut) {
        const outD = new Date(existing.date);
        const [h, m] = existing.requestedClockOut.split(":");
        outD.setHours(parseInt(h), parseInt(m), 0, 0);
        clockOutIso = outD.toISOString();
      }

      // Compute worked minutes
      let workedMinutes = 480; // default 8 hours if not fully specified
      if (clockInIso && clockOutIso) {
        workedMinutes = Math.max(0, Math.round((new Date(clockOutIso).getTime() - new Date(clockInIso).getTime()) / 60000) - 60); // minus 1 hour break
      }

      const values = {
        id: recordId,
        tenantId: payload.tenantId,
        employeeId: existing.employeeId,
        employeeName: existing.employeeName,
        departmentId: existing.departmentId,
        date: existing.date,
        clockIn: clockInIso,
        clockOut: clockOutIso,
        workedMinutes,
        status: workedMinutes < 240 ? "half_day" : "present",
        source: "manual",
        regularized: true,
      };

      if (record) {
        await db.update(attendanceRecords).set(values).where(eq(attendanceRecords.id, recordId));
      } else {
        await db.insert(attendanceRecords).values(values);
      }
    }

    return NextResponse.json({ data: true, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error acting on regularization request:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
