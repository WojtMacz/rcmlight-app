import { useState } from 'react';
import { ChevronDown, ChevronRight, Layers, Boxes, Package2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MachineWithBOM } from '@/types';

export type NavNodeType = 'system' | 'assembly' | 'materialGroup';

export interface NavNode {
  type: NavNodeType;
  id: string;
  label: string;
}

interface Props {
  machine: MachineWithBOM;
  selectedId: string | null;
  onSelect: (node: NavNode) => void;
  showMaterialGroups?: boolean;
}

export function BomNavPanel({ machine, selectedId, onSelect, showMaterialGroups = false }: Props) {
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(
    () => new Set(machine.systems.map((s) => s.id)),
  );
  const [expandedAssemblies, setExpandedAssemblies] = useState<Set<string>>(new Set());

  function toggleSystem(id: string) {
    setExpandedSystems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAssembly(id: string) {
    setExpandedAssemblies((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-0.5 text-sm">
      {machine.systems.length === 0 && (
        <p className="text-xs text-muted-foreground px-2 py-4 text-center">
          Brak systemów — uzupełnij BOM
        </p>
      )}
      {machine.systems.map((system) => {
        const sysExpanded = expandedSystems.has(system.id);
        const sysSelected = selectedId === system.id;

        return (
          <div key={system.id}>
            {/* System row */}
            <div
              className={cn(
                'flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer select-none',
                sysSelected
                  ? 'bg-brand-navy text-white'
                  : 'hover:bg-secondary/60 text-foreground',
              )}
              onClick={() => {
                onSelect({ type: 'system', id: system.id, label: system.name });
                toggleSystem(system.id);
              }}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleSystem(system.id); }}
                className={cn('shrink-0', sysSelected ? 'text-white/70' : 'text-muted-foreground')}
              >
                {system.assemblies.length > 0 ? (
                  sysExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                ) : (
                  <span className="h-3.5 w-3.5 block" />
                )}
              </button>
              <Layers className={cn('h-3.5 w-3.5 shrink-0', sysSelected ? 'text-white/70' : 'text-muted-foreground')} />
              <span className="font-medium truncate">{system.number}. {system.name}</span>
            </div>

            {/* Assemblies */}
            {sysExpanded &&
              system.assemblies.map((assembly) => {
                const asmSelected = selectedId === assembly.id;
                const asmExpanded = expandedAssemblies.has(assembly.id);

                return (
                  <div key={assembly.id} className="ml-5">
                    <div
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer select-none',
                        asmSelected
                          ? 'bg-brand-navy text-white'
                          : 'hover:bg-secondary/60 text-foreground',
                      )}
                      onClick={() => {
                        onSelect({ type: 'assembly', id: assembly.id, label: assembly.name });
                        if (showMaterialGroups) toggleAssembly(assembly.id);
                      }}
                    >
                      {showMaterialGroups && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleAssembly(assembly.id); }}
                          className={cn('shrink-0', asmSelected ? 'text-white/70' : 'text-muted-foreground')}
                        >
                          {assembly.materialGroups.length > 0 ? (
                            asmExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                          ) : (
                            <span className="h-3.5 w-3.5 block" />
                          )}
                        </button>
                      )}
                      <Boxes className={cn('h-3.5 w-3.5 shrink-0', asmSelected ? 'text-white/70' : 'text-muted-foreground')} />
                      <span className="truncate">{assembly.number} {assembly.name}</span>
                    </div>

                    {/* Material Groups — display only, not selectable */}
                    {showMaterialGroups && asmExpanded &&
                      assembly.materialGroups.map((mg) => (
                        <div key={mg.id} className="ml-5">
                          <div className="flex items-center gap-1.5 px-2 py-1 select-none text-muted-foreground">
                            <Package2 className="h-3 w-3 shrink-0 opacity-50" />
                            <span className="font-mono text-xs shrink-0">{mg.code}</span>
                            <span className="truncate text-xs opacity-75">{mg.name}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}
