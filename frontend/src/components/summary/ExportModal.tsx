import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Printer, Loader2, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { annualCost, type PmRow } from './summaryUtils';
import { parseCauseDescription, TASK_TYPE_META } from '@/components/pm/pmUtils';
import { computeWk, computeWp, computeWkf } from '@/components/criticality/criticalityUtils';
import type { RcmAnalysis } from '@/types';

// ── XLSX client-side generation ────────────────────────────────────────────

function exportXlsx(rows: PmRow[], analysis: RcmAnalysis) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: All causes with criticality
  const critHeaders = ['System', 'Zespół', 'Grupa', 'Kod PF', 'Uszkodzenie fiz.', 'Kod przyczyny', 'Przyczyna', 'S', 'I', 'Q', 'P', 'F', 'WK', 'C', 'L', 'WP', 'WK_F', 'Typ zadania PM', 'Aktywne'];
  const critData = rows.map((r) => {
    const c = r.cause.criticality;
    const { text } = parseCauseDescription(r.causeDescription);
    const pmMeta = r.pmTask ? TASK_TYPE_META[r.pmTask.taskType] : null;
    return [
      r.systemName, r.assemblyName, `${r.mgCode} ${r.mgName}`,
      r.pfCode, r.pfDescription,
      r.causeCode, text,
      c?.safety ?? '', c?.impact ?? '', c?.quality ?? '', c?.production ?? '', c?.frequency ?? '',
      c ? computeWk(c).toFixed(2) : '',
      c?.repairCost ?? '', c?.laborTime ?? '',
      c ? computeWp(c).toFixed(2) : '',
      c ? computeWkf(c).toFixed(2) : '',
      pmMeta ? pmMeta.shortLabel : '',
      r.pmTask?.isActive ? 'TAK' : '',
    ];
  });
  const ws1 = XLSX.utils.aoa_to_sheet([critHeaders, ...critData]);
  ws1['!cols'] = critHeaders.map((_, i) => ({ wch: i < 7 ? 24 : 8 }));
  XLSX.utils.book_append_sheet(wb, ws1, 'Krytyczność');

  // Sheet 2: Active PM Tasks
  const pmHeaders = ['System', 'Zespół', 'Grupa', 'Kod przyczyny', 'Typ zadania', 'Opis', 'Branża', 'MTBF [mies.]', 'Obliczona częst. [mies.]', 'Zatwierdzona częst. [mies.]', 'Koszt jedn. [PLN]', 'Koszt roczny [PLN]', 'Aktywne'];
  const pmData = rows
    .filter((r) => r.pmTask)
    .map((r) => {
      const t = r.pmTask!;
      return [
        r.systemName, r.assemblyName, `${r.mgCode} ${r.mgName}`,
        r.causeCode,
        TASK_TYPE_META[t.taskType].label,
        t.description,
        t.assignedTo ?? '',
        r.pfMtbfMonths ?? '',
        t.calculatedFrequencyMonths ?? '',
        t.finalFrequencyMonths ?? '',
        t.totalCostPM ?? '',
        Math.round(annualCost(r)),
        t.isActive ? 'TAK' : 'NIE',
      ];
    });
  const ws2 = XLSX.utils.aoa_to_sheet([pmHeaders, ...pmData]);
  ws2['!cols'] = pmHeaders.map((_, i) => ({ wch: i < 6 ? 24 : 12 }));
  XLSX.utils.book_append_sheet(wb, ws2, 'Zadania PM');

  // Sheet 3: Summary stats
  const statsRows = [
    ['Maszyna', `${analysis.number} — ${analysis.name}`],
    ['Data eksportu', new Date().toLocaleDateString('pl-PL')],
    [],
    ['Łączna liczba przyczyn', rows.length],
    ['Przyczyny ocenione', rows.filter((r) => r.cause.criticality).length],
    ['Przyczyny z WK_F ≥ 2', rows.filter((r) => r.wkf !== null && r.wkf >= 2).length],
    ['Zdefiniowane zadania PM', rows.filter((r) => r.pmTask).length],
    ['Aktywne zadania PM', rows.filter((r) => r.pmTask?.isActive).length],
    ['Szacowany koszt PM roczny [PLN]', Math.round(rows.reduce((s, r) => s + annualCost(r), 0))],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(statsRows);
  ws3['!cols'] = [{ wch: 36 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Podsumowanie');

  XLSX.writeFile(wb, `RCM_${analysis.number}_${analysis.name.replace(/\s+/g, '_')}.xlsx`);
}

// ── Export format options ──────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rows: PmRow[];
  analysis: RcmAnalysis;
  machineId: string;
}

type ExportFormat = 'xlsx' | 'docx' | 'pdf';

const FORMAT_OPTIONS = [
  {
    id: 'xlsx' as ExportFormat,
    icon: FileSpreadsheet,
    label: 'Excel (XLSX)',
    desc: 'Pełna tabela zadań PM, krytyczność, podsumowanie — 3 arkusze',
    iconClass: 'text-green-600',
  },
  {
    id: 'docx' as ExportFormat,
    icon: FileText,
    label: 'Word (DOCX)',
    desc: 'Raport analityczny z opisami, tabelami i zaleceniami',
    iconClass: 'text-blue-600',
  },
  {
    id: 'pdf' as ExportFormat,
    icon: Printer,
    label: 'Druk / PDF',
    desc: 'Otwiera widok wydruku przeglądarki (Ctrl+P → Zapisz jako PDF)',
    iconClass: 'text-red-600',
  },
] as const;

export function ExportModal({ open, onOpenChange, rows, analysis, machineId }: Props) {
  const [selected, setSelected] = useState<ExportFormat>('xlsx');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleExport() {
    setLoading(true);
    try {
      if (selected === 'xlsx') {
        exportXlsx(rows, analysis);
      } else if (selected === 'docx') {
        const resp = await api.get(`/machines/${machineId}/export/docx`, {
          responseType: 'blob',
        });
        const url = URL.createObjectURL(resp.data as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RCM_${analysis.number}_${analysis.name.replace(/\s+/g, '_')}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        onOpenChange(false);
        window.print();
        return;
      }
      onOpenChange(false);
    } catch {
      // toast handled by api interceptor
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={() => onOpenChange(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-xl border shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Eksport raportu</h2>
            </div>
            <button type="button" onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Format options */}
          <div className="p-5 space-y-3">
            <p className="text-xs text-muted-foreground mb-4">
              Maszyna: <strong>{analysis.number} — {analysis.name}</strong>
            </p>
            {FORMAT_OPTIONS.map(({ id, icon: Icon, label, desc, iconClass }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSelected(id)}
                className={`w-full text-left rounded-lg border p-3.5 transition-all ${
                  selected === id
                    ? 'border-brand-orange bg-brand-orange/5 ring-1 ring-brand-orange'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconClass}`} />
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  <div className={`ml-auto h-4 w-4 rounded-full border-2 shrink-0 mt-1 ${
                    selected === id ? 'border-brand-orange bg-brand-orange' : 'border-muted-foreground/40'
                  }`} />
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-5 pb-5">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button size="sm" onClick={handleExport} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {selected === 'pdf' ? 'Drukuj' : 'Pobierz'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
