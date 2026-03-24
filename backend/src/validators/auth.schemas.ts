import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy adres e-mail'),
  password: z.string().min(1, 'Hasło jest wymagane'),
});

export const registerSchema = z.object({
  email: z.string().email('Nieprawidłowy adres e-mail'),
  firstName: z.string().min(2, 'Imię: minimum 2 znaki').max(60),
  lastName: z.string().min(2, 'Nazwisko: minimum 2 znaki').max(60),
  password: z
    .string()
    .min(8, 'Hasło: minimum 8 znaków')
    .regex(/[A-Z]/, 'Hasło musi zawierać co najmniej jedną wielką literę')
    .regex(/[0-9]/, 'Hasło musi zawierać co najmniej jedną cyfrę'),
  role: z.enum(['ADMIN', 'ANALYST', 'VIEWER']).default('ANALYST'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token jest wymagany'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
