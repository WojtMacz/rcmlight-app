import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BomNavPanel, type NavNode } from '@/components/rcm/BomNavPanel';
import { FunctionModal } from '@/components/rcm/FunctionModal';
import { FunctionalFailureModal } from '@/components/rcm/FunctionalFailureModal';
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
  useFunctionalFailures,
  useCreateSystemFunction,
  useCreateAssemblyFunction,
  useUpdateFunction,
  useDeleteFunction,
  useCreateFF,
  useUpdateFF,
  useDeleteFF,
} from '@/hooks/useRcm';
import type { FunctionDef, FunctionalFailure } from '@/types';

// ── Functional Failure Row ──────────────────────────────────────────────────

function FFRow({
  ff,
  onEdit,
  onDelete,
}: {
  ff: FunctionalFailure;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-3 py-2 px-3 rounded hover:bg-secondary/40 group">
      <span className="font-mono text-xs text-muted-foreground pt-0.5 shrink-0 w-16">{ff.code}</span>
      <span className="text-sm flex-1">{ff.description}</span>
      <Badge variant="secondary" className="text-xs shrink-0">
        PF: {ff._count.physicalFailures}
      </Badge>
      <div className="hidden group-hover:flex items-center gap-1 shrink-0">
        <button type="button" onClick={onEdit} className="p-1 rounded text-muted-foreground hover:text-foreground">
          <Pencil className="h-3 w-3" />
        </button>
        <button type="button" onClick={onDelete} className="p-1 rounded text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── Function Block ──────────────────────────────────────────────────────────

function FunctionBlock({
  fn,
  machineId,
  onEditFn,
  onDeleteFn,
}: {
  fn: FunctionDef;
  machineId: string;
  onEditFn: () => void;
  onDeleteFn: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [addFFOpen, setAddFFOpen] = useState(false);
  const [editFF, setEditFF] = useState<FunctionalFailure | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ label: string; onConfirm: () => void } | null>(null);

  const { data: failures = [], isLoading } = useFunctionalFailures(fn.id, expanded);
  const createFF = useCreateFF(machineId, fn.id);
  const updateFF = useUpdateFF(machineId);
  const deleteFF = useDeleteFF(machineId);

  const nextFFCode = `${fn.code}.FF${failures.length + 1}`;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Function header */}
      <div className="flex items-start gap-2 px-4 py-3 bg-secondary/30 group">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 text-muted-foreground shrink-0"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-brand-orange font-bold">{fn.code}</span>
            <Badge variant="outline" className="text-[10px] py-0">
              {fn.level === 'SYSTEM' ? 'SYSTEM' : 'ZESPÓŁ'}
            </Badge>
          </div>
          <p className="text-sm font-medium mt-0.5">{fn.description}</p>
          {fn.standard && (
            <p className="text-xs text-muted-foreground mt-0.5">▸ {fn.standard}</p>
          )}
        </div>
        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
          <button type="button" onClick={onEditFn} className="p-1 rounded text-muted-foreground hover:text-foreground">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDeleteFn}
            className="p-1 rounded text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Functional Failures */}
      {expanded && (
        <div className="p-2">
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Uszkodzenia funkcjonalne
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs gap-1"
              onClick={() => setAddFFOpen(true)}
            >
              <Plus className="h-3 w-3" /> Dodaj
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : failures.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              Brak uszkodzeń funkcjonalnych —{' '}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setAddFFOpen(true)}
              >
                dodaj pierwsze
              </button>
            </p>
          ) : (
            <div className="space-y-0.5">
              {failures.map((ff) => (
                <FFRow
                  key={ff.id}
                  ff={ff}
                  onEdit={() => setEditFF(ff)}
                  onDelete={() =>
                    setDeleteTarget({
                      label: `uszkodzenie "${ff.code}"`,
                      onConfirm: () => deleteFF.mutate({ ffId: ff.id, functionId: fn.id }),
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add FF modal */}
      <FunctionalFailureModal
        open={addFFOpen}
        onOpenChange={setAddFFOpen}
        suggestedCode={nextFFCode}
        functionCode={fn.code}
        isPending={createFF.isPending}
        onSubmit={(data) =>
          createFF.mutate(data, { onSuccess: () => setAddFFOpen(false) })
        }
      />

      {/* Edit FF modal */}
      <FunctionalFailureModal
        open={Boolean(editFF)}
        onOpenChange={(v) => !v && setEditFF(null)}
        defaultValues={editFF ?? undefined}
        functionCode={fn.code}
        isPending={updateFF.isPending}
        onSubmit={(data) =>
          updateFF.mutate(
            { ffId: editFF!.id, functionId: fn.id, data },
            { onSuccess: () => setEditFF(null) },
          )
        }
      />

      {/* Delete confirm */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdź usunięcie</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć {deleteTarget?.label}? Spowoduje to usunięcie kaskadowe
              powiązanych uszkodzeń fizycznych i przyczyn.
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

// ── FunctionsPage ───────────────────────────────────────────────────────────

export default function FunctionsPage() {
  const { machineId } = useParams<{ machineId: string }>();
  const id = machineId ?? '';

  const { data: machine, isLoading: bomLoading } = useMachineWithBOM(id);
  const { data: allFunctions = [], isLoading: fnLoading } = useMachineFunctions(id);

  const [selectedNode, setSelectedNode] = useState<NavNode | null>(null);
  const [addFnOpen, setAddFnOpen] = useState(false);
  const [editFn, setEditFn] = useState<FunctionDef | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ label: string; onConfirm: () => void } | null>(null);

  const createSysFn = useCreateSystemFunction(id);
  const createAsmFn = useCreateAssemblyFunction(id);
  const updateFn = useUpdateFunction(id);
  const deleteFn = useDeleteFunction(id);

  // Filter functions by selected node
  const visibleFunctions = selectedNode
    ? allFunctions.filter((fn) =>
        selectedNode.type === 'system'
          ? fn.systemId === selectedNode.id
          : fn.assemblyId === selectedNode.id,
      )
    : allFunctions;

  function nextFnCode() {
    if (!selectedNode) return `F${allFunctions.length + 1}`;
    const nodeNum = selectedNode.label;
    const count = visibleFunctions.length + 1;
    return selectedNode.type === 'system'
      ? `${nodeNum}.F${count}`
      : `${nodeNum}.F${count}`;
  }

  function handleCreateFn(data: { code: string; description: string; standard: string }) {
    if (!selectedNode) return;
    if (selectedNode.type === 'system') {
      createSysFn.mutate(
        { systemId: selectedNode.id, data },
        { onSuccess: () => setAddFnOpen(false) },
      );
    } else {
      createAsmFn.mutate(
        { assemblyId: selectedNode.id, data },
        { onSuccess: () => setAddFnOpen(false) },
      );
    }
  }

  if (bomLoading || fnLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!machine) return null;

  return (
    <div className="flex gap-0 h-[calc(100vh-240px)] min-h-[500px]">
      {/* Left panel — BOM nav */}
      <div className="w-[280px] shrink-0 border-r overflow-y-auto pr-2 py-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-2">
          Struktura BOM
        </p>
        <BomNavPanel
          machine={machine}
          selectedId={selectedNode?.id ?? null}
          onSelect={setSelectedNode}
          showMaterialGroups={false}
        />
      </div>

      {/* Right panel — Functions */}
      <div className="flex-1 overflow-y-auto pl-4 py-2 space-y-4">
        {!selectedNode ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-3 opacity-30" />
            <p className="text-sm">Wybierz system lub zespół z panelu po lewej,</p>
            <p className="text-sm">aby zobaczyć i zarządzać jego funkcjami.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">{selectedNode.label}</h2>
                <p className="text-xs text-muted-foreground">
                  {visibleFunctions.length} funkcji
                </p>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => setAddFnOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Dodaj funkcję
              </Button>
            </div>

            {visibleFunctions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Brak funkcji dla tego węzła.{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setAddFnOpen(true)}
                  >
                    Dodaj pierwszą funkcję.
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleFunctions.map((fn) => (
                  <FunctionBlock
                    key={fn.id}
                    fn={fn}
                    machineId={id}
                    onEditFn={() => setEditFn(fn)}
                    onDeleteFn={() =>
                      setDeleteTarget({
                        label: `funkcję "${fn.code}"`,
                        onConfirm: () => deleteFn.mutate(fn.id),
                      })
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add function modal */}
      <FunctionModal
        open={addFnOpen}
        onOpenChange={setAddFnOpen}
        suggestedCode={nextFnCode()}
        nodeLabel={selectedNode?.label}
        isPending={createSysFn.isPending || createAsmFn.isPending}
        onSubmit={handleCreateFn}
      />

      {/* Edit function modal */}
      <FunctionModal
        open={Boolean(editFn)}
        onOpenChange={(v) => !v && setEditFn(null)}
        defaultValues={editFn ?? undefined}
        isPending={updateFn.isPending}
        onSubmit={(data) =>
          updateFn.mutate({ functionId: editFn!.id, data }, { onSuccess: () => setEditFn(null) })
        }
      />

      {/* Delete confirm */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdź usunięcie</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć {deleteTarget?.label}? Spowoduje to usunięcie kaskadowe
              wszystkich uszkodzeń funkcjonalnych i fizycznych.
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
