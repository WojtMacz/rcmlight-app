import type { CalendarData } from './summaryUtils';

const MONTH_LABELS = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

interface Props {
  data: CalendarData;
  maxRows?: number;
}

export function PmCalendar({ data, maxRows = 30 }: Props) {
  const { tasks, monthSummaries } = data;
  const visible = tasks.slice(0, maxRows);
  const maxMonthCost = Math.max(...monthSummaries.map((m) => m.totalCost), 1);

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Brak aktywnych zadań PM z określoną częstotliwością.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs min-w-[700px]">
        <thead>
          <tr className="bg-secondary/40">
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-48 sticky left-0 bg-secondary/40">
              Zadanie PM
            </th>
            {MONTH_LABELS.map((m, i) => (
              <th key={i} className="px-1 py-2 text-center font-semibold text-muted-foreground w-10">
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((task, ti) => (
            <tr key={ti} className="border-b hover:bg-secondary/10">
              <td className="px-3 py-1.5 sticky left-0 bg-background border-r">
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{ background: task.typeColor }}
                  />
                  <span className="text-[10px] font-bold" style={{ color: task.typeColor }}>
                    {task.typeShort}
                  </span>
                  <span className="truncate max-w-[160px] text-foreground" title={task.label}>
                    {task.label}
                  </span>
                </div>
              </td>
              {task.months.map((active, mi) => (
                <td key={mi} className="px-0.5 py-1 text-center">
                  {active ? (
                    <div
                      className="mx-auto h-5 w-7 rounded"
                      style={{ background: task.typeColor, opacity: 0.85 }}
                    />
                  ) : (
                    <div className="mx-auto h-5 w-7 rounded bg-secondary/20" />
                  )}
                </td>
              ))}
            </tr>
          ))}

          {tasks.length > maxRows && (
            <tr className="border-b">
              <td colSpan={13} className="px-3 py-2 text-center text-xs text-muted-foreground">
                … i {tasks.length - maxRows} więcej zadań
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          {/* Task count row */}
          <tr className="border-t bg-secondary/20">
            <td className="px-3 py-2 text-xs font-semibold sticky left-0 bg-secondary/20 border-r">
              Łączna liczba zadań
            </td>
            {monthSummaries.map((ms) => (
              <td key={ms.monthIdx} className="px-0.5 py-2 text-center">
                <span className={`text-xs font-bold tabular-nums ${ms.taskCount > 0 ? 'text-foreground' : 'text-muted-foreground/30'}`}>
                  {ms.taskCount || '—'}
                </span>
              </td>
            ))}
          </tr>
          {/* Cost bar */}
          <tr className="border-t">
            <td className="px-3 py-2 text-xs font-semibold sticky left-0 bg-background border-r">
              Łączny koszt miesiąca
            </td>
            {monthSummaries.map((ms) => (
              <td key={ms.monthIdx} className="px-0.5 py-2 text-center">
                {ms.totalCost > 0 ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <div
                      className="w-7 rounded-sm bg-brand-orange/70"
                      style={{ height: `${Math.round((ms.totalCost / maxMonthCost) * 20) + 2}px` }}
                    />
                    <span className="text-[9px] tabular-nums text-muted-foreground">
                      {(ms.totalCost / 1000).toFixed(1)}k
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground/30 text-xs">—</span>
                )}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
