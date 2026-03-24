import { PrismaClient, User } from '@prisma/client';
import { AppError } from '../utils/AppError';
import type { UpdateUserInput } from '../validators/user.schemas';

type SafeUser = Omit<User, 'passwordHash'>;

function sanitize(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _ph, ...safe } = user;
  return safe;
}

export async function listCompanyUsers(
  companyId: string,
  prisma: PrismaClient,
): Promise<SafeUser[]> {
  const users = await prisma.user.findMany({
    where: { companyId },
    orderBy: { createdAt: 'asc' },
  });
  return users.map(sanitize);
}

export async function updateUser(
  userId: string,
  companyId: string,
  data: UpdateUserInput,
  prisma: PrismaClient,
): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) throw new AppError(404, 'Użytkownik nie istnieje');
  if (user.companyId !== companyId) {
    throw new AppError(403, 'Brak dostępu do zasobów innej firmy');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
  });
  return sanitize(updated);
}

export async function deactivateUser(
  userId: string,
  companyId: string,
  actorId: string,
  prisma: PrismaClient,
): Promise<SafeUser> {
  if (userId === actorId) throw new AppError(400, 'Nie możesz dezaktywować własnego konta');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'Użytkownik nie istnieje');
  if (user.companyId !== companyId) {
    throw new AppError(403, 'Brak dostępu do zasobów innej firmy');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  // Unieważnij wszystkie sesje dezaktywowanego użytkownika
  await prisma.refreshToken.deleteMany({ where: { userId } });

  return sanitize(updated);
}

export async function activateUser(
  userId: string,
  companyId: string,
  prisma: PrismaClient,
): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'Użytkownik nie istnieje');
  if (user.companyId !== companyId) {
    throw new AppError(403, 'Brak dostępu do zasobów innej firmy');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: true },
  });
  return sanitize(updated);
}
