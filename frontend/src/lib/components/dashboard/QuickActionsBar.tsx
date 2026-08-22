import { Button, Tooltip } from "@/lib/components/ui";
import { showToast } from "@/lib/components/ui/Toast";

const ACTIONS = [
  { label: "Add employee", available: false, phase: 3 },
  { label: "Run payroll", available: false, phase: 7 },
  { label: "Approve leaves", available: false, phase: 5 },
  { label: "View reports", available: false, phase: 10 },
];

export function QuickActionsBar() {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="flex items-center gap-2 min-w-min">
        {ACTIONS.map((a) =>
          a.available ? (
            <Button key={a.label} variant="secondary" size="sm">{a.label}</Button>
          ) : (
            <Tooltip key={a.label} content={`Available from Phase ${a.phase}`}>
              <button
                type="button"
                onClick={() => showToast(`${a.label} — coming in Phase ${a.phase}`, "info")}
                className="inline-flex items-center justify-center gap-2 rounded-md h-9 px-3 text-[13px] font-medium border border-dashed border-[#E5E5E3] text-[#6B6B6B] bg-white hover:bg-[#FAFAF8] transition-colors whitespace-nowrap"
              >
                {a.label}
              </button>
            </Tooltip>
          ),
        )}
      </div>
    </div>
  );
}
