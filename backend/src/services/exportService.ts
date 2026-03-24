import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
} from 'docx';
import * as XLSX from 'xlsx';
import { getFullRcmAnalysis } from './rcmAnalysisService';
import { computeIndices } from './criticalityService';
import { PrismaClient } from '@prisma/client';

// ── Helpers ────────────────────────────────────────────────────────────────

function n(v: { toNumber(): number } | number | null | undefined): number {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  return v.toNumber();
}

function round2(x: number) {
  return Math.round(x * 100) / 100;
}

function fmtPLN(v: number) {
  return `${v.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} PLN`;
}

const TASK_LABELS: Record<string, string> = {
  RTF: 'RTF (uszkodzeniowa)',
  REDESIGN: 'Przeprojektowanie',
  PDM: 'PdM (diagnostyczna)',
  PM_INSPECTION: 'PM Inspekcja',
  PM_OVERHAUL: 'PM Remont',
};

// ── Flatten rows ───────────────────────────────────────────────────────────

interface FlatRow {
  systemName: string;
  assemblyName: string;
  mgCode: string;
  mgName: string;
  pfCode: string;
  pfDescription: string;
  pfMtbfMonths: number | null;
  causeCode: string;
  causeDescription: string;
  wk: number | null;
  wp: number | null;
  wkf: number | null;
  totalFailureCost: number;
  pmTaskType: string | null;
  pmDescription: string | null;
  pmAssignedTo: string | null;
  pmFrequencyMonths: number | null;
  pmTotalCost: number | null;
  pmIsActive: boolean;
  pmAnnualCost: number;
}

type AnalysisType = Awaited<ReturnType<typeof getFullRcmAnalysis>>;

function flattenAnalysis(analysis: AnalysisType): FlatRow[] {
  const rows: FlatRow[] = [];
  const machine = analysis;

  for (const system of analysis.systems) {
    for (const assembly of system.assemblies) {
      for (const mg of assembly.materialGroups) {
        for (const pf of mg.physicalFailures) {
          for (const cause of pf.causes) {
            const c = cause.criticality;
            let wk: number | null = null;
            let wp: number | null = null;
            let wkf: number | null = null;
            let totalFailureCost = 0;

            if (c) {
              const idx = computeIndices(c, c, machine);
              wk = idx.consequenceIndex;
              wp = idx.workloadIndex;
              wkf = idx.criticalityIndex;
              totalFailureCost = idx.totalFailureCost;
            }

            const pmTask = cause.pmTask;
            let pmAnnualCost = 0;
            if (pmTask?.isActive && pmTask.totalCostPM && pmTask.finalFrequencyMonths) {
              pmAnnualCost = round2(n(pmTask.totalCostPM) * (12 / pmTask.finalFrequencyMonths));
            }

            rows.push({
              systemName: system.name,
              assemblyName: assembly.name,
              mgCode: mg.code,
              mgName: mg.name,
              pfCode: pf.code,
              pfDescription: pf.description,
              pfMtbfMonths: pf.mtbfMonths ? n(pf.mtbfMonths) : null,
              causeCode: cause.code,
              causeDescription: cause.description,
              wk,
              wp,
              wkf,
              totalFailureCost,
              pmTaskType: pmTask?.taskType ?? null,
              pmDescription: pmTask?.description ?? null,
              pmAssignedTo: pmTask?.assignedTo ?? null,
              pmFrequencyMonths: pmTask?.finalFrequencyMonths ?? null,
              pmTotalCost: pmTask?.totalCostPM ? n(pmTask.totalCostPM) : null,
              pmIsActive: pmTask?.isActive ?? false,
              pmAnnualCost,
            });
          }
        }
      }
    }
  }
  return rows;
}

// ── DOCX helpers ───────────────────────────────────────────────────────────

const CELL_BORDER = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: 'CCCCCC',
};

const CELL_BORDERS = {
  top: CELL_BORDER,
  bottom: CELL_BORDER,
  left: CELL_BORDER,
  right: CELL_BORDER,
};

const HEADER_SHADING = { type: ShadingType.SOLID, color: 'F1F5F9', fill: 'F1F5F9' };

function hCell(text: string): TableCell {
  return new TableCell({
    shading: HEADER_SHADING,
    borders: CELL_BORDERS,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 16 })],
      }),
    ],
  });
}

function dCell(text: string, opts?: { bold?: boolean }): TableCell {
  return new TableCell({
    borders: CELL_BORDERS,
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 16, bold: opts?.bold })],
      }),
    ],
  });
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1): Paragraph {
  return new Paragraph({ text, heading: level, spacing: { before: 300, after: 100 } });
}

function para(text: string, opts?: { bold?: boolean; size?: number }): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts?.bold, size: opts?.size ?? 20 })],
    spacing: { after: 80 },
  });
}

// ── DOCX generation ────────────────────────────────────────────────────────

export async function generateDocx(machineId: string, companyId: string, prisma: PrismaClient): Promise<Buffer> {
  const analysis = await getFullRcmAnalysis(machineId, companyId, prisma);
  const rows = flattenAnalysis(analysis);

  const totalCauses = rows.length;
  const highCrit = rows.filter((r) => r.wkf !== null && r.wkf >= 2).length;
  const activePm = rows.filter((r) => r.pmIsActive).length;
  const totalAnnualCost = rows.reduce((s, r) => s + r.pmAnnualCost, 0);
  const today = new Date().toLocaleDateString('pl-PL');

  // PM rows only
  const pmRows = rows.filter((r) => r.pmTaskType && r.pmIsActive);

  // Group by frequency
  function freqLabel(m: number | null): string {
    if (!m) return 'RTF / Redesign';
    if (m <= 1) return 'Miesięczne (1M)';
    if (m <= 3) return 'Co 3 miesiące';
    if (m <= 7) return 'Co 6 miesięcy';
    if (m <= 14) return 'Co rok (12M)';
    return 'Co 24M+';
  }

  const freqMap = new Map<string, FlatRow[]>();
  for (const r of pmRows) {
    const key = freqLabel(r.pmFrequencyMonths);
    if (!freqMap.has(key)) freqMap.set(key, []);
    freqMap.get(key)!.push(r);
  }

  // Group by branch
  const branchMap = new Map<string, FlatRow[]>();
  for (const r of pmRows) {
    const key = r.pmAssignedTo ?? 'Nieprzypisano';
    if (!branchMap.has(key)) branchMap.set(key, []);
    branchMap.get(key)!.push(r);
  }

  // ── Build sections ─────────────────────────────────────────────────────

  const children: (Paragraph | Table)[] = [];

  // Title page
  children.push(
    new Paragraph({
      text: 'ANALIZA RCM',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `${analysis.number} — ${analysis.name}`, size: 28, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Data sporządzenia: ${today}`, size: 20, color: '666666' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    new Paragraph({ text: '', pageBreakBefore: true }),
  );

  // 1. Streszczenie wykonawcze
  children.push(
    heading('1. Streszczenie wykonawcze'),
    para(`Niniejszy raport zawiera wyniki analizy niezawodności wg metodyki RCM (Reliability-Centered Maintenance) dla maszyny ${analysis.number} — ${analysis.name}.`),
    para('', { size: 12 }),
    para('Kluczowe wskaźniki analizy:', { bold: true }),
    para(`• Łączna liczba przyczyn uszkodzeń: ${totalCauses}`),
    para(`• Przyczyny o wysokiej krytyczności (WK_F ≥ 2): ${highCrit}`),
    para(`• Aktywne zadania PM: ${activePm}`),
    para(`• Szacowany łączny koszt PM (rocznie): ${fmtPLN(totalAnnualCost)}`),
    para('', { size: 12 }),
  );

  // 2. Tabela krytyczności
  children.push(heading('2. Tabela oceny krytyczności'));

  const critTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          hCell('Lokalizacja'), hCell('Kod'), hCell('Opis przyczyny'),
          hCell('WK'), hCell('WP'), hCell('WK_F'), hCell('Zadanie PM'),
        ],
      }),
      ...rows.map(
        (r) =>
          new TableRow({
            children: [
              dCell(`${r.systemName}\n${r.assemblyName}\n${r.mgCode}`),
              dCell(r.causeCode),
              dCell(r.causeDescription.replace(/^\[[^\]]+\]\s*/, '').substring(0, 80)),
              dCell(r.wk !== null ? r.wk.toFixed(2) : '—'),
              dCell(r.wp !== null ? r.wp.toFixed(2) : '—'),
              dCell(r.wkf !== null ? r.wkf.toFixed(2) : '—', { bold: (r.wkf ?? 0) >= 2 }),
              dCell(r.pmTaskType ? TASK_LABELS[r.pmTaskType] ?? r.pmTaskType : '—'),
            ],
          }),
      ),
    ],
  });

  children.push(critTable, new Paragraph({ text: '', spacing: { after: 200 } }));

  // 3. Plan PM wg częstotliwości
  children.push(heading('3. Plan PM — wg częstotliwości'));

  for (const [freqKey, fRows] of freqMap) {
    children.push(heading(freqKey, HeadingLevel.HEADING_2));
    const annualTotal = fRows.reduce((s, r) => s + r.pmAnnualCost, 0);
    children.push(para(`Zadań: ${fRows.length} · Koszt roczny: ${fmtPLN(annualTotal)}`));

    const freqTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [hCell('Lokalizacja'), hCell('Typ'), hCell('Opis zadania'), hCell('Branża'), hCell('Koszt jedn.'), hCell('Koszt roczny')],
        }),
        ...fRows.map(
          (r) =>
            new TableRow({
              children: [
                dCell(`${r.systemName} / ${r.mgCode}`),
                dCell(r.pmTaskType ? TASK_LABELS[r.pmTaskType] ?? r.pmTaskType : '—'),
                dCell((r.pmDescription ?? '').substring(0, 100)),
                dCell(r.pmAssignedTo ?? '—'),
                dCell(r.pmTotalCost !== null ? fmtPLN(r.pmTotalCost) : '—'),
                dCell(r.pmAnnualCost > 0 ? fmtPLN(r.pmAnnualCost) : '—'),
              ],
            }),
        ),
      ],
    });
    children.push(freqTable, new Paragraph({ text: '', spacing: { after: 160 } }));
  }

  // 4. Plan PM wg branży
  children.push(heading('4. Plan PM — wg branży'));

  for (const [branch, bRows] of branchMap) {
    const annualTotal = bRows.reduce((s, r) => s + r.pmAnnualCost, 0);
    const totalRmh = bRows.reduce((s, r) => {
      if (!r.pmFrequencyMonths) return s;
      const rmh = 0; // repairManHours not in flat row; skip for DOCX
      return s + rmh;
    }, 0);
    children.push(heading(branch, HeadingLevel.HEADING_2));
    children.push(para(`Zadań: ${bRows.length} · Koszt roczny: ${fmtPLN(annualTotal)}` + (totalRmh > 0 ? ` · rbh/rok: ${totalRmh.toFixed(1)}` : '')));

    const branchTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [hCell('Lokalizacja'), hCell('Typ'), hCell('Opis zadania'), hCell('Częst. [mies.]'), hCell('Koszt jedn.'), hCell('Koszt roczny')],
        }),
        ...bRows.map(
          (r) =>
            new TableRow({
              children: [
                dCell(`${r.systemName} / ${r.mgCode}`),
                dCell(r.pmTaskType ? TASK_LABELS[r.pmTaskType] ?? r.pmTaskType : '—'),
                dCell((r.pmDescription ?? '').substring(0, 100)),
                dCell(r.pmFrequencyMonths !== null ? String(r.pmFrequencyMonths) : '—'),
                dCell(r.pmTotalCost !== null ? fmtPLN(r.pmTotalCost) : '—'),
                dCell(r.pmAnnualCost > 0 ? fmtPLN(r.pmAnnualCost) : '—'),
              ],
            }),
        ),
      ],
    });
    children.push(branchTable, new Paragraph({ text: '', spacing: { after: 160 } }));
  }

  // 5. Zalecenia
  const criticalNoPm = rows
    .filter((r) => (r.wkf ?? 0) >= 2 && !r.pmTaskType)
    .sort((a, b) => (b.wkf ?? 0) - (a.wkf ?? 0));

  if (criticalNoPm.length > 0) {
    children.push(heading('5. Zalecenia — przyczyny wymagające działań'));
    children.push(para(`Poniższe ${criticalNoPm.length} przyczyn posiada wysoki wskaźnik krytyczności (WK_F ≥ 2) i nie ma zdefiniowanego zadania PM:`));

    for (const r of criticalNoPm) {
      children.push(
        para(`• ${r.causeCode}: ${r.causeDescription.replace(/^\[[^\]]+\]\s*/, '').substring(0, 120)} — WK_F=${r.wkf?.toFixed(2)}`, { bold: true }),
        para(`  Lokalizacja: ${r.systemName} / ${r.assemblyName} / ${r.mgCode}`, { size: 18 }),
      );
    }
  }

  // ── Create Document ────────────────────────────────────────────────────

  const doc = new Document({
    title: `Analiza RCM — ${analysis.name}`,
    description: `Raport analizy RCM dla maszyny ${analysis.number}`,
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

// ── XLSX generation (backend, for export endpoint) ─────────────────────────

export async function generateXlsx(machineId: string, companyId: string, prisma: PrismaClient): Promise<Buffer> {
  const analysis = await getFullRcmAnalysis(machineId, companyId, prisma);
  const rows = flattenAnalysis(analysis);

  const wb = XLSX.utils.book_new();

  // Sheet 1: Krytyczność
  const hCrit = ['System', 'Zespół', 'Grupa mat.', 'Kod PF', 'Uszkodzenie fizyczne', 'Kod przyczyny', 'Opis przyczyny', 'S', 'Q', 'P', 'F', 'WK', 'C', 'L', 'D', 'WP', 'WK_F', 'Koszt awarii', 'Zadanie PM', 'Aktywne'];
  const dCrit = rows.map((r) => [
    r.systemName, r.assemblyName, `${r.mgCode} ${r.mgName}`,
    r.pfCode, r.pfDescription, r.causeCode,
    r.causeDescription.replace(/^\[[^\]]+\]\s*/, ''),
    '', '', '', '', '', // S,I,Q,P,F — not available in flat
    r.wk ?? '', r.wp !== null ? '' : '', r.wp !== null ? '' : '',
    r.wk?.toFixed(2) ?? '', r.wp?.toFixed(2) ?? '', r.wkf?.toFixed(2) ?? '',
    r.totalFailureCost > 0 ? r.totalFailureCost : '',
    r.pmTaskType ? TASK_LABELS[r.pmTaskType] ?? r.pmTaskType : '',
    r.pmIsActive ? 'TAK' : '',
  ]);
  const ws1 = XLSX.utils.aoa_to_sheet([hCrit, ...dCrit]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Krytyczność');

  // Sheet 2: Zadania PM
  const hPm = ['System', 'Zespół', 'Grupa mat.', 'Kod przyczyny', 'Typ zadania', 'Opis zadania', 'Branża', 'MTBF [mies.]', 'Częst. [mies.]', 'Koszt jedn. [PLN]', 'Koszt roczny [PLN]', 'Aktywne'];
  const dPm = rows
    .filter((r) => r.pmTaskType)
    .map((r) => [
      r.systemName, r.assemblyName, `${r.mgCode} ${r.mgName}`,
      r.causeCode,
      r.pmTaskType ? TASK_LABELS[r.pmTaskType] ?? r.pmTaskType : '',
      r.pmDescription ?? '',
      r.pmAssignedTo ?? '',
      r.pfMtbfMonths ?? '',
      r.pmFrequencyMonths ?? '',
      r.pmTotalCost ?? '',
      r.pmAnnualCost > 0 ? Math.round(r.pmAnnualCost) : '',
      r.pmIsActive ? 'TAK' : 'NIE',
    ]);
  const ws2 = XLSX.utils.aoa_to_sheet([hPm, ...dPm]);
  XLSX.utils.book_append_sheet(wb, ws2, 'Zadania PM');

  // Sheet 3: Podsumowanie
  const totalAnnualCost = rows.reduce((s, r) => s + r.pmAnnualCost, 0);
  const statsData = [
    ['Maszyna', `${analysis.number} — ${analysis.name}`],
    ['Data eksportu', new Date().toLocaleDateString('pl-PL')],
    [],
    ['Łączna liczba przyczyn', rows.length],
    ['Przyczyny z WK_F ≥ 2', rows.filter((r) => (r.wkf ?? 0) >= 2).length],
    ['Zdefiniowane zadania PM', rows.filter((r) => r.pmTaskType).length],
    ['Aktywne zadania PM', rows.filter((r) => r.pmIsActive).length],
    ['Koszt PM roczny [PLN]', Math.round(totalAnnualCost)],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(statsData);
  XLSX.utils.book_append_sheet(wb, ws3, 'Podsumowanie');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
