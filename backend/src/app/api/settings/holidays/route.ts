import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { companyHolidays, nationalHolidays } from "@/db/schema";
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
    const type = searchParams.get("type"); // "company" or "national"
    const country = searchParams.get("country"); // for national, e.g. "India", "United States"

    if (type === "national") {
      let list = await db.query.nationalHolidays.findMany({
        where: (nh, { eq }) => eq(nh.tenantId, payload.tenantId),
      });

      if (list.length === 0) {
        // Seed default national holidays for the requested country if none exist
        const defaults: Record<string, Array<{ name: string; date: string }>> = {
          "United States": [
            { name: "New Year's Day", date: "2026-01-01" },
            { name: "Martin Luther King Jr. Day", date: "2026-01-19" },
            { name: "Memorial Day", date: "2026-05-25" },
            { name: "Independence Day", date: "2026-07-04" },
            { name: "Labor Day", date: "2026-09-07" },
            { name: "Thanksgiving", date: "2026-11-26" },
            { name: "Christmas Day", date: "2026-12-25" },
          ],
          "United Kingdom": [
            { name: "New Year's Day", date: "2026-01-01" },
            { name: "Good Friday", date: "2026-04-03" },
            { name: "Easter Monday", date: "2026-04-06" },
            { name: "Early May Bank Holiday", date: "2026-05-04" },
            { name: "Christmas Day", date: "2026-12-25" },
            { name: "Boxing Day", date: "2026-12-26" },
          ],
          "India": [
            { name: "Republic Day", date: "2026-01-26" },
            { name: "Holi", date: "2026-03-04" },
            { name: "Independence Day", date: "2026-08-15" },
            { name: "Gandhi Jayanti", date: "2026-10-02" },
            { name: "Diwali", date: "2026-11-08" },
          ],
        };

        const holidaysToSeed = defaults[country || "India"] || defaults["India"];
        const inserts = holidaysToSeed.map((h) => ({
          id: uid("nh_"),
          tenantId: payload.tenantId,
          name: h.name,
          date: h.date,
          observed: true,
        }));
        if (inserts.length > 0) {
          await db.insert(nationalHolidays).values(inserts);
          list = await db.query.nationalHolidays.findMany({
            where: (nh, { eq }) => eq(nh.tenantId, payload.tenantId),
          });
        }
      }
      return NextResponse.json({ data: list, error: null }, { headers: corsHeaders() });
    }

    // Default to company holidays
    const list = await db.query.companyHolidays.findMany({
      where: (ch, { eq }) => eq(ch.tenantId, payload.tenantId),
    });

    return NextResponse.json({ data: list, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error fetching holidays:", error);
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
    const { id, name, date, type, description } = body;

    if (!name || !date || !type) {
      return NextResponse.json({ data: null, error: { message: "Name, date, and type are required" } }, { status: 400, headers: corsHeaders() });
    }

    if (id) {
      // Update
      const existing = await db.query.companyHolidays.findFirst({
        where: (ch, { eq, and }) => and(eq(ch.id, id), eq(ch.tenantId, payload.tenantId)),
      });

      if (!existing) {
        return NextResponse.json({ data: null, error: { message: "Holiday not found" } }, { status: 404, headers: corsHeaders() });
      }

      await db.update(companyHolidays)
        .set({ name, date, type, description })
        .where(and(eq(companyHolidays.id, id), eq(companyHolidays.tenantId, payload.tenantId)));

      const updated = await db.query.companyHolidays.findFirst({
        where: (ch, { eq }) => eq(ch.id, id),
      });

      return NextResponse.json({ data: updated, error: null }, { headers: corsHeaders() });
    } else {
      // Create
      const newId = uid("h_");
      const created = {
        id: newId,
        tenantId: payload.tenantId,
        name,
        date,
        type,
        description: description || null,
      };

      await db.insert(companyHolidays).values(created);
      return NextResponse.json({ data: created, error: null }, { headers: corsHeaders() });
    }
  } catch (error: any) {
    console.error("Error saving holiday:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}

export async function PUT(req: Request) {
  // Toggle national holiday observed status
  try {
    const payload = authenticate(req);
    if (!payload) {
      return NextResponse.json({ data: null, error: { message: "Unauthorized" } }, { status: 401, headers: corsHeaders() });
    }

    const body = await req.json();
    const { id, observed } = body;

    if (!id || observed === undefined) {
      return NextResponse.json({ data: null, error: { message: "id and observed status are required" } }, { status: 400, headers: corsHeaders() });
    }

    const existing = await db.query.nationalHolidays.findFirst({
      where: (nh, { eq, and }) => and(eq(nh.id, id), eq(nh.tenantId, payload.tenantId)),
    });

    if (!existing) {
      return NextResponse.json({ data: null, error: { message: "Holiday not found" } }, { status: 404, headers: corsHeaders() });
    }

    await db.update(nationalHolidays)
      .set({ observed })
      .where(and(eq(nationalHolidays.id, id), eq(nationalHolidays.tenantId, payload.tenantId)));

    return NextResponse.json({ data: true, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error toggling national holiday:", error);
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

    await db.delete(companyHolidays).where(and(eq(companyHolidays.id, id), eq(companyHolidays.tenantId, payload.tenantId)));
    return NextResponse.json({ data: true, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error deleting holiday:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
