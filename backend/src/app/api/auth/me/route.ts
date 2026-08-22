import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { authenticate, corsHeaders, handleOptions } from "@/lib/auth";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req: Request) {
  try {
    const payload = authenticate(req);
    if (!payload) {
      return NextResponse.json({ data: null, error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, { status: 401, headers: corsHeaders() });
    }

    const tenant = await db.query.tenants.findFirst({
      where: (t, { eq }) => eq(t.id, payload.tenantId),
    });

    if (!tenant) {
      return NextResponse.json({ data: null, error: { message: "Tenant workspace not found." } }, { status: 404, headers: corsHeaders() });
    }

    const userResponse = {
      id: payload.id,
      tenantId: payload.tenantId,
      fullName: payload.fullName,
      email: payload.email,
      role: payload.role,
    };

    return NextResponse.json({ data: { user: userResponse, tenant }, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error in auth/me:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
