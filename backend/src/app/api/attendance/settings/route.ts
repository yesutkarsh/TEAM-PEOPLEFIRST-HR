import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { attendanceSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
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

    let settings = await db.query.attendanceSettings.findFirst({
      where: (as, { eq }) => eq(as.tenantId, payload.tenantId),
    });

    if (!settings) {
      settings = {
        id: uid("as_"),
        tenantId: payload.tenantId,
        captureMode: "web",
        enforceIp: false,
        allowedIps: ["192.168.0.0/16", "10.0.0.0/8"],
        enforceGeo: false,
        lateGraceMinutes: 15,
        halfDayMinutes: 240,
        fullDayMinutes: 480,
        overtimeAfterMinutes: 540,
        autoClockOutTime: "23:30",
        breakTrackingEnabled: true,
        allowRegularization: true,
        regularizationWindowDays: 30,
        maxRegularizationsPerMonth: 3,
      };
      await db.insert(attendanceSettings).values(settings);
    }

    return NextResponse.json({ data: settings, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error fetching attendance settings:", error);
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

    const existing = await db.query.attendanceSettings.findFirst({
      where: (as, { eq }) => eq(as.tenantId, payload.tenantId),
    });

    if (existing) {
      await db.update(attendanceSettings)
        .set(body)
        .where(eq(attendanceSettings.tenantId, payload.tenantId));
    } else {
      await db.insert(attendanceSettings).values({
        ...body,
        id: uid("as_"),
        tenantId: payload.tenantId,
      });
    }

    const updated = await db.query.attendanceSettings.findFirst({
      where: (as, { eq }) => eq(as.tenantId, payload.tenantId),
    });

    return NextResponse.json({ data: updated, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error saving attendance settings:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
