import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  getMe,
  loginUser,
  logoutUser,
  refreshTokens,
  registerUser,
} from '../services/authService';
import { refreshCookieOptions } from '../services/tokenService';
import { AppError } from '../utils/AppError';
import {
  loginSchema,
  refreshSchema,
  registerSchema,
} from '../validators/auth.schemas';

const IS_PROD = process.env.NODE_ENV === 'production';

// Helper: odczytaj refresh token z cookie lub body
function extractRefreshToken(req: Request): string | null {
  // 1. Cookie (httpOnly — preferowane dla przeglądarek)
  const cookieHeader = req.headers.cookie ?? '';
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === 'refresh_token') return decodeURIComponent(rest.join('='));
  }
  // 2. Body (API clients, mobile)
  if (typeof req.body?.refreshToken === 'string') return req.body.refreshToken;
  return null;
}

// POST /api/v1/auth/login
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await loginUser(
      body.email,
      body.password,
      prisma,
    );

    res.cookie('refresh_token', refreshToken, refreshCookieOptions(IS_PROD));

    res.status(200).json({
      status: 'ok',
      data: { user, accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/register  (wymaga ADMIN)
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'Brak autoryzacji'));
    const body = registerSchema.parse(req.body);
    const user = await registerUser(body, req.user.companyId, prisma);

    res.status(201).json({ status: 'ok', data: { user } });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/refresh
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractRefreshToken(req);
    if (!token) {
      // Spróbuj walidacji przez Zod body (dla API clients)
      const body = refreshSchema.parse(req.body);
      const tokens = await refreshTokens(body.refreshToken, prisma);
      res.cookie('refresh_token', tokens.refreshToken, refreshCookieOptions(IS_PROD));
      res.status(200).json({ status: 'ok', data: tokens });
      return;
    }

    const tokens = await refreshTokens(token, prisma);
    res.cookie('refresh_token', tokens.refreshToken, refreshCookieOptions(IS_PROD));
    res.status(200).json({ status: 'ok', data: tokens });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/auth/logout
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractRefreshToken(req);
    if (token) await logoutUser(token, prisma);

    res.clearCookie('refresh_token', { path: '/api/v1/auth' });
    res.status(200).json({ status: 'ok', data: null });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/auth/me
export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError(401, 'Brak autoryzacji'));
    const user = await getMe(req.user.sub, prisma);
    res.status(200).json({ status: 'ok', data: { user } });
  } catch (err) {
    next(err);
  }
}
