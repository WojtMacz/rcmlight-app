import { z } from 'zod';

export const criteriaCategoryEnum = z.enum([
  'SAFETY', 'IMPACT', 'QUALITY', 'PRODUCTION', 'FREQUENCY', 'REPAIR_COST', 'LABOR', 'AVAILABILITY',
]);

export const updateCriterionSchema = z.object({
  label: z.string().min(1).max(50),
  description: z.string().min(1).max(500),
});

export const resetCriteriaSchema = z.object({
  category: criteriaCategoryEnum.optional(),
});

export const createMaterialGroupTemplateSchema = z.object({
  code: z.string().min(1).max(10).transform((v) => v.toUpperCase()),
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(10),
  categoryName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  inspectionStandards: z.string().max(2000).optional(),
  typicalCauses: z.string().max(2000).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updateMaterialGroupTemplateSchema = createMaterialGroupTemplateSchema.partial();

export type UpdateCriterionInput = z.infer<typeof updateCriterionSchema>;
export type ResetCriteriaInput = z.infer<typeof resetCriteriaSchema>;
export type CreateMaterialGroupTemplateInput = z.infer<typeof createMaterialGroupTemplateSchema>;
export type UpdateMaterialGroupTemplateInput = z.infer<typeof updateMaterialGroupTemplateSchema>;
