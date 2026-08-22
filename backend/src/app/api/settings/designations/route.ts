import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { designations } from "@/db/schema";
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

    const list = await db.query.designations.findMany({
      where: (d, { eq }) => eq(d.tenantId, payload.tenantId),
    });

    return NextResponse.json({ data: list, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error listing designations:", error);
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
    const { id, name, grade, departmentIds, description } = body;

    if (!name || !grade || !departmentIds) {
      return NextResponse.json({ data: null, error: { message: "Name, grade, and departmentIds are required" } }, { status: 400, headers: corsHeaders() });
    }

    if (id) {
      // Update
      const existing = await db.query.designations.findFirst({
        where: (d, { eq, and }) => and(eq(d.id, id), eq(d.tenantId, payload.tenantId)),
      });

      if (!existing) {
        return NextResponse.json({ data: null, error: { message: "Designation not found" } }, { status: 404, headers: corsHeaders() });
      }

      await db.update(designations)
        .set({ name, grade, departmentIds, description })
        .where(and(eq(designations.id, id), eq(designations.tenantId, payload.tenantId)));

      const updated = await db.query.designations.findFirst({
        where: (d, { eq }) => eq(d.id, id),
      });

      return NextResponse.json({ data: updated, error: null }, { headers: corsHeaders() });
    } else {
      // Create
      const newId = uid("g_");
      const created = {
        id: newId,
        tenantId: payload.tenantId,
        name,
        grade,
        departmentIds,
        description: description || null,
        employeeCount: 0,
      };

      await db.insert(designations).values(created);
      return NextResponse.json({ data: created, error: null }, { headers: corsHeaders() });
    }
  } catch (error: any) {
    console.error("Error upserting designation:", error);
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
      return NextResponse.json({ data: null, error: { message: "ID is required" } }, { status: 400, headers: corsHeaders() });
    }

    await db.delete(designations).where(and(eq(designations.id, id), eq(designations.tenantId, payload.tenantId)));
    return NextResponse.json({ data: true, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error deleting designation:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
