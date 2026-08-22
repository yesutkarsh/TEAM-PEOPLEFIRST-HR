import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { leaveTypes } from "@/db/schema";
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

    const list = await db.query.leaveTypes.findMany({
      where: (lt, { eq }) => eq(lt.tenantId, payload.tenantId),
    });

    return NextResponse.json({ data: list, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error fetching leave types:", error);
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
    const { id, name, code, category, isPaid, applicableGender, allowHalfDay, documentRequired, documentAfterDays, minDaysPerRequest, maxDaysPerRequest, accrualType, annualAllocation, carryForwardMax, carryForwardLapseDate, encashmentAllowed, encashmentMaxDays, color, isActive } = body;

    if (!name || !code || !category || !color || annualAllocation === undefined) {
      return NextResponse.json({ data: null, error: { message: "Required fields are missing" } }, { status: 400, headers: corsHeaders() });
    }

    const values = {
      tenantId: payload.tenantId,
      name,
      code,
      category,
      isPaid: isPaid !== undefined ? !!isPaid : true,
      applicableGender: applicableGender || "all",
      allowHalfDay: allowHalfDay !== undefined ? !!allowHalfDay : true,
      documentRequired: documentRequired || "never",
      documentAfterDays: documentAfterDays ? parseInt(documentAfterDays) : null,
      minDaysPerRequest: minDaysPerRequest ? parseFloat(minDaysPerRequest) : 1,
      maxDaysPerRequest: maxDaysPerRequest ? parseFloat(maxDaysPerRequest) : null,
      accrualType: accrualType || "monthly",
      annualAllocation: parseFloat(annualAllocation),
      carryForwardMax: carryForwardMax ? parseFloat(carryForwardMax) : null,
      carryForwardLapseDate: carryForwardLapseDate || null,
      encashmentAllowed: encashmentAllowed !== undefined ? !!encashmentAllowed : false,
      encashmentMaxDays: encashmentMaxDays ? parseInt(encashmentMaxDays) : null,
      color,
      isActive: isActive !== undefined ? !!isActive : true,
    };

    if (id) {
      const existing = await db.query.leaveTypes.findFirst({
        where: (lt, { eq, and }) => and(eq(lt.id, id), eq(lt.tenantId, payload.tenantId)),
      });

      if (!existing) {
        return NextResponse.json({ data: null, error: { message: "Leave type not found" } }, { status: 404, headers: corsHeaders() });
      }

      await db.update(leaveTypes).set(values).where(eq(leaveTypes.id, id));
      return NextResponse.json({ data: { id, ...values }, error: null }, { headers: corsHeaders() });
    } else {
      const newId = uid("lt_");
      await db.insert(leaveTypes).values({ id: newId, ...values });
      return NextResponse.json({ data: { id: newId, ...values }, error: null }, { headers: corsHeaders() });
    }
  } catch (error: any) {
    console.error("Error upserting leave type:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}

export async function DELETE(req: Request) {
  try {
    const payload = authenticate(req);
    if (!payload) {
      return NextResponse.json({ data: null, error: { message: "Unauthorized" } }, { status: 401, headers: corsHeaders() });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ data: null, error: { message: "id parameter is required" } }, { status: 400, headers: corsHeaders() });
    }

    await db.delete(leaveTypes).where(and(eq(leaveTypes.id, id), eq(leaveTypes.tenantId, payload.tenantId)));
    return NextResponse.json({ data: true, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error deleting leave type:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
