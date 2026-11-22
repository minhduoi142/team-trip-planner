# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Team Trip Planner**: an MVP for small groups (~10–15 people) to agree on travel dates, plan a day-by-day itinerary, split costs, and keep trip photos on Google Drive. The UI and all user-facing messages (including backend error `detail`) are in **Vietnamese**.

**Read first:**
- `AGENT_RULE.md`: mandatory workflow and coding rules. Read the SDD → backend first (migration → Entity → Repository → DTO record → Service → Controller + Swagger) → frontend types copied 1:1 from the Java DTOs → both builds green before reporting.
- `docs/sdd-phase-N.md`: the design for each phase. It is the contract. If it conflicts with the code or with `AGENT_RULE.md`, ask the user before coding.
- `/run-phase N` (`.claude/commands/run-phase.md`) runs a phase end to end.

The two Vietnamese spec files at the root are the original product specs. The plan was later changed to **5 phases**:
1. Auth + trips + invites + countdown
2. Day-level availability + lock dates
3. Itinerary + checklist + dress code (beta deploy)
4. Polls + expense split with VietQR
5. Drive album links + room assignment + share previews + production deploy

Login is Google **or** username/password. No Drive OAuth scope is requested, so the album only stores Drive links.

## Current state

Phases 1–2 are implemented (see `docs/sdd-phase-1.md` and `docs/sdd-phase-2.md`). The backend runs against local MySQL 8.0.44, and all 42 tests pass, including the integration tests. The frontend builds and lints cleanly but has not been tried in a browser yet.

## Commands

Backend (`backend/`, Java 21, Maven wrapper; use `mvnw.cmd` from PowerShell):
- `./mvnw spring-boot:run`: needs `JWT_SECRET` (≥32 bytes) and `DB_URL`/`DB_USERNAME`/`DB_PASSWORD`. These are read from `backend/.env` through `spring.config.import: optional:file:.env[.properties]`, relative to the working directory, so run from `backend/`. Real environment variables take precedence. `.env` is gitignored; the template is `backend/.env.example`. Never put secrets in `application.yml`.
- Seed data: `APP_SEED_ENABLED=true` (already set in the local `backend/.env`) makes `DevDataSeeder` create sample Đà Lạt availability (a separate idempotent step; the best 3-day window is at offset 5–7) and users `linh`, `mai`, `lan`, `ngoc`, `thao`, `vy` (password `matkhau123`) and 4 trips, one per status, with dates relative to today. The users-and-trips step skips if `linh` already exists; the availability step skips if Đà Lạt already has availability. Seeding is disabled in the test profile. Never enable it in production.
- `./mvnw test`: unit tests always run. Integration tests (`IntegrationTest` subclasses) run only when `TEST_DB_URL`/`TEST_DB_USERNAME`/`TEST_DB_PASSWORD` point to a local MySQL schema such as `tripplanner_test`.
- `./mvnw test -Dtest=TripIntegrationTest`: run a single test class (`-Dtest=Class#method` runs one method).
- Swagger UI: `http://localhost:8080/swagger-ui.html`

Frontend (`frontend/`):
- `npm run dev`: http://localhost:5173. Copy `.env.example` to `.env.local` first.
- `npm run build`: `tsc -b` + `vite build`. This is the FE self-check required by AGENT_RULE.
- `npm run lint`
- `npx shadcn@latest add <component>`: adds a Shadcn component (preset radix-maia, lucide icons).

## Architecture

**Backend** (`com.tripplanner`). Packages are split by feature (`auth`, `user`, `trip`) plus `common` and `config`.
- **Auth:** stateless. The app issues its own HS256 JWT (`JwtService`), and `oauth2-resource-server` verifies it. The JWT `sub` claim is the userId; controllers read it with `@AuthenticationPrincipal Jwt` + `CurrentUser.id(jwt)`.
- **Google login:** the FE sends a Google ID token to `POST /api/v1/auth/google`. `NimbusGoogleTokenVerifier` checks it against Google's JWKS. That decoder is deliberately **not** a bean, so it never clashes with the app's `JwtDecoder`. Tests mock the `GoogleTokenVerifier` interface.
- **Authorization:** every trip-scoped check goes through `TripAccessService.require(tripId, userId, minRole)`, where `VIEWER < EDITOR < OWNER` by enum order. Reuse it for later phases (availability, itinerary, …).
- **Errors:** `BusinessException(ErrorCode)` → `GlobalExceptionHandler` → `ProblemDetail` with extra `code` and optional `fieldErrors`. 401/403 raised by the security filter chain use the same shape. To add an error, add it to `ErrorCode` **and** to `frontend/src/types/api.ts`.
- **Time:** times are stored in UTC (`hibernate.jdbc.time_zone=UTC`). "Today" comes from the injected `Clock` (Asia/Ho_Chi_Minh). Trip status (`TripStatus`) is **computed** from `start_date`/`end_date`, never stored.

**Schema rules (MySQL 8, Flyway, `ddl-auto=validate`):**
- Never edit an existing migration. Add `V{n+1}__*.sql` instead.
- `trip_members` has a composite PK (`@EmbeddedId TripMemberId` + `@MapsId`) and implements `Persistable`, so `save()` persists instead of merging.
- "Exactly one OWNER per trip" is enforced by the generated column `owner_trip_id` with a UNIQUE index. That column is intentionally unmapped. Ownership transfer demotes the current owner and flushes **before** promoting the new one.
- MySQL rejects `ON DELETE CASCADE`/`SET NULL` on a foreign key whose column feeds a generated column (error 1215). So `fk_trip_members_trip` has no cascade, and the app deletes members before deleting a trip.
- MySQL DDL is not transactional. If a migration fails halfway, the tables it already created stay behind and Flyway records the migration with `success=0`. Drop those leftovers and that history row (or run `flyway repair`) before retrying.
- Enum columns are `VARCHAR` and need `@JdbcTypeCode(SqlTypes.VARCHAR)`. Otherwise Hibernate expects a MySQL `ENUM` and validation fails.
- `member_availabilities` (V2) has a natural PK `(trip_id, user_id, avail_date)` and a composite FK `(trip_id, user_id)` → `trip_members` with `ON DELETE CASCADE`, so removing a member also removes their availability. A missing row means "not answered yet".
- **Locked** means `trips.start_date IS NOT NULL`; there is no flag column. `TripDayService` is the **only** writer of `start_date`/`end_date` and `trip_days`, which keeps `actual_date = start_date + day_index - 1` true. Unlocking deletes `trip_days` but keeps availability.
- The suggestion algorithm lives in `AvailabilitySuggester`, a pure class with its own unit test. Scoring: AVAILABLE = 2, MAYBE = 1, BUSY or unanswered = 0. It returns the top 3 non-overlapping windows, considering only days from today onward.
- `TINYINT`/`SMALLINT` columns are mapped as `Integer` with `columnDefinition`, so `ddl-auto=validate` accepts them.
- Planned for Phase 3: `itinerary_items` references only `trip_day_id` (no `trip_id`). Unlocking must be blocked or warned once days have itinerary items.

**Frontend** (`src/`):
- `types/`: mirrors the Java DTOs 1:1.
- `api/`: axios calls only. The `lib/api.ts` interceptor attaches the JWT. On a 401 it clears the token and fires an event that `AuthProvider` listens for.
- `hooks/`: TanStack Query hooks; UI components never call `api/` directly.
- `pages/`, `components/`. `components/ui/` is generated by Shadcn; avoid hand-editing it.
- Routing:
  - `ProtectedRoute` sends logged-out users to `/login?returnTo=…`, and `PublicOnlyRoute` sends logged-in users on to `returnTo`. This keeps invite links working across login.
  - `/join/:code` is public.
- Trip covers are either an http(s) URL or `preset:<key>`, which `lib/covers.ts` renders as a gradient. The backend validates both forms.
- Query keys live in `tripKeys` (`hooks/useTrips.ts`). The availability and days keys sit **under** `detail(tripId)`, so invalidating a trip's detail refreshes them too. The availability PUT returns the full matrix, which is written straight into the cache.
- `useAvailabilityEditor` applies changes optimistically, debounces them by 600 ms, and sends them one request at a time. `AvailabilityGrid` lets you paint across cells by releasing pointer capture on `pointerdown` (needed on touch screens) and setting `touch-none` on your own row.
