import { cn } from '@/lib/utils';
import type { CriterionDef } from './criticalityUtils';

const SCORE_STYLES: Record<number, { border: string; bg: string; text: string; dot: string }> = {
  0: { border: 'border-border', bg: 'bg-secondary/40', text: 'text-secondary-foreground', dot: 'bg-secondary-foreground/40' },
  1: { border: 'border-green-300', bg: 'bg-green-50', text: 'text-green-800', dot: 'bg-green-500' },
  2: { border: 'border-amber-300', bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500' },
  3: { border: 'border-red-300', bg: 'bg-red-50', text: 'text-red-800', dot: 'bg-red-500' },
};

interface CriterionCardProps {
  criterion: CriterionDef;
  value: number | null;
  onChange: (v: number) => void;
}

export function CriterionCard({ criterion, value, onChange }: CriterionCardProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-bold text-brand-orange w-5">{criterion.shortLabel}</span>
        <span className="text-sm font-medium">{criterion.label}</span>
        {value !== null && (
          <span className={cn('ml-auto text-xs font-bold px-1.5 rounded', SCORE_STYLES[value].bg, SCORE_STYLES[value].text)}>
            {value}
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {([0, 1, 2, 3] as const).map((score) => {
          const style = SCORE_STYLES[score];
          const isSelected = value === score;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={cn(
                'text-left rounded border px-2 py-1.5 transition-all',
                isSelected
                  ? cn(style.border, style.bg, 'ring-1 ring-offset-1 ring-current', style.text)
                  : 'border-border hover:border-muted-foreground bg-background',
              )}
            >
              <div className="flex items-center gap-1 mb-1">
                <span className={cn('h-2 w-2 rounded-full shrink-0', isSelected ? style.dot : 'bg-border')} />
                <span className={cn('text-xs font-bold', isSelected ? style.text : 'text-muted-foreground')}>
                  {score}
                </span>
              </div>
              <p className={cn('text-[10px] leading-tight', isSelected ? style.text : 'text-muted-foreground')}>
                {criterion.descriptions[score]}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
