import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  useMaterialGroupTemplates,
  useCreateMaterialGroupTemplate,
  useUpdateMaterialGroupTemplate,
  useDeleteMaterialGroupTemplate,
} from '@/hooks/useSettings';
import type { MaterialGroupTemplate } from '@/types';

// ── Category meta ────────────────────────────────────────────────────────────

const CATEGORY_TABS = [
  { key: 'ME', label: 'Mechanika' },
  { key: 'EL', label: 'Elektryka' },
  { key: 'PN', label: 'Pneumatyka' },
  { key: 'HO', label: 'Hydraulika Olejowa' },
  { key: 'HW', label: 'Hydraulika Wodna' },
  { key: 'OL', label: 'Oleje i smary' },
  { key: 'WM', label: 'Wyposażenie maszyn' },
];

const CATEGORY_NAME: Record<string, string> = {
  ME: 'Mechanika',
  EL: 'Elektryka',
  PN: 'Pneumatyka',
  HO: 'Hydraulika olejowa',
  HW: 'Hydraulika wodna',
  OL: 'Oleje i smary',
  WM: 'Wyposażenie maszyn',
};

// ── Editable Row ─────────────────────────────────────────────────────────────

function TemplateRow({
  tmpl,
  isEditing,
  onEdit,
  onCancel,
}: {
  tmpl: MaterialGroupTemplate;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(tmpl.name);
  const update = useUpdateMaterialGroupTemplate();
  const del = useDeleteMaterialGroupTemplate();

  function handleSave() {
    update.mutate(
      { id: tmpl.id, name: name.trim().toUpperCase() },
      { onSuccess: onCancel },
    );
  }

  if (isEditing) {
    return (
      <tr className="border-b bg-primary/5">
        <td className="px-4 py-2.5 w-20">
          <span className="font-mono text-sm font-bold">{tmpl.code}</span>
        </td>
        <td className="px-4 py-2.5">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value.toUpperCase())}
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
          />
        </td>
        <td className="px-4 py-2.5 w-24 text-center">
          <Badge variant={tmpl.isActive ? 'default' : 'secondary'} className="text-xs">
            {tmpl.isActive ? 'Aktywna' : 'Nieaktywna'}
          </Badge>
        </td>
        <td className="px-4 py-2.5 w-24">
          <div className="flex gap-1">
            <Button size="sm" className="h-7 px-2" onClick={handleSave} loading={update.isPending}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onCancel} disabled={update.isPending}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={cn('border-b group', !tmpl.isActive && 'opacity-50')}>
      <td className="px-4 py-2.5 w-20">
        <span className="font-mono text-sm font-bold">{tmpl.code}</span>
      </td>
      <td className="px-4 py-2.5 text-sm">{tmpl.name}</td>
      <td className="px-4 py-2.5 w-24 text-center">
        <Badge variant={tmpl.isActive ? 'default' : 'secondary'} className="text-xs">
          {tmpl.isActive ? 'Aktywna' : 'Nieaktywna'}
        </Badge>
      </td>
      <td className="px-4 py-2.5 w-24">
        <div className="hidden group-hover:flex gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="p-1 rounded text-muted-foreground hover:text-foreground"
            title="Edytuj nazwę"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => del.mutate(tmpl.id)}
            className="p-1 rounded text-muted-foreground hover:text-destructive"
            title={tmpl.isActive ? 'Dezaktywuj' : 'Już nieaktywna'}
            disabled={!tmpl.isActive || del.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Add Row Form ─────────────────────────────────────────────────────────────

function AddRowForm({
  category,
  existingCodes,
  onClose,
}: {
  category: string;
  existingCodes: string[];
  onClose: () => void;
}) {
  const create = useCreateMaterialGroupTemplate();

  // Auto-suggest next code
  const prefix = category;
  const nums = existingCodes
    .filter((c) => c.startsWith(prefix))
    .map((c) => parseInt(c.slice(prefix.length), 10))
    .filter((n) => !isNaN(n));
  const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  const suggestedCode = `${prefix}${String(nextNum).padStart(2, '0')}`;

  const [code, setCode] = useState(suggestedCode);
  const [name, setName] = useState('');

  function handleSave() {
    if (!code.trim() || !name.trim()) return;
    create.mutate(
      {
        code: code.trim().toUpperCase(),
        name: name.trim().toUpperCase(),
        category,
        categoryName: CATEGORY_NAME[category] ?? category,
        isActive: true,
        sortOrder: nums.length > 0 ? Math.max(...nums) + 1 : 1,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <tr className="border-b bg-green-50/50">
      <td className="px-4 py-2.5 w-20">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="h-8 text-sm font-mono w-20"
          maxLength={10}
          autoFocus
        />
      </td>
      <td className="px-4 py-2.5">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value.toUpperCase())}
          placeholder="NAZWA GRUPY"
          className="h-8 text-sm"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
        />
      </td>
      <td className="px-4 py-2.5 w-24 text-center">
        <Badge variant="default" className="text-xs">Aktywna</Badge>
      </td>
      <td className="px-4 py-2.5 w-24">
        <div className="flex gap-1">
          <Button size="sm" className="h-7 px-2" onClick={handleSave} loading={create.isPending} disabled={!code.trim() || !name.trim()}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onClose} disabled={create.isPending}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ── Category Tab ─────────────────────────────────────────────────────────────

function CategoryTab({
  categoryKey,
  templates,
}: {
  categoryKey: string;
  templates: MaterialGroupTemplate[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  const sorted = [...templates].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
  const existingCodes = templates.map((t) => t.code);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground w-20">Kod</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Nazwa</th>
              <th className="px-4 py-2 text-xs font-semibold text-muted-foreground text-center w-24">Status</th>
              <th className="px-4 py-2 w-24" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => (
              <TemplateRow
                key={t.id}
                tmpl={t}
                isEditing={editingId === t.id}
                onEdit={() => { setEditingId(t.id); setAddingNew(false); }}
                onCancel={() => setEditingId(null)}
              />
            ))}
            {addingNew && (
              <AddRowForm
                category={categoryKey}
                existingCodes={existingCodes}
                onClose={() => setAddingNew(false)}
              />
            )}
            {sorted.length === 0 && !addingNew && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Brak grup materiałowych w tej kategorii.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!addingNew && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => { setAddingNew(true); setEditingId(null); }}
        >
          <Plus className="h-3.5 w-3.5" />
          Dodaj grupę materiałową
        </Button>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MaterialGroupsDictionaryPage() {
  const { data: templates = [], isLoading } = useMaterialGroupTemplates();
  const [activeCategory, setActiveCategory] = useState('ME');

  const byCategory = (cat: string) => templates.filter((t) => t.category === cat);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Słownik grup materiałowych</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Zarządzaj szablonem grup materiałowych używanych w analizach BOM i RCM.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 border-b pb-0">
        {CATEGORY_TABS.map((cat) => {
          const count = byCategory(cat.key).filter((t) => t.isActive).length;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px transition-colors flex items-center gap-1.5',
                activeCategory === cat.key
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              <span className="font-mono text-xs mr-0.5">{cat.key}</span>
              {cat.label}
              {count > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{count}</Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Active tab content */}
      {CATEGORY_TABS.map((cat) =>
        activeCategory === cat.key ? (
          <CategoryTab key={cat.key} categoryKey={cat.key} templates={byCategory(cat.key)} />
        ) : null,
      )}
    </div>
  );
}
