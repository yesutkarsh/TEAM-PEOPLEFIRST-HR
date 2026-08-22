import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { employees, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { uid } from "@/lib/utils";
import { authenticate, corsHeaders, handleOptions } from "@/lib/auth";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = authenticate(req);
    if (!payload) {
      return NextResponse.json({ data: null, error: { message: "Unauthorized" } }, { status: 401, headers: corsHeaders() });
    }

    const { id } = await params;
    const emp = await db.query.employees.findFirst({
      where: (e, { eq, and }) => and(eq(e.id, id), eq(e.tenantId, payload.tenantId)),
    });

    if (!emp) {
      return NextResponse.json({ data: null, error: { message: "Employee profile not found" } }, { status: 404, headers: corsHeaders() });
    }

    return NextResponse.json({ data: emp, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error fetching employee details:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = authenticate(req);
    if (!payload) {
      return NextResponse.json({ data: null, error: { message: "Unauthorized" } }, { status: 401, headers: corsHeaders() });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await db.query.employees.findFirst({
      where: (e, { eq, and }) => and(eq(e.id, id), eq(e.tenantId, payload.tenantId)),
    });

    if (!existing) {
      return NextResponse.json({ data: null, error: { message: "Employee profile not found" } }, { status: 404, headers: corsHeaders() });
    }

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
      role,
    } = body;

    // Recalculate completeness
    let completeness = 25;
    if (personalEmail || existing.personalEmail) completeness += 10;
    if (phone || existing.phone) completeness += 10;
    if (dateOfBirth || existing.dateOfBirth) completeness += 10;
    if (bankAccountNumber || existing.bankAccountNumber) completeness += 15;
    if (panNumber || existing.panNumber) completeness += 15;
    if (aadhaarNumber || existing.aadhaarNumber) completeness += 15;

    // Record timeline log
    const updatedTimeline = [...((existing.timeline as any[]) || [])];
    const changes: string[] = [];
    if (firstName && firstName !== existing.firstName) changes.push(`First Name`);
    if (lastName && lastName !== existing.lastName) changes.push(`Last Name`);
    if (workEmail && workEmail !== existing.workEmail) changes.push(`Work Email`);
    if (departmentId && departmentId !== existing.departmentId) changes.push(`Department`);
    if (designationId && designationId !== existing.designationId) changes.push(`Designation`);
    if (ctcAnnual && parseFloat(ctcAnnual) !== existing.ctcAnnual) changes.push(`Compensation CTC`);

    if (changes.length > 0) {
      updatedTimeline.push({
        id: uid("tm_"),
        at: new Date().toISOString(),
        actor: payload.fullName,
        message: `Updated profile details: ${changes.join(", ")}.`,
      });
    }

    // Update DB
    const updates = {
      firstName: firstName !== undefined ? firstName : existing.firstName,
      middleName: middleName !== undefined ? middleName : existing.middleName,
      lastName: lastName !== undefined ? lastName : existing.lastName,
      personalEmail: personalEmail !== undefined ? personalEmail : existing.personalEmail,
      workEmail: workEmail !== undefined ? workEmail : existing.workEmail,
      phone: phone !== undefined ? phone : existing.phone,
      dateOfBirth: dateOfBirth !== undefined ? dateOfBirth : existing.dateOfBirth,
      gender: gender !== undefined ? gender : existing.gender,
      bloodGroup: bloodGroup !== undefined ? bloodGroup : existing.bloodGroup,
      maritalStatus: maritalStatus !== undefined ? maritalStatus : existing.maritalStatus,
      nationality: nationality !== undefined ? nationality : existing.nationality,
      currentAddress: currentAddress !== undefined ? currentAddress : existing.currentAddress,
      permanentAddress: permanentAddress !== undefined ? permanentAddress : existing.permanentAddress,
      sameAddress: sameAddress !== undefined ? !!sameAddress : existing.sameAddress,
      departmentId: departmentId !== undefined ? departmentId : existing.departmentId,
      designationId: designationId !== undefined ? designationId : existing.designationId,
      grade: grade !== undefined ? grade : existing.grade,
      reportingManagerId: reportingManagerId !== undefined ? reportingManagerId : existing.reportingManagerId,
      employmentType: employmentType !== undefined ? employmentType : existing.employmentType,
      employmentStatus: employmentStatus !== undefined ? employmentStatus : existing.employmentStatus,
      dateOfJoining: dateOfJoining !== undefined ? dateOfJoining : existing.dateOfJoining,
      probationEndDate: probationEndDate !== undefined ? probationEndDate : existing.probationEndDate,
      workLocation: workLocation !== undefined ? workLocation : existing.workLocation,
      shiftId: shiftId !== undefined ? shiftId : existing.shiftId,
      ctcAnnual: ctcAnnual !== undefined ? (ctcAnnual ? parseFloat(ctcAnnual) : null) : existing.ctcAnnual,
      bankName: bankName !== undefined ? bankName : existing.bankName,
      bankAccountNumber: bankAccountNumber !== undefined ? bankAccountNumber : existing.bankAccountNumber,
      bankIfsc: bankIfsc !== undefined ? bankIfsc : existing.bankIfsc,
      panNumber: panNumber !== undefined ? panNumber : existing.panNumber,
      aadhaarNumber: aadhaarNumber !== undefined ? aadhaarNumber : existing.aadhaarNumber,
      avatarUrl: avatarUrl !== undefined ? avatarUrl : existing.avatarUrl,
      documents: documents !== undefined ? documents : existing.documents,
      emergencyContact: emergencyContact !== undefined ? emergencyContact : existing.emergencyContact,
      role: role !== undefined ? role : existing.role,
      timeline: updatedTimeline,
      profileCompleteness: completeness,
      updatedAt: new Date(),
    };

    await db.update(employees).set(updates).where(eq(employees.id, id));

    // If role changed or user name/email changed, sync to user table
    if (existing.userId) {
      const userUpdates: Partial<typeof users.$inferInsert> = {};
      if (firstName || lastName) {
        userUpdates.fullName = `${firstName || existing.firstName} ${lastName || existing.lastName}`;
      }
      if (workEmail) {
        userUpdates.email = workEmail;
      }
      if (role) {
        userUpdates.role = role;
      }

      if (Object.keys(userUpdates).length > 0) {
        await db.update(users).set(userUpdates).where(eq(users.id, existing.userId));
      }
    }

    const updatedEmployee = await db.query.employees.findFirst({
      where: (e, { eq }) => eq(e.id, id),
    });

    return NextResponse.json({ data: updatedEmployee, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error updating employee profile:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = authenticate(req);
    if (!payload) {
      return NextResponse.json({ data: null, error: { message: "Unauthorized" } }, { status: 401, headers: corsHeaders() });
    }

    const { id } = await params;
    const existing = await db.query.employees.findFirst({
      where: (e, { eq, and }) => and(eq(e.id, id), eq(e.tenantId, payload.tenantId)),
    });

    if (!existing) {
      return NextResponse.json({ data: null, error: { message: "Employee profile not found" } }, { status: 404, headers: corsHeaders() });
    }

    // Delete Employee
    await db.delete(employees).where(eq(employees.id, id));

    // Also delete associated User account if it exists
    if (existing.userId) {
      await db.delete(users).where(eq(users.id, existing.userId));
    }

    return NextResponse.json({ data: true, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error deleting employee:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
