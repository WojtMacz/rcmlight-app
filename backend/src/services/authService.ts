import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import type { RegisterInput } from '../validators/auth.schemas';
import {
  AccessTokenPayload,
  consumeRefreshToken,
  createRefreshToken,
  signAccessToken,
} from './tokenService';

const SALT_ROUNDS = 12;

// Pola bezpieczne do zwrócenia klientowi
type SafeUser = Omit<User, 'passwordHash'>;

function sanitize(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _ph, ...safe } = user;
  return safe;
}

function buildPayload(user: User): AccessTokenPayload {
  return {
    sub: user.id,
    email: user.email,
    companyId: user.companyId,
    role: user.role as AccessTokenPayload['role'],
  };
}

// -----------------------------------------------------------------------

export async function loginUser(
  email: string,
  password: string,
  prisma: PrismaClient,
): Promise<{ user: SafeUser; accessToken: string; refreshToken: string }> {
  const user = await prisma.user.findUnique({ where: { email } });

  // Zawsze wykonaj porównanie hasła (timing-safe — zapobiega user enumeration)
  const dummyHash = '$2b$12$invalidhashtopreventtimingattacks000000000000000000000';
  const isValid = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);

  if (!user || !isValid) {
    logger.warn('Failed login attempt', { email });
    throw new AppError(401, 'Nieprawidłowy adres e-mail lub hasło');
  }

  if (!user.isActive) {
    throw new AppError(403, 'Konto jest nieaktywne — skontaktuj się z administratorem');
  }

  const accessToken = signAccessToken(buildPayload(user));
  const refreshToken = await createRefreshToken(user.id, prisma);

  return { user: sanitize(user), accessToken, refreshToken };
}

export async function registerUser(
  data: RegisterInput,
  actorCompanyId: string,
  prisma: PrismaClient,
): Promise<SafeUser> {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError(409, 'Użytkownik z tym adresem e-mail już istnieje');

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      passwordHash,
      companyId: actorCompanyId, // nowy user trafia do firmy admina
      isActive: true,
    },
  });

  logger.info('New user registered', { userId: user.id, companyId: actorCompanyId });
  return sanitize(user);
}

export async function refreshTokens(
  oldRefreshToken: string,
  prisma: PrismaClient,
): Promise<{ accessToken: string; refreshToken: string }> {
  const userId = await consumeRefreshToken(oldRefreshToken, prisma);
  if (!userId) throw new AppError(401, 'Refresh token nieprawidłowy lub wygasł');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw new AppError(401, 'Konto nieaktywne');

  const accessToken = signAccessToken(buildPayload(user));
  const refreshToken = await createRefreshToken(userId, prisma);

  return { accessToken, refreshToken };
}

export async function logoutUser(refreshToken: string, prisma: PrismaClient): Promise<void> {
  // revokeRefreshToken jest idempotentne — nie rzuca jeśli token już nie istnieje
  const { revokeRefreshToken } = await import('./tokenService');
  await revokeRefreshToken(refreshToken, prisma);
}

export async function getMe(userId: string, prisma: PrismaClient): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'Użytkownik nie istnieje');
  return sanitize(user);
}
