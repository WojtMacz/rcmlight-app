import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { Role } from '../middleware/auth';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  companyId: string;
  role: Role;
}

const ACCESS_SECRET = (): string => {
  const s = process.env.JWT_ACCESS_SECRET;
  if (!s) throw new Error('JWT_ACCESS_SECRET is not set');
  return s;
};

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dni

export function signAccessToken(payload: AccessTokenPayload): string {
  // `sub` jest już w payload — nie przekazujemy `subject` w opcjach (powoduje konflikt)
  return jwt.sign(payload, ACCESS_SECRET(), {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET()) as AccessTokenPayload;
}

export async function createRefreshToken(
  userId: string,
  prisma: PrismaClient,
): Promise<string> {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
}

/**
 * Weryfikuje refresh token, usuwa go (rotacja) i zwraca userId.
 * Zwraca null jeśli token nieistnieje lub wygasł.
 */
export async function consumeRefreshToken(
  token: string,
  prisma: PrismaClient,
): Promise<string | null> {
  const record = await prisma.refreshToken.findUnique({ where: { token } });
  if (!record) return null;

  // Usuń token niezależnie od ważności (rotacja / unieważnienie po użyciu)
  await prisma.refreshToken.delete({ where: { token } });

  if (record.expiresAt < new Date()) return null;

  return record.userId;
}

export async function revokeRefreshToken(
  token: string,
  prisma: PrismaClient,
): Promise<void> {
  await prisma.refreshToken
    .delete({ where: { token } })
    .catch(() => undefined); // ignoruj jeśli nie istnieje
}

export function refreshCookieOptions(secure: boolean): object {
  return {
    httpOnly: true,
    secure,
    sameSite: 'strict' as const,
    maxAge: REFRESH_TTL_MS,
    path: '/api/v1/auth',
  };
}
