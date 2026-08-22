/** Ask-a-question bar for reports: interprets NL text into a report config. */
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Input, Button, Spinner, EmptyState } from "@/lib/components/ui";
import { Search, ArrowRight } from "lucide-react";
import { interpretNlQuery, runCustomReport } from "@/lib/api/reports";
import type { NlReportQuery } from "@/lib/types/reports";
import { ClarificationChips } from "./ClarificationChips";
import { ReportTable } from "./ReportTable";

const NL_DRAFT_KEY = "hrms.reports.nlDraft";

export function NaturalLanguageReportBar() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NlReportQuery | null>(null);
  const [tableData, setTableData] = useState<{ columns: { key: string; label: string }[]; rows: any[] } | null>(null);

  const ask = async (queryText: string) => {
    if (!queryText.trim()) return;
    setLoading(true);
    setResult(null);
    setTableData(null);
    const res = await interpretNlQuery(queryText);
    setLoading(false);
    if (res.data) {
      setResult(res.data);
      if (res.data.generatedConfig) {
        const runRes = await runCustomReport(res.data.generatedConfig);
        if (runRes.data) setTableData(runRes.data);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void ask(text);
  };

  const pickOption = (option: string) => {
    setText(option);
    void ask(option);
  };

  return (
    <div className="rounded-md border border-[#E5E5E3] bg-white p-5 space-y-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            leadingIcon={<Search size={16} />}
            placeholder="Ask a question about your workforce, e.g. “open helpdesk tickets”"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <Button type="submit" variant="primary" disabled={loading || !text.trim()} aria-label="Submit question">
          <ArrowRight size={16} />
        </Button>
      </form>

      {loading && (
        <div className="flex items-center gap-2 text-[13px] text-[#6B6B6B]">
          <Spinner size={14} /> Thinking…
        </div>
      )}

      {!loading && result?.declineMessage && (
        <p className="text-[13px] text-[#6B6B6B] italic">{result.declineMessage}</p>
      )}

      {!loading && result && !result.declineMessage && result.needsClarification && (
        <ClarificationChips
          question={result.clarificationQuestion ?? "Could you clarify?"}
          options={result.clarificationOptions ?? []}
          onPick={pickOption}
        />
      )}

      {!loading && result && !result.declineMessage && !result.needsClarification && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-[#0A0A0A]">
              I understood this as: <span className="font-medium">{result.interpretedAs}</span>
            </p>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="text-[13px] font-medium text-[var(--tenant-primary)] hover:underline"
            >
              Refine →
            </button>
          </div>

          {result.resultCount === 0 ? (
            <EmptyState
              title="No matching data"
              subtitle={`I understood this as: ${result.interpretedAs}, but found no rows to show.`}
            />
          ) : (
            <>
              <ReportTable columns={tableData?.columns ?? []} rows={tableData?.rows ?? []} />
              <button
                type="button"
                onClick={() => {
                  if (result.generatedConfig) {
                    window.sessionStorage.setItem(NL_DRAFT_KEY, JSON.stringify(result.generatedConfig));
                  }
                  void navigate({ to: "/reports/builder" });
                }}
                className="inline-block text-[13px] font-medium text-[var(--tenant-primary)] hover:underline"
              >
                Save this as a report →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
