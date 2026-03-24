import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BomNavPanel, type NavNode } from '@/components/rcm/BomNavPanel';
import { PhysicalFailureModal } from '@/components/rcm/PhysicalFailureModal';
import { CauseModal } from '@/components/rcm/CauseModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useMachineWithBOM } from '@/hooks/useBom';
import {
  useMachineFunctions,
  useRcmAnalysis,
  useCreatePF,
  useUpdatePF,
  useDeletePF,
  useCreateCause,
  useUpdateCause,
  useDeleteCause,
} from '@/hooks/useRcm';
import { cn } from '@/lib/utils';
import type {
  FailureCause,
  FunctionalFailure,
  PhysicalFailureAnalysis,
  RcmAssembly,
  RcmMaterialGroup,
} from '@/types';

// ── Stats bar ──────────────────────────────────────────────────────────────

function StatsBar({ machineId }: { machineId: string }) {
  const { data: analysis } = useRcmAnalysis(machineId);

  if (!analysis) return null;

  let ffCount = 0;
  let pfCount = 0;
  let causeCount = 0;
  let noCrit = 0;
  let noPm = 0;
  const seenFF = new Set<string>();

  for (const sys of analysis.systems) {
    for (const asm of sys.assemblies) {
      for (const mg of asm.materialGroups) {
        for (const pf of mg.physicalFailures) {
          pfCount++;
          if (!seenFF.has(pf.functionalFailureId)) {
            seenFF.add(pf.functionalFailureId);
            ffCount++;
          }
          for (const c of pf.causes) {
            causeCount++;
            if (!c.criticality) noCrit++;
            if (!c.pmTask) noPm++;
          }
        }
      }
    }
  }

  return (
    <div className="rounded-lg border bg-card px-4 py-3 flex flex-wrap items-center gap-6 text-sm">
      <StatItem label="UF" value={ffCount} />
      <StatItem label="Uszkodzeń fizycznych" value={pfCount} />
      <StatItem label="Przyczyn" value={causeCount} />
      {noCrit > 0 && (
        <div className="flex items-center gap-1.5">
          <Badge className="bg-red-100 text-red-800 border-0">{noCrit} bez krytyczności</Badge>
        </div>
      )}
      {noPm > 0 && (
        <div className="flex items-center gap-1.5">
          <Badge className="bg-amber-100 text-amber-800 border-0">{noPm} bez zadania PM</Badge>
        </div>
      )}
      {causeCount > 0 && noCrit === 0 && noPm === 0 && (
        <div className="flex items-center gap-1.5 text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-xs font-medium">Wszystkie przyczyny ocenione</span>
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

// ── Cause Card ─────────────────────────────────────────────────────────────

function CauseCard({
  cause,
  onEdit,
  onDelete,
}: {
  cause: FailureCause;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const { machineId: mid } = useParams<{ machineId: string }>();

  const hasCrit = Boolean(cause.criticality);
  const hasPm = Boolean(cause.pmTask);

  let wkLabel = '';
  if (cause.criticality) {
    const c = cause.criticality;
    const wk = ((c.safety + (c.availability ?? 0) + c.quality + c.production + c.frequency) / 5 +
      (c.repairCost + c.laborTime) / 2) / 2;
    wkLabel = `WK = ${wk.toFixed(1)}`;
  }

  const catMatch = cause.description.match(/^\[([^\]]+)\]/);
  const category = catMatch?.[1] ?? null;
  const desc = catMatch ? cause.description.slice(catMatch[0].length + 1) : cause.description;

  return (
    <div className="rounded-lg border p-3 space-y-2 hover:border-border/80 transition-colors group">
      <div className="flex items-start gap-2">
        <span className="font-mono text-xs text-muted-foreground pt-0.5 shrink-0">{cause.code}</span>
        <div className="flex-1 min-w-0">
          {category && (
            <span className="text-[10px] font-medium bg-secondary rounded px-1.5 py-0.5 mr-1">
              {category}
            </span>
          )}
          <span className="text-sm">{desc}</span>
        </div>
        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
          <button type="button" onClick={onEdit} className="p-1 rounded text-muted-foreground hover:text-foreground">
            <Pencil className="h-3 w-3" />
          </button>
          <button type="button" onClick={onDelete} className="p-1 rounded text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {hasCrit ? (
          <Badge className="bg-blue-100 text-blue-800 border-0 text-[10px]">
            ⚠ {wkLabel}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">Brak krytyczności</Badge>
        )}
        {hasPm ? (
          <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">
            ✅ {cause.pmTask?.taskType}
            {cause.pmTask?.finalFrequencyMonths ? ` co ${cause.pmTask.finalFrequencyMonths}M` : ''}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">Brak zadania PM</Badge>
        )}

        <div className="ml-auto flex gap-1">
          {!hasCrit && (
            <Button
              size="sm"
              variant="ghost"
              className="h-5 text-[10px] px-2 text-blue-700 hover:bg-blue-50"
              onClick={() => navigate(`/app/machines/${mid}/criticality`)}
            >
              Oceń krytyczność →
            </Button>
          )}
          {!hasPm && (
            <Button
              size="sm"
              variant="ghost"
              className="h-5 text-[10px] px-2 text-amber-700 hover:bg-amber-50"
              onClick={() => navigate(`/app/machines/${mid}/pm-tasks`)}
            >
              Zdefiniuj zadanie →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PF Card ────────────────────────────────────────────────────────────────

function PFCard({
  pf,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  pf: PhysicalFailureAnalysis;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Compute max WK across causes
  const maxWk = pf.causes.reduce((max, c) => {
    if (!c.criticality) return max;
    const cr = c.criticality;
    const wk = ((cr.safety + (cr.availability ?? 0) + cr.quality + cr.production + cr.frequency) / 5 +
      (cr.repairCost + cr.laborTime) / 2) / 2;
    return Math.max(max, wk);
  }, -1);

  return (
    <div
      className={cn(
        'rounded-lg border p-3 cursor-pointer transition-colors group',
        selected ? 'border-brand-navy bg-brand-navy/5' : 'hover:border-border/80',
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5 flex-wrap mb-1">
            <Badge variant="outline" className="font-mono text-[10px] shrink-0 bg-muted/40 py-0">
              {pf.code}
            </Badge>
            <p className="text-sm font-medium leading-tight">{pf.description}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {pf.materialGroup?.code} — {pf.materialGroup?.name}
            {pf.mtbfMonths ? ` | MTBF: ${pf.mtbfMonths} mies.` : ''}
            {` | Przyczyny: ${pf.causes.length}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {maxWk >= 0 && (
            <Badge className="bg-blue-100 text-blue-800 border-0 text-[10px]">
              WK: {maxWk.toFixed(2)}
            </Badge>
          )}
          <div className="hidden group-hover:flex gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1 rounded text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MG Section in Panel B ──────────────────────────────────────────────────

function MGSection({
  mg,
  selectedPfId,
  onSelectPf,
  onEditPf,
  onDeletePf,
  onAddPf,
}: {
  mg: RcmMaterialGroup;
  selectedPfId: string | null;
  onSelectPf: (pfId: string) => void;
  onEditPf: (pf: PhysicalFailureAnalysis) => void;
  onDeletePf: (pf: PhysicalFailureAnalysis) => void;
  onAddPf: (mgId: string) => void;
}) {
  const hasPfs = mg.physicalFailures.length > 0;

  return (
    <div className="space-y-1.5">
      {/* MG header row */}
      <div className="flex items-center gap-2 px-1 py-0.5">
        <span className="font-mono text-xs font-bold text-brand-navy">{mg.code}</span>
        <span className="text-xs text-muted-foreground truncate">{mg.name}</span>
        <Badge variant="outline" className="ml-auto text-[10px] shrink-0">
          {mg.physicalFailures.length} PF
        </Badge>
      </div>

      {hasPfs ? (
        <>
          <div className="space-y-1.5 rounded-md border p-2">
            {mg.physicalFailures.map((pf) => (
              <PFCard
                key={pf.id}
                pf={pf}
                selected={selectedPfId === pf.id}
                onSelect={() => onSelectPf(pf.id)}
                onEdit={() => onEditPf(pf)}
                onDelete={() => onDeletePf(pf)}
              />
            ))}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[10px] px-2 text-muted-foreground w-full justify-start"
            onClick={() => onAddPf(mg.id)}
          >
            <Plus className="h-3 w-3 mr-0.5" /> Dodaj opis uszkodzenia {mg.code}
          </Button>
        </>
      ) : (
        <p className="text-xs text-muted-foreground px-1 flex items-center gap-2">
          <span>Brak uszkodzeń.</span>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 text-primary hover:underline"
            onClick={() => onAddPf(mg.id)}
          >
            <Plus className="h-3 w-3" /> Dodaj opis uszkodzenia {mg.code}
          </button>
        </p>
      )}
    </div>
  );
}

// ── PhysicalFailuresPage ───────────────────────────────────────────────────

export default function PhysicalFailuresPage() {
  const { machineId } = useParams<{ machineId: string }>();
  const id = machineId ?? '';

  const { data: machine, isLoading: bomLoading } = useMachineWithBOM(id);
  const { data: analysis, isLoading: analysisLoading } = useRcmAnalysis(id);
  const { data: allFunctions = [] } = useMachineFunctions(id);

  const [selectedNode, setSelectedNode] = useState<NavNode | null>(null);
  const [selectedPfId, setSelectedPfId] = useState<string | null>(null);

  const [pfModal, setPfModal] = useState<{
    open: boolean;
    editing?: PhysicalFailureAnalysis;
    preselectedMgId?: string;
    preselectedFfId?: string;
  }>({ open: false });
  const [causeModal, setCauseModal] = useState<{
    open: boolean;
    editing?: FailureCause;
    pfId?: string;
    pfCode?: string;
  }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<{ label: string; onConfirm: () => void } | null>(null);

  const [ffByFunction, setFfByFunction] = useState<Record<string, FunctionalFailure[]>>({});

  const createPF = useCreatePF(id);
  const updatePF = useUpdatePF(id);
  const deletePF = useDeletePF(id);
  const createCause = useCreateCause(id);
  const updateCause = useUpdateCause(id);
  const deleteCause = useDeleteCause(id);

  // Derive selected assembly from analysis
  const selectedAsm: RcmAssembly | null =
    selectedNode?.type === 'assembly' && analysis
      ? (analysis.systems.flatMap((s) => s.assemblies).find((a) => a.id === selectedNode.id) ?? null)
      : null;

  // All PFs in the selected assembly (for causes panel lookup and code suggestion)
  const allAsmPfs: PhysicalFailureAnalysis[] = selectedAsm
    ? selectedAsm.materialGroups.flatMap((mg) => mg.physicalFailures)
    : [];

  // Selected PF's causes
  const selectedPf = allAsmPfs.find((p) => p.id === selectedPfId) ?? null;

  const handleFunctionChange = useCallback(
    async (functionId: string) => {
      if (ffByFunction[functionId]) return;
      try {
        const { data } = await import('@/lib/api').then((m) =>
          m.api.get<{ data: { failures: FunctionalFailure[] } }>(
            `/functions/${functionId}/functional-failures`,
          ),
        );
        setFfByFunction((prev) => ({ ...prev, [functionId]: data.data.failures }));
      } catch {
        /* ignore */
      }
    },
    [ffByFunction],
  );

  if (bomLoading || analysisLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!machine) return null;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <StatsBar machineId={id} />

      <div className="flex gap-0 h-[calc(100vh-300px)] min-h-[500px]">
        {/* Panel A — BOM nav (System → Assembly → MG display-only) */}
        <div className="w-[180px] shrink-0 border-r overflow-y-auto pr-2 py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-2">
            BOM
          </p>
          {machine && (
            <BomNavPanel
              machine={machine}
              selectedId={selectedNode?.id ?? null}
              onSelect={(node) => {
                setSelectedNode(node);
                setSelectedPfId(null);
              }}
              showMaterialGroups
            />
          )}
        </div>

        {/* Panel B — MG sections with PF lists */}
        <div className="w-[40%] shrink-0 border-r overflow-y-auto px-3 py-2 space-y-3">
          {!selectedAsm ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-center">
              <AlertTriangle className="h-6 w-6 mb-2 opacity-30" />
              <p className="text-xs">Wybierz zespół z drzewa BOM po lewej</p>
            </div>
          ) : selectedAsm.materialGroups.length === 0 ? (
            <div className="rounded border border-dashed p-6 text-center">
              <p className="text-xs text-muted-foreground">
                Ten zespół nie ma grup materiałowych. Dodaj je w module BOM.
              </p>
            </div>
          ) : (() => {
            const totalPfs = selectedAsm.materialGroups.reduce(
              (sum, mg) => sum + mg.physicalFailures.length, 0,
            );

            if (totalPfs === 0) {
              // Empty state — assembly has no PFs at all
              return (
                <div className="flex flex-col items-start gap-3 pt-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {selectedAsm.number} {selectedAsm.name}
                  </p>
                  <div className="w-full rounded border border-dashed p-8 flex flex-col items-center gap-3 text-center">
                    <p className="text-sm text-muted-foreground">
                      Brak uszkodzeń fizycznych dla tego zespołu.
                    </p>
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
                      onClick={() => setPfModal({ open: true })}
                    >
                      <Plus className="h-3.5 w-3.5" /> Dodaj uszkodzenie fizyczne
                    </Button>
                  </div>
                </div>
              );
            }

            // Assembly has PFs — show MG sections
            return (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {selectedAsm.number} {selectedAsm.name}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs gap-1"
                    onClick={() => setPfModal({ open: true })}
                  >
                    <Plus className="h-3 w-3" /> Dodaj uszkodzenie fizyczne
                  </Button>
                </div>
                <div className="space-y-4">
                  {selectedAsm.materialGroups.filter((mg) => mg.physicalFailures.length > 0).map((mg) => (
                    <MGSection
                      key={mg.id}
                      mg={mg}
                      selectedPfId={selectedPfId}
                      onSelectPf={setSelectedPfId}
                      onEditPf={(pf) => setPfModal({ open: true, editing: pf })}
                      onDeletePf={(pf) =>
                        setDeleteTarget({
                          label: `uszkodzenie fizyczne "${pf.code}"`,
                          onConfirm: () =>
                            deletePF.mutate(
                              { pfId: pf.id, ffId: pf.functionalFailureId },
                              { onSuccess: () => setSelectedPfId(null) },
                            ),
                        })
                      }
                      onAddPf={(mgId) => setPfModal({ open: true, preselectedMgId: mgId })}
                    />
                  ))}
                </div>
              </>
            );
          })()}
        </div>

        {/* Panel C — Causes */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {selectedPf ? `Przyczyny — ${selectedPf.code}` : 'Przyczyny uszkodzenia'}
            </p>
            {selectedPf && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs gap-1"
                onClick={() =>
                  setCauseModal({ open: true, pfId: selectedPf.id, pfCode: selectedPf.code })
                }
              >
                <Plus className="h-3 w-3" /> Dodaj przyczynę
              </Button>
            )}
          </div>

          {!selectedPf ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-center">
              <Clock className="h-6 w-6 mb-2 opacity-30" />
              <p className="text-xs">Wybierz uszkodzenie fizyczne z panelu obok</p>
            </div>
          ) : selectedPf.causes.length === 0 ? (
            <div className="rounded border border-dashed p-6 text-center">
              <p className="text-xs text-muted-foreground">
                Brak przyczyn.{' '}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() =>
                    setCauseModal({ open: true, pfId: selectedPf.id, pfCode: selectedPf.code })
                  }
                >
                  Dodaj pierwszą.
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedPf.causes.map((cause) => (
                <CauseCard
                  key={cause.id}
                  cause={cause}
                  onEdit={() =>
                    setCauseModal({
                      open: true,
                      editing: cause,
                      pfId: selectedPf.id,
                      pfCode: selectedPf.code,
                    })
                  }
                  onDelete={() =>
                    setDeleteTarget({
                      label: `przyczynę "${cause.code}"`,
                      onConfirm: () =>
                        deleteCause.mutate({ causeId: cause.id, pfId: selectedPf.id }),
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PF Modal */}
      {machine && (
        <PhysicalFailureModal
          open={pfModal.open}
          onOpenChange={(v) => !v && setPfModal({ open: false })}
          defaultValues={pfModal.editing}
          machine={machine}
          functions={allFunctions}
          ffByFunction={ffByFunction}
          onFunctionChange={handleFunctionChange}
          preselectedMgId={pfModal.preselectedMgId}
          preselectedFfId={pfModal.preselectedFfId}
          filterAssemblyId={selectedNode?.type === 'assembly' ? selectedNode.id : undefined}
          analysis={analysis}
          isPending={createPF.isPending || updatePF.isPending}
          onSubmit={(data) => {
            if (pfModal.editing) {
              updatePF.mutate(
                {
                  pfId: pfModal.editing.id,
                  ffId: pfModal.editing.functionalFailureId,
                  data: {
                    description: data.description,
                    materialGroupId: data.materialGroupId,
                    mtbfMonths: data.mtbfMonths,
                  },
                },
                { onSuccess: () => setPfModal({ open: false }) },
              );
            } else {
              createPF.mutate(
                { ffId: data.ffId, data: { description: data.description, materialGroupId: data.materialGroupId, mtbfMonths: data.mtbfMonths } },
                { onSuccess: () => setPfModal({ open: false }) },
              );
            }
          }}
        />
      )}

      {/* Cause Modal */}
      <CauseModal
        open={causeModal.open}
        onOpenChange={(v) => !v && setCauseModal({ open: false })}
        defaultValues={causeModal.editing}
        suggestedCode={
          selectedPf
            ? `C${(selectedPf.causes.length + 1).toString().padStart(2, '0')}`
            : 'C01'
        }
        pfCode={causeModal.pfCode}
        isPending={createCause.isPending || updateCause.isPending}
        onSubmit={(data) => {
          const pfId = causeModal.pfId ?? '';
          if (causeModal.editing) {
            updateCause.mutate(
              { causeId: causeModal.editing.id, pfId, data },
              { onSuccess: () => setCauseModal({ open: false }) },
            );
          } else {
            createCause.mutate(
              { pfId, data },
              { onSuccess: () => setCauseModal({ open: false }) },
            );
          }
        }}
      />

      {/* Delete confirm */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdź usunięcie</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć {deleteTarget?.label}? Operacja jest nieodwracalna i
              usuwa kaskadowo elementy podrzędne.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { deleteTarget?.onConfirm(); setDeleteTarget(null); }}
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
