/** Hand-built SVG bar/line chart themed with tenant primary — no chart library. */
import type { ReportChartDataPoint } from "@/lib/types/reports";

export interface ReportChartProps {
  title?: string;
  points: ReportChartDataPoint[];
  kind: "bar" | "line";
  height?: number;
}

export function ReportChart({ title, points, kind, height = 220 }: ReportChartProps) {
  if (points.length === 0) {
    return (
      <div className="rounded-md border border-[#E5E5E3] bg-white p-5">
        {title && <h3 className="text-[13px] font-semibold text-[#0A0A0A] mb-3">{title}</h3>}
        <p className="text-[13px] text-[#6B6B6B]">No data to chart.</p>
      </div>
    );
  }
  const width = Math.max(360, points.length * 70);
  const padding = 32;
  const max = Math.max(1, ...points.map((p) => p.value));
  const innerH = height - padding * 2;
  const innerW = width - padding * 2;
  const step = points.length > 1 ? innerW / (points.length - 1) : 0;

  return (
    <div className="rounded-md border border-[#E5E5E3] bg-white p-5 overflow-x-auto">
      {title && <h3 className="text-[13px] font-semibold text-[#0A0A0A] mb-3">{title}</h3>}
      <svg width={width} height={height} role="img" aria-label={title}>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E5E5E3" strokeWidth={1} />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#E5E5E3" strokeWidth={1} />

        {kind === "bar" &&
          points.map((p, i) => {
            const barW = Math.min(40, innerW / points.length - 12);
            const x = padding + (innerW / points.length) * i + (innerW / points.length - barW) / 2;
            const h = (p.value / max) * innerH;
            const y = height - padding - h;
            return (
              <g key={p.label}>
                <rect x={x} y={y} width={barW} height={h} fill={p.color ?? "var(--tenant-primary)"} rx={2} />
                <text x={x + barW / 2} y={height - padding + 14} textAnchor="middle" fontSize={10} fill="#6B6B6B">
                  {p.label.length > 10 ? `${p.label.slice(0, 9)}…` : p.label}
                </text>
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={10} fill="#0A0A0A">
                  {p.value}
                </text>
              </g>
            );
          })}

        {kind === "line" && (
          <>
            <polyline
              fill="none"
              stroke="var(--tenant-primary)"
              strokeWidth={2}
              points={points.map((p, i) => `${padding + i * step},${height - padding - (p.value / max) * innerH}`).join(" ")}
            />
            {points.map((p, i) => {
              const x = padding + i * step;
              const y = height - padding - (p.value / max) * innerH;
              return (
                <g key={p.label}>
                  <circle cx={x} cy={y} r={3} fill="var(--tenant-primary)" />
                  <text x={x} y={height - padding + 14} textAnchor="middle" fontSize={10} fill="#6B6B6B">
                    {p.label.length > 10 ? `${p.label.slice(0, 9)}…` : p.label}
                  </text>
                </g>
              );
            })}
          </>
        )}
      </svg>
    </div>
  );
}
