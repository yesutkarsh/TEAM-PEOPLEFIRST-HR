import { Alert, Card } from "@/lib/components/ui";
import type { PayrollValidationIssue } from "@/lib/types/payroll";

const variantOf = { error: "error", warning: "warning", info: "info" } as const;

export function ValidationIssuesPanel({ issues }: { issues: PayrollValidationIssue[] }) {
  if (issues.length === 0) {
    return (
      <Card>
        <Alert variant="success" title="No validation issues">Every entry in this run passed all pre-run checks.</Alert>
      </Card>
    );
  }
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");
  return (
    <Card className="space-y-2">
      <h3 className="text-[15px] font-semibold text-[#0A0A0A] mb-1">
        Validation ({errors.length} error{errors.length === 1 ? "" : "s"}, {warnings.length} warning{warnings.length === 1 ? "" : "s"})
      </h3>
      {[...errors, ...warnings, ...infos].map((issue, i) => (
        <Alert key={i} variant={variantOf[issue.severity]}>
          {issue.message}
        </Alert>
      ))}
    </Card>
  );
}
