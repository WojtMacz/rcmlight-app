import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../app';
import { signAccessToken } from '../services/tokenService';

// ── Mock Prismy ─────────────────────────────────────────────────────────────
// vi.mock jest hoistowany — musi być przed importami
vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma';

// Typed helpers — upraszczają mockowanie w testach
const userMock = {
  findUnique: vi.mocked(prisma.user.findUnique),
  findMany: vi.mocked(prisma.user.findMany),
  create: vi.mocked(prisma.user.create),
  update: vi.mocked(prisma.user.update),
};
const rtMock = {
  findUnique: vi.mocked(prisma.refreshToken.findUnique),
  create: vi.mocked(prisma.refreshToken.create),
  delete: vi.mocked(prisma.refreshToken.delete),
  deleteMany: vi.mocked(prisma.refreshToken.deleteMany),
};

// ── Dane testowe ────────────────────────────────────────────────────────────
const COMPANY_ID = 'company-test-001';
const USER_ID = 'user-test-001';
const PASSWORD = 'Admin123!';

const fakeUser = {
  id: USER_ID,
  email: 'admin@test.com',
  firstName: 'Test',
  lastName: 'Admin',
  role: 'ADMIN' as const,
  passwordHash: bcrypt.hashSync(PASSWORD, 10), // saltRounds=10 dla szybkości testów
  isActive: true,
  companyId: COMPANY_ID,
  createdAt: new Date(),
};

const fakeRefTokenRecord = {
  id: 'rt-001',
  token: 'valid-refresh-token-hex',
  userId: USER_ID,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const app = createApp();
const request = supertest(app);

function makeToken(role: 'ADMIN' | 'ANALYST' | 'VIEWER', userId = USER_ID, companyId = COMPANY_ID) {
  return signAccessToken({ sub: userId, email: 'test@test.com', companyId, role });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/v1/auth/login
// ═══════════════════════════════════════════════════════════════════════════

describe('POST /api/v1/auth/login', () => {
  it('zwraca 200 + accessToken przy poprawnych danych', async () => {
    userMock.findUnique.mockResolvedValue(fakeUser);
    rtMock.create.mockResolvedValue(fakeRefTokenRecord);

    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.passwordHash).toBeUndefined(); // nigdy nie zwracamy hasha
    expect(res.body.data.user.email).toBe('admin@test.com');
  });

  it('zwraca 401 przy błędnym haśle', async () => {
    userMock.findUnique.mockResolvedValue(fakeUser);

    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'WrongPass999!' });

    expect(res.status).toBe(401);
    expect(res.body.status).toBe('fail');
    expect(res.body.message).toContain('Nieprawidłowy');
  });

  it('zwraca 401 gdy użytkownik nie istnieje (timing-safe — nie ujawnia info)', async () => {
    userMock.findUnique.mockResolvedValue(null);

    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@test.com', password: PASSWORD });

    expect(res.status).toBe(401);
    // Wiadomość błędu identyczna jak przy złym haśle — user enumeration prevention
    expect(res.body.message).toContain('Nieprawidłowy');
  });

  it('zwraca 403 gdy konto jest nieaktywne', async () => {
    userMock.findUnique.mockResolvedValue({ ...fakeUser, isActive: false });

    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('nieaktywne');
  });

  it('zwraca 422 przy brakującym polu password', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com' });

    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  it('zwraca 422 przy nieprawidłowym formacie email', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: PASSWORD });

    expect(res.status).toBe(422);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/v1/auth/refresh
// ═══════════════════════════════════════════════════════════════════════════

describe('POST /api/v1/auth/refresh', () => {
  it('zwraca 200 + nowe tokeny przy prawidłowym refresh token', async () => {
    rtMock.findUnique.mockResolvedValue(fakeRefTokenRecord);
    rtMock.delete.mockResolvedValue(fakeRefTokenRecord);
    userMock.findUnique.mockResolvedValue(fakeUser);
    rtMock.create.mockResolvedValue({ ...fakeRefTokenRecord, token: 'new-refresh-token-hex' });

    const res = await request
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'valid-refresh-token-hex' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    // Stary token musi być usunięty (rotacja)
    expect(rtMock.delete).toHaveBeenCalledWith({ where: { token: 'valid-refresh-token-hex' } });
  });

  it('zwraca 401 gdy refresh token nie istnieje w bazie', async () => {
    rtMock.findUnique.mockResolvedValue(null);
    rtMock.delete.mockResolvedValue(fakeRefTokenRecord);

    const res = await request
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'unknown-token' });

    expect(res.status).toBe(401);
  });

  it('zwraca 401 gdy refresh token wygasł', async () => {
    rtMock.findUnique.mockResolvedValue({
      ...fakeRefTokenRecord,
      expiresAt: new Date(Date.now() - 1000), // 1 sekunda w przeszłości
    });
    rtMock.delete.mockResolvedValue(fakeRefTokenRecord);

    const res = await request
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'expired-token' });

    expect(res.status).toBe(401);
    // Token musi być usunięty nawet jeśli wygasł (cleanup)
    expect(rtMock.delete).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/v1/auth/me
// ═══════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/auth/me', () => {
  it('zwraca dane zalogowanego użytkownika (bez passwordHash)', async () => {
    userMock.findUnique.mockResolvedValue(fakeUser);

    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(USER_ID);
    expect(res.body.data.user.email).toBe(fakeUser.email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('zwraca 401 bez nagłówka Authorization', async () => {
    const res = await request.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('zwraca 401 przy wygasłym tokenie (fake timers)', async () => {
    const token = makeToken('ADMIN');

    // Przesuń zegar o 20 minut — token (TTL 15m) będzie wygasły
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 20 * 60 * 1000);

    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    vi.useRealTimers();

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('wygasł');
  });

  it('zwraca 401 przy zmanipulowanym tokenie', async () => {
    const token = makeToken('ADMIN');
    const tampered = token.slice(0, -5) + 'XXXXX'; // modyfikacja podpisu

    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tampered}`);

    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/v1/auth/register (wymaga ADMIN)
// ═══════════════════════════════════════════════════════════════════════════

describe('POST /api/v1/auth/register', () => {
  const newUserPayload = {
    email: 'new@test.com',
    firstName: 'Nowy',
    lastName: 'Użytkownik',
    password: 'Password1!',
    role: 'ANALYST',
  };

  it('ADMIN może zarejestrować nowego użytkownika w swojej firmie', async () => {
    userMock.findUnique.mockResolvedValue(null); // email wolny
    userMock.create.mockResolvedValue({
      ...fakeUser,
      id: 'new-user-id',
      email: 'new@test.com',
      role: 'ANALYST',
    });

    const res = await request
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send(newUserPayload);

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('new@test.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    // Nowy user trafia do firmy admina (companyId z tokenu)
    expect(userMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ companyId: COMPANY_ID }) }),
    );
  });

  it('ANALYST nie może rejestrować użytkowników → 403', async () => {
    const res = await request
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${makeToken('ANALYST')}`)
      .send(newUserPayload);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('ADMIN');
  });

  it('VIEWER nie może rejestrować użytkowników → 403', async () => {
    const res = await request
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${makeToken('VIEWER')}`)
      .send(newUserPayload);

    expect(res.status).toBe(403);
  });

  it('zwraca 409 jeśli email już istnieje', async () => {
    userMock.findUnique.mockResolvedValue(fakeUser); // email zajęty

    const res = await request
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send({ ...newUserPayload, email: 'admin@test.com' });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('już istnieje');
  });

  it('zwraca 401 bez tokenu', async () => {
    const res = await request
      .post('/api/v1/auth/register')
      .send(newUserPayload);

    expect(res.status).toBe(401);
  });

  it('zwraca 422 przy słabym haśle', async () => {
    const res = await request
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`)
      .send({ ...newUserPayload, password: 'weak' });

    expect(res.status).toBe(422);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/v1/users — izolacja tenanta
// ═══════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/users — tenant isolation', () => {
  it('ADMIN widzi tylko użytkowników swojej firmy (companyId z tokenu)', async () => {
    userMock.findMany.mockResolvedValue([fakeUser]);

    const res = await request
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${makeToken('ADMIN')}`);

    expect(res.status).toBe(200);
    expect(res.body.data.users).toHaveLength(1);
    // Prisma query musi zawierać companyId z tokenu
    expect(userMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: COMPANY_ID } }),
    );
  });

  it('ANALYST nie może listować użytkowników → 403', async () => {
    const res = await request
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${makeToken('ANALYST')}`);

    expect(res.status).toBe(403);
  });

  it('Admin z INNEJ firmy może listować tylko swoich użytkowników', async () => {
    const OTHER_COMPANY = 'other-company-999';
    userMock.findMany.mockResolvedValue([]);

    const res = await request
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${makeToken('ADMIN', 'other-admin', OTHER_COMPANY)}`);

    expect(res.status).toBe(200);
    // Zapytanie do DB filtrowane przez INNY companyId — nigdy przez COMPANY_ID
    expect(userMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: OTHER_COMPANY } }),
    );
    expect(userMock.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: COMPANY_ID } }),
    );
  });

  it('zwraca 401 bez tokenu', async () => {
    const res = await request.get('/api/v1/users');
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/v1/auth/logout
// ═══════════════════════════════════════════════════════════════════════════

describe('POST /api/v1/auth/logout', () => {
  it('zwraca 200 i unieważnia refresh token', async () => {
    rtMock.delete.mockResolvedValue(fakeRefTokenRecord);

    const res = await request
      .post('/api/v1/auth/logout')
      .send({ refreshToken: 'some-refresh-token' });

    expect(res.status).toBe(200);
    expect(rtMock.delete).toHaveBeenCalledWith({ where: { token: 'some-refresh-token' } });
  });

  it('zwraca 200 nawet bez refresh token w body (idempotentne)', async () => {
    const res = await request.post('/api/v1/auth/logout').send({});
    expect(res.status).toBe(200);
    expect(rtMock.delete).not.toHaveBeenCalled();
  });
});
