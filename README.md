# RCMLight App

Narzędzie do przeprowadzania analizy niezawodnościowej **RCM** (Reliability-Centered Maintenance) dla maszyn i urządzeń produkcyjnych.

---

## Stos technologiczny

| Warstwa | Technologia |
|---|---|
| Backend | Node.js + Express.js + TypeScript |
| Baza danych | PostgreSQL + Prisma ORM |
| Autentykacja | JWT (access 15 min + refresh 7 dni) |
| Walidacja | Zod |
| Frontend | React 18 + Vite + TypeScript |
| Style | Tailwind CSS + shadcn/ui |
| Stan serwera | TanStack Query v5 |
| Routing | React Router v6 |
| Formularze | React Hook Form + Zod |

---

## Wymagania wstępne

- Node.js >= 20.x
- npm >= 10.x
- PostgreSQL >= 15.x

---

## Uruchomienie — Backend

```bash
cd backend

# 1. Zainstaluj zależności
npm install

# 2. Skonfiguruj zmienne środowiskowe
cp .env.example .env
# Uzupełnij .env (DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ...)

# 3. Utwórz bazę danych i uruchom migracje
npm run db:migrate

# 4. (Opcjonalnie) Załaduj dane testowe
npm run db:seed

# 5. Uruchom serwer developerski
npm run dev
# API dostępne pod: http://localhost:3001/api/v1
```

### Dodatkowe komendy — backend

```bash
npm run build        # Kompilacja TypeScript → dist/
npm run start        # Uruchomienie z dist/ (produkcja)
npm run db:deploy    # Migracje na środowisku produkcyjnym
npm run db:studio    # Prisma Studio (GUI bazy danych)
npm run lint         # ESLint
npm run format       # Prettier
```

---

## Uruchomienie — Frontend

```bash
cd frontend

# 1. Zainstaluj zależności
npm install

# 2. (Opcjonalnie) Skonfiguruj URL API
# Domyślnie frontend proxy'uje /api → http://localhost:3001
# Możesz dodać .env z: VITE_API_URL=http://localhost:3001/api/v1

# 3. Uruchom serwer developerski
npm run dev
# Aplikacja dostępna pod: http://localhost:5173
```

### Dodatkowe komendy — frontend

```bash
npm run build        # Build produkcyjny → dist/
npm run preview      # Podgląd buildu produkcyjnego
npm run lint         # ESLint
npm run format       # Prettier
```

---

## Struktura projektu

```
rcmlight/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Kontrolery tras
│   │   ├── middleware/     # auth, errorHandler, rateLimiter
│   │   ├── routes/         # Definicje tras Express
│   │   ├── services/       # Logika biznesowa
│   │   ├── utils/          # logger, AppError
│   │   ├── app.ts          # Konfiguracja Express
│   │   └── server.ts       # Punkt wejścia
│   ├── prisma/
│   │   └── schema.prisma   # Schemat bazy danych
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Komponenty UI (shadcn/ui + własne)
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # api.ts, queryClient.ts, utils.ts
│   │   ├── pages/          # Strony (widoki)
│   │   ├── types/          # Typy TypeScript
│   │   ├── App.tsx         # Router główny
│   │   └── main.tsx        # Punkt wejścia React
│   └── index.html
│
└── README.md
```

---

## Multi-tenancy

Każda firma (tenant) ma izolowaną przestrzeń danych. Role użytkowników:

| Rola | Uprawnienia |
|---|---|
| `ADMIN` | Zarządzanie firmą i użytkownikami, pełny dostęp do analiz |
| `ANALYST` | Tworzenie i edycja analiz RCM |
| `VIEWER` | Tylko odczyt |

---

## API — Endpointy (planowane)

```
GET  /api/v1/health          # Health check

POST /api/v1/auth/register   # Rejestracja (tworzy tenant + admin)
POST /api/v1/auth/login      # Logowanie → access + refresh token
POST /api/v1/auth/refresh    # Odświeżenie access tokenu
POST /api/v1/auth/logout     # Wylogowanie

GET  /api/v1/users           # Lista użytkowników firmy (ADMIN)
POST /api/v1/users/invite    # Zaproszenie użytkownika (ADMIN)

GET  /api/v1/machines        # Lista maszyn
POST /api/v1/machines        # Dodanie maszyny

GET  /api/v1/analyses        # Lista analiz RCM
POST /api/v1/analyses        # Nowa analiza
```

---

## Zmienne środowiskowe (backend)

| Zmienna | Opis | Domyślnie |
|---|---|---|
| `NODE_ENV` | Środowisko | `development` |
| `PORT` | Port serwera | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_ACCESS_SECRET` | Sekret access tokenu | — |
| `JWT_REFRESH_SECRET` | Sekret refresh tokenu | — |
| `JWT_ACCESS_EXPIRES_IN` | TTL access tokenu | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | TTL refresh tokenu | `7d` |
| `CORS_ORIGINS` | Dozwolone originy (CSV) | `http://localhost:5173` |
| `RATE_LIMIT_WINDOW_MS` | Okno rate limitera (ms) | `900000` |
| `RATE_LIMIT_MAX` | Max żądań na okno | `100` |
| `LOG_LEVEL` | Poziom logowania | `debug` |
