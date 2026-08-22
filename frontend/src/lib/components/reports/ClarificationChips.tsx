export function ClarificationChips({ question, options, onPick }: { question: string; options: string[]; onPick: (option: string) => void }) {
  return (
    <div className="rounded-md border border-[#E5E5E3] bg-white p-5">
      <p className="text-[14px] text-[#0A0A0A] mb-3">{question}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onPick(o)}
            className="rounded-full border border-[#E5E5E3] px-3.5 py-1.5 text-[13px] text-[#0A0A0A] hover:border-[var(--tenant-primary)] hover:text-[var(--tenant-primary)] transition-colors"
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
