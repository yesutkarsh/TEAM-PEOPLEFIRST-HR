/** Phase 10 — Reports & analytics domain types. */

export type ReportDataSource =
  | "employees" | "leave" | "attendance" | "performance" | "helpdesk" | "expenses";

export type ReportFilterOperator =
  | "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "between" | "in";

export interface ReportFilter {
  field: string;
  operator: ReportFilterOperator;
  value: string | number | string[];
}

export interface CustomReportConfig {
  dataSource: ReportDataSource;
  fields: string[];
  filters: ReportFilter[];
  groupBy?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export interface SavedReport {
  id: string;
  name: string;
  description?: string;
  config: CustomReportConfig;
  createdBy: string;
  createdAt: string;
  lastRunAt?: string;
}

export interface NlReportQuery {
  id: string;
  queryText: string;
  interpretedAs: string;
  generatedConfig: CustomReportConfig | null;
  needsClarification: boolean;
  clarificationQuestion?: string;
  clarificationOptions?: string[];
  /** backend decline for queries outside the data model (Edge case 16) */
  declineMessage?: string;
  resultCount: number;
}

export type ExecutiveKpiTrendDir = "up" | "down" | "neutral";

export interface ExecutiveKpi {
  key: string;
  label: string;
  value: string;
  trend?: string;
  trendDir?: ExecutiveKpiTrendDir;
}

export interface ReportChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export type ReportRow = Record<string, string | number>;
