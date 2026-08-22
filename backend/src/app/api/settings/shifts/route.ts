import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { shifts } from "@/db/schema";
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

    const list = await db.query.shifts.findMany({
      where: (s, { eq }) => eq(s.tenantId, payload.tenantId),
    });

    return NextResponse.json({ data: list, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error listing shifts:", error);
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
    const { id, name, startTime, endTime, breakMinutes, days, graceMinutes } = body;

    if (!name || !startTime || !endTime || breakMinutes === undefined || !days || graceMinutes === undefined) {
      return NextResponse.json({ data: null, error: { message: "All parameters are required" } }, { status: 400, headers: corsHeaders() });
    }

    if (id) {
      // Update
      const existing = await db.query.shifts.findFirst({
        where: (s, { eq, and }) => and(eq(s.id, id), eq(s.tenantId, payload.tenantId)),
      });

      if (!existing) {
        return NextResponse.json({ data: null, error: { message: "Shift not found" } }, { status: 404, headers: corsHeaders() });
      }

      await db.update(shifts)
        .set({ name, startTime, endTime, breakMinutes, days, graceMinutes })
        .where(and(eq(shifts.id, id), eq(shifts.tenantId, payload.tenantId)));

      const updated = await db.query.shifts.findFirst({
        where: (s, { eq }) => eq(s.id, id),
      });

      return NextResponse.json({ data: updated, error: null }, { headers: corsHeaders() });
    } else {
      // Create
      const newId = uid("sh_");
      const created = {
        id: newId,
        tenantId: payload.tenantId,
        name,
        startTime,
        endTime,
        breakMinutes,
        days,
        graceMinutes,
      };

      await db.insert(shifts).values(created);
      return NextResponse.json({ data: created, error: null }, { headers: corsHeaders() });
    }
  } catch (error: any) {
    console.error("Error saving shift:", error);
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

    await db.delete(shifts).where(and(eq(shifts.id, id), eq(shifts.tenantId, payload.tenantId)));
    return NextResponse.json({ data: true, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error deleting shift:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
