import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

interface ErrorResponse {
  status: 'error' | 'fail';
  message: string;
  errors?: Record<string, string[]>;
  stack?: string;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.');
      errors[path] = [...(errors[path] ?? []), issue.message];
    }
    const body: ErrorResponse = { status: 'fail', message: 'Błąd walidacji danych', errors };
    res.status(422).json(body);
    return;
  }

  if (err instanceof AppError) {
    const body: ErrorResponse = {
      status: err.isOperational ? 'fail' : 'error',
      message: err.message,
    };
    if (process.env.NODE_ENV === 'development') body.stack = err.stack;
    res.status(err.statusCode).json(body);
    return;
  }

  // Nieznany błąd
  logger.error('Unhandled error', err);
  const body: ErrorResponse = {
    status: 'error',
    message: 'Wystąpił nieoczekiwany błąd serwera',
  };
  if (process.env.NODE_ENV === 'development' && err instanceof Error) {
    body.stack = err.stack;
  }
  res.status(500).json(body);
}
