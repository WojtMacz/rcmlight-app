import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HeatCell } from './summaryUtils';
import { parseCauseDescription, TASK_TYPE_META } from '@/components/pm/pmUtils';

// ── Cell color ─────────────────────────────────────────────────────────────

function cellColor(count: number, max: number): string {
  if (count === 0) return 'bg-secondary/30';
  const ratio = count / Math.max(max, 1);
  if (ratio < 0.25) return 'bg-green-100 border-green-300';
  if (ratio < 0.5) return 'bg-yellow-100 border-yellow-300';
  if (ratio < 0.75) return 'bg-orange-100 border-orange-300';
  return 'bg-red-100 border-red-300';
}

function cellTextColor(count: number, max: number): string {
  if (count === 0) return 'text-muted-foreground/30';
  const ratio = count / Math.max(max, 1);
  if (ratio < 0.25) return 'text-green-700';
  if (ratio < 0.5) return 'text-yellow-700';
  if (ratio < 0.75) return 'text-orange-700';
  return 'text-red-700';
}

// ── Cell detail modal ──────────────────────────────────────────────────────

function CellDetail({ cell, onClose }: { cell: HeatCell; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-background border rounded-xl shadow-xl w-[480px] max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h3 className="font-semibold text-sm">WK = {cell.wk} · WP = {cell.wp}</h3>
            <p className="text-xs text-muted-foreground">{cell.count} przyczyn w tym kwadrancie</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-2">
          {cell.rows.map((row) => {
            const { category, text } = parseCauseDescription(row.causeDescription);
            const pmMeta = row.pmTask ? TASK_TYPE_META[row.pmTask.taskType] : null;
            return (
              <div key={row.causeId} className="rounded-md border p-2.5 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-brand-orange">{row.causeCode}</span>
                  <span className="text-muted-foreground">{row.mgCode} · {row.assemblyName}</span>
                  {pmMeta && (
                    <span className={`ml-auto text-[10px] font-bold px-1.5 rounded ${pmMeta.bgColor} ${pmMeta.color}`}>
                      {pmMeta.shortLabel}
                    </span>
                  )}
                </div>
                {category && <p className="text-muted-foreground/60 text-[10px]">[{category}]</p>}
                <p className="text-foreground">{text}</p>
                <p className="text-muted-foreground mt-0.5">{row.pfCode} — {row.pfDescription}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

const AXIS_LABELS = ['0', '1', '2', '3'];
const WP_LABELS = ['0 (Niski)', '1', '2', '3 (Wysoki)'];
const WK_LABELS = ['0 (Niskie)', '1', '2', '3 (Wysokie)'];

interface Props {
  grid: HeatCell[][];
}

export function HeatMap({ grid }: Props) {
  const [selected, setSelected] = useState<HeatCell | null>(null);
  const max = Math.max(...grid.flat().map((c) => c.count), 1);

  // grid[wp][wk] — display with wp increasing upward (flip)
  const displayRows = [...grid].reverse(); // wp=3 at top

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {/* Y axis label */}
        <div className="flex items-center">
          <div className="text-xs text-muted-foreground font-medium" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>
            WP — Pracochłonność →
          </div>
        </div>

        <div className="flex-1">
          {/* Grid */}
          <div className="space-y-1">
            {displayRows.map((wpRow, ri) => {
              const wp = 3 - ri; // since we reversed
              return (
                <div key={wp} className="flex items-center gap-1">
                  <div className="w-14 text-right text-xs text-muted-foreground shrink-0">
                    {WP_LABELS[wp]}
                  </div>
                  <div className="flex gap-1">
                    {wpRow.map((cell) => (
                      <button
                        key={cell.wk}
                        type="button"
                        onClick={() => cell.count > 0 && setSelected(cell)}
                        className={cn(
                          'h-14 w-14 rounded border flex flex-col items-center justify-center transition-all',
                          cellColor(cell.count, max),
                          cell.count > 0 && 'cursor-pointer hover:opacity-80 hover:scale-105',
                          cell.count === 0 && 'cursor-default',
                        )}
                      >
                        <span className={cn('text-lg font-bold tabular-nums leading-none', cellTextColor(cell.count, max))}>
                          {cell.count}
                        </span>
                        {cell.count > 0 && (
                          <span className={cn('text-[9px] leading-tight', cellTextColor(cell.count, max))}>
                            przyczyn
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* X axis labels */}
          <div className="flex items-center gap-1 mt-1">
            <div className="w-14 shrink-0" />
            {AXIS_LABELS.map((l, i) => (
              <div key={i} className="w-14 text-center text-xs text-muted-foreground">
                {WK_LABELS[i] ?? l}
              </div>
            ))}
          </div>

          {/* X axis title */}
          <div className="text-center text-xs text-muted-foreground mt-1 ml-14">
            WK — Konsekwencje →
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 ml-16 text-xs text-muted-foreground">
        <span>Intensywność:</span>
        {[
          { color: 'bg-green-100 border-green-300', label: 'Niska' },
          { color: 'bg-yellow-100 border-yellow-300', label: 'Średnia' },
          { color: 'bg-orange-100 border-orange-300', label: 'Wysoka' },
          { color: 'bg-red-100 border-red-300', label: 'Krytyczna' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={cn('h-3 w-5 rounded border', color)} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {selected && <CellDetail cell={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
