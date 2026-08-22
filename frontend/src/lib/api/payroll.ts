/**
 * Payroll mock API (Phase 7). Browser-storage backed — no backend.
 * All money is monthly INR unless a field name says "annual".
 */
import type { ApiResponse } from "../types/api";
import type { Employee } from "../types/employee";
import {
  DEFAULT_PT_SLABS,
  ESI_EMPLOYEE_RATE,
  ESI_EMPLOYER_RATE,
  ESI_GROSS_LIMIT,
  PF_RATE,
  PF_WAGE_CAP,
  monthLabel,
  type EmployeeSalary,
  type InvestmentDeclaration,
  type PayrollEntry,
  type PayrollEntryFlag,
  type PayrollLineItem,
  type PayrollRun,
  type PayrollRunStatus,
  type PayrollValidationIssue,
  type Payslip,
  type SalaryBreakup,
  type SalaryBreakupLine,
  type SalaryComponent,
  type SalaryStructure,
} from "../types/payroll";
import { delay, fail, ok, uid } from "./client";
import { listEmployees } from "./employees";
import { attendanceApi } from "./attendance";
import { formatCurrency } from "../utils/format";

const COMPONENTS_KEY = "hrms.payroll.components";
const STRUCTURES_KEY = "hrms.payroll.structures";
const SALARIES_KEY = "hrms.payroll.salaries";
const RUNS_KEY = "hrms.payroll.runs";
const ENTRIES_KEY = "hrms.payroll.entries";
const PAYSLIPS_KEY = "hrms.payroll.payslips";
const DECLARATIONS_KEY = "hrms.payroll.declarations";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// ───────────────────────── seed ─────────────────────────

function seedComponents(): SalaryComponent[] {
  const base = (c: Partial<SalaryComponent> & Pick<SalaryComponent, "id" | "name" | "code" | "type" | "calculationMethod" | "displayOrder">): SalaryComponent => ({
    taxable: true,
    isActive: true,
    isSystemDefined: false,
    ...c,
  });
  return [
    base({ id: "pc_basic", name: "Basic Salary", code: "BASIC", type: "earning", calculationMethod: "percentage_of_ctc", value: 40, displayOrder: 1, description: "Foundation of the salary structure." }),
    base({ id: "pc_hra", name: "House Rent Allowance", code: "HRA", type: "earning", calculationMethod: "percentage_of_basic", value: 40, displayOrder: 2 }),
    base({ id: "pc_conv", name: "Conveyance Allowance", code: "CONV", type: "earning", calculationMethod: "fixed", value: 1600, displayOrder: 3 }),
    base({ id: "pc_special", name: "Special Allowance", code: "SPECIAL", type: "earning", calculationMethod: "balance", displayOrder: 4, description: "Balancing figure so earnings + employer cost equal CTC." }),
    base({ id: "pc_pf_emp", name: "PF (Employee)", code: "PFEMP", type: "deduction", calculationMethod: "statutory", statutoryType: "pf_employee", taxable: false, isSystemDefined: true, displayOrder: 5, pfOnActualBasic: false }),
    base({ id: "pc_esi_emp", name: "ESI (Employee)", code: "ESIEMP", type: "deduction", calculationMethod: "statutory", statutoryType: "esi_employee", taxable: false, isSystemDefined: true, displayOrder: 6 }),
    base({ id: "pc_pt", name: "Professional Tax", code: "PT", type: "deduction", calculationMethod: "slab", statutoryType: "professional_tax", taxable: false, isSystemDefined: true, displayOrder: 7, slabs: DEFAULT_PT_SLABS }),
    base({ id: "pc_tds", name: "TDS", code: "TDS", type: "deduction", calculationMethod: "statutory", statutoryType: "tds", taxable: false, isSystemDefined: true, displayOrder: 8, value: 0, description: "MVP1: entered manually per employee in the payroll review." }),
    base({ id: "pc_pf_er", name: "PF (Employer)", code: "PFER", type: "employer_contribution", calculationMethod: "statutory", statutoryType: "pf_employer", taxable: false, isSystemDefined: true, displayOrder: 9 }),
    base({ id: "pc_esi_er", name: "ESI (Employer)", code: "ESIER", type: "employer_contribution", calculationMethod: "statutory", statutoryType: "esi_employer", taxable: false, isSystemDefined: true, displayOrder: 10 }),
  ];
}

function getComponents(): SalaryComponent[] {
  let list = read<SalaryComponent[]>(COMPONENTS_KEY, []);
  if (list.length === 0) {
    list = seedComponents();
    write(COMPONENTS_KEY, list);
  }
  return list;
}

function seedStructures(components: SalaryComponent[]): SalaryStructure[] {
  const pick = (codes: string[]) =>
    codes
      .map((code, i) => {
        const component = components.find((c) => c.code === code)!;
        return { componentId: component.id, component, isEditable: component.type === "earning", displayOrder: i + 1 };
      })
      .filter((c) => !!c.component);
  const all = ["BASIC", "HRA", "CONV", "SPECIAL", "PFEMP", "ESIEMP", "PT", "TDS", "PFER", "ESIER"];
  return [
    {
      id: "ps_standard",
      name: "Standard — All Employees",
      description: "Default structure applied to every employee without a custom assignment.",
      components: pick(all),
      employeeCount: 0,
      isDefault: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "ps_senior",
      name: "Senior — Leadership",
      description: "Higher basic proportion for senior grades.",
      components: pick(all),
      employeeCount: 0,
      isDefault: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];
}

function getStructures(): SalaryStructure[] {
  const components = getComponents();
  let list = read<SalaryStructure[]>(STRUCTURES_KEY, []);
  if (list.length === 0) {
    list = seedStructures(components);
    write(STRUCTURES_KEY, list);
  }
  // keep embedded component snapshots fresh
  list = list.map((s) => ({
    ...s,
    components: s.components
      .map((sc) => ({ ...sc, component: components.find((c) => c.id === sc.componentId) ?? sc.component }))
      .filter((sc) => !!sc.component),
  }));
  const salaries = read<EmployeeSalary[]>(SALARIES_KEY, []);
  return list.map((s) => ({
    ...s,
    employeeCount: salaries.filter((a) => a.structureId === s.id && !a.effectiveTo).length,
  }));
}

// ───────────────────────── calculation engine ─────────────────────────

function round(n: number) {
  return Math.round(n);
}

function ptFor(gross: number, slabs = DEFAULT_PT_SLABS): { tax: number; label: string } {
  const sorted = [...slabs].sort((a, b) => a.upTo - b.upTo);
  for (const s of sorted) {
    if (gross <= s.upTo) return { tax: s.tax, label: `Gross up to ${formatCurrency(s.upTo)}` };
  }
  const last = sorted[sorted.length - 1];
  return { tax: last?.tax ?? 0, label: "Top slab" };
}

export interface BreakupOptions {
  /** Proration factor (daysWorked / workingDays). 1 = full month. */
  proration?: number;
  /** Manual TDS for the month (MVP1 — no auto TDS). */
  tds?: number;
}

/**
 * Computes the monthly salary breakup for a structure + annual CTC.
 * Order matters: basic → % of basic → fixed → statutory employer → balance → employee deductions.
 * ESI depends on gross which depends on the balance component, so the balance figure is solved
 * against employer PF only and ESI is then applied on the resulting gross (documented approximation).
 */
export function computeBreakup(structure: SalaryStructure, annualCtc: number, opts: BreakupOptions = {}): SalaryBreakup {
  const proration = opts.proration ?? 1;
  const monthlyCtc = round((annualCtc || 0) / 12);
  const comps = [...structure.components].sort((a, b) => a.displayOrder - b.displayOrder);
  const valueOf = (sc: (typeof comps)[number]) => sc.overrideValue ?? sc.component.value ?? 0;

  const earnings: SalaryBreakupLine[] = [];
  const deductions: SalaryBreakupLine[] = [];
  const employerContribs: SalaryBreakupLine[] = [];

  // 1 — Basic
  const basicSc = comps.find((c) => c.component.code === "BASIC");
  const basic = basicSc
    ? basicSc.component.calculationMethod === "fixed"
      ? valueOf(basicSc)
      : round((monthlyCtc * valueOf(basicSc)) / 100)
    : round(monthlyCtc * 0.4);

  // 2 — Non-balance earnings
  let earningsSum = 0;
  for (const sc of comps) {
    if (sc.component.type !== "earning") continue;
    const c = sc.component;
    if (c.calculationMethod === "balance") continue;
    let amount = 0;
    let note: string | undefined;
    if (c.code === "BASIC") {
      amount = basic;
      note = c.calculationMethod === "percentage_of_ctc" ? `${valueOf(sc)}% of CTC` : "Fixed";
    } else if (c.calculationMethod === "percentage_of_basic") {
      amount = round((basic * valueOf(sc)) / 100);
      note = `${valueOf(sc)}% of Basic`;
    } else if (c.calculationMethod === "percentage_of_ctc") {
      amount = round((monthlyCtc * valueOf(sc)) / 100);
      note = `${valueOf(sc)}% of CTC`;
    } else {
      amount = valueOf(sc);
      note = "Fixed";
    }
    amount = round(amount * proration);
    earningsSum += amount;
    earnings.push({ componentId: c.id, component: c, monthlyAmount: amount, annualAmount: amount * 12, note });
  }

  // 3 — Employer PF (needed before solving the balance component)
  const pfErSc = comps.find((c) => c.component.statutoryType === "pf_employer");
  const pfBaseFull = pfErSc?.component.pfOnActualBasic ? basic : Math.min(basic, PF_WAGE_CAP);
  const pfBase = round(pfBaseFull * proration);
  const pfEmployer = pfErSc ? round(pfBase * PF_RATE) : 0;

  // 4 — Balance component (Special Allowance)
  const balanceSc = comps.find((c) => c.component.calculationMethod === "balance");
  if (balanceSc) {
    const target = round(monthlyCtc * proration) - pfEmployer - earningsSum;
    const amount = Math.max(0, target);
    earningsSum += amount;
    earnings.push({
      componentId: balanceSc.component.id,
      component: balanceSc.component,
      monthlyAmount: amount,
      annualAmount: amount * 12,
      note: "Balance of CTC",
    });
  }

  const grossEarnings = earningsSum;
  const esiApplicable = grossEarnings <= ESI_GROSS_LIMIT;

  // 5 — Employer contributions
  for (const sc of comps) {
    if (sc.component.type !== "employer_contribution") continue;
    const c = sc.component;
    if (c.statutoryType === "pf_employer") {
      employerContribs.push({
        componentId: c.id, component: c, monthlyAmount: pfEmployer, annualAmount: pfEmployer * 12,
        note: `${PF_RATE * 100}% of Basic${!c.pfOnActualBasic && basic > PF_WAGE_CAP ? ` (on ${formatCurrency(PF_WAGE_CAP)} cap)` : ""}`,
      });
    } else if (c.statutoryType === "esi_employer") {
      const amount = esiApplicable ? round(grossEarnings * ESI_EMPLOYER_RATE) : 0;
      employerContribs.push({
        componentId: c.id, component: c, monthlyAmount: amount, annualAmount: amount * 12,
        note: esiApplicable ? "3.25% of Gross" : "Not applicable — gross above ₹21,000",
        notApplicable: !esiApplicable,
      });
    } else {
      const amount = round((sc.overrideValue ?? c.value ?? 0) * proration);
      employerContribs.push({ componentId: c.id, component: c, monthlyAmount: amount, annualAmount: amount * 12, note: "Fixed" });
    }
  }

  // 6 — Employee deductions
  for (const sc of comps) {
    if (sc.component.type !== "deduction") continue;
    const c = sc.component;
    let amount = 0;
    let note: string | undefined;
    let notApplicable = false;
    switch (c.statutoryType) {
      case "pf_employee":
        amount = round(pfBase * PF_RATE);
        note = `12% of Basic${!c.pfOnActualBasic && basic > PF_WAGE_CAP ? ` (on ${formatCurrency(PF_WAGE_CAP)} cap)` : ""}`;
        break;
      case "esi_employee":
        amount = esiApplicable ? round(grossEarnings * ESI_EMPLOYEE_RATE) : 0;
        note = esiApplicable ? "0.75% of Gross" : "Not applicable — gross above ₹21,000";
        notApplicable = !esiApplicable;
        break;
      case "professional_tax": {
        const pt = ptFor(grossEarnings, c.slabs ?? DEFAULT_PT_SLABS);
        amount = pt.tax;
        note = `Slab: ${pt.label}`;
        break;
      }
      case "tds":
        amount = opts.tds ?? 0;
        note = "Entered manually (MVP1)";
        break;
      default:
        amount = c.calculationMethod === "percentage_of_basic"
          ? round((basic * (sc.overrideValue ?? c.value ?? 0)) / 100)
          : round((sc.overrideValue ?? c.value ?? 0) * proration);
        note = c.calculationMethod === "percentage_of_basic" ? `${sc.overrideValue ?? c.value ?? 0}% of Basic` : "Fixed";
    }
    deductions.push({ componentId: c.id, component: c, monthlyAmount: amount, annualAmount: amount * 12, note, notApplicable });
  }

  const totalDeductions = deductions.reduce((n, l) => n + l.monthlyAmount, 0);
  const totalEmployerContrib = employerContribs.reduce((n, l) => n + l.monthlyAmount, 0);
  return {
    earnings,
    deductions,
    employerContribs,
    grossEarnings,
    totalDeductions,
    netPay: grossEarnings - totalDeductions,
    totalEmployerContrib,
    totalCost: grossEarnings + totalEmployerContrib,
    monthlyCtc,
    unallocated: round(monthlyCtc * proration) - (grossEarnings + totalEmployerContrib),
  };
}

function toLineItems(lines: SalaryBreakupLine[]): PayrollLineItem[] {
  return lines.map((l) => ({
    componentId: l.componentId,
    componentName: l.component.name,
    componentCode: l.component.code,
    amount: l.monthlyAmount,
    isManualOverride: false,
    note: l.note,
  }));
}

// ───────────────────────── helpers ─────────────────────────

function getSalaries(): EmployeeSalary[] {
  return read<EmployeeSalary[]>(SALARIES_KEY, []);
}

function currentSalaryOf(employeeId: string): EmployeeSalary | undefined {
  return getSalaries().find((s) => s.employeeId === employeeId && !s.effectiveTo);
}

function workingDaysInMonth(year: number, month: number): number {
  const days = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const wd = new Date(year, month - 1, d).getDay();
    if (wd !== 0 && wd !== 6) count++;
  }
  return count;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// ───────────────────────── public API ─────────────────────────

export const payrollApi = {
  // ---------- components ----------
  async listComponents(): Promise<ApiResponse<SalaryComponent[]>> {
    return delay(ok([...getComponents()].sort((a, b) => a.displayOrder - b.displayOrder)));
  },

  async isCodeUnique(code: string, ignoreId?: string): Promise<boolean> {
    return !getComponents().some((c) => c.code.toUpperCase() === code.toUpperCase() && c.id !== ignoreId);
  },

  async saveComponent(input: Partial<SalaryComponent> & { name: string; code: string; type: SalaryComponent["type"]; calculationMethod: SalaryComponent["calculationMethod"] }): Promise<ApiResponse<SalaryComponent>> {
    const list = getComponents();
    if (list.some((c) => c.code.toUpperCase() === input.code.toUpperCase() && c.id !== input.id)) {
      return delay(fail<SalaryComponent>(`Code ${input.code.toUpperCase()} is already used by another component.`));
    }
    if (input.id) {
      const next = list.map((c) => (c.id === input.id ? { ...c, ...input, code: input.code.toUpperCase() } : c));
      write(COMPONENTS_KEY, next);
      return delay(ok(next.find((c) => c.id === input.id)!));
    }
    const created: SalaryComponent = {
      id: uid("pc_"),
      description: input.description,
      value: input.value,
      statutoryType: input.statutoryType,
      slabs: input.slabs,
      taxable: input.taxable ?? true,
      isActive: input.isActive ?? true,
      isSystemDefined: false,
      displayOrder: list.length + 1,
      name: input.name,
      code: input.code.toUpperCase(),
      type: input.type,
      calculationMethod: input.calculationMethod,
      pfOnActualBasic: input.pfOnActualBasic,
    };
    write(COMPONENTS_KEY, [...list, created]);
    return delay(ok(created));
  },

  async deleteComponent(id: string): Promise<ApiResponse<true>> {
    const list = getComponents();
    const target = list.find((c) => c.id === id);
    if (!target) return delay(fail<true>("Component not found."));
    if (target.isSystemDefined) return delay(fail<true>("System components cannot be deleted."));
    const used = getStructures().some((s) => s.components.some((sc) => sc.componentId === id));
    if (used) return delay(fail<true>("This component is used in a salary structure. Remove it there first."));
    write(COMPONENTS_KEY, list.filter((c) => c.id !== id));
    return delay(ok(true as const));
  },

  async reorderComponents(ids: string[]): Promise<ApiResponse<SalaryComponent[]>> {
    const list = getComponents().map((c) => {
      const i = ids.indexOf(c.id);
      return i === -1 ? c : { ...c, displayOrder: i + 1 };
    });
    write(COMPONENTS_KEY, list);
    return delay(ok(list));
  },

  // ---------- structures ----------
  async listStructures(): Promise<ApiResponse<SalaryStructure[]>> {
    return delay(ok(getStructures()));
  },

  async getStructure(id: string): Promise<ApiResponse<SalaryStructure>> {
    const s = getStructures().find((x) => x.id === id);
    return delay(s ? ok(s) : fail<SalaryStructure>("Salary structure not found."));
  },

  async saveStructure(input: Partial<SalaryStructure> & { name: string }): Promise<ApiResponse<SalaryStructure>> {
    const list = read<SalaryStructure[]>(STRUCTURES_KEY, getStructures());
    if (input.id) {
      const next = list.map((s) => (s.id === input.id ? { ...s, ...input } : s));
      write(STRUCTURES_KEY, next);
      return delay(ok(getStructures().find((s) => s.id === input.id)!));
    }
    const created: SalaryStructure = {
      id: uid("ps_"),
      name: input.name,
      description: input.description,
      components: input.components ?? [],
      employeeCount: 0,
      isDefault: list.length === 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    write(STRUCTURES_KEY, [...list, created]);
    return delay(ok(created));
  },

  async cloneStructure(id: string): Promise<ApiResponse<SalaryStructure>> {
    const src = getStructures().find((s) => s.id === id);
    if (!src) return delay(fail<SalaryStructure>("Salary structure not found."));
    return payrollApi.saveStructure({ name: `${src.name} (copy)`, description: src.description, components: src.components });
  },

  async setDefaultStructure(id: string): Promise<ApiResponse<SalaryStructure[]>> {
    const list = read<SalaryStructure[]>(STRUCTURES_KEY, getStructures()).map((s) => ({ ...s, isDefault: s.id === id }));
    write(STRUCTURES_KEY, list);
    return delay(ok(getStructures()));
  },

  async deleteStructure(id: string): Promise<ApiResponse<true>> {
    const assigned = getSalaries().some((s) => s.structureId === id && !s.effectiveTo);
    if (assigned) return delay(fail<true>("Employees are assigned to this structure. Reassign them first."));
    write(STRUCTURES_KEY, read<SalaryStructure[]>(STRUCTURES_KEY, getStructures()).filter((s) => s.id !== id));
    return delay(ok(true as const));
  },

  // ---------- employee salary ----------
  async listSalaries(employeeId: string): Promise<ApiResponse<EmployeeSalary[]>> {
    const list = getSalaries()
      .filter((s) => s.employeeId === employeeId)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
    return delay(ok(list));
  },

  async getCurrentSalary(employeeId: string): Promise<ApiResponse<EmployeeSalary | null>> {
    return delay(ok(currentSalaryOf(employeeId) ?? null));
  },

  async assignSalary(input: {
    employeeId: string;
    structureId: string;
    annualCtc: number;
    effectiveFrom: string;
    bankName: string;
    bankAccountNumber: string;
    bankIfsc: string;
    panNumber?: string;
  }): Promise<ApiResponse<EmployeeSalary>> {
    const list = getSalaries();
    const prior = list.find((s) => s.employeeId === input.employeeId && !s.effectiveTo);
    const closed = prior
      ? list.map((s) =>
          s.id === prior.id
            ? { ...s, effectiveTo: new Date(new Date(input.effectiveFrom).getTime() - 86400000).toISOString().slice(0, 10) }
            : s,
        )
      : list;
    const created: EmployeeSalary = { id: uid("sal_"), createdAt: new Date().toISOString(), ...input };
    write(SALARIES_KEY, [created, ...closed]);
    return delay(ok(created));
  },

  /** Breakup preview for a structure + CTC (no persistence). */
  async previewBreakup(structureId: string, annualCtc: number): Promise<ApiResponse<SalaryBreakup>> {
    const s = getStructures().find((x) => x.id === structureId);
    if (!s) return delay(fail<SalaryBreakup>("Salary structure not found."));
    return delay(ok(computeBreakup(s, annualCtc)));
  },

  // ---------- runs ----------
  async listRuns(): Promise<ApiResponse<PayrollRun[]>> {
    const list = read<PayrollRun[]>(RUNS_KEY, []).sort((a, b) =>
      b.year - a.year || b.month - a.month,
    );
    return delay(ok(list));
  },

  async getRun(id: string): Promise<ApiResponse<PayrollRun>> {
    const run = read<PayrollRun[]>(RUNS_KEY, []).find((r) => r.id === id);
    return delay(run ? ok(run) : fail<PayrollRun>("Payroll run not found."));
  },

  async listEntries(runId: string): Promise<ApiResponse<PayrollEntry[]>> {
    return delay(ok(read<PayrollEntry[]>(ENTRIES_KEY, []).filter((e) => e.runId === runId)));
  },

  async createRun(input: {
    month: number;
    year: number;
    departmentIds?: string[];
    notes?: string;
    initiatedBy: string;
  }): Promise<ApiResponse<PayrollRun>> {
    const runs = read<PayrollRun[]>(RUNS_KEY, []);
    // Edge case 10 — duplicate run guard.
    const blocking = runs.find(
      (r) => r.month === input.month && r.year === input.year && (r.status === "finalised" || r.status === "paid"),
    );
    if (blocking) {
      return delay(
        fail<PayrollRun>(
          `A finalised payroll already exists for ${monthLabel(input.month, input.year)}. Cancel the existing run first.`,
        ),
      );
    }

    const empRes = await listEmployees();
    let employees = (empRes.data ?? []).filter((e) => e.employmentStatus !== "inactive");
    if (input.departmentIds?.length) {
      employees = employees.filter((e) => input.departmentIds!.includes(e.departmentId));
    }

    const structures = getStructures();
    const defaultStructure = structures.find((s) => s.isDefault) ?? structures[0];
    const runId = uid("run_");
    const entries: PayrollEntry[] = [];
    const workingDays = workingDaysInMonth(input.year, input.month);
    const monthStart = new Date(input.year, input.month - 1, 1);
    const monthEnd = new Date(input.year, input.month, 0);

    for (const emp of employees) {
      const salary = currentSalaryOf(emp.id);
      const structure = structures.find((s) => s.id === salary?.structureId) ?? defaultStructure;
      if (!structure) continue;
      const annualCtc = salary?.annualCtc ?? emp.ctcAnnual ?? 600000;

      // Edge case 1/2 — proration for mid-month joiners and exits.
      const doj = new Date(emp.dateOfJoining);
      const flags: PayrollEntryFlag[] = [];
      let daysWorkedBase = workingDays;
      if (doj > monthStart && doj <= monthEnd) {
        let count = 0;
        for (let d = doj.getDate(); d <= monthEnd.getDate(); d++) {
          const wd = new Date(input.year, input.month - 1, d).getDay();
          if (wd !== 0 && wd !== 6) count++;
        }
        daysWorkedBase = count;
        flags.push("prorated");
      }
      if (emp.employmentStatus === "exited" || emp.employmentStatus === "notice_period") {
        flags.push("final_settlement");
      }

      // LOP from Phase 6 attendance.
      const att = await attendanceApi.getMonth(emp.id, input.year, input.month - 1);
      let lopDays = (att.data ?? []).filter((r) => r.status === "absent").length;
      // Edge case 7 — impossible LOP.
      if (lopDays > workingDays) lopDays = workingDays;
      const daysWorked = Math.max(0, daysWorkedBase - lopDays);
      const proration = workingDays > 0 ? daysWorked / workingDays : 1;

      const breakup = computeBreakup(structure, annualCtc, { proration });
      const fullBreakup = computeBreakup(structure, annualCtc);
      const lopAmount = Math.max(0, fullBreakup.grossEarnings - breakup.grossEarnings);

      entries.push({
        id: uid("pe_"),
        runId,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        employeeCode: emp.employeeCode,
        departmentId: emp.departmentId,
        structureId: structure.id,
        structureName: structure.name,
        monthlyCtc: Math.round(annualCtc / 12),
        annualCtc,
        lopDays,
        lopAmount,
        workingDays,
        daysWorked,
        earnings: toLineItems(breakup.earnings),
        deductions: toLineItems(breakup.deductions),
        employerContribs: toLineItems(breakup.employerContribs),
        grossEarnings: breakup.grossEarnings,
        totalDeductions: breakup.totalDeductions,
        netPay: breakup.netPay,
        totalCost: breakup.totalCost,
        ytdGross: breakup.grossEarnings * ((input.month + 8) % 12 || 1),
        ytdDeductions: breakup.totalDeductions * ((input.month + 8) % 12 || 1),
        ytdNetPay: breakup.netPay * ((input.month + 8) % 12 || 1),
        isManuallyEdited: false,
        payslipGenerated: false,
        flags,
        bankName: salary?.bankName ?? emp.bankName,
        bankAccountNumber: salary?.bankAccountNumber ?? emp.bankAccountNumber,
        bankIfsc: salary?.bankIfsc ?? emp.bankIfsc,
      });
    }

    const run: PayrollRun = {
      id: runId,
      month: input.month,
      year: input.year,
      status: "draft",
      employeeCount: entries.length,
      totalGross: entries.reduce((n, e) => n + e.grossEarnings, 0),
      totalDeductions: entries.reduce((n, e) => n + e.totalDeductions, 0),
      totalNetPay: entries.reduce((n, e) => n + e.netPay, 0),
      totalEmployerCost: entries.reduce((n, e) => n + e.totalCost, 0),
      initiatedBy: input.initiatedBy,
      initiatedAt: new Date().toISOString(),
      validationIssues: [],
      notes: input.notes,
      log: [{ id: uid("lg_"), at: new Date().toISOString(), actor: input.initiatedBy, message: "Payroll run created in draft." }],
    };
    run.validationIssues = validateEntries(entries);
    write(ENTRIES_KEY, [...read<PayrollEntry[]>(ENTRIES_KEY, []), ...entries]);
    write(RUNS_KEY, [run, ...runs]);
    return delay(ok(run), 600);
  },

  async refreshValidation(runId: string): Promise<ApiResponse<PayrollRun>> {
    const runs = read<PayrollRun[]>(RUNS_KEY, []);
    const run = runs.find((r) => r.id === runId);
    if (!run) return delay(fail<PayrollRun>("Payroll run not found."));
    const entries = read<PayrollEntry[]>(ENTRIES_KEY, []).filter((e) => e.runId === runId);
    const next = { ...run, validationIssues: validateEntries(entries), ...totalsOf(entries) };
    write(RUNS_KEY, runs.map((r) => (r.id === runId ? next : r)));
    return delay(ok(next));
  },

  async updateEntry(entryId: string, patch: {
    earnings?: PayrollLineItem[];
    deductions?: PayrollLineItem[];
    lopDays?: number;
    notes: string;
  }): Promise<ApiResponse<PayrollEntry>> {
    const all = read<PayrollEntry[]>(ENTRIES_KEY, []);
    const entry = all.find((e) => e.id === entryId);
    if (!entry) return delay(fail<PayrollEntry>("Payroll entry not found."));
    const earnings = patch.earnings ?? entry.earnings;
    const deductions = patch.deductions ?? entry.deductions;
    const grossEarnings = earnings.reduce((n, l) => n + l.amount, 0);
    const totalDeductions = deductions.reduce((n, l) => n + l.amount, 0);
    const employerTotal = entry.employerContribs.reduce((n, l) => n + l.amount, 0);
    const next: PayrollEntry = {
      ...entry,
      earnings,
      deductions,
      lopDays: patch.lopDays ?? entry.lopDays,
      grossEarnings,
      totalDeductions,
      netPay: grossEarnings - totalDeductions,
      totalCost: grossEarnings + employerTotal,
      isManuallyEdited: true,
      manualEditNotes: patch.notes,
      flags: entry.flags.includes("manually_edited") ? entry.flags : [...entry.flags, "manually_edited"],
    };
    const list = all.map((e) => (e.id === entryId ? next : e));
    write(ENTRIES_KEY, list);
    await payrollApi.refreshValidation(entry.runId);
    return delay(ok(next));
  },

  async setRunStatus(runId: string, status: PayrollRunStatus, actor: string): Promise<ApiResponse<PayrollRun>> {
    const runs = read<PayrollRun[]>(RUNS_KEY, []);
    const run = runs.find((r) => r.id === runId);
    if (!run) return delay(fail<PayrollRun>("Payroll run not found."));
    const next: PayrollRun = {
      ...run,
      status,
      paidAt: status === "paid" ? new Date().toISOString() : run.paidAt,
      log: [
        ...run.log,
        { id: uid("lg_"), at: new Date().toISOString(), actor, message: `Status changed to ${status.replace("_", " ")}.` },
      ],
    };
    write(RUNS_KEY, runs.map((r) => (r.id === runId ? next : r)));
    return delay(ok(next));
  },

  async finaliseRun(runId: string, actor: string): Promise<ApiResponse<{ run: PayrollRun; payslips: number }>> {
    const runs = read<PayrollRun[]>(RUNS_KEY, []);
    const run = runs.find((r) => r.id === runId);
    if (!run) return delay(fail<{ run: PayrollRun; payslips: number }>("Payroll run not found."));
    const entries = read<PayrollEntry[]>(ENTRIES_KEY, []);
    const mine = entries.filter((e) => e.runId === runId && !e.excluded);
    const issues = validateEntries(mine);
    if (issues.some((i) => i.severity === "error")) {
      return delay(fail<{ run: PayrollRun; payslips: number }>("Resolve all errors before finalising this payroll run."));
    }
    const empRes = await listEmployees();
    const employees = empRes.data ?? [];
    const slips: Payslip[] = mine.map((e) => {
      const emp = employees.find((x) => x.id === e.employeeId);
      return {
        id: uid("slip_"),
        entryId: e.id,
        employeeId: e.employeeId,
        runId,
        month: run.month,
        year: run.year,
        employeeName: e.employeeName,
        employeeCode: e.employeeCode,
        designation: emp?.designationId,
        department: emp?.departmentId,
        dateOfJoining: emp?.dateOfJoining,
        panNumber: emp?.panNumber,
        bankName: e.bankName,
        bankAccountNumber: e.bankAccountNumber,
        earnings: e.earnings,
        deductions: e.deductions,
        employerContribs: e.employerContribs,
        grossEarnings: e.grossEarnings,
        totalDeductions: e.totalDeductions,
        netPay: e.netPay,
        ytdGross: e.ytdGross,
        ytdDeductions: e.ytdDeductions,
        ytdNetPay: e.ytdNetPay,
        generatedAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
        note: e.flags.includes("prorated") ? "Salary prorated for part of the month." : undefined,
      };
    });
    write(PAYSLIPS_KEY, [...read<Payslip[]>(PAYSLIPS_KEY, []).filter((p) => p.runId !== runId), ...slips]);
    write(ENTRIES_KEY, entries.map((e) => (e.runId === runId ? { ...e, payslipGenerated: true } : e)));
    const next: PayrollRun = {
      ...run,
      status: "finalised",
      finalisedBy: actor,
      finalisedAt: new Date().toISOString(),
      ...totalsOf(mine),
      log: [...run.log, { id: uid("lg_"), at: new Date().toISOString(), actor, message: `Finalised — ${slips.length} pay slips generated.` }],
    };
    write(RUNS_KEY, runs.map((r) => (r.id === runId ? next : r)));
    return delay(ok({ run: next, payslips: slips.length }), 700);
  },

  // ---------- payslips ----------
  async listPayslips(employeeId: string): Promise<ApiResponse<Payslip[]>> {
    const list = read<Payslip[]>(PAYSLIPS_KEY, [])
      .filter((p) => p.employeeId === employeeId)
      .sort((a, b) => b.year - a.year || b.month - a.month);
    return delay(ok(list));
  },

  async getPayslip(id: string): Promise<ApiResponse<Payslip>> {
    const slip = read<Payslip[]>(PAYSLIPS_KEY, []).find((p) => p.id === id);
    return delay(slip ? ok(slip) : fail<Payslip>("Pay slip not found."));
  },

  // ---------- declarations ----------
  async getDeclaration(employeeId: string, financialYear: string): Promise<ApiResponse<InvestmentDeclaration>> {
    const list = read<InvestmentDeclaration[]>(DECLARATIONS_KEY, []);
    let dec = list.find((d) => d.employeeId === employeeId && d.financialYear === financialYear);
    if (!dec) {
      dec = seedDeclaration(employeeId, financialYear);
      write(DECLARATIONS_KEY, [...list, dec]);
    }
    return delay(ok(dec));
  },

  async saveDeclaration(dec: InvestmentDeclaration): Promise<ApiResponse<InvestmentDeclaration>> {
    const sections = dec.sections.map((s) => ({ ...s, total: s.items.reduce((n, i) => n + (i.amount || 0), 0) }));
    const next: InvestmentDeclaration = {
      ...dec,
      sections,
      totalDeclared: sections.reduce((n, s) => n + Math.min(s.total, s.maxLimit), 0),
    };
    const list = read<InvestmentDeclaration[]>(DECLARATIONS_KEY, []);
    write(DECLARATIONS_KEY, list.some((d) => d.id === next.id) ? list.map((d) => (d.id === next.id ? next : d)) : [...list, next]);
    return delay(ok(next));
  },

  async submitDeclaration(id: string): Promise<ApiResponse<InvestmentDeclaration>> {
    const list = read<InvestmentDeclaration[]>(DECLARATIONS_KEY, []);
    const dec = list.find((d) => d.id === id);
    if (!dec) return delay(fail<InvestmentDeclaration>("Declaration not found."));
    const next: InvestmentDeclaration = { ...dec, status: "submitted", submittedAt: new Date().toISOString() };
    write(DECLARATIONS_KEY, list.map((d) => (d.id === id ? next : d)));
    return delay(ok(next));
  },

  // ---------- reports / exports ----------
  async bankFile(runId: string): Promise<ApiResponse<{ csv: string; included: number; excluded: number }>> {
    const entries = read<PayrollEntry[]>(ENTRIES_KEY, []).filter((e) => e.runId === runId && !e.excluded);
    const run = read<PayrollRun[]>(RUNS_KEY, []).find((r) => r.id === runId);
    if (!run) return delay(fail<{ csv: string; included: number; excluded: number }>("Payroll run not found."));
    const withBank = entries.filter((e) => e.bankAccountNumber && e.bankIfsc);
    const excluded = entries.length - withBank.length;
    const header = [
      excluded > 0 ? `# Excluded: ${excluded} employees (missing bank details)` : "# Excluded: 0 employees",
      "Sequence,Bank Name,Account Number,IFSC,Employee Name,Amount,Reference",
    ];
    const rows = withBank.map((e, i) =>
      [
        i + 1,
        e.bankName ?? "",
        e.bankAccountNumber ?? "",
        e.bankIfsc ?? "",
        e.employeeName,
        e.netPay.toFixed(2),
        `"SAL-${monthLabel(run.month, run.year).slice(0, 3).toUpperCase()}-${run.year}-${e.employeeCode}"`,
      ].join(","),
    );
    return delay(ok({ csv: [...header, ...rows].join("\n"), included: withBank.length, excluded }));
  },

  async summaryCsv(runId: string): Promise<ApiResponse<string>> {
    const entries = read<PayrollEntry[]>(ENTRIES_KEY, []).filter((e) => e.runId === runId);
    const rows = entries.map((e) =>
      [e.employeeCode, e.employeeName, e.daysWorked, e.lopDays, e.grossEarnings, e.totalDeductions, e.netPay, e.totalCost].join(","),
    );
    return delay(ok(["Code,Employee,Days worked,LOP,Gross,Deductions,Net pay,Employer cost", ...rows].join("\n")));
  },

  async statutoryRegister(runId: string, kind: "pf" | "esi"): Promise<ApiResponse<string>> {
    const entries = read<PayrollEntry[]>(ENTRIES_KEY, []).filter((e) => e.runId === runId);
    const empCode = kind === "pf" ? "PFEMP" : "ESIEMP";
    const erCode = kind === "pf" ? "PFER" : "ESIER";
    const rows = entries.map((e) => {
      const emp = e.deductions.find((l) => l.componentCode === empCode)?.amount ?? 0;
      const er = e.employerContribs.find((l) => l.componentCode === erCode)?.amount ?? 0;
      return [e.employeeCode, e.employeeName, e.grossEarnings, emp, er, emp + er].join(",");
    });
    return delay(ok([`Code,Employee,Gross,${kind.toUpperCase()} Employee,${kind.toUpperCase()} Employer,Total`, ...rows].join("\n")));
  },

  async dashboardStats(): Promise<ApiResponse<{ ytdCost: number; employeesOnPayroll: number; lastRunLabel: string; pendingDeclarations: number }>> {
    const runs = read<PayrollRun[]>(RUNS_KEY, []);
    const empRes = await listEmployees();
    const employees = (empRes.data ?? []).filter((e) => e.employmentStatus !== "inactive" && e.employmentStatus !== "exited");
    const finalised = runs.filter((r) => r.status === "finalised" || r.status === "paid");
    const last = runs[0];
    const decs = read<InvestmentDeclaration[]>(DECLARATIONS_KEY, []);
    return delay(
      ok({
        ytdCost: finalised.reduce((n, r) => n + r.totalEmployerCost, 0),
        employeesOnPayroll: employees.length,
        lastRunLabel: last ? monthLabel(last.month, last.year) : "—",
        pendingDeclarations: Math.max(0, employees.length - decs.filter((d) => d.status !== "draft").length),
      }),
    );
  },
};

function totalsOf(entries: PayrollEntry[]) {
  return {
    employeeCount: entries.length,
    totalGross: entries.reduce((n, e) => n + e.grossEarnings, 0),
    totalDeductions: entries.reduce((n, e) => n + e.totalDeductions, 0),
    totalNetPay: entries.reduce((n, e) => n + e.netPay, 0),
    totalEmployerCost: entries.reduce((n, e) => n + e.totalCost, 0),
  };
}

/** All pre-run checks (edge cases 7, 8, 9, 13, 5, 1, 11). */
export function validateEntries(entries: PayrollEntry[]): PayrollValidationIssue[] {
  const issues: PayrollValidationIssue[] = [];
  const prorated: string[] = [];
  for (const e of entries) {
    if (e.lopDays > e.workingDays) {
      issues.push({ severity: "error", code: "LOP_EXCEEDS", employeeId: e.employeeId, employeeName: e.employeeName, message: `LOP days exceed working days for ${e.employeeName}.` });
    }
    if (e.netPay <= 0) {
      issues.push({ severity: "error", code: "ZERO_NET", employeeId: e.employeeId, employeeName: e.employeeName, message: `Net pay is zero or negative for ${e.employeeName}. Review manually.` });
    }
    if (!e.bankAccountNumber || !e.bankIfsc) {
      issues.push({ severity: "warning", code: "NO_BANK", employeeId: e.employeeId, employeeName: e.employeeName, message: `Bank details missing for ${e.employeeName}. Pay slip will be generated but bank transfer entry will be skipped.` });
    }
    if (e.flags.includes("final_settlement")) {
      issues.push({ severity: "warning", code: "EXITED", employeeId: e.employeeId, employeeName: e.employeeName, message: `${e.employeeName} is on notice or marked as exited. Confirm inclusion in this payroll run.` });
    }
    if (e.lopDays >= 5 && e.lopDays <= e.workingDays) {
      issues.push({ severity: "warning", code: "HIGH_LOP", employeeId: e.employeeId, employeeName: e.employeeName, message: `High LOP: ${e.employeeName} has ${e.lopDays} LOP days this month.` });
    }
    if (e.grossEarnings > ESI_GROSS_LIMIT - 500 && e.grossEarnings <= ESI_GROSS_LIMIT) {
      issues.push({ severity: "warning", code: "ESI_BOUNDARY", employeeId: e.employeeId, employeeName: e.employeeName, message: `ESI boundary: ${e.employeeName}'s gross (${formatCurrency(e.grossEarnings)}) is near the ₹21,000 threshold.` });
    }
    if (e.flags.includes("prorated")) prorated.push(e.employeeName);
  }
  if (prorated.length) {
    issues.push({ severity: "info", code: "PRORATED", message: `Prorated salary: ${prorated.length} employee(s) joined or left mid-month. Verify their dates.` });
  }
  issues.push({ severity: "info", code: "TDS_MANUAL", message: "TDS is currently set manually per employee. Configure investment declarations to auto-calculate TDS." });
  return issues;
}

function seedDeclaration(employeeId: string, financialYear: string): InvestmentDeclaration {
  const item = (label: string, amount = 0): { id: string; label: string; amount: number; proofStatus: "not_uploaded" } => ({
    id: uid("di_"), label, amount, proofStatus: "not_uploaded",
  });
  const sections = [
    {
      code: "80C",
      label: "Section 80C — Tax Saving Investments",
      maxLimit: 150000,
      items: [item("PPF"), item("ELSS Mutual Funds"), item("Life Insurance Premium"), item("Tax Saver FD"), item("NSC"), item("Sukanya Samriddhi"), item("Home Loan Principal")],
      total: 0,
    },
    {
      code: "80D",
      label: "Section 80D — Medical Insurance",
      maxLimit: 75000,
      items: [item("Medical Insurance (self + family)"), item("Medical Insurance (parents)")],
      total: 0,
    },
    {
      code: "HRA_EXEMPTION",
      label: "HRA Exemption",
      maxLimit: 300000,
      items: [item("Annual rent paid"), item("Landlord PAN declared (₹0 if not applicable)")],
      total: 0,
    },
    {
      code: "LTA",
      label: "Leave Travel Allowance",
      maxLimit: 50000,
      items: [item("Travel expenses claimed")],
      total: 0,
    },
  ];
  return {
    id: uid("dec_"),
    employeeId,
    financialYear,
    status: "draft",
    sections,
    totalDeclared: 0,
  };
}

/** Triggers a client-side file download for generated CSV exports. */
export function downloadTextFile(filename: string, contents: string, mime = "text/csv") {
  if (typeof window === "undefined") return;
  const blob = new Blob([contents], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function maskAccount(account?: string): string {
  if (!account) return "—";
  return `XXXXXX${account.slice(-4)}`;
}

export function monthOptions(count = 12): Array<{ value: string; label: string }> {
  const now = new Date();
  return Array.from({ length: count }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { value: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`, label: monthLabel(d.getMonth() + 1, d.getFullYear()) };
  });
}

export function currentFinancialYear(): string {
  const now = new Date();
  const startYear = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}