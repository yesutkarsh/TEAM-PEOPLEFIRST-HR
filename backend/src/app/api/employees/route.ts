import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { employees, users } from "@/db/schema";
import { eq, and, like, or, inArray, sql } from "drizzle-orm";
import { uid } from "@/lib/utils";
import { hashPassword, authenticate, corsHeaders, handleOptions } from "@/lib/auth";

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
    const q = searchParams.get("q");
    const departmentId = searchParams.get("departmentId");
    const designationId = searchParams.get("designationId");
    const typesStr = searchParams.get("types"); // comma separated
    const statusesStr = searchParams.get("statuses"); // comma separated

    const conditions = [eq(employees.tenantId, payload.tenantId)];

    if (q) {
      conditions.push(
        or(
          like(employees.firstName, `%${q}%`),
          like(employees.lastName, `%${q}%`),
          like(employees.employeeCode, `%${q}%`),
          like(employees.workEmail, `%${q}%`)
        ) as any
      );
    }

    if (departmentId && departmentId !== "all") {
      conditions.push(eq(employees.departmentId, departmentId));
    }

    if (designationId && designationId !== "all") {
      conditions.push(eq(employees.designationId, designationId));
    }

    if (typesStr) {
      const types = typesStr.split(",");
      conditions.push(inArray(employees.employmentType, types));
    }

    if (statusesStr) {
      const statuses = statusesStr.split(",");
      conditions.push(inArray(employees.employmentStatus, statuses));
    }

    const list = await db.query.employees.findMany({
      where: and(...conditions),
      orderBy: (emp, { asc }) => asc(emp.employeeCode),
    });

    return NextResponse.json({ data: list, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error fetching employees:", error);
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
    const {
      firstName,
      middleName,
      lastName,
      personalEmail,
      workEmail,
      phone,
      dateOfBirth,
      gender,
      bloodGroup,
      maritalStatus,
      nationality,
      currentAddress,
      permanentAddress,
      sameAddress,
      departmentId,
      designationId,
      grade,
      reportingManagerId,
      employmentType,
      employmentStatus,
      dateOfJoining,
      probationEndDate,
      workLocation,
      shiftId,
      ctcAnnual,
      bankName,
      bankAccountNumber,
      bankIfsc,
      panNumber,
      aadhaarNumber,
      avatarUrl,
      documents,
      emergencyContact,
    } = body;

    if (!firstName || !lastName || !workEmail || !phone || !departmentId || !designationId || !employmentType || !employmentStatus || !dateOfJoining) {
      return NextResponse.json({ data: null, error: { message: "Required fields are missing." } }, { status: 400, headers: corsHeaders() });
    }

    // Check if employee with workEmail already exists under this tenant
    const existing = await db.query.employees.findFirst({
      where: (emp, { eq, and }) => and(eq(emp.workEmail, workEmail), eq(emp.tenantId, payload.tenantId)),
    });
    if (existing) {
      return NextResponse.json({ data: null, error: { message: "An employee with this work email already exists." } }, { status: 400, headers: corsHeaders() });
    }

    // Auto generate code: find count and increment
    const countRes = await db.select({ count: sql<number>`count(*)` }).from(employees).where(eq(employees.tenantId, payload.tenantId));
    const nextNum = (countRes[0]?.count || 0) + 1;
    const employeeCode = `EMP${String(nextNum).padStart(3, "0")}`;

    const employeeId = uid("emp_");
    const userId = uid("u_");

    // 1. Create User login credentials (default password is Welcome123)
    const defaultPasswordHash = await hashPassword("Welcome123");
    await db.insert(users).values({
      id: userId,
      tenantId: payload.tenantId,
      fullName: `${firstName} ${lastName}`,
      email: workEmail,
      password: defaultPasswordHash,
      role: "employee", // Defaults to employee login role
    });

    // Compute completeness
    let completeness = 25;
    if (personalEmail) completeness += 10;
    if (phone) completeness += 10;
    if (dateOfBirth) completeness += 10;
    if (bankAccountNumber) completeness += 15;
    if (panNumber) completeness += 15;
    if (aadhaarNumber) completeness += 15;

    // 2. Create Employee
    const createdEmployee = {
      id: employeeId,
      tenantId: payload.tenantId,
      userId,
      employeeCode,
      firstName,
      middleName: middleName || null,
      lastName,
      personalEmail: personalEmail || null,
      workEmail,
      phone,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      bloodGroup: bloodGroup || null,
      maritalStatus: maritalStatus || null,
      nationality: nationality || null,
      currentAddress: currentAddress || null,
      permanentAddress: permanentAddress || null,
      sameAddress: !!sameAddress,
      departmentId,
      designationId,
      grade: grade || null,
      reportingManagerId: reportingManagerId || null,
      employmentType,
      employmentStatus,
      dateOfJoining,
      probationEndDate: probationEndDate || null,
      workLocation: workLocation || null,
      shiftId: shiftId || null,
      ctcAnnual: ctcAnnual ? parseFloat(ctcAnnual) : null,
      bankName: bankName || null,
      bankAccountNumber: bankAccountNumber || null,
      bankIfsc: bankIfsc || null,
      panNumber: panNumber || null,
      aadhaarNumber: aadhaarNumber || null,
      avatarUrl: avatarUrl || null,
      role: "employee" as const, // default role
      documents: documents || [],
      emergencyContact: emergencyContact || null,
      timeline: [
        {
          id: uid("tm_"),
          at: new Date().toISOString(),
          actor: payload.fullName,
          message: "Employee profile created in system.",
        },
      ],
      profileCompleteness: completeness,
    };

    await db.insert(employees).values(createdEmployee);

    return NextResponse.json({ data: createdEmployee, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error creating employee:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
