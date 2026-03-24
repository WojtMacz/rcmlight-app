import { cn } from '@/lib/utils';

const ACTIVE_CLASSES: Record<number, string> = {
  0: 'bg-secondary border-secondary-foreground/30 text-secondary-foreground',
  1: 'bg-green-100 border-green-400 text-green-800',
  2: 'bg-amber-100 border-amber-400 text-amber-800',
  3: 'bg-red-100 border-red-400 text-red-800',
};

interface RatingButtonProps {
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function RatingButton({ value, onChange, disabled, size = 'sm' }: RatingButtonProps) {
  const dim = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';
  return (
    <div className="flex gap-0.5">
      {[0, 1, 2, 3].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className={cn(
            dim,
            'font-bold rounded border transition-all shrink-0',
            value === n
              ? ACTIVE_CLASSES[n]
              : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground bg-background',
            disabled && 'opacity-40 cursor-not-allowed',
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
