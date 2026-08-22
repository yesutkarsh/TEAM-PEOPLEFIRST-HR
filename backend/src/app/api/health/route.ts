import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { corsHeaders, handleOptions } from "@/lib/auth";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request) {
  try {
    let dbStatus = "disconnected";
    try {
      // Basic database connection query
      const tenantsList = await db.query.tenants.findMany({ limit: 1 });
      if (tenantsList) {
        dbStatus = "connected";
      }
    } catch (dbError: any) {
      console.error("Health check DB connection failed:", dbError);
      dbStatus = `error: ${dbError.message || dbError}`;
    }

    return NextResponse.json(
      {
        data: {
          status: "healthy",
          timestamp: new Date().toISOString(),
          database: dbStatus,
          uptime: process.uptime(),
        },
        error: null,
      },
      {
        headers: corsHeaders(),
      }
    );
  } catch (error: any) {
    console.error("Error in health check:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error" },
      },
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
}
