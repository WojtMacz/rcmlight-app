import { Request } from 'express';

/**
 * Bezpieczne odczytanie parametru trasy.
 * Wymagane dla @types/express@5 gdzie req.params może być string | string[].
 */
export function param(req: Request, key: string): string {
  const val = (req.params as Record<string, string | string[]>)[key];
  return Array.isArray(val) ? val[0] : (val ?? '');
}
