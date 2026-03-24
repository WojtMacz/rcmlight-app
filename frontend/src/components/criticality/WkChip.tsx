import { cn } from '@/lib/utils';

function colorClass(v: number | null) {
  if (v === null) return 'bg-secondary text-secondary-foreground';
  if (v < 1) return 'bg-green-100 text-green-800 border border-green-300';
  if (v < 2) return 'bg-amber-100 text-amber-800 border border-amber-300';
  return 'bg-red-100 text-red-800 border border-red-300';
}

interface WkChipProps {
  value: number | null;
  label?: string;
  size?: 'sm' | 'md';
}

export function WkChip({ value, label, size = 'sm' }: WkChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold tabular-nums',
        size === 'sm' ? 'text-xs' : 'text-sm',
        colorClass(value),
      )}
    >
      {label && <span className="font-normal opacity-60 text-[10px]">{label}</span>}
      {value !== null ? value.toFixed(2) : '—'}
    </span>
  );
}
