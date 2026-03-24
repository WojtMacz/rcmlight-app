import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Plus, ChevronLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useMaterialGroupTemplates,
  useCreateMaterialGroupTemplate,
} from '@/hooks/useSettings';
import type { MaterialGroup, MaterialGroupTemplate } from '@/types';

export const MATERIAL_CATEGORIES = [
  { value: 'ME', label: 'ME – Mechanika' },
  { value: 'EL', label: 'EL – Elektryka' },
  { value: 'PN', label: 'PN – Pneumatyka' },
  { value: 'HO', label: 'HO – Hydraulika Olejowa' },
  { value: 'HW', label: 'HW – Hydraulika Wodna' },
  { value: 'OL', label: 'OL – Oleje i smary' },
  { value: 'WM', label: 'WM – Wyposażenie maszyn' },
] as const;

const CATEGORY_NAME: Record<string, string> = {
  ME: 'Mechanika',
  EL: 'Elektryka',
  PN: 'Pneumatyka',
  HO: 'Hydraulika olejowa',
  HW: 'Hydraulika wodna',
  OL: 'Oleje i smary',
  WM: 'Wyposażenie maszyn',
};

const schema = z.object({
  code: z.string().min(1, 'Kod jest wymagany').max(10).toUpperCase(),
  category: z.string().min(1, 'Kategoria jest wymagana'),
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValues) => void;
  isPending: boolean;
  defaultValues?: Partial<MaterialGroup>;
}

// ── Custom group mini-form ────────────────────────────────────────────────────

function CustomGroupForm({
  onBack,
  onCreated,
  existingCodes,
}: {
  onBack: () => void;
  onCreated: (tmpl: MaterialGroupTemplate) => void;
  existingCodes: string[];
}) {
  const createTemplate = useCreateMaterialGroupTemplate();
  const [category, setCategory] = useState('ME');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  // Auto-suggest code when category changes
  useEffect(() => {
    const prefix = category;
    const nums = existingCodes
      .filter((c) => c.startsWith(prefix))
      .map((c) => parseInt(c.slice(prefix.length), 10))
      .filter((n) => !isNaN(n));
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    setCode(`${prefix}${String(next).padStart(2, '0')}`);
  }, [category, existingCodes]);

  function handleSave() {
    if (!code.trim() || !name.trim()) return;
    createTemplate.mutate(
      {
        code: code.trim().toUpperCase(),
        name: name.trim().toUpperCase(),
        category,
        categoryName: CATEGORY_NAME[category] ?? category,
        isActive: true,
        sortOrder: 999,
      },
      {
        onSuccess: (tmpl) => onCreated(tmpl as MaterialGroupTemplate),
      },
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Wróć do słownika
      </button>

      <div className="rounded-lg border border-dashed p-4 space-y-3">
        <p className="text-sm font-medium">Nowa grupa materiałowa</p>

        <div className="space-y-1">
          <Label>Kategoria</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATERIAL_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Kod</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={10}
              className="font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label>Nazwa</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="NAZWA GRUPY"
              autoFocus
            />
          </div>
        </div>

        <Button
          className="w-full gap-1.5"
          onClick={handleSave}
          loading={createTemplate.isPending}
          disabled={!code.trim() || !name.trim()}
        >
          Zapisz do słownika i użyj
        </Button>
      </div>
    </div>
  );
}

// ── Dictionary select ────────────────────────────────────────────────────────

function DictionarySelect({
  onSelect,
  onCustom,
  templates,
}: {
  onSelect: (tmpl: MaterialGroupTemplate) => void;
  onCustom: () => void;
  templates: MaterialGroupTemplate[];
}) {
  const [search, setSearch] = useState('');

  const filtered = templates.filter(
    (t) =>
      t.isActive &&
      (t.code.toLowerCase().includes(search.toLowerCase()) ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.categoryName.toLowerCase().includes(search.toLowerCase())),
  );

  // Group by category
  const groups = MATERIAL_CATEGORIES.map((cat) => ({
    ...cat,
    items: filtered.filter((t) => t.category === cat.value),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj po kodzie lub nazwie..."
          className="pl-9"
          autoFocus
        />
      </div>

      <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
        {groups.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Brak wyników</p>
        ) : (
          groups.map((group) => (
            <div key={group.value}>
              <div className="px-3 py-1.5 bg-muted/40 sticky top-0">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.label}
                </span>
              </div>
              {group.items.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelect(t)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                >
                  <Badge variant="outline" className="font-mono text-xs shrink-0 min-w-[3.5rem] justify-center">
                    {t.code}
                  </Badge>
                  <span className="text-sm">{t.name}</span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={onCustom}
        className="flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        <Plus className="h-3.5 w-3.5" />
        Nie ma na liście? Dodaj nową grupę
      </button>
    </div>
  );
}

// ── Confirmation view (after selection) ─────────────────────────────────────

function SelectionConfirm({
  tmpl,
  onClear,
}: {
  tmpl: MaterialGroupTemplate;
  onClear: () => void;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Wybrana grupa:</p>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Zmień
        </button>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="font-mono text-sm px-3 py-1">{tmpl.code}</Badge>
        <div>
          <p className="font-medium text-sm">{tmpl.name}</p>
          <p className="text-xs text-muted-foreground">{tmpl.categoryName}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MaterialGroupModal({ open, onOpenChange, onSubmit, isPending, defaultValues }: Props) {
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const isEdit = Boolean(defaultValues?.id);

  // Dictionary state (only for add mode)
  const { data: templates = [] } = useMaterialGroupTemplates();
  const [mode, setMode] = useState<'select' | 'custom'>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<MaterialGroupTemplate | null>(null);

  useEffect(() => {
    if (open) {
      setMode('select');
      setSelectedTemplate(null);
      reset({
        code: defaultValues?.code ?? '',
        category: defaultValues?.category ?? '',
        name: defaultValues?.name ?? '',
      });
    }
  }, [open, defaultValues, reset]);

  function handleTemplateSelect(tmpl: MaterialGroupTemplate) {
    setSelectedTemplate(tmpl);
  }

  function handleTemplateCreated(tmpl: MaterialGroupTemplate) {
    setSelectedTemplate(tmpl);
    setMode('select');
  }

  function handleFormSubmit(data: FormValues) {
    onSubmit(data);
  }

  function handleConfirmTemplate() {
    if (!selectedTemplate) return;
    onSubmit({
      code: selectedTemplate.code,
      category: selectedTemplate.category,
      name: selectedTemplate.name,
    });
  }

  // ── Edit mode — simple form ──────────────────────────────────────────────
  if (isEdit) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edytuj grupę materiałową</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="code">Kod</Label>
                <Input
                  id="code"
                  placeholder="ME01"
                  {...register('code')}
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase();
                    register('code').onChange(e);
                  }}
                />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Kategoria</Label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz..." />
                      </SelectTrigger>
                      <SelectContent>
                        {MATERIAL_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="name">Nazwa grupy</Label>
              <Input
                id="name"
                placeholder="np. ŁOŻYSKA I USZCZELNIENIA"
                {...register('name')}
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase();
                  register('name').onChange(e);
                }}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Anuluj</Button>
              <Button type="submit" loading={isPending}>Zapisz</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Add mode — dictionary select ──────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dodaj grupę materiałową</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {mode === 'custom' ? (
            <CustomGroupForm
              onBack={() => setMode('select')}
              onCreated={handleTemplateCreated}
              existingCodes={templates.map((t) => t.code)}
            />
          ) : selectedTemplate ? (
            <SelectionConfirm
              tmpl={selectedTemplate}
              onClear={() => setSelectedTemplate(null)}
            />
          ) : (
            <DictionarySelect
              templates={templates}
              onSelect={handleTemplateSelect}
              onCustom={() => setMode('custom')}
            />
          )}
        </div>

        {mode === 'select' && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button
              onClick={handleConfirmTemplate}
              disabled={!selectedTemplate}
              loading={isPending}
            >
              Dodaj
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
