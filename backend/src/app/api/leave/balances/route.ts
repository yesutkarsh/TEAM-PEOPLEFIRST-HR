import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { leaveBalances, leaveTypes, leaveAdjustments } from "@/db/schema";
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

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const yearStr = searchParams.get("year");
    const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();

    if (!employeeId) {
      return NextResponse.json({ data: null, error: { message: "employeeId is required" } }, { status: 400, headers: corsHeaders() });
    }

    // 1. Fetch existing balances
    let balances = await db.query.leaveBalances.findMany({
      where: and(
        eq(leaveBalances.tenantId, payload.tenantId),
        eq(leaveBalances.employeeId, employeeId),
        eq(leaveBalances.year, year)
      ),
    });

    // 2. If no balances exist, initialize them
    if (balances.length === 0) {
      const activeTypes = await db.query.leaveTypes.findMany({
        where: and(
          eq(leaveTypes.tenantId, payload.tenantId),
          eq(leaveTypes.isActive, true)
        ),
      });

      const inserts = activeTypes.map((lt) => ({
        id: uid("bal_"),
        tenantId: payload.tenantId,
        employeeId,
        leaveTypeId: lt.id,
        year,
        allocated: lt.annualAllocation,
        accrued: lt.annualAllocation,
        used: 0,
        pending: 0,
        carried: 0,
        available: lt.annualAllocation,
        encashed: 0,
      }));

      if (inserts.length > 0) {
        await db.insert(leaveBalances).values(inserts);
        balances = await db.query.leaveBalances.findMany({
          where: and(
            eq(leaveBalances.tenantId, payload.tenantId),
            eq(leaveBalances.employeeId, employeeId),
            eq(leaveBalances.year, year)
          ),
        });
      }
    }

    // 3. Format with full leaveType detail
    const results = [];
    for (const bal of balances) {
      const leaveType = await db.query.leaveTypes.findFirst({
        where: (lt, { eq }) => eq(lt.id, bal.leaveTypeId),
      });
      if (leaveType) {
        results.push({
          ...bal,
          leaveType,
        });
      }
    }

    return NextResponse.json({ data: results, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error fetching leave balances:", error);
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
    const { employeeId, leaveTypeId, adjustment, reason } = body;

    if (!employeeId || !leaveTypeId || adjustment === undefined || !reason) {
      return NextResponse.json({ data: null, error: { message: "Missing adjustment parameters" } }, { status: 400, headers: corsHeaders() });
    }

    const year = new Date().getFullYear();

    // Look up balance
    const balance = await db.query.leaveBalances.findFirst({
      where: and(
        eq(leaveBalances.tenantId, payload.tenantId),
        eq(leaveBalances.employeeId, employeeId),
        eq(leaveBalances.leaveTypeId, leaveTypeId),
        eq(leaveBalances.year, year)
      ),
    });

    if (!balance) {
      return NextResponse.json({ data: null, error: { message: "Balance ledger not initialized" } }, { status: 404, headers: corsHeaders() });
    }

    const adjAmount = parseFloat(adjustment);
    const newAllocated = Math.max(0, balance.allocated + adjAmount);
    const newAvailable = Math.max(0, balance.available + adjAmount);

    // 1. Update balance
    await db.update(leaveBalances)
      .set({ allocated: newAllocated, available: newAvailable })
      .where(eq(leaveBalances.id, balance.id));

    // 2. Log adjustment
    await db.insert(leaveAdjustments).values({
      id: uid("ladj_"),
      tenantId: payload.tenantId,
      employeeId,
      leaveTypeId,
      adjustment: adjAmount,
      reason,
      adjustedBy: payload.fullName,
      adjustedAt: new Date().toISOString(),
    });

    return NextResponse.json({ data: true, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error making leave adjustment:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
