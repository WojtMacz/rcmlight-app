import { useState } from 'react';
import { RotateCcw, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useCriteriaCriteria,
  useUpdateCriterion,
  useResetCriteria,
} from '@/hooks/useSettings';
import type { CriteriaCategory, CriticalityCriteria } from '@/types';

// ── Category meta ────────────────────────────────────────────────────────────

const CATEGORIES: { key: CriteriaCategory; label: string; shortLabel: string }[] = [
  { key: 'SAFETY', label: 'Bezpieczeństwo', shortLabel: 'S' },
  { key: 'QUALITY', label: 'Jakość', shortLabel: 'Q' },
  { key: 'PRODUCTION', label: 'Produkcja', shortLabel: 'P' },
  { key: 'FREQUENCY', label: 'Częstotliwość', shortLabel: 'F' },
  { key: 'AVAILABILITY', label: 'Dostępność części', shortLabel: 'D' },
  { key: 'REPAIR_COST', label: 'Koszt naprawy', shortLabel: 'C' },
  { key: 'LABOR', label: 'Pracochłonność', shortLabel: 'L' },
];

const LEVEL_COLORS = [
  'bg-green-100 text-green-700',
  'bg-yellow-100 text-yellow-700',
  'bg-orange-100 text-orange-700',
  'bg-red-100 text-red-700',
];

// ── Criterion Row ────────────────────────────────────────────────────────────

function CriterionRow({
  criterion,
  isEditing,
  onEdit,
  onCancel,
}: {
  criterion: CriticalityCriteria;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(criterion.label);
  const [description, setDescription] = useState(criterion.description);
  const update = useUpdateCriterion();

  function handleSave() {
    update.mutate(
      { id: criterion.id, label: label.trim(), description: description.trim() },
      { onSuccess: onCancel },
    );
  }

  function handleStartEdit() {
    setLabel(criterion.label);
    setDescription(criterion.description);
    onEdit();
  }

  if (isEditing) {
    return (
      <tr className="border-b bg-primary/5">
        <td className="px-4 py-3 w-10 align-top">
          <Badge className={cn('text-xs font-bold', LEVEL_COLORS[criterion.level])}>
            {criterion.level}
          </Badge>
        </td>
        <td className="px-4 py-3 align-top w-40">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />
        </td>
        <td className="px-4 py-3 align-top">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="text-sm min-h-[64px] resize-none"
            rows={2}
          />
        </td>
        <td className="px-4 py-3 align-top w-20">
          <div className="flex gap-1">
            <Button
              size="sm"
              className="h-7 px-2"
              onClick={handleSave}
              loading={update.isPending}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={onCancel}
              disabled={update.isPending}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b hover:bg-muted/30 group">
      <td className="px-4 py-3 w-10">
        <Badge className={cn('text-xs font-bold', LEVEL_COLORS[criterion.level])}>
          {criterion.level}
        </Badge>
      </td>
      <td className="px-4 py-3 w-40">
        <span className="text-sm font-medium">{criterion.label}</span>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{criterion.description}</td>
      <td className="px-4 py-3 w-20">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 opacity-0 group-hover:opacity-100"
          onClick={handleStartEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

// ── Category Tab ─────────────────────────────────────────────────────────────

function CategoryTab({
  category,
  criteria,
}: {
  category: { key: CriteriaCategory; label: string };
  criteria: CriticalityCriteria[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const reset = useResetCriteria();

  const sorted = [...criteria].sort((a, b) => a.level - b.level);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Dostosuj etykiety i opisy dla kategorii{' '}
          <strong>{category.label}</strong> (poziomy 0–3).
        </p>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 shrink-0"
          onClick={() => reset.mutate(category.key)}
          loading={reset.isPending}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Przywróć domyślne
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground w-10">Poz.</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground w-40">Etykieta</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Opis</th>
              <th className="px-4 py-2 w-20" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <CriterionRow
                key={c.id}
                criterion={c}
                isEditing={editingId === c.id}
                onEdit={() => setEditingId(c.id)}
                onCancel={() => setEditingId(null)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CriteriaCriteriaPage() {
  const { data: criteria = [], isLoading } = useCriteriaCriteria();
  const reset = useResetCriteria();
  const [activeCategory, setActiveCategory] = useState<CriteriaCategory>('SAFETY');

  const byCat = (cat: CriteriaCategory) => criteria.filter((c) => c.category === cat);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Kryteria krytyczności</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Dostosuj etykiety i opisy poziomów krytyczności dla swojej firmy.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 shrink-0"
          onClick={() => reset.mutate(undefined)}
          loading={reset.isPending}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Przywróć wszystkie domyślne
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 border-b pb-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setActiveCategory(cat.key)}
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px transition-colors',
              activeCategory === cat.key
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
            )}
          >
            <span className="font-mono text-xs mr-1.5 opacity-60">{cat.shortLabel}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {CATEGORIES.map((cat) =>
        activeCategory === cat.key ? (
          <CategoryTab key={cat.key} category={cat} criteria={byCat(cat.key)} />
        ) : null,
      )}
    </div>
  );
}
