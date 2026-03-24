import { z } from 'zod';

// ── Helpers ────────────────────────────────────────────────────────────────

const rating = (label: string) =>
  z.number().int().min(0, `${label}: wartość min 0`).max(3, `${label}: wartość max 3`).default(0);

// ── FunctionDef ────────────────────────────────────────────────────────────

export const createFunctionSchema = z.object({
  code: z.string().min(1).max(100),
  description: z.string().min(1, 'Opis jest wymagany').max(500),
  standard: z.string().min(1, 'Standard jest wymagany').max(500),
});

export const updateFunctionSchema = createFunctionSchema.partial();

// ── FunctionalFailure ──────────────────────────────────────────────────────

export const createFunctionalFailureSchema = z.object({
  code: z.string().min(1).max(100),
  description: z.string().min(1, 'Opis jest wymagany').max(500),
});

export const updateFunctionalFailureSchema = createFunctionalFailureSchema.partial();

// ── PhysicalFailure ────────────────────────────────────────────────────────

export const createPhysicalFailureSchema = z.object({
  // code is auto-generated on the backend
  description: z.string().min(1, 'Opis jest wymagany').max(500),
  mtbfMonths: z.number().positive('MTBF musi być dodatni').optional(),
  materialGroupId: z.string().min(1, 'ID grupy materiałowej jest wymagane'),
});

export const updatePhysicalFailureSchema = createPhysicalFailureSchema.partial();

// ── FailureCause ───────────────────────────────────────────────────────────

export const createFailureCauseSchema = z.object({
  code: z.string().min(1).max(100),
  description: z.string().min(1, 'Opis jest wymagany').max(500),
});

export const updateFailureCauseSchema = createFailureCauseSchema.partial();

// ── Criticality ────────────────────────────────────────────────────────────

export const criticalitySchema = z.object({
  // Wskaźnik Konsekwencji — 0–3
  safety: rating('Bezpieczeństwo (S)'),
  impact: rating('Wpływ na proces (I)').optional().default(0), // legacy
  quality: rating('Jakość (Q)'),
  production: rating('Produkcja (P)'),
  frequency: rating('Częstotliwość (F)'),
  availability: rating('Dostępność części (D)').optional().default(0),
  // Wskaźnik Pracochłonności — 0–3
  repairCost: rating('Koszty awarii (C)'),
  laborTime: rating('Pracochłonność (L)'),
  // Składowe kosztów (opcjonalne — null i undefined dozwolone)
  downtimeHours: z.number().nonnegative().nullish(),
  qualityLossCost: z.number().nonnegative().nullish(),
  secondaryDamageCost: z.number().nonnegative().nullish(),
  sparepartCost: z.number().nonnegative().nullish(),
  repairManHours: z.number().nonnegative().nullish(),
});

// ── PMTask ─────────────────────────────────────────────────────────────────

export const createPMTaskSchema = z.object({
  taskType: z.enum(['REDESIGN', 'PDM', 'PM_INSPECTION', 'PM_OVERHAUL', 'RTF']),
  description: z.string().min(1, 'Opis jest wymagany').max(500),
  assignedTo: z.string().max(200).nullish(),
  isActive: z.boolean().default(true),
  plannedDowntimeH: z.number().nonnegative().nullish(),
  sparepartCost: z.number().nonnegative().nullish(),
  repairManHours: z.number().nonnegative().nullish(),
  finalFrequencyMonths: z.number().int().positive().nullish(),
});

export const updatePMTaskSchema = createPMTaskSchema.partial();

// ── Query params ───────────────────────────────────────────────────────────

export const functionLevelQuerySchema = z.object({
  level: z.enum(['SYSTEM', 'ASSEMBLY']).optional(),
});

export const pmSummaryQuerySchema = z.object({
  groupBy: z.enum(['frequency', 'cost', 'assignedTo']).default('frequency'),
});

// ── Types ──────────────────────────────────────────────────────────────────

export type CreateFunctionInput = z.infer<typeof createFunctionSchema>;
export type UpdateFunctionInput = z.infer<typeof updateFunctionSchema>;
export type CreateFunctionalFailureInput = z.infer<typeof createFunctionalFailureSchema>;
export type UpdateFunctionalFailureInput = z.infer<typeof updateFunctionalFailureSchema>;
export type CreatePhysicalFailureInput = z.infer<typeof createPhysicalFailureSchema>;
export type UpdatePhysicalFailureInput = z.infer<typeof updatePhysicalFailureSchema>;
export type CreateFailureCauseInput = z.infer<typeof createFailureCauseSchema>;
export type UpdateFailureCauseInput = z.infer<typeof updateFailureCauseSchema>;
export type CriticalityInput = z.infer<typeof criticalitySchema>;
export type CreatePMTaskInput = z.infer<typeof createPMTaskSchema>;
export type UpdatePMTaskInput = z.infer<typeof updatePMTaskSchema>;
