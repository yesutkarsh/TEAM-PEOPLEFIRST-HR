/** Payroll domain types (Phase 7). Dates are ISO strings — browser-storage friendly. */
import type { Employee } from "./employee";

export type ComponentType = "earning" | "deduction" | "employer_contribution";
export type CalculationMethod =
  | "fixed"
  | "percentage_of_basic"
  | "percentage_of_ctc"
  | "statutory"
  | "slab"
  | "balance";
export type StatutoryType =
  | "pf_employee"
  | "pf_employer"
  | "esi_employee"
  | "esi_employer"
  | "professional_tax"
  | "tds";

export interface PtSlab {
  upTo: number; // gross up to this monthly amount
  tax: number; // monthly PT
}

export interface SalaryComponent {
  id: string;
  name: string;
  code: string;
  description?: string;
  type: ComponentType;
  calculationMethod: CalculationMethod;
  value?: number;
  statutoryType?: StatutoryType;
  slabs?: PtSlab[];
  taxable: boolean;
  isActive: boolean;
  isSystemDefined: boolean;
  displayOrder: number;
  /** PF on actual basic instead of the ₹15,000 statutory cap. */
  pfOnActualBasic?: boolean;
}

export interface SalaryStructureComponent {
  componentId: string;
  component: SalaryComponent;
  overrideValue?: number;
  isEditable: boolean;
  displayOrder: number;
}

export interface SalaryStructure {
  id: string;
  name: string;
  description?: string;
  components: SalaryStructureComponent[];
  employeeCount: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface SalaryBreakupLine {
  componentId: string;
  component: SalaryComponent;
  monthlyAmount: number;
  annualAmount: number;
  /** Human note, e.g. "12% of Basic (on ₹15,000 cap)" or "Not applicable". */
  note?: string;
  notApplicable?: boolean;
}

export interface SalaryBreakup {
  earnings: SalaryBreakupLine[];
  deductions: SalaryBreakupLine[];
  employerContribs: SalaryBreakupLine[];
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  totalEmployerContrib: number;
  totalCost: number;
  monthlyCtc: number;
  unallocated: number;
}

export interface EmployeeSalary {
  id: string;
  employeeId: string;
  structureId: string;
  annualCtc: number;
  effectiveFrom: string;
  effectiveTo?: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  panNumber?: string;
  createdAt: string;
}

export type PayrollRunStatus = "draft" | "in_review" | "finalised" | "paid" | "cancelled";

export type PayrollValidationSeverity = "error" | "warning" | "info";

export interface PayrollValidationIssue {
  severity: PayrollValidationSeverity;
  employeeId?: string;
  employeeName?: string;
  code: string;
  message: string;
}

export interface PayrollRunLogEntry {
  id: string;
  at: string;
  actor: string;
  message: string;
}

export interface PayrollRun {
  id: string;
  month: number; // 1–12
  year: number;
  status: PayrollRunStatus;
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNetPay: number;
  totalEmployerCost: number;
  initiatedBy: string;
  initiatedAt: string;
  finalisedBy?: string;
  finalisedAt?: string;
  paidAt?: string;
  validationIssues: PayrollValidationIssue[];
  notes?: string;
  log: PayrollRunLogEntry[];
}

export interface PayrollLineItem {
  componentId: string;
  componentName: string;
  componentCode: string;
  amount: number;
  isManualOverride: boolean;
  note?: string;
}

export type PayrollEntryFlag = "prorated" | "final_settlement" | "manually_edited" | "has_error" | "arrears";

export interface PayrollEntry {
  id: string;
  runId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentId: string;
  structureId: string;
  structureName: string;
  monthlyCtc: number;
  annualCtc: number;
  lopDays: number;
  lopAmount: number;
  workingDays: number;
  daysWorked: number;
  earnings: PayrollLineItem[];
  deductions: PayrollLineItem[];
  employerContribs: PayrollLineItem[];
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  totalCost: number;
  ytdGross: number;
  ytdDeductions: number;
  ytdNetPay: number;
  isManuallyEdited: boolean;
  manualEditNotes?: string;
  payslipGenerated: boolean;
  flags: PayrollEntryFlag[];
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  includeArrears?: boolean;
  arrearsAmount?: number;
  excluded?: boolean;
}

export interface Payslip {
  id: string;
  entryId: string;
  employeeId: string;
  runId: string;
  month: number;
  year: number;
  employeeName: string;
  employeeCode: string;
  designation?: string;
  department?: string;
  dateOfJoining?: string;
  panNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  earnings: PayrollLineItem[];
  deductions: PayrollLineItem[];
  employerContribs: PayrollLineItem[];
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  ytdGross: number;
  ytdDeductions: number;
  ytdNetPay: number;
  generatedAt: string;
  sentAt?: string;
  note?: string;
}

export type DeclarationStatus = "draft" | "submitted" | "approved";
export type ProofStatus = "not_uploaded" | "uploaded" | "verified" | "rejected";

export interface DeclarationItem {
  id: string;
  label: string;
  amount: number;
  proofUrl?: string;
  proofStatus: ProofStatus;
}

export interface DeclarationSection {
  code: string;
  label: string;
  items: DeclarationItem[];
  maxLimit: number;
  total: number;
}

export interface InvestmentDeclaration {
  id: string;
  employeeId: string;
  financialYear: string;
  status: DeclarationStatus;
  submittedAt?: string;
  approvedAt?: string;
  sections: DeclarationSection[];
  totalDeclared: number;
}

export interface PayrollEmployeeContext {
  employee: Employee;
  salary?: EmployeeSalary;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthLabel(month: number, year: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export const RUN_STATUS_LABELS: Record<PayrollRunStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  finalised: "Finalised",
  paid: "Paid",
  cancelled: "Cancelled",
};

/** Statutory constants — India, MVP1. */
export const PF_WAGE_CAP = 15000;
export const PF_RATE = 0.12;
export const ESI_GROSS_LIMIT = 21000;
export const ESI_EMPLOYEE_RATE = 0.0075;
export const ESI_EMPLOYER_RATE = 0.0325;
export const DEFAULT_PT_SLABS: PtSlab[] = [
  { upTo: 15000, tax: 0 },
  { upTo: Number.MAX_SAFE_INTEGER, tax: 200 },
];