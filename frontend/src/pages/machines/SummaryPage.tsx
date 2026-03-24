import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Loader2, Download, AlertTriangle, CheckCircle2, ClipboardList, Banknote, TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart } from '@/components/summary/PieChart';
import { BarChart } from '@/components/summary/BarChart';
import { HeatMap } from '@/components/summary/HeatMap';
import { PmCalendar } from '@/components/summary/PmCalendar';
import { ExportModal } from '@/components/summary/ExportModal';
import {
  flattenPmRows,
  computeKpi,
  computeTaskTypeDistribution,
  computeWkfDistribution,
  computeFrequencyGroups,
  computeBranchGroups,
  computeHeatMap,
  computeCalendar,
  annualCost,
  type FreqGroup,
  type BranchGroup,
} from '@/components/summary/summaryUtils';
import { TASK_TYPE_META, parseCauseDescription } from '@/components/pm/pmUtils';
import { useRcmAnalysis } from '@/hooks/useRcm';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtCurrency(v: number) {
  return v.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
      {children}
    </h2>
  );
}

// ── KPI card ───────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'text-foreground',
  badge,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  badge?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Icon className="h-5 w-5 text-muted-foreground/50" />
            {badge}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Frequency table ────────────────────────────────────────────────────────

function FreqTable({ group }: { group: FreqGroup }) {
  if (group.rows.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-secondary/40 text-muted-foreground uppercase tracking-wide">
            <th className="px-3 py-2 text-left font-semibold">Lokalizacja</th>
            <th className="px-3 py-2 text-left font-semibold">Typ</th>
            <th className="px-3 py-2 text-left font-semibold">Opis zadania</th>
            <th className="px-3 py-2 text-left font-semibold">Branża</th>
            <th className="px-3 py-2 text-right font-semibold">Koszt jedn. [PLN]</th>
            <th className="px-3 py-2 text-right font-semibold">Koszt roczny [PLN]</th>
          </tr>
        </thead>
        <tbody>
          {group.rows.map((row) => {
            const t = row.pmTask!;
            const meta = TASK_TYPE_META[t.taskType];
            const ac = annualCost(row);
            return (
              <tr key={row.causeId} className="border-b hover:bg-secondary/10 transition-colors">
                <td className="px-3 py-2 align-top">
                  <div>
                    <div className="font-medium">{row.systemName}</div>
                    <div className="text-muted-foreground">{row.assemblyName} · {row.mgCode}</div>
                  </div>
                </td>
                <td className="px-3 py-2 align-middle">
                  <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded border ${meta.bgColor} ${meta.color} ${meta.borderColor}`}>
                    {meta.shortLabel}
                  </span>
                </td>
                <td className="px-3 py-2 align-top max-w-[260px]">
                  <p className="line-clamp-2">{t.description}</p>
                  <p className="text-muted-foreground/70 font-mono text-[10px] mt-0.5">{row.causeCode}</p>
                </td>
                <td className="px-3 py-2 align-middle text-muted-foreground">{t.assignedTo ?? '—'}</td>
                <td className="px-3 py-2 align-middle text-right tabular-nums">
                  {t.totalCostPM !== null ? fmtCurrency(t.totalCostPM) : '—'}
                </td>
                <td className="px-3 py-2 align-middle text-right tabular-nums font-medium">
                  {ac > 0 ? fmtCurrency(ac) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t bg-secondary/20">
            <td colSpan={4} className="px-3 py-2 font-semibold">Razem</td>
            <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtCurrency(group.totalCost)}</td>
            <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtCurrency(group.annualCost)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Branch table ───────────────────────────────────────────────────────────

function BranchTable({ group }: { group: BranchGroup }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-secondary/40 text-muted-foreground uppercase tracking-wide">
            <th className="px-3 py-2 text-left font-semibold">Lokalizacja</th>
            <th className="px-3 py-2 text-left font-semibold">Typ</th>
            <th className="px-3 py-2 text-left font-semibold">Opis zadania</th>
            <th className="px-3 py-2 text-center font-semibold">Częst. [mies.]</th>
            <th className="px-3 py-2 text-right font-semibold">rbh/rok</th>
            <th className="px-3 py-2 text-right font-semibold">Koszt roczny [PLN]</th>
          </tr>
        </thead>
        <tbody>
          {group.rows.map((row) => {
            const t = row.pmTask!;
            const meta = TASK_TYPE_META[t.taskType];
            const ac = annualCost(row);
            const annualRmh = t.repairManHours && t.finalFrequencyMonths
              ? (t.repairManHours * (12 / t.finalFrequencyMonths)).toFixed(1)
              : '—';
            return (
              <tr key={row.causeId} className="border-b hover:bg-secondary/10 transition-colors">
                <td className="px-3 py-2 align-top">
                  <div className="font-medium">{row.systemName}</div>
                  <div className="text-muted-foreground">{row.assemblyName} · {row.mgCode}</div>
                </td>
                <td className="px-3 py-2 align-middle">
                  <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded border ${meta.bgColor} ${meta.color} ${meta.borderColor}`}>
                    {meta.shortLabel}
                  </span>
                </td>
                <td className="px-3 py-2 align-top max-w-[260px]">
                  <p className="line-clamp-2">{t.description}</p>
                </td>
                <td className="px-3 py-2 align-middle text-center tabular-nums">{t.finalFrequencyMonths ?? '—'}</td>
                <td className="px-3 py-2 align-middle text-right tabular-nums">{annualRmh}</td>
                <td className="px-3 py-2 align-middle text-right tabular-nums font-medium">
                  {ac > 0 ? fmtCurrency(ac) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t bg-secondary/20">
            <td colSpan={4} className="px-3 py-2 font-semibold">Razem — {group.branch}</td>
            <td className="px-3 py-2 text-right tabular-nums font-semibold">
              {group.totalRepairManHours.toFixed(1)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums font-semibold">
              {fmtCurrency(group.totalAnnualCost)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Recommendations section ────────────────────────────────────────────────

function Recommendations({ rows }: { rows: ReturnType<typeof flattenPmRows> }) {
  const critical = rows
    .filter((r) => r.wkf !== null && r.wkf >= 2 && !r.pmTask)
    .sort((a, b) => (b.wkf ?? 0) - (a.wkf ?? 0))
    .slice(0, 10);

  if (critical.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Przyczyny o wysokiej krytyczności (WK_F ≥ 2) bez zdefiniowanego zadania PM:
      </p>
      {critical.map((row) => {
        const { category, text } = parseCauseDescription(row.causeDescription);
        return (
          <div key={row.causeId} className="rounded-md border border-red-200 bg-red-50 p-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">{row.causeCode}</span>
                  <span className="text-xs bg-red-100 text-red-700 border border-red-300 px-1.5 rounded font-semibold">
                    WK_F {row.wkf?.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">{row.systemName} / {row.assemblyName} / {row.mgCode}</span>
                </div>
                {category && <p className="text-xs text-muted-foreground/70 mt-0.5">[{category}]</p>}
                <p className="text-xs text-foreground mt-0.5">{text}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{row.pfCode} — {row.pfDescription}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Simple tab bar ─────────────────────────────────────────────────────────

function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b pb-0">
      {tabs.map(({ id, label, count }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors border-b-2 ${
            active === id
              ? 'border-brand-orange text-brand-orange bg-brand-orange/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {label}
          {count !== undefined && (
            <span className="ml-1.5 text-[10px] bg-secondary rounded-full px-1.5 py-0.5">{count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function SummaryPage() {
  const { machineId } = useParams<{ machineId: string }>();
  const id = machineId ?? '';

  const { data: analysis, isLoading } = useRcmAnalysis(id);

  const [freqTab, setFreqTab] = useState<string>('');
  const [branchTab, setBranchTab] = useState<string>('');
  const [exportOpen, setExportOpen] = useState(false);

  const rows = useMemo(() => flattenPmRows(analysis), [analysis]);
  const kpi = useMemo(() => computeKpi(rows), [rows]);
  const pieData = useMemo(() => computeTaskTypeDistribution(rows), [rows]);
  const barData = useMemo(() => computeWkfDistribution(rows), [rows]);
  const freqGroups = useMemo(() => computeFrequencyGroups(rows), [rows]);
  const branchGroups = useMemo(() => computeBranchGroups(rows), [rows]);
  const heatGrid = useMemo(() => computeHeatMap(rows), [rows]);
  const calendar = useMemo(
    () => computeCalendar(rows, analysis?.allowedUnavailability ?? 0),
    [rows, analysis],
  );

  // Initialize tabs
  const freqTabActive = freqTab || freqGroups[0]?.bucket || '';
  const branchTabActive = branchTab || branchGroups[0]?.branch || '';

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!analysis) return null;

  const activeFreqGroup = freqGroups.find((g) => g.bucket === freqTabActive);
  const activeBranchGroup = branchGroups.find((g) => g.branch === branchTabActive);

  return (
    <div className="space-y-8 pb-12">
      {/* ── Sekcja 1: KPI ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <SectionTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Podsumowanie analizy
          </SectionTitle>
          <Button size="sm" className="gap-1.5" onClick={() => setExportOpen(true)}>
            <Download className="h-3.5 w-3.5" />
            Eksportuj raport
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            icon={ClipboardList}
            label="Przyczyny analizowane"
            value={String(kpi.totalCauses)}
            sub={`${kpi.noCritAssessed} bez oceny krytyczności`}
            badge={kpi.noCritAssessed > 0 ? (
              <Badge variant="secondary" className="text-[10px]">{kpi.noCritAssessed} bez oceny</Badge>
            ) : undefined}
          />
          <KpiCard
            icon={AlertTriangle}
            label="Wysoka krytyczność"
            value={String(kpi.highCriticality)}
            sub="WK_F ≥ 2.0"
            color={kpi.highCriticality > 0 ? 'text-red-600' : 'text-foreground'}
            badge={kpi.highCriticality > 0 ? (
              <Badge className="text-[10px] bg-red-100 text-red-800 border-red-300 hover:bg-red-100">
                Priorytet
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">Brak</Badge>
            )}
          />
          <KpiCard
            icon={CheckCircle2}
            label="Zadania PM aktywne"
            value={String(kpi.activePmTasks)}
            sub={`z ${kpi.totalPmTasks} zdefiniowanych (${kpi.noPmDefined} bez zadania)`}
            color="text-green-600"
          />
          <KpiCard
            icon={Banknote}
            label="Koszt PM roczny"
            value={fmtCurrency(kpi.totalAnnualCost)}
            sub="szacunkowy koszt łączny"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Rozkład zadań PM wg typu</CardTitle>
            </CardHeader>
            <CardContent>
              <PieChart data={pieData} size={130} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Rozkład przyczyn wg krytyczności WK_F</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart data={barData} height={80} barWidth={52} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Sekcja 2: Wg częstotliwości ─────────────────────────────────── */}
      <section className="space-y-3">
        <SectionTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          Lista zadań wg częstotliwości
        </SectionTitle>
        {freqGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak zdefiniowanych zadań PM.</p>
        ) : (
          <>
            <TabBar
              tabs={freqGroups.map((g) => ({ id: g.bucket, label: g.label, count: g.rows.length }))}
              active={freqTabActive}
              onChange={(v) => setFreqTab(v)}
            />
            {activeFreqGroup && <FreqTable group={activeFreqGroup} />}
          </>
        )}
      </section>

      {/* ── Sekcja 3: Wg branży ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          Lista zadań wg branży / kompetencji
        </SectionTitle>
        {branchGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak zdefiniowanych zadań PM z przypisaną branżą.</p>
        ) : (
          <>
            <TabBar
              tabs={branchGroups.map((g) => ({
                id: g.branch,
                label: g.branch,
                count: g.rows.length,
              }))}
              active={branchTabActive}
              onChange={(v) => setBranchTab(v)}
            />
            {activeBranchGroup && (
              <div className="space-y-2">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Zadań: <strong className="text-foreground">{activeBranchGroup.rows.length}</strong></span>
                  <span>Czas roczny: <strong className="text-foreground">{activeBranchGroup.totalRepairManHours.toFixed(1)} rbh/rok</strong></span>
                  <span>Koszt roczny: <strong className="text-foreground">{fmtCurrency(activeBranchGroup.totalAnnualCost)}</strong></span>
                </div>
                <BranchTable group={activeBranchGroup} />
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Sekcja 4: Mapa krytyczności ─────────────────────────────────── */}
      <section className="space-y-3">
        <SectionTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          Mapa krytyczności (WK × WP)
        </SectionTitle>
        <Card>
          <CardContent className="pt-5">
            <HeatMap grid={heatGrid} />
          </CardContent>
        </Card>
      </section>

      {/* ── Sekcja 5: Harmonogram PM ─────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          Harmonogram PM — kalendarz roczny
        </SectionTitle>
        <Card>
          <CardContent className="pt-5 overflow-x-auto">
            <PmCalendar data={calendar} />
          </CardContent>
        </Card>
      </section>

      {/* ── Sekcja 6: Zalecenia ──────────────────────────────────────────── */}
      {rows.some((r) => r.wkf !== null && r.wkf >= 2 && !r.pmTask) && (
        <section className="space-y-3">
          <SectionTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Zalecenia — przyczyny wymagające działań
          </SectionTitle>
          <Recommendations rows={rows} />
        </section>
      )}

      {/* Export modal */}
      <ExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        rows={rows}
        analysis={analysis}
        machineId={id}
      />
    </div>
  );
}
