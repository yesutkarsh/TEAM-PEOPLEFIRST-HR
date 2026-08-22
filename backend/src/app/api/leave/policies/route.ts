import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { leavePolicies, leavePolicyAllocations, leaveTypes } from "@/db/schema";
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

    const policies = await db.query.leavePolicies.findMany({
      where: (p, { eq }) => eq(p.tenantId, payload.tenantId),
    });

    const results = [];
    for (const policy of policies) {
      const allocations = await db.query.leavePolicyAllocations.findMany({
        where: (lpa, { eq }) => eq(lpa.policyId, policy.id),
      });

      const formattedAllocations = [];
      for (const alloc of allocations) {
        const leaveType = await db.query.leaveTypes.findFirst({
          where: (lt, { eq }) => eq(lt.id, alloc.leaveTypeId),
        });
        if (leaveType) {
          formattedAllocations.push({
            leaveTypeId: alloc.leaveTypeId,
            leaveType,
            daysOverride: alloc.daysOverride || undefined,
          });
        }
      }

      results.push({
        ...policy,
        allocations: formattedAllocations,
        employeeCount: 0, // In a real system, we'd count employees assigned to this policy
      });
    }

    return NextResponse.json({ data: results, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error fetching leave policies:", error);
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
    const { id, name, description, eligibility, allocations, isDefault } = body;

    if (!name || !eligibility) {
      return NextResponse.json({ data: null, error: { message: "Name and eligibility are required" } }, { status: 400, headers: corsHeaders() });
    }

    let policyId = id;

    if (id) {
      // Update
      const existing = await db.query.leavePolicies.findFirst({
        where: (p, { eq, and }) => and(eq(p.id, id), eq(p.tenantId, payload.tenantId)),
      });

      if (!existing) {
        return NextResponse.json({ data: null, error: { message: "Policy not found" } }, { status: 404, headers: corsHeaders() });
      }

      await db.update(leavePolicies)
        .set({ name, description, eligibility, isDefault: !!isDefault })
        .where(eq(leavePolicies.id, id));

      // Remove previous allocations
      await db.delete(leavePolicyAllocations).where(eq(leavePolicyAllocations.policyId, id));
    } else {
      // Create
      policyId = uid("pol_");
      await db.insert(leavePolicies).values({
        id: policyId,
        tenantId: payload.tenantId,
        name,
        description: description || null,
        eligibility,
        isDefault: !!isDefault,
      });
    }

    // Insert new allocations
    if (allocations && Array.isArray(allocations)) {
      const inserts = allocations.map((a: any) => ({
        id: uid("lpa_"),
        tenantId: payload.tenantId,
        policyId,
        leaveTypeId: a.leaveTypeId,
        daysOverride: a.daysOverride ? parseFloat(a.daysOverride) : null,
      }));
      if (inserts.length > 0) {
        await db.insert(leavePolicyAllocations).values(inserts);
      }
    }

    return NextResponse.json({ data: { id: policyId, name }, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error upserting leave policy:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
