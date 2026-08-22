import { pgTable, text, integer, boolean, doublePrecision, timestamp, jsonb } from "drizzle-orm/pg-core";

// ────────────────────────────────────────────────────────────────────────────
// 1. TENANTS & USERS
// ────────────────────────────────────────────────────────────────────────────

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain").notNull().unique(),
  settings: jsonb("settings").notNull(), // TenantSettings (companyName, size, industry, country, hrContactName, hrContactEmail, logoDataUrl)
  theme: jsonb("theme").notNull(), // TenantTheme (primary, primaryForeground, accent, accentForeground, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  password: text("password").notNull(), // hashed
  role: text("role").notNull(), // super_admin, hr_admin, manager, employee
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ────────────────────────────────────────────────────────────────────────────
// 2. ORG STRUCTURE & SETTINGS
// ────────────────────────────────────────────────────────────────────────────

export const departments = pgTable("departments", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  parentId: text("parent_id"), // hierarchical
  description: text("description"),
  headName: text("head_name"),
  employeeCount: integer("employee_count").default(0).notNull(),
});

export const designations = pgTable("designations", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  grade: text("grade").notNull(),
  departmentIds: jsonb("department_ids").notNull(), // string[]
  description: text("description"),
  employeeCount: integer("employee_count").default(0).notNull(),
});

export const shifts = pgTable("shifts", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  startTime: text("start_time").notNull(), // HH:mm
  endTime: text("end_time").notNull(), // HH:mm
  breakMinutes: integer("break_minutes").notNull(),
  days: jsonb("days").notNull(), // number[]
  graceMinutes: integer("grace_minutes").notNull(),
});

export const companyHolidays = pgTable("company_holidays", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  type: text("type").notNull(), // full, half
  description: text("description"),
});

export const workCalendars = pgTable("work_calendars", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  workingDays: jsonb("working_days").notNull(), // number[]
});

export const nationalHolidays = pgTable("national_holidays", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  observed: boolean("observed").default(true).notNull(),
});

// ────────────────────────────────────────────────────────────────────────────
// 3. EMPLOYEES
// ────────────────────────────────────────────────────────────────────────────

export const employees = pgTable("employees", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  employeeCode: text("employee_code").notNull(),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name").notNull(),
  personalEmail: text("personal_email"),
  workEmail: text("work_email").notNull(),
  phone: text("phone").notNull(),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  bloodGroup: text("blood_group"),
  maritalStatus: text("marital_status"),
  nationality: text("nationality"),
  currentAddress: jsonb("current_address"), // EmployeeAddress
  permanentAddress: jsonb("permanent_address"), // EmployeeAddress
  sameAddress: boolean("same_address").default(false).notNull(),
  
  departmentId: text("department_id").notNull(),
  designationId: text("designation_id").notNull(),
  grade: text("grade"),
  reportingManagerId: text("reporting_manager_id"),
  employmentType: text("employment_type").notNull(), // full_time, part_time, contract, intern
  employmentStatus: text("employment_status").notNull(), // active, probation, inactive, exited, notice_period
  dateOfJoining: text("date_of_joining").notNull(), // YYYY-MM-DD
  probationEndDate: text("probation_end_date"),
  workLocation: text("work_location"),
  shiftId: text("shift_id"),
  
  ctcAnnual: doublePrecision("ctc_annual"),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankIfsc: text("bank_ifsc"),
  panNumber: text("pan_number"),
  aadhaarNumber: text("aadhaar_number"),
  
  role: text("role"), // hr_admin, manager, employee
  avatarUrl: text("avatar_url"),
  documents: jsonb("documents").default([]).notNull(), // EmployeeDocument[]
  emergencyContact: jsonb("emergency_contact"), // EmergencyContact
  timeline: jsonb("timeline").default([]).notNull(), // TimelineEntry[]
  profileCompleteness: integer("profile_completeness").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ────────────────────────────────────────────────────────────────────────────
// 4. ATTENDANCE & GEOLOCATION
// ────────────────────────────────────────────────────────────────────────────

export const attendanceSettings = pgTable("attendance_settings", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  captureMode: text("capture_mode").default("web").notNull(), // web, web_biometric, biometric
  enforceIp: boolean("enforce_ip").default(false).notNull(),
  allowedIps: jsonb("allowed_ips").default([]).notNull(), // string[]
  enforceGeo: boolean("enforce_geo").default(false).notNull(),
  lateGraceMinutes: integer("late_grace_minutes").default(15).notNull(),
  halfDayMinutes: integer("half_day_minutes").default(240).notNull(),
  fullDayMinutes: integer("full_day_minutes").default(480).notNull(),
  overtimeAfterMinutes: integer("overtime_after_minutes").default(540).notNull(),
  autoClockOutTime: text("auto_clock_out_time").default("23:30").notNull(), // HH:mm
  breakTrackingEnabled: boolean("break_tracking_enabled").default(true).notNull(),
  allowRegularization: boolean("allow_regularization").default(true).notNull(),
  regularizationWindowDays: integer("regularization_window_days").default(30).notNull(),
  maxRegularizationsPerMonth: integer("max_regularizations_per_month").default(3).notNull(),
});

export const geoFences = pgTable("geo_fences", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  radiusMeters: integer("radius_meters").notNull(),
});

export const attendanceRecords = pgTable("attendance_records", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  employeeId: text("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  employeeName: text("employee_name").notNull(),
  departmentId: text("department_id"),
  date: text("date").notNull(), // YYYY-MM-DD
  shiftId: text("shift_id"),
  shiftName: text("shift_name"),
  clockIn: text("clock_in"), // ISO string
  clockOut: text("clock_out"), // ISO string
  breaks: jsonb("breaks").default([]).notNull(), // BreakEntry[]
  workedMinutes: integer("worked_minutes").default(0).notNull(),
  breakMinutes: integer("break_minutes").default(0).notNull(),
  overtimeMinutes: integer("overtime_minutes").default(0).notNull(),
  lateMinutes: integer("late_minutes").default(0).notNull(),
  earlyExitMinutes: integer("early_exit_minutes").default(0).notNull(),
  status: text("status").notNull(), // AttendanceStatus
  source: text("source").notNull(), // AttendanceSource
  clockInLocation: jsonb("clock_in_location"), // AttendanceLocation
  clockOutLocation: jsonb("clock_out_location"), // AttendanceLocation
  ip: text("ip"),
  note: text("note"),
  regularized: boolean("regularized").default(false).notNull(),
  leaveTypeName: text("leave_type_name"),
  holidayName: text("holiday_name"),
});

export const regularizationRequests = pgTable("regularization_requests", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  employeeId: text("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  employeeName: text("employee_name").notNull(),
  departmentId: text("department_id"),
  date: text("date").notNull(), // YYYY-MM-DD
  type: text("type").notNull(), // RegularizationType
  requestedClockIn: text("requested_clock_in"), // HH:mm
  requestedClockOut: text("requested_clock_out"), // HH:mm
  reason: text("reason").notNull(),
  status: text("status").notNull(), // RegularizationStatus
  appliedAt: text("applied_at").notNull(), // ISO string
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
  reviewComment: text("review_comment"),
});

// ────────────────────────────────────────────────────────────────────────────
// 5. LEAVE MANAGEMENT
// ────────────────────────────────────────────────────────────────────────────

export const leaveTypes = pgTable("leave_types", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  category: text("category").notNull(), // LeaveCategory
  isPaid: boolean("is_paid").default(true).notNull(),
  applicableGender: text("applicable_gender").default("all").notNull(), // ApplicableGender
  allowHalfDay: boolean("allow_half_day").default(true).notNull(),
  documentRequired: text("document_required").default("never").notNull(), // DocumentRequirement
  documentAfterDays: integer("document_after_days"),
  minDaysPerRequest: doublePrecision("min_days_per_request").default(1).notNull(),
  maxDaysPerRequest: doublePrecision("max_days_per_request"),
  accrualType: text("accrual_type").default("monthly").notNull(), // AccrualType
  annualAllocation: doublePrecision("annual_allocation").notNull(),
  carryForwardMax: doublePrecision("carry_forward_max"),
  carryForwardLapseDate: text("carry_forward_lapse_date"), // MM-DD
  encashmentAllowed: boolean("encashment_allowed").default(false).notNull(),
  encashmentMaxDays: integer("encashment_max_days"),
  color: text("color").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const leavePolicies = pgTable("leave_policies", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  eligibility: jsonb("eligibility").notNull(), // LeavePolicyEligibility
  isDefault: boolean("is_default").default(false).notNull(),
});

export const leavePolicyAllocations = pgTable("leave_policy_allocations", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  policyId: text("policy_id").references(() => leavePolicies.id, { onDelete: "cascade" }).notNull(),
  leaveTypeId: text("leave_type_id").references(() => leaveTypes.id, { onDelete: "cascade" }).notNull(),
  daysOverride: doublePrecision("days_override"),
});

export const leaveBalances = pgTable("leave_balances", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  employeeId: text("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  leaveTypeId: text("leave_type_id").references(() => leaveTypes.id, { onDelete: "cascade" }).notNull(),
  year: integer("year").notNull(),
  allocated: doublePrecision("allocated").default(0).notNull(),
  accrued: doublePrecision("accrued").default(0).notNull(),
  used: doublePrecision("used").default(0).notNull(),
  pending: doublePrecision("pending").default(0).notNull(),
  carried: doublePrecision("carried").default(0).notNull(),
  available: doublePrecision("available").default(0).notNull(),
  encashed: doublePrecision("encashed").default(0).notNull(),
});

export const leaveRequests = pgTable("leave_requests", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  employeeId: text("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  employeeName: text("employee_name").notNull(),
  departmentId: text("department_id"),
  leaveTypeId: text("leave_type_id").references(() => leaveTypes.id, { onDelete: "cascade" }).notNull(),
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date").notNull(), // YYYY-MM-DD
  isHalfDay: boolean("is_half_day").default(false).notNull(),
  halfDayPeriod: text("half_day_period"), // first_half, second_half
  workingDays: doublePrecision("working_days").notNull(),
  reason: text("reason"),
  documentUrl: text("document_url"),
  documentName: text("document_name"),
  status: text("status").notNull(), // LeaveRequestStatus
  appliedAt: text("applied_at").notNull(), // ISO string
  cancelledAt: text("cancelled_at"), // ISO string
  cancelReason: text("cancel_reason"),
  twoLevel: boolean("two_level").default(false).notNull(),
});

export const leaveApprovals = pgTable("leave_approvals", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  requestId: text("request_id").references(() => leaveRequests.id, { onDelete: "cascade" }).notNull(),
  level: text("level").notNull(), // manager, hr_admin
  approverId: text("approver_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  approverName: text("approver_name").notNull(),
  action: text("action").notNull(), // approved, rejected
  comment: text("comment"),
  actionAt: text("action_at").notNull(), // ISO string
});

export const leaveAdjustments = pgTable("leave_adjustments", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  employeeId: text("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  leaveTypeId: text("leave_type_id").references(() => leaveTypes.id, { onDelete: "cascade" }).notNull(),
  adjustment: doublePrecision("adjustment").notNull(),
  reason: text("reason").notNull(),
  adjustedBy: text("adjusted_by").notNull(),
  adjustedAt: text("adjusted_at").notNull(), // ISO string
});

// ────────────────────────────────────────────────────────────────────────────
// 6. PAYROLL & COMPENSATION
// ────────────────────────────────────────────────────────────────────────────

export const salaryComponents = pgTable("salary_components", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  type: text("type").notNull(), // earning, deduction, employer_contribution
  calculationMethod: text("calculation_method").notNull(), // fixed, percentage_of_basic, percentage_of_ctc, statutory, slab, balance
  value: doublePrecision("value"),
  statutoryType: text("statutory_type"), // pf_employee, pf_employer, professional_tax, etc.
  slabs: jsonb("slabs"), // PtSlab[] for PT
  taxable: boolean("taxable").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isSystemDefined: boolean("is_system_defined").default(false).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  pfOnActualBasic: boolean("pf_on_actual_basic").default(false).notNull(),
});

export const salaryStructures = pgTable("salary_structures", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  employeeCount: integer("employee_count").default(0).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: text("created_at").notNull(), // ISO string
});

export const salaryStructureComponents = pgTable("salary_structure_components", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  structureId: text("structure_id").references(() => salaryStructures.id, { onDelete: "cascade" }).notNull(),
  componentId: text("component_id").references(() => salaryComponents.id, { onDelete: "cascade" }).notNull(),
  overrideValue: doublePrecision("override_value"),
  isEditable: boolean("is_editable").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
});

export const employeeSalaries = pgTable("employee_salaries", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  employeeId: text("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  structureId: text("structure_id").references(() => salaryStructures.id, { onDelete: "cascade" }).notNull(),
  annualCtc: doublePrecision("annual_ctc").notNull(),
  effectiveFrom: text("effective_from").notNull(), // YYYY-MM-DD
  effectiveTo: text("effective_to"), // YYYY-MM-DD
  bankName: text("bank_name").notNull(),
  bankAccountNumber: text("bank_account_number").notNull(),
  bankIfsc: text("bank_ifsc").notNull(),
  panNumber: text("pan_number"),
  createdAt: text("created_at").notNull(), // ISO string
});

export const payrollRuns = pgTable("payroll_runs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  status: text("status").notNull(), // PayrollRunStatus (draft, in_review, finalised, paid, cancelled)
  employeeCount: integer("employee_count").default(0).notNull(),
  totalGross: doublePrecision("total_gross").default(0).notNull(),
  totalDeductions: doublePrecision("total_deductions").default(0).notNull(),
  totalNetPay: doublePrecision("total_net_pay").default(0).notNull(),
  totalEmployerCost: doublePrecision("total_employer_cost").default(0).notNull(),
  initiatedBy: text("initiated_by").notNull(),
  initiatedAt: text("initiated_at").notNull(), // ISO string
  finalisedBy: text("finalised_by"),
  finalisedAt: text("finalised_at"),
  paidAt: text("paid_at"),
  validationIssues: jsonb("validation_issues").default([]).notNull(), // PayrollValidationIssue[]
  notes: text("notes"),
  log: jsonb("log").default([]).notNull(), // PayrollRunLogEntry[]
});

export const payrollEntries = pgTable("payroll_entries", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  runId: text("run_id").references(() => payrollRuns.id, { onDelete: "cascade" }).notNull(),
  employeeId: text("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  employeeName: text("employee_name").notNull(),
  employeeCode: text("employee_code").notNull(),
  departmentId: text("department_id").notNull(),
  structureId: text("structure_id").references(() => salaryStructures.id).notNull(),
  structureName: text("structure_name").notNull(),
  monthlyCtc: doublePrecision("monthly_ctc").notNull(),
  annualCtc: doublePrecision("annual_ctc").notNull(),
  lopDays: doublePrecision("lop_days").default(0).notNull(),
  lopAmount: doublePrecision("lop_amount").default(0).notNull(),
  workingDays: doublePrecision("working_days").default(0).notNull(),
  daysWorked: doublePrecision("days_worked").default(0).notNull(),
  earnings: jsonb("earnings").default([]).notNull(), // PayrollLineItem[]
  deductions: jsonb("deductions").default([]).notNull(), // PayrollLineItem[]
  employerContribs: jsonb("employer_contribs").default([]).notNull(), // PayrollLineItem[]
  grossEarnings: doublePrecision("gross_earnings").default(0).notNull(),
  totalDeductions: doublePrecision("total_deductions").default(0).notNull(),
  netPay: doublePrecision("net_pay").default(0).notNull(),
  totalCost: doublePrecision("total_cost").default(0).notNull(),
  ytdGross: doublePrecision("ytd_gross").default(0).notNull(),
  ytdDeductions: doublePrecision("ytd_deductions").default(0).notNull(),
  ytdNetPay: doublePrecision("ytd_net_pay").default(0).notNull(),
  isManuallyEdited: boolean("is_manually_edited").default(false).notNull(),
  manualEditNotes: text("manual_edit_notes"),
  payslipGenerated: boolean("payslip_generated").default(false).notNull(),
  flags: jsonb("flags").default([]).notNull(), // PayrollEntryFlag[]
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankIfsc: text("bank_ifsc"),
  includeArrears: boolean("include_arrears").default(false).notNull(),
  arrearsAmount: doublePrecision("arrears_amount").default(0).notNull(),
  excluded: boolean("excluded").default(false).notNull(),
});

export const payslips = pgTable("payslips", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  entryId: text("entry_id").references(() => payrollEntries.id, { onDelete: "cascade" }).notNull(),
  employeeId: text("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  runId: text("run_id").references(() => payrollRuns.id, { onDelete: "cascade" }).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  employeeName: text("employee_name").notNull(),
  employeeCode: text("employee_code").notNull(),
  designation: text("designation"),
  department: text("department"),
  dateOfJoining: text("date_of_joining"),
  panNumber: text("pan_number"),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  earnings: jsonb("earnings").default([]).notNull(), // PayrollLineItem[]
  deductions: jsonb("deductions").default([]).notNull(), // PayrollLineItem[]
  employerContribs: jsonb("employer_contribs").default([]).notNull(), // PayrollLineItem[]
  grossEarnings: doublePrecision("gross_earnings").default(0).notNull(),
  totalDeductions: doublePrecision("total_deductions").default(0).notNull(),
  netPay: doublePrecision("net_pay").default(0).notNull(),
  ytdGross: doublePrecision("ytd_gross").default(0).notNull(),
  ytdDeductions: doublePrecision("ytd_deductions").default(0).notNull(),
  ytdNetPay: doublePrecision("ytd_net_pay").default(0).notNull(),
  generatedAt: text("generated_at").notNull(), // ISO string
  sentAt: text("sent_at"), // ISO string
  note: text("note"),
});

export const taxDeclarations = pgTable("tax_declarations", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  employeeId: text("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  financialYear: text("financial_year").notNull(), // e.g. 2026-2027
  status: text("status").notNull(), // DeclarationStatus (draft, submitted, approved)
  submittedAt: text("submitted_at"), // ISO string
  approvedAt: text("approved_at"), // ISO string
  sections: jsonb("sections").notNull(), // DeclarationSection[]
  totalDeclared: doublePrecision("total_declared").default(0).notNull(),
});
