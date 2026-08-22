import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { geoFences } from "@/db/schema";
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

    const list = await db.query.geoFences.findMany({
      where: (gf, { eq }) => eq(gf.tenantId, payload.tenantId),
    });

    return NextResponse.json({ data: list, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error listing geofences:", error);
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
    const { id, name, lat, lng, radiusMeters } = body;

    if (!name || lat === undefined || lng === undefined || radiusMeters === undefined) {
      return NextResponse.json({ data: null, error: { message: "Name, lat, lng, and radiusMeters are required" } }, { status: 400, headers: corsHeaders() });
    }

    if (id) {
      // Update
      const existing = await db.query.geoFences.findFirst({
        where: (gf, { eq, and }) => and(eq(gf.id, id), eq(gf.tenantId, payload.tenantId)),
      });

      if (!existing) {
        return NextResponse.json({ data: null, error: { message: "GeoFence not found" } }, { status: 404, headers: corsHeaders() });
      }

      await db.update(geoFences)
        .set({ name, lat: parseFloat(lat), lng: parseFloat(lng), radiusMeters: parseInt(radiusMeters) })
        .where(and(eq(geoFences.id, id), eq(geoFences.tenantId, payload.tenantId)));

      const updated = await db.query.geoFences.findFirst({
        where: (gf, { eq }) => eq(gf.id, id),
      });

      return NextResponse.json({ data: updated, error: null }, { headers: corsHeaders() });
    } else {
      // Create
      const newId = uid("gf_");
      const created = {
        id: newId,
        tenantId: payload.tenantId,
        name,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radiusMeters: parseInt(radiusMeters),
      };

      await db.insert(geoFences).values(created);
      return NextResponse.json({ data: created, error: null }, { headers: corsHeaders() });
    }
  } catch (error: any) {
    console.error("Error upserting geofence:", error);
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

    await db.delete(geoFences).where(and(eq(geoFences.id, id), eq(geoFences.tenantId, payload.tenantId)));
    return NextResponse.json({ data: true, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error deleting geofence:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
