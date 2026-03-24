# RCMLight — Instrukcja wdrożenia

## Wymagania

- Docker 24+ i Docker Compose v2
- Node.js 20 (tylko do lokalnego devu bez Docker)
- PostgreSQL 16 (tylko lokalnie bez Docker)
- Serwer Linux z SSH (produkcja)

---

## Zmienne środowiskowe

### Backend (`.env` lub GitHub Secrets)

| Zmienna | Opis | Przykład |
|---|---|---|
| `DATABASE_URL` | Connection string PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `NODE_ENV` | Środowisko | `production` |
| `PORT` | Port serwera | `3001` |
| `JWT_ACCESS_SECRET` | Sekret JWT access token (**min. 32 znaki losowe**) | `$(openssl rand -hex 32)` |
| `JWT_REFRESH_SECRET` | Sekret JWT refresh token (**min. 32 znaki losowe**) | `$(openssl rand -hex 32)` |
| `JWT_ACCESS_EXPIRES_IN` | Czas ważności access tokenu | `15m` |
| `SUPER_ADMIN_JWT_SECRET` | Sekret tokenu super admina | `$(openssl rand -hex 32)` |
| `CORS_ORIGINS` | Dozwolone originy (CSV) | `https://rcmlight.example.com` |

### Frontend (build args)

| Zmienna | Opis | Przykład |
|---|---|---|
| `VITE_API_URL` | Bazowy URL API | `/api/v1` lub `https://api.example.com/api/v1` |

### Docker Compose produkcja (`.env.prod`)

```env
DB_USER=rcmlight
DB_PASSWORD=ZMIEN_NA_SILNE_HASLO
DB_NAME=rcmlight
REGISTRY=ghcr.io/TWOJA_ORGANIZACJA
JWT_ACCESS_SECRET=ZMIEN
JWT_REFRESH_SECRET=ZMIEN
SUPER_ADMIN_JWT_SECRET=ZMIEN
CORS_ORIGINS=https://rcmlight.example.com
```

---

## Uruchomienie lokalne (Docker)

```bash
# 1. Sklonuj repo
git clone https://github.com/ORG/rcmlight.git && cd rcmlight

# 2. Uruchom dev stack (DB + backend + frontend hot reload)
docker compose up -d

# 3. Otwórz aplikację
# Frontend: http://localhost:5173
# API: http://localhost:3001/api/v1/health
```

Pierwsze uruchomienie automatycznie:
- uruchamia migracje Prisma
- seeduje bazę danych (firma Demo, użytkownicy, maszyna demo)

---

## Uruchomienie lokalne (bez Docker)

```bash
# Terminal 1 — PostgreSQL musi działać lokalnie, np. brew services start postgresql
cd backend
cp .env.example .env   # uzupełnij DATABASE_URL i sekrety JWT
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev

# Terminal 2
cd frontend
npm install
npm run dev
```

---

## Wdrożenie produkcyjne (CI/CD)

### GitHub Actions (automatyczne)

Przy każdym pushu do `main`:
1. Testy backendu (vitest + PostgreSQL service container)
2. Build i push obrazów Docker do GitHub Container Registry (GHCR)
3. Deploy SSH na serwer produkcyjny

### Wymagane GitHub Secrets

| Secret | Opis |
|---|---|
| `SSH_HOST` | IP/hostname serwera produkcyjnego |
| `SSH_USER` | Użytkownik SSH |
| `SSH_PRIVATE_KEY` | Klucz prywatny SSH |

Zmienne środowiskowe przechowuj w GitHub Environment `production`.

### Pierwsze wdrożenie (ręczne)

```bash
# Na serwerze produkcyjnym:
mkdir -p /opt/rcmlight
cd /opt/rcmlight

# Skopiuj pliki konfiguracyjne:
scp docker-compose.prod.yml nginx.conf user@server:/opt/rcmlight/

# Utwórz .env.prod z wartościami produkcyjnymi
nano .env.prod

# Zaloguj się do GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Uruchom stack
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Sprawdź status
docker compose -f docker-compose.prod.yml ps
docker logs rcmlight_backend --tail 50
```

---

## Pierwsze uruchomienie — dane dostępowe

Po seedzie bazy (`npx prisma db seed`):

| Rola | E-mail | Hasło |
|---|---|---|
| ADMIN | `wojtek.maczynski@somasolution24.com` | `Admin123!` |
| ANALYST | `analyst@demo.com` | `Analyst123!` |
| VIEWER | `viewer@demo.com` | `Viewer123!` |
| SUPER ADMIN | `superadmin@rcmlight.app` | `SuperAdmin123!` |

> **Zmień hasła po pierwszym logowaniu!**

Panel Super Admina dostępny pod: `/admin/login`

---

## Aktualizacja aplikacji

```bash
# Pull najnowszego obrazu i restart
cd /opt/rcmlight
docker compose -f docker-compose.prod.yml --env-file .env.prod pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --remove-orphans
docker image prune -f
```

Migracje bazy danych są uruchamiane automatycznie przy starcie kontenera backendowego (`prisma migrate deploy`).

---

## Backup PostgreSQL

```bash
# Backup
docker exec rcmlight_db pg_dump -U rcmlight rcmlight | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Restore
gunzip -c backup.sql.gz | docker exec -i rcmlight_db psql -U rcmlight rcmlight
```

Zalecane: cron co 24h + automatyczne przesyłanie na S3/B2.

---

## Porty

| Usługa | Port (dev) | Port (prod) |
|---|---|---|
| Frontend | 5173 | 80 / 443 (nginx) |
| Backend API | 3001 | /api/* (proxy nginx) |
| PostgreSQL | 5432 | brak (sieć internal) |

---

## Sprawdzenie zdrowia

```bash
# API health check
curl http://localhost:3001/api/v1/health

# Response:
# {"status":"ok","timestamp":"...","service":"RCMLight API","version":"1.0.0"}
```
