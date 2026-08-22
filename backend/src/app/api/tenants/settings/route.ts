import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { corsHeaders, handleOptions } from "@/lib/auth";

export async function OPTIONS() {
  return handleOptions();
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { tenantId, theme, settings } = body;

    if (!tenantId) {
      return NextResponse.json({ data: null, error: { message: "tenantId is required" } }, { status: 400, headers: corsHeaders() });
    }

    const existing = await db.query.tenants.findFirst({
      where: (t, { eq }) => eq(t.id, tenantId),
    });

    if (!existing) {
      return NextResponse.json({ data: null, error: { message: "Tenant not found" } }, { status: 404, headers: corsHeaders() });
    }

    const updates: Partial<typeof tenants.$inferInsert> = {};
    if (theme !== undefined) updates.theme = theme;
    if (settings !== undefined) updates.settings = settings;

    if (Object.keys(updates).length > 0) {
      await db.update(tenants).set(updates).where(eq(tenants.id, tenantId));
    }

    const updated = await db.query.tenants.findFirst({
      where: (t, { eq }) => eq(t.id, tenantId),
    });

    return NextResponse.json({ data: updated, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error updating tenant settings:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
