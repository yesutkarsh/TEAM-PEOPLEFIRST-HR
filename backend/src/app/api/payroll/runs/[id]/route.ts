import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { payrollRuns, payrollEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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
    const run = await db.query.payrollRuns.findFirst({
      where: (pr, { eq, and }) => and(eq(pr.id, id), eq(pr.tenantId, payload.tenantId)),
    });

    if (!run) {
      return NextResponse.json({ data: null, error: { message: "Payroll run not found" } }, { status: 404, headers: corsHeaders() });
    }

    // Fetch matching employee entries
    const entries = await db.query.payrollEntries.findMany({
      where: (pe, { eq, and }) => and(eq(pe.runId, id), eq(pe.tenantId, payload.tenantId)),
    });

    return NextResponse.json({
      data: {
        run,
        entries,
      },
      error: null
    }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error fetching payroll run detail:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
