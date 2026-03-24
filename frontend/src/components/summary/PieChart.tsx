import type { PieSlice } from './summaryUtils';

interface Props {
  data: PieSlice[];
  size?: number;
}

export function PieChart({ data, size = 140 }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-xs text-muted-foreground py-4">Brak danych</p>;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;

  let startAngle = -Math.PI / 2;
  const arcs = data.map((item) => {
    const sweep = (item.value / total) * 2 * Math.PI;
    const end = startAngle + sweep;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = sweep > Math.PI ? 1 : 0;
    const path = `M${cx},${cy} L${x1},${y1} A${r},${r},0,${large},1,${x2},${y2} Z`;
    startAngle = end;
    return { ...item, path, pct: Math.round((item.value / total) * 100) };
  });

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {arcs.map((arc, i) => (
          <path key={i} d={arc.path} fill={arc.color} stroke="white" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="space-y-1.5">
        {arcs.map((arc, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="h-3 w-3 rounded-sm shrink-0" style={{ background: arc.color }} />
            <span className="text-muted-foreground">{arc.shortLabel}</span>
            <span className="font-semibold tabular-nums">{arc.value}</span>
            <span className="text-muted-foreground/60">({arc.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
