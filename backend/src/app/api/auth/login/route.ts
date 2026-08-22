import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { users, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { comparePassword, generateToken, corsHeaders, handleOptions } from "@/lib/auth";

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ data: null, error: { message: "Email and password are required" } }, { status: 400, headers: corsHeaders() });
    }

    // Find User
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, email),
    });

    if (!user) {
      return NextResponse.json({ data: null, error: { message: "Incorrect email or password." } }, { status: 400, headers: corsHeaders() });
    }

    // Compare Password
    const match = await comparePassword(password, user.password);
    if (!match) {
      return NextResponse.json({ data: null, error: { message: "Incorrect email or password." } }, { status: 400, headers: corsHeaders() });
    }

    // Find Tenant
    const tenant = await db.query.tenants.findFirst({
      where: (t, { eq }) => eq(t.id, user.tenantId),
    });

    if (!tenant) {
      return NextResponse.json({ data: null, error: { message: "Workspace not found." } }, { status: 404, headers: corsHeaders() });
    }

    // Generate Token
    const token = generateToken({
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    const userResponse = {
      id: user.id,
      tenantId: user.tenantId,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    };

    return NextResponse.json({ data: { user: userResponse, token, tenant }, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error logging in:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
