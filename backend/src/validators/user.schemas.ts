import { z } from 'zod';

export const updateUserSchema = z.object({
  firstName: z.string().min(2, 'Minimum 2 znaki').max(60).optional(),
  lastName: z.string().min(2, 'Minimum 2 znaki').max(60).optional(),
  role: z.enum(['ADMIN', 'ANALYST', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
