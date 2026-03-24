import { z } from 'zod';

// ── Machine ────────────────────────────────────────────────────────────────
export const createMachineSchema = z.object({
  number: z.string().min(1, 'Numer jest wymagany').max(50),
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  description: z.string().max(1000).optional(),
  machineDowntimeCostPerHour: z.number().nonnegative().default(0),
  technicianHourlyCost: z.number().nonnegative().default(0),
  allowedUnavailability: z.number().min(0).max(1).default(0.03),
});

export const updateMachineSchema = createMachineSchema.partial();

// ── System ─────────────────────────────────────────────────────────────────
export const createSystemSchema = z.object({
  number: z.number().int().positive('Numer systemu musi być dodatni'),
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
});

export const updateSystemSchema = createSystemSchema.partial();

export const reorderSystemsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1, 'ID jest wymagane'),
        number: z.number().int().positive(),
      }),
    )
    .min(1, 'Lista elementów nie może być pusta'),
});

// ── Assembly ───────────────────────────────────────────────────────────────
export const createAssemblySchema = z.object({
  number: z.string().min(1, 'Numer jest wymagany').max(20),
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
});

export const updateAssemblySchema = createAssemblySchema.partial();

// ── MaterialGroup ──────────────────────────────────────────────────────────
export const createMaterialGroupSchema = z.object({
  code: z.string().min(1).max(10).toUpperCase(),
  name: z.string().min(1).max(200).toUpperCase(),
  category: z.string().min(1).max(10).toUpperCase(),
});

export const updateMaterialGroupSchema = createMaterialGroupSchema.partial();

// ── SparePart ──────────────────────────────────────────────────────────────
export const createSparePartSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  catalogNumber: z.string().max(100).optional(),
});

export const updateSparePartSchema = createSparePartSchema.partial();

// ── Query params ───────────────────────────────────────────────────────────
export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

export const deleteQuerySchema = z.object({
  force: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

// ── Types ──────────────────────────────────────────────────────────────────
export type CreateMachineInput = z.infer<typeof createMachineSchema>;
export type UpdateMachineInput = z.infer<typeof updateMachineSchema>;
export type CreateSystemInput = z.infer<typeof createSystemSchema>;
export type UpdateSystemInput = z.infer<typeof updateSystemSchema>;
export type ReorderSystemsInput = z.infer<typeof reorderSystemsSchema>;
export type CreateAssemblyInput = z.infer<typeof createAssemblySchema>;
export type UpdateAssemblyInput = z.infer<typeof updateAssemblySchema>;
export type CreateMaterialGroupInput = z.infer<typeof createMaterialGroupSchema>;
export type UpdateMaterialGroupInput = z.infer<typeof updateMaterialGroupSchema>;
export type CreateSparePartInput = z.infer<typeof createSparePartSchema>;
export type UpdateSparePartInput = z.infer<typeof updateSparePartSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
