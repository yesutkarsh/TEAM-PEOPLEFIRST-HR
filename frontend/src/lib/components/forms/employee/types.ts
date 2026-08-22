import type { Employee, EmployeeDocument } from "@/lib/types/employee";

export type EmployeeDraft = Partial<Employee> & {
  documents?: EmployeeDocument[];
  bankAccountConfirm?: string;
  sendCredentials?: boolean;
};

export const EMPTY_DRAFT: EmployeeDraft = {
  firstName: "",
  lastName: "",
  personalEmail: "",
  workEmail: "",
  phone: "",
  currentAddress: { line1: "", city: "", state: "", pincode: "", country: "India" },
  sameAddress: true,
  emergencyContact: { name: "", relationship: "", phone: "" },
  employmentType: "full_time",
  employmentStatus: "active",
  dateOfJoining: new Date().toISOString().slice(0, 10),
  role: "employee",
  sendCredentials: true,
  documents: [],
};