import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/AppError';

const SALT_ROUNDS = 12;

type SafeUser = Omit<User, 'passwordHash'>;

function sanitize(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _ph, ...safe } = user;
  return safe;
}

export async function updateProfile(
  userId: string,
  data: { firstName: string; lastName: string },
  prisma: PrismaClient,
): Promise<SafeUser> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { firstName: data.firstName, lastName: data.lastName },
  });
  return sanitize(updated);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  prisma: PrismaClient,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'Użytkownik nie istnieje');

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new AppError(400, 'Aktualne hasło jest nieprawidłowe');

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  // Unieważnij wszystkie sesje po zmianie hasła (poza bieżącą nie mamy możliwości wybrania)
  await prisma.refreshToken.deleteMany({ where: { userId } });
}
