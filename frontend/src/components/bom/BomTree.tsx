import { useState, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Wrench,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { SystemModal } from './modals/SystemModal';
import { AssemblyModal } from './modals/AssemblyModal';
import { MaterialGroupModal } from './modals/MaterialGroupModal';
import { SparePartModal } from './modals/SparePartModal';
import {
  useCreateSystem,
  useUpdateSystem,
  useDeleteSystem,
  useReorderSystems,
  useCreateAssembly,
  useUpdateAssembly,
  useDeleteAssembly,
  useCreateMaterialGroup,
  useUpdateMaterialGroup,
  useDeleteMaterialGroup,
  useCreateSparePart,
  useUpdateSparePart,
  useDeleteSparePart,
} from '@/hooks/useBom';
import type { Assembly, BomSystem, MaterialGroup, MachineWithBOM, SparePart } from '@/types';

// ── Category badge colors ──────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  ME: 'bg-blue-100 text-blue-800',
  EL: 'bg-yellow-100 text-yellow-800',
  PH: 'bg-purple-100 text-purple-800',
  IN: 'bg-green-100 text-green-800',
  AU: 'bg-orange-100 text-orange-800',
  OT: 'bg-gray-100 text-gray-700',
};

// ── Delete confirm dialog ──────────────────────────────────────────────────

interface DeleteTarget {
  label: string;
  onConfirm: () => void;
}

// ── Spare Part Row ─────────────────────────────────────────────────────────

function SparePartRow({
  part,
  onEdit,
  onDelete,
}: {
  part: SparePart;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-3 rounded hover:bg-secondary/40 group">
      <Wrench className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
      <span className="text-sm flex-1">{part.name}</span>
      {part.catalogNumber && (
        <span className="text-xs text-muted-foreground font-mono">{part.catalogNumber}</span>
      )}
      <div className="hidden group-hover:flex items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Edytuj"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
          title="Usuń"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── Material Group Node ────────────────────────────────────────────────────

function MaterialGroupNode({
  group,
  machineId,
  expanded,
  onToggle,
  setDeleteTarget,
}: {
  group: MaterialGroup;
  machineId: string;
  expanded: boolean;
  onToggle: () => void;
  setDeleteTarget: (t: DeleteTarget | null) => void;
}) {
  const [sparePartModal, setSparePartModal] = useState<{ open: boolean; editing?: SparePart }>({
    open: false,
  });
  const [matGroupModal, setMatGroupModal] = useState(false);

  const createSP = useCreateSparePart(machineId);
  const updateSP = useUpdateSparePart(machineId);
  const deleteSP = useDeleteSparePart(machineId);
  const updateMG = useUpdateMaterialGroup(machineId);
  const deleteMG = useDeleteMaterialGroup(machineId);

  const catColor = CATEGORY_COLORS[group.category] ?? CATEGORY_COLORS.OT;

  return (
    <div className="ml-4">
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-secondary/40 group cursor-pointer"
        onClick={onToggle}
      >
        <span className="text-muted-foreground w-4 shrink-0">
          {group.spareParts.length > 0 ? (
            expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <span className="h-4 w-4 block" />
          )}
        </span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${catColor}`}>
          {group.category}
        </span>
        <span className="text-xs font-mono font-semibold text-muted-foreground">{group.code}</span>
        <span className="text-sm flex-1">{group.name}</span>
        <span className="text-xs text-muted-foreground">{group.spareParts.length} cz.</span>
        <div
          className="hidden group-hover:flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setSparePartModal({ open: true })}
            className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
            title="Dodaj część zamienną"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setMatGroupModal(true)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Edytuj"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              setDeleteTarget({
                label: `grupę "${group.name}"`,
                onConfirm: () => deleteMG.mutate({ groupId: group.id, force: true }),
              })
            }
            className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
            title="Usuń"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && group.spareParts.length > 0 && (
        <div className="ml-6 space-y-0.5 py-1">
          {group.spareParts.map((p) => (
            <SparePartRow
              key={p.id}
              part={p}
              onEdit={() => setSparePartModal({ open: true, editing: p })}
              onDelete={() =>
                setDeleteTarget({
                  label: `część "${p.name}"`,
                  onConfirm: () => deleteSP.mutate(p.id),
                })
              }
            />
          ))}
        </div>
      )}

      <SparePartModal
        open={sparePartModal.open}
        onOpenChange={(v) => setSparePartModal({ open: v })}
        defaultValues={sparePartModal.editing}
        isPending={createSP.isPending || updateSP.isPending}
        onSubmit={(data) => {
          if (sparePartModal.editing) {
            updateSP.mutate({ partId: sparePartModal.editing.id, data }, { onSuccess: () => setSparePartModal({ open: false }) });
          } else {
            createSP.mutate({ groupId: group.id, data }, { onSuccess: () => setSparePartModal({ open: false }) });
          }
        }}
      />

      <MaterialGroupModal
        open={matGroupModal}
        onOpenChange={setMatGroupModal}
        defaultValues={group}
        isPending={updateMG.isPending}
        onSubmit={(data) => updateMG.mutate({ groupId: group.id, data }, { onSuccess: () => setMatGroupModal(false) })}
      />
    </div>
  );
}

// ── Assembly Node ──────────────────────────────────────────────────────────

function AssemblyNode({
  assembly,
  machineId,
  expanded,
  expandedGroups,
  onToggle,
  onToggleGroup,
  setDeleteTarget,
  parentSystemNumber,
}: {
  assembly: Assembly;
  machineId: string;
  expanded: boolean;
  expandedGroups: Set<string>;
  onToggle: () => void;
  onToggleGroup: (id: string) => void;
  setDeleteTarget: (t: DeleteTarget | null) => void;
  parentSystemNumber: number;
}) {
  const [matGroupModal, setMatGroupModal] = useState(false);
  const [assemblyModal, setAssemblyModal] = useState(false);

  const createMG = useCreateMaterialGroup(machineId);
  const updateAssembly = useUpdateAssembly(machineId);
  const deleteAssembly = useDeleteAssembly(machineId);

  return (
    <div className="ml-4">
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-md bg-[#e2e8f0] hover:bg-[#cbd5e1] group cursor-pointer"
        onClick={onToggle}
      >
        <span className="text-slate-600 w-4 shrink-0">
          {assembly.materialGroups.length > 0 ? (
            expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <span className="h-4 w-4 block" />
          )}
        </span>
        <span className="text-xs font-mono font-semibold text-slate-500">{assembly.number}</span>
        <span className="text-sm font-medium text-slate-800 flex-1">{assembly.name}</span>
        <span className="text-xs text-slate-500">{assembly.materialGroups.length} gr.</span>
        <div
          className="hidden group-hover:flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setMatGroupModal(true)}
            className="p-1 rounded text-slate-500 hover:text-brand-navy transition-colors"
            title="Dodaj grupę materiałową"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setAssemblyModal(true)}
            className="p-1 rounded text-slate-500 hover:text-foreground transition-colors"
            title="Edytuj"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              setDeleteTarget({
                label: `zespół "${assembly.name}"`,
                onConfirm: () => deleteAssembly.mutate({ assemblyId: assembly.id, force: true }),
              })
            }
            className="p-1 rounded text-slate-500 hover:text-destructive transition-colors"
            title="Usuń"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && assembly.materialGroups.length > 0 && (
        <div className="space-y-0.5 py-1">
          {assembly.materialGroups.map((g) => (
            <MaterialGroupNode
              key={g.id}
              group={g}
              machineId={machineId}
              expanded={expandedGroups.has(g.id)}
              onToggle={() => onToggleGroup(g.id)}
              setDeleteTarget={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <MaterialGroupModal
        open={matGroupModal}
        onOpenChange={setMatGroupModal}
        isPending={createMG.isPending}
        onSubmit={(data) =>
          createMG.mutate(
            { assemblyId: assembly.id, data },
            { onSuccess: () => setMatGroupModal(false) },
          )
        }
      />

      <AssemblyModal
        open={assemblyModal}
        onOpenChange={setAssemblyModal}
        defaultValues={assembly}
        isPending={updateAssembly.isPending}
        parentSystemNumber={parentSystemNumber}
        onSubmit={(data) =>
          updateAssembly.mutate(
            { assemblyId: assembly.id, data },
            { onSuccess: () => setAssemblyModal(false) },
          )
        }
      />
    </div>
  );
}

// ── Sortable System Node ───────────────────────────────────────────────────

function SortableSystemNode({
  system,
  machineId,
  expanded,
  expandedAssemblies,
  expandedGroups,
  onToggle,
  onToggleAssembly,
  onToggleGroup,
  setDeleteTarget,
}: {
  system: BomSystem;
  machineId: string;
  expanded: boolean;
  expandedAssemblies: Set<string>;
  expandedGroups: Set<string>;
  onToggle: () => void;
  onToggleAssembly: (id: string) => void;
  onToggleGroup: (id: string) => void;
  setDeleteTarget: (t: DeleteTarget | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: system.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [assemblyModal, setAssemblyModal] = useState(false);
  const [systemModal, setSystemModal] = useState(false);

  const createAssembly = useCreateAssembly(machineId);
  const updateSystem = useUpdateSystem(machineId);
  const deleteSystem = useDeleteSystem(machineId);

  const maxSubNumber = system.assemblies.reduce((max, a) => {
    const sub = parseInt(a.number.split('.').pop() ?? '0', 10);
    return isNaN(sub) ? max : Math.max(max, sub);
  }, 0);
  const nextAssemblyNumber = `${system.number}.${maxSubNumber + 1}`;

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-2 px-4 py-3 bg-[#1e3a5f] text-white group cursor-pointer"
        onClick={onToggle}
      >
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-white/40 hover:text-white/80 transition-colors shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <span className="text-white/70 w-4 shrink-0">
          {system.assemblies.length > 0 ? (
            expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="h-4 w-4 block" />
          )}
        </span>

        <span className="font-mono text-sm font-bold text-white/60 shrink-0">{system.number}.</span>
        <span className="font-semibold flex-1">{system.name}</span>
        <span className="text-xs text-white/60">{system.assemblies.length} zesp.</span>

        <div
          className="hidden group-hover:flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setAssemblyModal(true)}
            className="p-1 rounded text-white/60 hover:text-white transition-colors"
            title="Dodaj zespół"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setSystemModal(true)}
            className="p-1 rounded text-white/60 hover:text-white transition-colors"
            title="Edytuj"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setDeleteTarget({
                label: `system "${system.name}"`,
                onConfirm: () => deleteSystem.mutate({ systemId: system.id, force: true }),
              })
            }
            className="p-1 rounded text-white/60 hover:text-red-300 transition-colors"
            title="Usuń"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border border-t-0 rounded-b-lg space-y-1 py-2 bg-background">
          {system.assemblies.map((a) => (
            <AssemblyNode
              key={a.id}
              assembly={a}
              machineId={machineId}
              expanded={expandedAssemblies.has(a.id)}
              expandedGroups={expandedGroups}
              onToggle={() => onToggleAssembly(a.id)}
              onToggleGroup={onToggleGroup}
              setDeleteTarget={setDeleteTarget}
              parentSystemNumber={system.number}
            />
          ))}
          {system.assemblies.length === 0 && (
            <p className="text-xs text-muted-foreground px-8 py-2">
              Brak zespołów — dodaj pierwszy{' '}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setAssemblyModal(true)}
              >
                tutaj
              </button>
            </p>
          )}
        </div>
      )}

      <AssemblyModal
        open={assemblyModal}
        onOpenChange={setAssemblyModal}
        isPending={createAssembly.isPending}
        suggestedNumber={nextAssemblyNumber}
        parentSystemNumber={system.number}
        onSubmit={(data) =>
          createAssembly.mutate(
            { systemId: system.id, data },
            { onSuccess: () => setAssemblyModal(false) },
          )
        }
      />

      <SystemModal
        open={systemModal}
        onOpenChange={setSystemModal}
        defaultValues={system}
        isPending={updateSystem.isPending}
        onSubmit={(data) =>
          updateSystem.mutate(
            { systemId: system.id, data },
            { onSuccess: () => setSystemModal(false) },
          )
        }
      />
    </div>
  );
}

// ── BomTree ────────────────────────────────────────────────────────────────

interface Props {
  machine: MachineWithBOM;
}

export function BomTree({ machine }: Props) {
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(
    () => new Set(machine.systems.map((s) => s.id)),
  );
  const [expandedAssemblies, setExpandedAssemblies] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const createSystem = useCreateSystem(machine.id);
  const reorderSystems = useReorderSystems(machine.id);

  const [systemModal, setSystemModal] = useState(false);
  const [localSystems, setLocalSystems] = useState<BomSystem[]>(machine.systems);
  const [prevMachine, setPrevMachine] = useState(machine);

  // Sync whenever machine data changes from server (catches nested changes: assemblies, groups, parts)
  if (prevMachine !== machine) {
    setPrevMachine(machine);
    setLocalSystems(machine.systems);
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = localSystems.findIndex((s) => s.id === active.id);
      const newIndex = localSystems.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(localSystems, oldIndex, newIndex);
      setLocalSystems(reordered);

      const items = reordered.map((s, i) => ({ id: s.id, number: i + 1 }));
      reorderSystems.mutate(items);
    },
    [localSystems, reorderSystems],
  );

  function toggleAll(expand: boolean) {
    if (expand) {
      setExpandedSystems(new Set(machine.systems.map((s) => s.id)));
      setExpandedAssemblies(
        new Set(machine.systems.flatMap((s) => s.assemblies.map((a) => a.id))),
      );
      setExpandedGroups(
        new Set(
          machine.systems.flatMap((s) =>
            s.assemblies.flatMap((a) => a.materialGroups.map((g) => g.id)),
          ),
        ),
      );
    } else {
      setExpandedSystems(new Set());
      setExpandedAssemblies(new Set());
      setExpandedGroups(new Set());
    }
  }

  function toggle(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  return (
    <div className="space-y-4">
      {/* Collapse/expand controls */}
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={() => toggleAll(true)}
        >
          Rozwiń wszystko
        </button>
        <span className="text-muted-foreground">·</span>
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={() => toggleAll(false)}
        >
          Zwiń wszystko
        </button>
      </div>

      {/* System list with DnD */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={localSystems.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {localSystems.map((system) => (
              <SortableSystemNode
                key={system.id}
                system={system}
                machineId={machine.id}
                expanded={expandedSystems.has(system.id)}
                expandedAssemblies={expandedAssemblies}
                expandedGroups={expandedGroups}
                onToggle={() => setExpandedSystems(toggle(expandedSystems, system.id))}
                onToggleAssembly={(id) => setExpandedAssemblies(toggle(expandedAssemblies, id))}
                onToggleGroup={(id) => setExpandedGroups(toggle(expandedGroups, id))}
                setDeleteTarget={setDeleteTarget}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {localSystems.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">
            Brak systemów — dodaj pierwszy system klikając "Dodaj System" powyżej.
          </p>
        </div>
      )}

      {/* Add system modal */}
      <SystemModal
        open={systemModal}
        onOpenChange={setSystemModal}
        isPending={createSystem.isPending}
        nextNumber={(machine.systems[machine.systems.length - 1]?.number ?? 0) + 1}
        onSubmit={(data) =>
          createSystem.mutate(data, { onSuccess: () => setSystemModal(false) })
        }
      />

      {/* Delete confirmation */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdź usunięcie</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć {deleteTarget?.label}? Operacja usunie kaskadowo
              wszystkie elementy podrzędne i jest nieodwracalna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteTarget?.onConfirm();
                setDeleteTarget(null);
              }}
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Expose add-system trigger via ref — called from BomPage */}
      <button
        id="bom-add-system-trigger"
        type="button"
        className="sr-only"
        onClick={() => setSystemModal(true)}
      />
    </div>
  );
}
