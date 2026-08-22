import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { salaryStructures, salaryStructureComponents, salaryComponents } from "@/db/schema";
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

    // Ensure default system-defined components exist for this tenant
    let comps = await db.query.salaryComponents.findMany({
      where: (sc, { eq }) => eq(sc.tenantId, payload.tenantId),
    });

    if (comps.length === 0) {
      const defaults = [
        { id: `sc_basic_${payload.tenantId}`, tenantId: payload.tenantId, name: "Basic Salary", code: "BASIC", type: "earning", calculationMethod: "percentage_of_ctc", value: 50, taxable: true, isSystemDefined: true, displayOrder: 1 },
        { id: `sc_hra_${payload.tenantId}`, tenantId: payload.tenantId, name: "House Rent Allowance", code: "HRA", type: "earning", calculationMethod: "percentage_of_basic", value: 40, taxable: true, isSystemDefined: true, displayOrder: 2 },
        { id: `sc_allowance_${payload.tenantId}`, tenantId: payload.tenantId, name: "Special Allowance", code: "SPECIAL", type: "earning", calculationMethod: "balance", taxable: true, isSystemDefined: true, displayOrder: 3 },
        { id: `sc_pf_${payload.tenantId}`, tenantId: payload.tenantId, name: "Provident Fund (Employee)", code: "PF_EE", type: "deduction", calculationMethod: "statutory", statutoryType: "pf_employee", taxable: false, isSystemDefined: true, displayOrder: 4 },
        { id: `sc_pt_${payload.tenantId}`, tenantId: payload.tenantId, name: "Professional Tax", code: "PT", type: "deduction", calculationMethod: "statutory", statutoryType: "professional_tax", taxable: false, isSystemDefined: true, displayOrder: 5 },
      ];
      await db.insert(salaryComponents).values(defaults);
      comps = await db.query.salaryComponents.findMany({
        where: (sc, { eq }) => eq(sc.tenantId, payload.tenantId),
      });
    }

    const list = await db.query.salaryStructures.findMany({
      where: (ss, { eq }) => eq(ss.tenantId, payload.tenantId),
    });

    const results = [];
    for (const struct of list) {
      const structComps = await db.query.salaryStructureComponents.findMany({
        where: (ssc, { eq }) => eq(ssc.structureId, struct.id),
      });

      const formattedComps = [];
      for (const sc of structComps) {
        const fullComponent = comps.find((c) => c.id === sc.componentId);
        if (fullComponent) {
          formattedComps.push({
            componentId: sc.componentId,
            component: fullComponent,
            overrideValue: sc.overrideValue || undefined,
            isEditable: sc.isEditable,
            displayOrder: sc.displayOrder,
          });
        }
      }

      results.push({
        ...struct,
        components: formattedComps,
      });
    }

    // If no structure exists, create a default one
    if (results.length === 0) {
      const structId = uid("str_");
      await db.insert(salaryStructures).values({
        id: structId,
        tenantId: payload.tenantId,
        name: "Standard Salary Structure",
        description: "Default salary structure with 50% Basic and 40% HRA",
        isDefault: true,
        isActive: true,
        createdAt: new Date().toISOString(),
      });

      const componentsToLink = comps.map((c, i) => ({
        id: uid("ssc_"),
        tenantId: payload.tenantId,
        structureId: structId,
        componentId: c.id,
        isEditable: true,
        displayOrder: i + 1,
      }));

      await db.insert(salaryStructureComponents).values(componentsToLink);
      
      const newStruct = await db.query.salaryStructures.findFirst({
        where: (ss, { eq }) => eq(ss.id, structId),
      });

      results.push({
        ...newStruct,
        components: comps.map((c, i) => ({
          componentId: c.id,
          component: c,
          isEditable: true,
          displayOrder: i + 1,
        })),
      });
    }

    return NextResponse.json({ data: results, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error in salary structures GET:", error);
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
    const { id, name, description, components, isDefault } = body;

    if (!name || !components || !Array.isArray(components)) {
      return NextResponse.json({ data: null, error: { message: "Name and components array are required" } }, { status: 400, headers: corsHeaders() });
    }

    let structureId = id;

    if (id) {
      const existing = await db.query.salaryStructures.findFirst({
        where: (ss, { eq, and }) => and(eq(ss.id, id), eq(ss.tenantId, payload.tenantId)),
      });

      if (!existing) {
        return NextResponse.json({ data: null, error: { message: "Salary structure not found" } }, { status: 404, headers: corsHeaders() });
      }

      await db.update(salaryStructures)
        .set({ name, description, isDefault: !!isDefault })
        .where(eq(salaryStructures.id, id));

      await db.delete(salaryStructureComponents).where(eq(salaryStructureComponents.structureId, id));
    } else {
      structureId = uid("str_");
      await db.insert(salaryStructures).values({
        id: structureId,
        tenantId: payload.tenantId,
        name,
        description: description || null,
        isDefault: !!isDefault,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    }

    // Link components
    const inserts = components.map((c: any, i: number) => ({
      id: uid("ssc_"),
      tenantId: payload.tenantId,
      structureId,
      componentId: c.componentId,
      overrideValue: c.overrideValue ? parseFloat(c.overrideValue) : null,
      isEditable: c.isEditable !== undefined ? !!c.isEditable : true,
      displayOrder: i + 1,
    }));

    if (inserts.length > 0) {
      await db.insert(salaryStructureComponents).values(inserts);
    }

    return NextResponse.json({ data: { id: structureId, name }, error: null }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("Error upserting salary structure:", error);
    return NextResponse.json({ data: null, error: { message: "Internal server error" } }, { status: 500, headers: corsHeaders() });
  }
}
