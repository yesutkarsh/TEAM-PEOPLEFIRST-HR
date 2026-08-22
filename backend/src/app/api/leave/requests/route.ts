import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { leaveRequests, leaveBalances, leaveTypes, leaveApprovals, attendanceRecords, employees } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { uid, dateKey } from "@/lib/utils";
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
    const managerId = searchParams.get("managerId");
    const statusesStr = searchParams.get("statuses");

    const conditions = [eq(leaveRequests.tenantId, payload.tenantId)];

    if (employeeId) {
      conditions.push(eq(leaveRequests.employeeId, employeeId));
    }

    if (managerId) {
      const reportingEmps = await db.query.employees.findMany({
        where: (e, { eq, and }) => and(eq(e.tenantId, payload.tenantId), eq(e.reportingManagerId, managerId)),
      });
      const empIds = reportingEmps.map((e) => e.id);
      if (empIds.length > 0) {
        conditions.push(inArray(leaveRequests.employeeId, empIds));
      } else {
        return NextResponse.json({ data: [], error: null }, { headers: corsHeaders() });
      }
    }

    if (statusesStr) {
      const statuses = statusesStr.split(",");
      conditions.push(inArray(leaveRequests.status, statuses));
    }

    const list = await db.query.leaveRequests.findMany({
      where: and(...conditions),
      orderBy: (lr, { desc }) => desc(lr.appliedAt),
    });

    // Populate full employee and leave type objects
    const results = [];
    for (const reqItem of list) {
      const employee = await db.query.employees.findFirst({
        where: (e, { eq }) => eq(e.id, reqItem.employeeId),
      });

      const leaveType = await db.query.leaveTypes.findFirst({
        where: (lt, { eq }) => eq(lt.id, reqItem.leaveTypeId),
      });

      const approvals = await db.query.leaveApprovals.findMany({
        where: (la, { eq }) => eq(la.requestId, reqItem.id),
      });

      results.push({
        ...reqItem,
        startDate: new Date(reqItem.startDate),
        endDate: new Date(reqItem.endDate),
        appliedAt: new Date(reqItem.appliedAt),
        employee: employee || null,
        leaveType: leaveType!,
        approvals: approvals.map((a) => ({ ...a, actionAt: new Date(a.actionAt), approver: null })),
      });
    }

    return NextResponse.json({ data: results, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error fetching leave requests:", error);
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
    const { employeeId, leaveTypeId, startDate, endDate, isHalfDay, halfDayPeriod, workingDays, reason, documentUrl, documentName } = body;

    if (!employeeId || !leaveTypeId || !startDate || !endDate || workingDays === undefined) {
      return NextResponse.json({ data: null, error: { message: "Missing request parameters" } }, { status: 400, headers: corsHeaders() });
    }

    // Get employee details
    const employee = await db.query.employees.findFirst({
      where: (e, { eq }) => eq(e.id, employeeId),
    });
    if (!employee) {
      return NextResponse.json({ data: null, error: { message: "Employee not found" } }, { status: 404, headers: corsHeaders() });
    }

    // Check balance is sufficient
    const year = new Date(startDate).getFullYear();
    const balance = await db.query.leaveBalances.findFirst({
      where: and(
        eq(leaveBalances.tenantId, payload.tenantId),
        eq(leaveBalances.employeeId, employeeId),
        eq(leaveBalances.leaveTypeId, leaveTypeId),
        eq(leaveBalances.year, year)
      ),
    });

    if (!balance || balance.available < workingDays) {
      return NextResponse.json({ data: null, error: { message: "Insufficient leave balance" } }, { status: 400, headers: corsHeaders() });
    }

    // Apply leave request
    const requestId = uid("lreq_");
    const createdRequest = {
      id: requestId,
      tenantId: payload.tenantId,
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      departmentId: employee.departmentId,
      leaveTypeId,
      startDate: dateKey(new Date(startDate)),
      endDate: dateKey(new Date(endDate)),
      isHalfDay: !!isHalfDay,
      halfDayPeriod: halfDayPeriod || null,
      workingDays: parseFloat(workingDays),
      reason: reason || null,
      documentUrl: documentUrl || null,
      documentName: documentName || null,
      status: "pending",
      appliedAt: new Date().toISOString(),
      twoLevel: false,
    };

    await db.insert(leaveRequests).values(createdRequest);

    // Update balance: deduct available, increase pending
    await db.update(leaveBalances)
      .set({
        available: balance.available - workingDays,
        pending: balance.pending + workingDays,
      })
      .where(eq(leaveBalances.id, balance.id));

    return NextResponse.json({ data: createdRequest, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error creating leave request:", error);
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
    const { id, action, comment } = body; // action is "approved", "rejected", or "cancelled"

    if (!id || !action) {
      return NextResponse.json({ data: null, error: { message: "id and action are required" } }, { status: 400, headers: corsHeaders() });
    }

    const leaveReq = await db.query.leaveRequests.findFirst({
      where: (r, { eq, and }) => and(eq(r.id, id), eq(r.tenantId, payload.tenantId)),
    });

    if (!leaveReq) {
      return NextResponse.json({ data: null, error: { message: "Leave request not found" } }, { status: 404, headers: corsHeaders() });
    }

    if (leaveReq.status !== "pending") {
      return NextResponse.json({ data: null, error: { message: "Leave request already processed" } }, { status: 400, headers: corsHeaders() });
    }

    const year = new Date(leaveReq.startDate).getFullYear();
    const balance = await db.query.leaveBalances.findFirst({
      where: and(
        eq(leaveBalances.tenantId, payload.tenantId),
        eq(leaveBalances.employeeId, leaveReq.employeeId),
        eq(leaveBalances.leaveTypeId, leaveReq.leaveTypeId),
        eq(leaveBalances.year, year)
      ),
    });

    if (!balance) {
      return NextResponse.json({ data: null, error: { message: "Balance record not found" } }, { status: 404, headers: corsHeaders() });
    }

    // 1. Log approval action
    await db.insert(leaveApprovals).values({
      id: uid("la_"),
      tenantId: payload.tenantId,
      requestId: id,
      level: "manager", // default level
      approverId: payload.id, // user id acts as approver
      approverName: payload.fullName,
      action: action === "approved" ? "approved" : "rejected",
      comment: comment || null,
      actionAt: new Date().toISOString(),
    });

    // 2. Update request status
    await db.update(leaveRequests)
      .set({
        status: action,
        cancelledAt: action === "cancelled" ? new Date().toISOString() : null,
        cancelReason: action === "cancelled" ? comment : null,
      })
      .where(eq(leaveRequests.id, id));

    // 3. Reconcile Balances
    if (action === "approved") {
      // Deduct from pending, add to used
      await db.update(leaveBalances)
        .set({
          pending: Math.max(0, balance.pending - leaveReq.workingDays),
          used: balance.used + leaveReq.workingDays,
        })
        .where(eq(leaveBalances.id, balance.id));

      // Get Leave Type Name
      const lt = await db.query.leaveTypes.findFirst({
        where: (t, { eq }) => eq(t.id, leaveReq.leaveTypeId),
      });

      // Write 'on_leave' records in attendance ledger for each day in range
      const start = new Date(leaveReq.startDate);
      const end = new Date(leaveReq.endDate);
      const dayMillis = 24 * 60 * 60 * 1000;

      for (let time = start.getTime(); time <= end.getTime(); time += dayMillis) {
        const dateStr = dateKey(new Date(time));
        const recordId = `att_${leaveReq.employeeId}_${dateStr}`;
        const existingAtt = await db.query.attendanceRecords.findFirst({
          where: (rec, { eq }) => eq(rec.id, recordId),
        });

        const attValue = {
          id: recordId,
          tenantId: payload.tenantId,
          employeeId: leaveReq.employeeId,
          employeeName: leaveReq.employeeName,
          departmentId: leaveReq.departmentId,
          date: dateStr,
          status: "on_leave",
          source: "system",
          leaveTypeName: lt?.name || "Annual Leave",
          regularized: false,
        };

        if (existingAtt) {
          await db.update(attendanceRecords).set({ status: "on_leave", leaveTypeName: lt?.name || "Annual Leave" }).where(eq(attendanceRecords.id, recordId));
        } else {
          await db.insert(attendanceRecords).values(attValue);
        }
      }
    } else {
      // action is rejected or cancelled
      // Restore available, subtract pending
      await db.update(leaveBalances)
        .set({
          available: balance.available + leaveReq.workingDays,
          pending: Math.max(0, balance.pending - leaveReq.workingDays),
        })
        .where(eq(leaveBalances.id, balance.id));
    }

    return NextResponse.json({ data: true, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error updating leave request:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
