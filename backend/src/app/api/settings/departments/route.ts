import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { departments } from "@/db/schema";
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

    const list = await db.query.departments.findMany({
      where: (d, { eq }) => eq(d.tenantId, payload.tenantId),
    });

    return NextResponse.json({ data: list, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error listing departments:", error);
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
    const { id, name, parentId, description, headName } = body;

    if (!name) {
      return NextResponse.json({ data: null, error: { message: "Department name is required" } }, { status: 400, headers: corsHeaders() });
    }

    if (id) {
      // Update
      const existing = await db.query.departments.findFirst({
        where: (d, { eq, and }) => and(eq(d.id, id), eq(d.tenantId, payload.tenantId)),
      });

      if (!existing) {
        return NextResponse.json({ data: null, error: { message: "Department not found" } }, { status: 404, headers: corsHeaders() });
      }

      await db.update(departments)
        .set({ name, parentId, description, headName })
        .where(and(eq(departments.id, id), eq(departments.tenantId, payload.tenantId)));

      const updated = await db.query.departments.findFirst({
        where: (d, { eq }) => eq(d.id, id),
      });

      return NextResponse.json({ data: updated, error: null }, { headers: corsHeaders() });
    } else {
      // Create
      const newId = uid("d_");
      const created = {
        id: newId,
        tenantId: payload.tenantId,
        name,
        parentId: parentId || null,
        description: description || null,
        headName: headName || null,
        employeeCount: 0,
      };

      await db.insert(departments).values(created);
      return NextResponse.json({ data: created, error: null }, { headers: corsHeaders() });
    }
  } catch (error: any) {
    console.error("Error upserting department:", error);
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

    await db.delete(departments).where(and(eq(departments.id, id), eq(departments.tenantId, payload.tenantId)));
    return NextResponse.json({ data: true, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error deleting department:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
