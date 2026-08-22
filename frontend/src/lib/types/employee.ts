/** Employee domain types — used by api/employees.ts and all employee UI. */
export type EmploymentType = "full_time" | "part_time" | "contract" | "intern";
export type EmploymentStatus = "active" | "probation" | "inactive" | "exited" | "notice_period";
export type DocumentStatus = "pending" | "uploaded" | "verified" | "rejected";
export type DocumentType =
  | "aadhaar"
  | "pan"
  | "passport"
  | "offer_letter"
  | "appointment_letter"
  | "previous_experience"
  | "education_certificate"
  | "other";

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface EmployeeAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface EmployeeDocument {
  id: string;
  type: DocumentType;
  label: string;
  status: DocumentStatus;
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
  verifiedAt?: string;
  rejectedNote?: string;
}

export interface TimelineEntry {
  id: string;
  at: string; // ISO
  actor: string;
  message: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  personalEmail: string;
  workEmail: string;
  phone: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "non_binary" | "prefer_not_to_say";
  bloodGroup?: string;
  maritalStatus?: "single" | "married" | "other";
  nationality?: string;
  currentAddress?: EmployeeAddress;
  permanentAddress?: EmployeeAddress;
  sameAddress?: boolean;

  departmentId: string;
  designationId: string;
  grade?: string;
  reportingManagerId?: string;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  dateOfJoining: string;
  probationEndDate?: string;
  workLocation?: string;
  shiftId?: string;

  ctcAnnual?: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  panNumber?: string;
  aadhaarNumber?: string;

  role?: "hr_admin" | "manager" | "employee";
  avatarUrl?: string;
  documents: EmployeeDocument[];
  emergencyContact?: EmergencyContact;
  timeline: TimelineEntry[];
  createdAt: string;
  updatedAt: string;
  profileCompleteness: number;
}

export interface EmployeeFilters {
  q?: string;
  departmentId?: string;
  designationId?: string;
  types?: EmploymentType[];
  statuses?: EmploymentStatus[];
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  intern: "Intern",
};

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: "Active",
  probation: "Probation",
  inactive: "Inactive",
  notice_period: "Notice period",
  exited: "Exited",
};