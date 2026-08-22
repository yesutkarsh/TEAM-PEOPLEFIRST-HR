import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { taxDeclarations } from "@/db/schema";
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
    const employeeId = searchParams.get("employeeId");
    const fy = searchParams.get("financialYear") || "2026-2027";

    if (!employeeId) {
      return NextResponse.json({ data: null, error: { message: "employeeId is required" } }, { status: 400, headers: corsHeaders() });
    }

    let dec = await db.query.taxDeclarations.findFirst({
      where: and(
        eq(taxDeclarations.tenantId, payload.tenantId),
        eq(taxDeclarations.employeeId, employeeId),
        eq(taxDeclarations.financialYear, fy)
      ),
    });

    if (!dec) {
      // Auto-initialize standard section list
      const sections = [
        {
          code: "80C",
          label: "Section 80C (PPF, ELSS, LIC, Tuition Fees, etc.)",
          maxLimit: 150000,
          total: 0,
          items: [
            { id: uid("di_"), label: "Public Provident Fund (PPF)", amount: 0, proofStatus: "not_uploaded" },
            { id: uid("di_"), label: "Equity Linked Savings Scheme (ELSS)", amount: 0, proofStatus: "not_uploaded" },
            { id: uid("di_"), label: "Life Insurance Premium", amount: 0, proofStatus: "not_uploaded" },
          ],
        },
        {
          code: "80D",
          label: "Section 80D (Medical Insurance Premium)",
          maxLimit: 25000,
          total: 0,
          items: [
            { id: uid("di_"), label: "Self and Family Health Insurance", amount: 0, proofStatus: "not_uploaded" },
            { id: uid("di_"), label: "Parents Health Insurance", amount: 0, proofStatus: "not_uploaded" },
          ],
        },
        {
          code: "HRA",
          label: "House Rent Allowance (HRA) Declarations",
          maxLimit: 1000000,
          total: 0,
          items: [
            { id: uid("di_"), label: "Rent Paid to Landlord", amount: 0, proofStatus: "not_uploaded" },
          ],
        },
      ];

      const newDec = {
        id: uid("dec_"),
        tenantId: payload.tenantId,
        employeeId,
        financialYear: fy,
        status: "draft",
        sections,
        totalDeclared: 0,
        submittedAt: null as string | null,
        approvedAt: null as string | null,
      };

      await db.insert(taxDeclarations).values(newDec);
      dec = newDec;
    }

    return NextResponse.json({ data: dec, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error fetching tax declarations:", error);
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
    const { id, employeeId, financialYear, sections, status } = body;

    if (!employeeId || !sections) {
      return NextResponse.json({ data: null, error: { message: "employeeId and sections are required" } }, { status: 400, headers: corsHeaders() });
    }

    const fy = financialYear || "2026-2027";

    // Recalculate totals
    let totalDeclared = 0;
    const updatedSections = sections.map((sec: any) => {
      const secTotal = sec.items.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);
      totalDeclared += Math.min(secTotal, sec.maxLimit);
      return {
        ...sec,
        total: secTotal,
      };
    });

    const existing = await db.query.taxDeclarations.findFirst({
      where: and(
        eq(taxDeclarations.tenantId, payload.tenantId),
        eq(taxDeclarations.employeeId, employeeId),
        eq(taxDeclarations.financialYear, fy)
      ),
    });

    if (existing) {
      await db.update(taxDeclarations)
        .set({
          sections: updatedSections,
          status: status || existing.status,
          totalDeclared,
          submittedAt: status === "submitted" ? new Date().toISOString() : existing.submittedAt,
          approvedAt: status === "approved" ? new Date().toISOString() : existing.approvedAt,
        })
        .where(eq(taxDeclarations.id, existing.id));
    } else {
      await db.insert(taxDeclarations).values({
        id: uid("dec_"),
        tenantId: payload.tenantId,
        employeeId,
        financialYear: fy,
        status: status || "draft",
        sections: updatedSections,
        totalDeclared,
        submittedAt: status === "submitted" ? new Date().toISOString() : null,
      });
    }

    const updated = await db.query.taxDeclarations.findFirst({
      where: and(
        eq(taxDeclarations.tenantId, payload.tenantId),
        eq(taxDeclarations.employeeId, employeeId),
        eq(taxDeclarations.financialYear, fy)
      ),
    });

    return NextResponse.json({ data: updated, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error saving tax declaration:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
