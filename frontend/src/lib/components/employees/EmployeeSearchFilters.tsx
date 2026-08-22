/** Search + filter bar above directory. */
import { FilterX, Sparkles } from "lucide-react";
import { SearchInput } from "@/lib/components/ui/SearchInput";
import { MultiSelect } from "@/lib/components/ui/MultiSelect";
import {
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  type EmployeeFilters,
  type EmploymentStatus,
  type EmploymentType,
} from "@/lib/types/employee";
import type { Department, Designation } from "@/lib/api/settings";

export interface EmployeeSearchFiltersProps {
  filters: EmployeeFilters;
  onChange: (f: EmployeeFilters) => void;
  departments: Department[];
  designations: Designation[];
}

export function EmployeeSearchFilters({ filters, onChange, departments, designations }: EmployeeSearchFiltersProps) {
  const activeCount = [
    !!filters.q,
    !!filters.departmentId,
    !!filters.designationId,
    !!filters.types?.length,
    !!filters.statuses?.length,
  ].filter(Boolean).length;

  const hasAny = activeCount > 0;
  const filteredDesigs = filters.departmentId
    ? designations.filter((d) => d.departmentIds.includes(filters.departmentId!))
    : designations;

  return (
    <div className="rounded-2xl border border-[#E5E5E3] bg-white p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8E8E8E]">
            Directory Search & Filters
          </h2>
          {hasAny && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-600 border border-orange-500/20">
              {activeCount} active filter{activeCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {hasAny && (
          <button
            type="button"
            onClick={() => onChange({})}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-neutral-500 hover:text-orange-600 transition-colors"
          >
            <FilterX className="w-3.5 h-3.5" />
            Reset all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <SearchInput
          placeholder="Search name, code, email…"
          value={filters.q ?? ""}
          onChange={(q) => onChange({ ...filters, q: q || undefined })}
          className="lg:col-span-2"
        />
        <select
          aria-label="Department"
          value={filters.departmentId ?? ""}
          onChange={(e) => onChange({ ...filters, departmentId: e.target.value || undefined, designationId: undefined })}
          className="h-10 px-3.5 rounded-xl border border-[#E5E5E3] bg-[#FAFAF9] hover:bg-white focus:bg-white text-[13px] font-medium text-[#0A0A0A] transition-colors focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-hidden"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          aria-label="Designation"
          value={filters.designationId ?? ""}
          onChange={(e) => onChange({ ...filters, designationId: e.target.value || undefined })}
          className="h-10 px-3.5 rounded-xl border border-[#E5E5E3] bg-[#FAFAF9] hover:bg-white focus:bg-white text-[13px] font-medium text-[#0A0A0A] transition-colors focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-hidden"
        >
          <option value="">All designations</option>
          {filteredDesigs.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <MultiSelect
            options={Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            value={filters.types ?? []}
            onChange={(v) => onChange({ ...filters, types: v.length ? (v as EmploymentType[]) : undefined })}
            placeholder="All types"
          />
          <MultiSelect
            options={Object.entries(EMPLOYMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            value={filters.statuses ?? []}
            onChange={(v) => onChange({ ...filters, statuses: v.length ? (v as EmploymentStatus[]) : undefined })}
            placeholder="All statuses"
          />
        </div>
      </div>
    </div>
  );
}