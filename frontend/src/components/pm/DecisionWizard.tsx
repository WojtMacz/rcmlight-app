import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WIZARD_STEPS, resolveNextStep, getStepById, TASK_TYPE_META, type WizardOutcome } from './pmUtils';
import type { PMTaskType } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────

interface WizardState {
  currentStepId: number;
  answers: Map<number, boolean>; // stepId → answer
  recommendation: PMTaskType | null;
  path: number[]; // ordered step ids visited
}

interface Props {
  autoAnswerStep1?: boolean | null; // null = not enough data, true/false = auto answer
  onRecommendation: (type: PMTaskType) => void;
  existingTaskType?: PMTaskType | null;
}

// ── Tree node for visualization ────────────────────────────────────────────

interface TreeNode {
  stepId: number;
  question: string;
  answer: boolean | undefined;
  isActive: boolean;
  isPast: boolean;
}

// ── Visualization ──────────────────────────────────────────────────────────

function StepNode({ node }: { node: TreeNode }) {
  return (
    <div className={`flex items-start gap-2 py-1 ${node.isActive ? 'opacity-100' : node.isPast ? 'opacity-100' : 'opacity-30'}`}>
      <div className="shrink-0 mt-0.5">
        {node.isPast && node.answer !== undefined ? (
          <CheckCircle2 className={`h-4 w-4 ${node.answer ? 'text-green-500' : 'text-red-400'}`} />
        ) : node.isActive ? (
          <div className="h-4 w-4 rounded-full border-2 border-brand-orange bg-brand-orange/20" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-tight ${node.isActive ? 'text-foreground font-medium' : node.isPast ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
          {node.question}
        </p>
        {node.isPast && node.answer !== undefined && (
          <span className={`text-[10px] font-semibold ${node.answer ? 'text-green-600' : 'text-red-500'}`}>
            {node.answer ? 'TAK' : 'NIE'}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Recommendation card ────────────────────────────────────────────────────

function RecommendationCard({ type, onAccept, onReset }: { type: PMTaskType; onAccept: () => void; onReset: () => void }) {
  const meta = TASK_TYPE_META[type];
  return (
    <div className={`rounded-lg border-2 p-4 ${meta.borderColor} ${meta.bgColor}`}>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Rekomendacja</p>
      <p className={`text-lg font-bold ${meta.color} mb-1`}>{meta.shortLabel}</p>
      <p className={`text-sm ${meta.color} mb-4`}>{meta.label}</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onAccept} className="flex-1">
          Przejdź do formularza <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
        <Button size="sm" variant="outline" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function DecisionWizard({ autoAnswerStep1, onRecommendation, existingTaskType }: Props) {
  const [state, setState] = useState<WizardState>({
    currentStepId: 1,
    answers: new Map(),
    recommendation: null,
    path: [1],
  });

  // Auto-answer step 1 when autoAnswerStep1 is known
  useEffect(() => {
    if (autoAnswerStep1 !== undefined && autoAnswerStep1 !== null) {
      handleAnswer(autoAnswerStep1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnswerStep1]);

  function handleAnswer(answer: boolean) {
    const currentStep = getStepById(state.currentStepId);
    if (!currentStep) return;

    const outcome = resolveNextStep(currentStep, answer);
    const newAnswers = new Map(state.answers);
    newAnswers.set(state.currentStepId, answer);

    if (typeof outcome === 'object' && 'recommend' in outcome) {
      setState((prev) => ({
        ...prev,
        answers: newAnswers,
        recommendation: outcome.recommend as WizardOutcome,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        answers: newAnswers,
        currentStepId: outcome as number,
        path: [...prev.path, outcome as number],
      }));
    }
  }

  function handleReset() {
    setState({ currentStepId: 1, answers: new Map(), recommendation: null, path: [1] });
  }

  const currentStep = getStepById(state.currentStepId);

  // Build tree nodes for visualization
  const treeNodes: TreeNode[] = WIZARD_STEPS.map((step) => ({
    stepId: step.id,
    question: step.question,
    answer: state.answers.get(step.id),
    isActive: !state.recommendation && state.currentStepId === step.id,
    isPast: state.answers.has(step.id),
  })).filter((n) => n.isPast || n.isActive || state.path.includes(n.stepId));

  return (
    <div className="flex gap-4 h-full">
      {/* Left: Decision tree visualization */}
      <div className="w-52 shrink-0 border-r pr-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Ścieżka decyzyjna
        </p>
        {treeNodes.map((node, i) => (
          <div key={node.stepId}>
            <StepNode node={node} />
            {i < treeNodes.length - 1 && (
              <div className="ml-2 w-px h-3 bg-border" />
            )}
          </div>
        ))}
        {state.recommendation && (
          <>
            <div className="ml-2 w-px h-3 bg-border" />
            <div className={`flex items-center gap-2 py-1 ${TASK_TYPE_META[state.recommendation].color}`}>
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="text-xs font-bold">{TASK_TYPE_META[state.recommendation].shortLabel}</span>
            </div>
          </>
        )}

        {existingTaskType && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-[10px] text-muted-foreground mb-1">Aktualne zadanie:</p>
            <span className={`text-xs font-semibold ${TASK_TYPE_META[existingTaskType].color}`}>
              {TASK_TYPE_META[existingTaskType].shortLabel}
            </span>
          </div>
        )}
      </div>

      {/* Right: Question or recommendation */}
      <div className="flex-1 flex flex-col gap-4">
        {state.recommendation ? (
          <RecommendationCard
            type={state.recommendation}
            onAccept={() => onRecommendation(state.recommendation!)}
            onReset={handleReset}
          />
        ) : currentStep ? (
          <>
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-orange text-white text-xs font-bold shrink-0">
                {state.currentStepId}
              </span>
              <span className="text-xs text-muted-foreground">z {WIZARD_STEPS.length} kroków</span>
              {state.answers.size > 0 && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>

            {/* Question */}
            <div className="rounded-lg border bg-background p-4">
              <p className="font-medium text-foreground leading-snug mb-4">{currentStep.question}</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-green-400 text-green-700 hover:bg-green-50 hover:border-green-500 font-semibold"
                  onClick={() => handleAnswer(true)}
                >
                  TAK
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 font-semibold"
                  onClick={() => handleAnswer(false)}
                >
                  NIE
                </Button>
              </div>
            </div>

            {/* Hint */}
            <div className="rounded-lg bg-secondary/40 border p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Wskazówka
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">{currentStep.hint}</p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
