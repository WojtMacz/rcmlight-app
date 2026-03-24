# RCMLight — CLAUDE.md

> **Instrukcja dla asystenta AI:** Przeczytaj ten plik PRZED każdą zmianą. Zaktualizuj go PO każdej zmianie.

---

## 1. Architektura projektu

### Stos technologiczny

| Warstwa | Technologia |
|---------|-------------|
| **Backend** | Node.js + Express + TypeScript |
| **ORM** | Prisma v5 + PostgreSQL |
| **Autentykacja** | JWT (HS256) + refresh token rotation (crypto hex 64B) |
| **Walidacja** | Zod |
| **Frontend** | React 18 + Vite 6 |
| **Routing** | React Router v6 |
| **UI** | Tailwind CSS + shadcn/ui (subset) |
| **State / API** | TanStack Query v5 |
| **Formularze** | React Hook Form + Zod |
| **HTTP client** | Axios z auto-refresh interceptorem |
| **Toasty** | Sonner |
| **Drag-drop (BOM)** | @dnd-kit |
| **Import/Export** | xlsx (SheetJS) |

### Porty
- Backend: **3001**
- Frontend: **5173**

### Struktura folderów

```
RCMLight_app/
├── CLAUDE.md                    ← ten plik
├── README.md
├── DEPLOYMENT.md
├── docker-compose.yml
├── docker-compose.prod.yml
├── nginx.conf
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        ← modele DB
│   │   ├── seed.ts              ← dane demo
│   │   └── migrations/          ← historia migracji
│   └── src/
│       ├── app.ts               ← Express + CORS
│       ├── server.ts            ← punkt wejścia
│       ├── lib/
│       │   └── prisma.ts        ← singleton PrismaClient
│       ├── middleware/
│       │   ├── auth.ts          ← authenticate (JWT)
│       │   ├── requireRole.ts   ← requireRole(...roles)
│       │   ├── tenantIsolation.ts
│       │   ├── errorHandler.ts
│       │   └── rateLimiter.ts
│       ├── routes/
│       │   └── index.ts         ← rejestracja wszystkich tras
│       ├── controllers/         ← request/response handlers
│       ├── services/            ← logika biznesowa
│       ├── validators/          ← Zod schemas
│       └── utils/
│           ├── AppError.ts      ← klasa błędów operacyjnych
│           ├── logger.ts
│           ├── pagination.ts
│           └── reqParams.ts     ← param() helper (@types/express v5)
│
└── frontend/
    └── src/
        ├── App.tsx              ← definicja tras (React Router)
        ├── types/index.ts       ← wszystkie typy TypeScript
        ├── lib/
        │   ├── api.ts           ← Axios + interceptory
        │   └── queryClient.ts   ← TanStack Query config
        ├── contexts/
        │   └── AuthContext.tsx
        ├── hooks/
        │   ├── useBom.ts        ← BOM queries + mutations
        │   ├── useMachines.ts
        │   ├── useRcm.ts        ← RCM queries + mutations
        │   └── useSettings.ts   ← Kryteria + słownik grup mat.
        ├── components/
        │   ├── auth/
        │   ├── bom/
        │   │   ├── BomTree.tsx
        │   │   └── modals/
        │   │       ├── MaterialGroupModal.tsx  ← select ze słownika
        │   │       ├── AssemblyModal.tsx
        │   │       ├── SystemModal.tsx
        │   │       ├── SparePartModal.tsx
        │   │       ├── MachineModal.tsx
        │   │       └── ImportModal.tsx
        │   ├── criticality/
        │   ├── layout/
        │   │   ├── AppLayout.tsx
        │   │   ├── Sidebar.tsx
        │   │   └── Header.tsx
        │   ├── pm/
        │   ├── rcm/
        │   ├── summary/
        │   └── ui/              ← shadcn/ui (subset)
        └── pages/
            ├── LoginPage.tsx
            ├── dashboard/
            ├── machines/
            │   ├── BomPage.tsx
            │   ├── FunctionsPage.tsx
            │   ├── PhysicalFailuresPage.tsx
            │   ├── CriticalityPage.tsx
            │   ├── PmTasksPage.tsx
            │   └── SummaryPage.tsx
            ├── settings/
            │   ├── SettingsLayout.tsx
            │   ├── ProfilePage.tsx
            │   ├── UsersPage.tsx
            │   ├── CompanyPage.tsx
            │   ├── CriteriaCriteriaPage.tsx      ← NOWE
            │   └── MaterialGroupsDictionaryPage.tsx  ← NOWE
            └── admin/           ← Super Admin panel
```

---

## 2. Model danych (Prisma)

### Multi-tenancy
```
Company → User (role: ADMIN|ANALYST|VIEWER), RefreshToken, InviteToken,
          CriticalityCriteria, MaterialGroupTemplate, Machine
```

### BOM (4 poziomy)
```
Machine → System → Assembly → MaterialGroup → SparePart
```

### Analiza RCM
```
FunctionDef (level: SYSTEM|ASSEMBLY)
  → FunctionalFailure
    → PhysicalFailure (materialGroupId, mtbfMonths)
      → FailureCause
          → Criticality (S,I,Q,P,F + C,L; 0–3)
          → PMTask (type: REDESIGN|PDM|PM_INSPECTION|PM_OVERHAUL|RTF)
```

### Konfiguracja firmy
```
CriticalityCriteria (companyId, category: SAFETY|IMPACT|QUALITY|PRODUCTION|FREQUENCY|REPAIR_COST|LABOR, level 0–3, label, description)
MaterialGroupTemplate (companyId, code, name, category, categoryName, isActive, sortOrder)
```

### Migracje
| Data | Nazwa |
|------|-------|
| 2026-03-14 | `init` — pełny schemat BOM + RCM |
| 2026-03-15 | `add_criteria_and_material_templates` — tabele konfiguracyjne |

---

## 3. API — endpointy

Prefix: `/api/v1`

### Auth
| Metoda | Ścieżka | Opis |
|--------|---------|------|
| POST | `/auth/login` | Login → accessToken + refreshToken |
| POST | `/auth/refresh` | Rotacja refresh tokenu |
| POST | `/auth/logout` | Unieważnienie refresh tokenu |
| GET | `/auth/me` | Dane zalogowanego użytkownika |
| POST | `/auth/register` | Tworzenie użytkownika (ADMIN only) |

### BOM
`/machines`, `/systems`, `/assemblies`, `/material-groups`, `/spare-parts`
- Import BOM: `POST /machines/:id/import-bom`
- Export BOM: `GET /machines/:id/export-bom`

### RCM
`/functions`, `/functional-failures`, `/physical-failures`, `/causes`, `/pm-tasks`

### Ustawienia (nowe)
| Metoda | Ścieżka | Dostęp |
|--------|---------|--------|
| GET | `/settings/criticality-criteria` | Wszystkie role |
| PATCH | `/settings/criticality-criteria/:id` | ADMIN |
| POST | `/settings/criticality-criteria/reset` | ADMIN |
| GET | `/settings/material-groups-dictionary` | Wszystkie role |
| POST | `/settings/material-groups-dictionary` | ADMIN |
| PATCH | `/settings/material-groups-dictionary/:id` | ADMIN |
| DELETE | `/settings/material-groups-dictionary/:id` | ADMIN (soft-delete) |

### Company / Users / Admin
`/company`, `/users`, `/admin/companies`

---

## 4. Status modułów

### Backend
| Moduł | Status | Uwagi |
|-------|--------|-------|
| Autentykacja + JWT | ✅ Ukończony | 25 testów pass |
| BOM API | ✅ Ukończony | import/export xlsx |
| RCM API (functions, FF, PF, causes) | ✅ Ukończony | |
| Criticality API | ✅ Ukończony | |
| PM Tasks API | ✅ Ukończony | |
| Settings API | ✅ Ukończony | lazy-seed domyślnych danych |
| Company API | ✅ Ukończony | |
| Users API | ✅ Ukończony | |
| Admin API | ✅ Ukończony | Super Admin panel |
| Testy | ⚠️ Częściowy | Tylko auth (25 testów); brak testów dla BOM/RCM |

### Frontend
| Moduł | Status | Uwagi |
|-------|--------|-------|
| Login / Auth flow | ✅ Ukończony | auto-refresh token |
| Dashboard | ✅ Ukończony | lista maszyn |
| 1. BOM — struktura | ✅ Ukończony | drag-drop, import/export |
| 2. Funkcje i dysfunkcje | ✅ Ukończony | |
| 3. Uszkodzenia fizyczne | ✅ Ukończony | poprawiony filtr MG |
| 4. Krytyczność | ✅ Ukończony | |
| 5. Zadania PM | ✅ Ukończony | kalkulator, kreator decyzji |
| 6. Podsumowanie | ✅ Ukończony | |
| Ustawienia — Profil | ✅ Ukończony | |
| Ustawienia — Użytkownicy | ✅ Ukończony | zaproszenia |
| Ustawienia — Firma | ✅ Ukończony | domyślne parametry analizy |
| Ustawienia — Kryteria krytyczności | ✅ Ukończony | zakładki, inline edycja, reset |
| Ustawienia — Słownik grup mat. | ✅ Ukończony | zakładki, inline CRUD |
| BOM — select ze słownika | ✅ Ukończony | MaterialGroupModal przebudowany |
| Super Admin panel | ✅ Ukończony | |
| Migracja DB | ✅ Ukończony | 2 migracje zastosowane |

---

## 5. Znane błędy i rozwiązania

### TypeScript — @types/express v5
**Problem:** `req.params` ma typ `string | string[]` zamiast `string`.
**Rozwiązanie:** Zawsze używaj `param(req, 'key')` z `utils/reqParams.ts`, nigdy bezpośrednio `req.params.key`.

### JWT — opcja `subject`
**Problem:** Używanie opcji `subject` w `jwt.sign()` konfliktuje z polem `sub` w payload.
**Rozwiązanie:** Nie używaj opcji `subject` — zamiast tego wstaw `sub` bezpośrednio do payload.

### Prisma — lazy seeding kryteriów
**Problem:** Tabele `CriticalityCriteria` i `MaterialGroupTemplate` są puste dla nowych firm.
**Rozwiązanie:** `settingsService.ts` wykrywa pusty wynik (`count === 0`) i automatycznie seeduje domyślne dane przy pierwszym zapytaniu GET.

### PhysicalFailuresPage — środkowy panel pokazywał wszystkie MG
**Problem:** Panel B wyświetlał wszystkie grupy materiałowe z BOM, nawet te bez uszkodzeń fizycznych.
**Rozwiązanie:** Dodano `.filter((mg) => mg.physicalFailures.length > 0)` przed renderowaniem `MGSection` (linia ~512 w `PhysicalFailuresPage.tsx`).

---

## 6. Ważne decyzje techniczne

### Multi-tenancy przez `companyId` w JWT
Każdy request niesie `companyId` w tokenie. Middleware `tenantIsolation` automatycznie dodaje izolację danych. Nie ma możliwości dostępu do danych innej firmy bez zmiany tokenu.

### Lazy seeding zamiast migracji danych
Kryteria krytyczności i szablony grup materiałowych są seedowane on-demand (przy pierwszym GET), nie przez migrację. Powód: elastyczność — firmy mogą customizować dane, więc nie można nadpisywać przy każdej migracji.

### shadcn/ui — podzbiór komponentów
Projekt używa tylko wybranych komponentów shadcn/ui (nie wszystkich). Brak: `Tabs`, `Combobox`, `Command`. Zakładki implementowane manualnie (przyciski z `border-b-2`), wyszukiwarka słownikowa — Input + filtrowanie.

### `param(req, 'key')` helper
Stworzony ze względu na breaking change w `@types/express@5`. Wszystkie kontrolery muszą używać tego helpera zamiast `req.params.key`.

### Soft delete dla MaterialGroupTemplate
DELETE nie usuwa rekordu, tylko ustawia `isActive: false`. Powód: grupy mogą być przypisane do historycznych analiz BOM i ich usunięcie mogłoby naruszyć integralność danych.

### Formuła WK (od sesji 4)
- **WK** = avg(S, Q, P, F, D) — Wskaźnik Konsekwencji (5 składowych, bez I)
- **WP** = avg(C, L) — Wskaźnik Pracochłonności
- **WKF** = avg(WK, WP) — Wskaźnik Krytyczności Finalny
- Pole `impact` jest zachowane w DB i typach jako legacy (`@default(0)`, nieużywane w UI/formułach)

### Kategorie grup materiałowych (od sesji 4)
Nowe 7 kategorii: **ME, EL, PN, HO, HW, OL, WM** (zamiast starych ME/EL/PH/IN/AU/OT).
Łącznie 73 szablony grup (vs. 28 poprzednio).

### Rotacja refresh tokenów
Każde użycie refresh tokenu go unieważnia i tworzy nowy. Zapobiega session fixation attacks. Tokeny przechowywane w DB (tabela `RefreshToken`).

### `req.user` vs `req.userId`
Middleware `auth.ts` ustawia `req.user` jako cały payload JWT (z polem `sub`). Nie ma osobnego `req.userId` — dostęp przez `req.user?.sub`.

---

## 7. Changelog

### 2026-03-15 (sesja 7) — Usuwanie maszyny z analizą

#### Zmiany

**Backend — `services/machineService.ts`**
- Zmodyfikowano `deleteMachine`: bez `force` blokuje jeśli są systemy; z `force=true` najpierw ręcznie usuwa `FunctionDef` powiązane z systemami/assembly maszyny (kaskada usuwa: FF → PF → Cause → Criticality/PMTask), następnie usuwa maszynę (kaskada: System → Assembly → MaterialGroup → SparePart)
- Uwaga: `FunctionDef` nie ma `onDelete: Cascade` w schemacie → konieczne ręczne deleteMany przed usunięciem maszyny

**Frontend — `hooks/useMachines.ts`**
- Dodano `useDeleteMachine` — mutation `DELETE /machines/:id?force=true` + invalidate `['machines']`

**Frontend — `pages/dashboard/DashboardPage.tsx`**
- `MachineCard`: dodano ikonę kosza (tylko dla ADMIN), prop `onDeleteRequest`
- `DashboardPage`: stan `machineToDelete`, obsługa `handleConfirmDelete`
- Dodano `AlertDialog` z opisem konsekwencji usunięcia, przyciskami "Anuluj" / "Usuń maszynę"
- Toast po sukcesie/błędzie

---

### 2026-03-15 (sesja 6) — Logo firmy

#### Zmiany
- **logo.png** (1024×1024) → `frontend/public/logo.png`:
  - Sesja 6a: usunięto białe tło (piksele R/G/B >240 → przezroczyste, 659k px transp.)
  - Sesja 6b: usunięto czarne tło (piksele R/G/B <30 → przezroczyste, łącznie 701k px transp.)
  - Logo ma własne kolory (niebiesko-szare, żółte, białe) — bez filtrów CSS
- **Sidebar.tsx** — `Cpu` icon + tekst → `<img>` bez filtra, rozmiar `h-14` (rozwinięty) / `h-8` (zwinięty)
- **LoginPage.tsx** — lewy panel dark: `<img h-32>` bez filtra; mobile jasne tło: `<img h-10>` bez filtra
- **index.html** — favicon `/logo.png` (zamiast vite.svg)
- Usunięto nieużywany import `Cpu` z Sidebar.tsx i LoginPage.tsx

---

### 2026-03-15 (sesja 5) — Bugfix: puste słowniki + reset kryteriów

#### Diagnoza
- Baza miała dane (32 kryteria × 8 kat, 73 szablony grup) — seed działał poprawnie
- Problem leżał w kodzie backendu

#### Bug 1 — Puste słowniki (401 Brak kontekstu firmy)
- **Przyczyna:** `routes/settings.ts` używał tylko `authenticate`, ale NIE `tenantIsolation`
  → `req.companyId` było `undefined`
  → `cid(req)` rzucał `AppError(401, 'Brak kontekstu firmy')`
  → frontend dostawał błąd 401, query pozostawało puste
- **Naprawa:** Dodano `tenantIsolation` do `router.use(authenticate, tenantIsolation)` w `routes/settings.ts`

#### Bug 2 — Błąd resetu kategorii AVAILABILITY
- **Przyczyna:** `criteriaCategoryEnum` w `validators/settings.schemas.ts` nie zawierał `'AVAILABILITY'`
  → Zod odrzucał `{ category: 'AVAILABILITY' }` walidacją 422
  → reset dla zakładki D nie działał
- **Naprawa:** Dodano `'AVAILABILITY'` do enum w walidatorze

#### Wzorzec do zapamiętania
Wszystkie chronione trasy muszą używać `authenticate + tenantIsolation` (nie samo `authenticate`).

---

### 2026-03-15 (sesja 4)

#### Backend — Aktualizacja słowników i formuły WK
- **Zaktualizowano** `schema.prisma` — dodano `AVAILABILITY` do enum `CriteriaCategory`; dodano pole `availability Int @default(0)` w modelu `Criticality`; pole `impact` oznaczone jako legacy
- **Zaktualizowano** `validators/rcm.schemas.ts` — `availability` jako nowe pole, `impact` opcjonalne z default 0
- **Zaktualizowano** `services/settingsService.ts`:
  - Nowe opisy wszystkich 8 kategorii krytyczności (SAFETY/QUALITY/PRODUCTION/FREQUENCY/AVAILABILITY/REPAIR_COST/LABOR)
  - Nowa formuła WK: `avg(S, Q, P, F, D)` (zamiast starego `avg(S, I, Q, P, F)`)
  - Zastąpiono 28 starych szablonów grup materiałowych **73 nowymi** (ME×20, EL×15, PN×8, HO×11, HW×9, OL×4, WM×6)
  - Nowe kategorie: **ME, EL, PN, HO, HW, OL, WM** (zamiast starych PH/IN/AU/OT)
- **Zaktualizowano** `prisma/seed.ts` — import danych z settingsService, deleteMany + create
- **Uruchomiono** migrację `update_criteria_and_material_groups`
- **Uruchomiono** `prisma db seed` — baza zaktualizowana

#### Frontend — Aktualizacja krytyczności (I→D)
- **Zaktualizowano** `types/index.ts` — `availability: number` w `Criticality`; `'AVAILABILITY'` w `CriteriaCategory`
- **Zaktualizowano** `hooks/useRcm.ts` — `CriticalityPayload`: `availability: number`, `impact?: number` (legacy)
- **Zaktualizowano** `components/criticality/criticalityUtils.ts`:
  - `computeWk`: `(S + Q + P + F + D) / 5` (usunięto I, dodano D)
  - `CriterionDef` key type: zastąpiono `impact` przez `availability`
  - `CRITERIA` array: usunięto krok I, dodano krok D (shortLabel: 'D')
- **Zaktualizowano** `components/criticality/CriticalityWizard.tsx`:
  - `WizardValues`: usunięto `impact`, dodano `availability`
  - `CRITERION_STEPS`: 🔴S / 🏭Q / ⚙️P / 📊F / 🔧D / 💰CL (6 kroków bez I)
  - Podsumowanie: wyświetla S/Q/P/F/D zamiast S/I/Q/P/F
- **Zaktualizowano** `components/criticality/CriticalityDrawer.tsx`:
  - Schema Zod: usunięto `impact`, dodano `availability`
  - `usePreview`, `reset`, `handleSave`: `availability` zamiast `impact`
- **Zaktualizowano** `pages/machines/CriticalityPage.tsx`:
  - Tabela: kolumna D zamiast I
  - Komórki: `numCell(c?.availability)` zamiast `numCell(c?.impact)`
  - Eksport CSV: nagłówek `D`, wartość `c?.availability`

#### Frontend — Aktualizacja słowników
- **Zaktualizowano** `pages/settings/CriteriaCriteriaPage.tsx` — zakładki S/Q/P/F/D/C/L (usunięto I, dodano D)
- **Zaktualizowano** `pages/settings/MaterialGroupsDictionaryPage.tsx` — zakładki ME/EL/PN/HO/HW/OL/WM
- **Zaktualizowano** `components/bom/modals/MaterialGroupModal.tsx` — `MATERIAL_CATEGORIES` i `CATEGORY_NAME` z nowymi 7 kategoriami

---

### 2026-03-15 (sesja 3)

#### Backend — Settings API
- **Dodano** modele `CriticalityCriteria` i `MaterialGroupTemplate` do `schema.prisma`
- **Uruchomiono** migrację `add_criteria_and_material_templates`
- **Utworzono** `validators/settings.schemas.ts` — Zod schemas dla settings
- **Utworzono** `services/settingsService.ts` — CRUD + lazy seeding domyślnych danych
- **Utworzono** `controllers/settingsController.ts` — 7 handlers
- **Utworzono** `routes/settings.ts` — trasy z RBAC (ADMIN writes, all reads)
- **Zaktualizowano** `routes/index.ts` — zarejestrowano `/settings`
- **Zaktualizowano** `prisma/seed.ts` — seeduje 28 kryteriów + 28 szablonów grup
- **Uruchomiono** `prisma db seed` — baza wypełniona danymi demo

#### Frontend — Settings API
- **Dodano** typy `CriticalityCriteria`, `MaterialGroupTemplate`, `CriteriaCategory` do `types/index.ts`
- **Utworzono** `hooks/useSettings.ts` — pełny zestaw hooks TanStack Query

#### Frontend — Strony ustawień
- **Utworzono** `pages/settings/CriteriaCriteriaPage.tsx` — zakładki S/I/Q/P/F/C/L, inline edycja, reset
- **Utworzono** `pages/settings/MaterialGroupsDictionaryPage.tsx` — zakładki ME/EL/PH/IN/AU/OT, CRUD inline
- **Zaktualizowano** `pages/settings/SettingsLayout.tsx` — nowe pozycje nav dla ADMIN
- **Zaktualizowano** `components/layout/Sidebar.tsx` — ikony SlidersHorizontal + BookOpen w sekcji Administracja
- **Zaktualizowano** `App.tsx` — trasy `/criticality-criteria` i `/material-groups-dictionary` pod `AdminRoute`

#### Frontend — BOM MaterialGroupModal
- **Przebudowano** `components/bom/modals/MaterialGroupModal.tsx`:
  - Tryb dodawania: wyszukiwarka ze słownika firmy (pogrupowana, przeszukiwalna)
  - Po wyborze: karta potwierdzenia z kodem/nazwą/kategorią
  - Link "Nie ma na liście?" → mini-formularz z auto-sugestią kodu i zapisem do słownika
  - Tryb edycji: bez zmian (prosty formularz)

### 2026-03-15 (sesja 2)

#### Frontend — Fix: środkowy panel PhysicalFailuresPage
- **Naprawiono** `pages/machines/PhysicalFailuresPage.tsx` linia ~512:
  - Zmieniono `selectedAsm.materialGroups.map(...)` na `selectedAsm.materialGroups.filter(mg => mg.physicalFailures.length > 0).map(...)`
  - Grupy bez uszkodzeń fizycznych nie są już wyświetlane w panelu B

### 2026-03-14 (sesja 1)
- Szkielet projektu (backend + frontend)
- Schemat Prisma + seed
- Autentykacja backend (25 testów)
- BOM API + frontend
- Pełna analiza RCM (wszystkie 6 kroków) + frontend
- Super Admin panel

---

## 8. Dane demo (seed)

### Firma: "Demo Company" (slug: `demo`)
| Email | Hasło | Rola |
|-------|-------|------|
| admin@demo.com | Admin123! | ADMIN |
| analyst@demo.com | Analyst123! | ANALYST |
| viewer@demo.com | Viewer123! | VIEWER |

### Maszyna demo
- **M-001** — Linia pakowania — maszyna główna
- 2 systemy → 3 assemblies → grupy ME01/ME03/ME06/ME08/EL01/EL02/EL03
- Kompletna analiza RCM: 3 PF, przyczyny z krytycznością i zadaniami PM

### Super Admin
- superadmin@rcmlight.app / SuperAdmin123!

---

## 9. Uruchamianie projektu

```bash
# Backend
cd backend
cp .env.example .env          # ustaw DATABASE_URL, JWT_SECRET, itp.
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev                   # :3001

# Frontend
cd frontend
npm install
npm run dev                   # :5173
```

### Zmienne środowiskowe (backend `.env`)
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=http://localhost:5173
RATE_LIMIT_AUTH_MAX=10
```
