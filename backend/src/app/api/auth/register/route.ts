import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { users, employees, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { uid, dateKey } from "@/lib/utils";
import { hashPassword, generateToken, corsHeaders, handleOptions } from "@/lib/auth";

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, email, password, tenantId } = body;

    if (!fullName || !email || !password || !tenantId) {
      return NextResponse.json({ data: null, error: { message: "All fields are required" } }, { status: 400, headers: corsHeaders() });
    }

    // Verify tenant exists
    const tenantExists = await db.query.tenants.findFirst({
      where: (t, { eq }) => eq(t.id, tenantId),
    });
    if (!tenantExists) {
      return NextResponse.json({ data: null, error: { message: "Tenant workspace not found" } }, { status: 404, headers: corsHeaders() });
    }

    // Check if user email already registered
    const existingUser = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, email),
    });
    if (existingUser) {
      return NextResponse.json({ data: null, error: { message: "An account with this email already exists." } }, { status: 400, headers: corsHeaders() });
    }

    const userId = uid("u_");
    const hashedPassword = await hashPassword(password);
    const userRole = "hr_admin"; // First registered user is the HR Admin

    // 1. Create User
    const newUser = {
      id: userId,
      tenantId,
      fullName,
      email,
      password: hashedPassword,
      role: userRole,
    };
    await db.insert(users).values(newUser);

    // 2. Create Employee profile matching the user
    const parts = fullName.split(" ");
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ") || "Admin";
    const employeeId = uid("emp_");
    
    const newEmployee = {
      id: employeeId,
      tenantId,
      userId,
      employeeCode: "EMP001",
      firstName,
      lastName,
      workEmail: email,
      phone: "0000000000",
      departmentId: `d_ppl_${tenantId}`,
      designationId: `g_ae_${tenantId}`,
      employmentType: "full_time" as const,
      employmentStatus: "active" as const,
      dateOfJoining: dateKey(new Date()),
      role: "hr_admin" as const,
      profileCompleteness: 20,
      timeline: [
        {
          id: uid("tm_"),
          at: new Date().toISOString(),
          actor: "System",
          message: "Account registered and employee profile created.",
        },
      ],
    };
    
    await db.insert(employees).values(newEmployee);

    // 3. Generate token
    const token = generateToken({
      id: userId,
      tenantId,
      email,
      role: userRole,
      fullName,
    });

    const userResponse = {
      id: userId,
      tenantId,
      fullName,
      email,
      role: userRole,
    };

    return NextResponse.json({ data: { user: userResponse, token }, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error registering user:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
