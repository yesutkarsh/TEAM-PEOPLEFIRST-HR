import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { workCalendars } from "@/db/schema";
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

    let cal = await db.query.workCalendars.findFirst({
      where: (wc, { eq }) => eq(wc.tenantId, payload.tenantId),
    });

    if (!cal) {
      // Return default
      cal = {
        id: uid("wc_"),
        tenantId: payload.tenantId,
        workingDays: [1, 2, 3, 4, 5],
      };
    }

    return NextResponse.json({ data: cal, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error fetching work calendar:", error);
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
    const { workingDays } = body;

    if (!workingDays || !Array.isArray(workingDays)) {
      return NextResponse.json({ data: null, error: { message: "workingDays array is required" } }, { status: 400, headers: corsHeaders() });
    }

    const existing = await db.query.workCalendars.findFirst({
      where: (wc, { eq }) => eq(wc.tenantId, payload.tenantId),
    });

    if (existing) {
      await db.update(workCalendars)
        .set({ workingDays })
        .where(eq(workCalendars.tenantId, payload.tenantId));
    } else {
      await db.insert(workCalendars).values({
        id: uid("wc_"),
        tenantId: payload.tenantId,
        workingDays,
      });
    }

    return NextResponse.json({ data: { workingDays }, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error saving work calendar:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
