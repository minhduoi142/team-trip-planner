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
3. Itinerary (drag & drop, auto-insert by time) + dress code + checklist (deployment moved to phase 5; `backend/Dockerfile` is ready but not yet built)
4. Polls + expense split with VietQR
5. Drive album links + room assignment + share previews (production deploy postponed)

Login is Google **or** username/password. No Drive OAuth scope is requested, so the album (phase 5) only stores Drive links. Trip covers, avatars and dress-code sample images can also be **uploaded from the device into MinIO** (`docs/sdd-media-upload.md`).

## Current state

All 5 phases and the MinIO image upload are implemented (see `docs/sdd-phase-{1..5}.md` and `docs/sdd-media-upload.md`). The backend runs against local MySQL 8.0.44 and MinIO, and all 108 tests pass, including the integration tests and the real-MinIO test. **Not deployed yet:** the user chose to run locally only for now. When deploying, write a separate SDD; uploaded images should go to MinIO on the same host, and `backend/Dockerfile` is ready but has never been built. The frontend builds and lints cleanly but has not been tried in a browser yet. The Docker image has not been built yet because Docker Desktop is turned off.

## Commands

Local infrastructure (repo root):
- `docker compose up -d` starts MinIO (S3 API at :9000, console at :9001) and creates the public-read bucket `trip-planner`. Credentials come from the root `.env` (gitignored; template `.env.example`). MinIO no longer publishes Docker images, so the compose file pins the image already on this machine with `pull_policy: never`; a new machine needs that image loaded first.

Backend (`backend/`, Java 21, Maven wrapper; use `mvnw.cmd` from PowerShell):
- `./mvnw spring-boot:run`: needs `JWT_SECRET` (≥32 bytes) and `DB_URL`/`DB_USERNAME`/`DB_PASSWORD`. These are read from `backend/.env` through `spring.config.import: optional:file:.env[.properties]`, relative to the working directory, so run from `backend/`. Real environment variables take precedence. `.env` is gitignored; the template is `backend/.env.example`. Never put secrets in `application.yml`.
- Seed data: `APP_SEED_ENABLED=true` (already set in the local `backend/.env`) makes `DevDataSeeder` create sample Đà Lạt availability (best 3-day window at offset 5–7), the Phú Quốc itinerary, dress codes and expenses (with one PENDING settlement), the Đà Lạt checklist and poll, sample bank accounts for `linh`/`mai`, and two Phú Quốc rooms (each a separate idempotent step; the album is left empty because it needs real Drive links), plus users `linh`, `mai`, `lan`, `ngoc`, `thao`, `vy` (password `matkhau123`) and 4 trips, one per status, with dates relative to today. The users-and-trips step skips if `linh` already exists; the availability step skips if Đà Lạt already has availability. Seeding is disabled in the test profile. Never enable it in production.
- Share links: `FRONTEND_URL` is where `/share/{code}` redirects; `PUBLIC_BASE_URL` is the public backend URL used for `og:image`. On the FE, `VITE_SHARE_BASE_URL` defaults to the API origin.
- `./mvnw test`: unit tests always run. Integration tests (`IntegrationTest` subclasses) run only when `TEST_DB_URL`/`TEST_DB_USERNAME`/`TEST_DB_PASSWORD` point to a local MySQL schema such as `tripplanner_test`.
- `MinioStorageServiceRealTest` runs against real MinIO only when `MINIO_TEST_ENDPOINT`/`MINIO_TEST_ACCESS_KEY`/`MINIO_TEST_SECRET_KEY` are set.
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
- **Media (MinIO/S3):** `POST /api/v1/media` (multipart `file` + `purpose`) checks the image type by **magic bytes** (`ImageType`), stores it under `{purpose}/{yyyy}/{MM}/{uuid}.{ext}` through the `StorageService` interface (`MinioStorageService`), and records metadata in `media_files`. It returns a public URL, which the FE writes into the existing URL fields; nothing else references `media_files`. URLs are **computed** from `MINIO_PUBLIC_URL` + bucket + key and never stored there. Tests mock `StorageService`. The MinIO SDK 8.x needs `okhttp-jvm` declared explicitly in the pom, because the OkHttp 5 `okhttp` artifact is an empty jar for Maven.
- **Time:** times are stored in UTC (`hibernate.jdbc.time_zone=UTC`). "Today" comes from the injected `Clock` (Asia/Ho_Chi_Minh). Trip status (`TripStatus`) is **computed** from `start_date`/`end_date`, never stored.

**Schema rules (MySQL 8, Flyway, `ddl-auto=validate`):**
- Never edit an existing migration. Add `V{n+1}__*.sql` instead.
- `trip_members` has a composite PK (`@EmbeddedId TripMemberId` + `@MapsId`) and implements `Persistable`, so `save()` persists instead of merging.
- "Exactly one OWNER per trip" is enforced by the generated column `owner_trip_id` with a UNIQUE index. That column is intentionally unmapped. Ownership transfer demotes the current owner and flushes **before** promoting the new one.
- MySQL rejects `ON DELETE CASCADE`/`SET NULL` on a foreign key whose column feeds a generated column (error 1215). So `fk_trip_members_trip` has no cascade, and the app deletes members before deleting a trip.
- MySQL DDL is not transactional. If a migration fails halfway, the tables it already created stay behind and Flyway records the migration with `success=0`. Drop those leftovers and that history row (or run `flyway repair`) before retrying.
- Enum columns are `VARCHAR` and need `@JdbcTypeCode(SqlTypes.VARCHAR)`. Otherwise Hibernate expects a MySQL `ENUM` and validation fails.
- `member_availabilities` (V2) has a natural PK `(trip_id, user_id, avail_date)` and a composite FK `(trip_id, user_id)` → `trip_members` with `ON DELETE CASCADE`, so removing a member also removes their availability. A missing row means "not answered yet".
- **Locked** means `trips.start_date IS NOT NULL`; there is no flag column. Since V3, `trip_days` is a persistent "Day N" with **no stored date**. Its date is derived as `start_date + day_index - 1` (`TripDay.dateIn`). Unlocking keeps the days and everything in them. Locking N days creates missing days 1..N and deletes days with index > N only if they are empty; days that still have content become **overflow** days. `TripDayService` is the only writer of `start_date`/`end_date` and of day creation/deletion during lock (`ItineraryService.deleteOverflowDay` can delete overflow days).
- The suggestion algorithm lives in `AvailabilitySuggester`, a pure class with its own unit test. Scoring: AVAILABLE = 2, MAYBE = 1, BUSY or unanswered = 0. It returns the top 3 non-overlapping windows, considering only days from today onward.
- `TINYINT`/`SMALLINT` columns are mapped as `Integer` with `columnDefinition`, so `ddl-auto=validate` accepts them.
- `itinerary_items` references only `trip_day_id` (no `trip_id`). To check permissions on a child resource, look up its trip id through a JPQL projection (`findTripIdByDayId`, `findTripIdByItemId`, …), then call `TripAccessService`. Ordering uses `ItineraryOrdering` (pure, unit-tested): an item with a time goes before the first item with a later time, otherwise last; an item without a time goes last when added and keeps its slot when edited. `sort_order` has no UNIQUE constraint and is renumbered 0..n-1 after every write. Moving an item to another day uses `POST /itinerary-items/{id}/move`.
- Tables with their own `trip_id` that reference a member (`trip_checklists.assignee_id`, `expenses.paid_by`, `settlements.from_user/to_user`) use a composite FK `(trip_id, user_id)` → `trip_members` with **no cascade**. Child tables **without** `trip_id` (`expense_shares`, `poll_votes`) do not store it, because that would be a transitive dependency; their "must be a member" rule is checked in the service.
- `TripService.delete` deletes, in order: settlements → expenses (shares cascade) → checklist → members → trip. Polls, options, votes and days cascade from the trip. `TripMemberService.removeMembership` returns `MEMBER_HAS_EXPENSES` (409) if the member has paid or owes anything, or has settlements; otherwise it deletes their poll votes and unassigns their checklist items. When you add a table that references members, update both places.
- **Album & rooms (phase 5):** the album stores only `drive_file_id`. View and thumbnail URLs are derived by `DriveLinks`, a pure class that parses file and folder links. Day tags live in a separate table, `album_photo_days`, to stay in BCNF. `room_assignments` is `(room_id, user_id)` with no `trip_id`, so `RoomService` enforces "at most one room per member per trip", capacity limits and membership. Removing a member deletes their room assignment but keeps the photos they added.
- **Share preview:** `share/SharePageController` (public `/share/**`, permitted in `SecurityConfig`) serves Open Graph HTML plus `cover.png`. `CoverImageRenderer` draws preset gradients with Java2D (no text) using the same colours as `lib/covers.ts`, so keep both in sync. Previews only work once the backend is publicly reachable.
- **Money (phase 4):** amounts are VND as `long`. `ExpenseSplitter` gives the remainder of an equal split to the payer. `BalanceCalculator` uses net = paid − share + sent − received and counts only CONFIRMED settlements; suggested transfers come from a greedy match (at most N−1 transfers). Both classes are pure and unit-tested. Invariant: the sum of `expense_shares` equals `expenses.amount`. **Permissions:** only the creator, the payer or the OWNER can edit or delete an expense, and only the OWNER can record an expense paid by someone else. Plain EDITORs cannot, because everyone who joins through an invite link is an EDITOR by default.
- Bank accounts live on `users` (`bank_bin`/`bank_account_no`/`bank_account_name`: all three set or all three null). The bank name is derived from the BIN through `BankDirectory`. The VietQR payload (EMVCo + CRC16) is built **on the client** in `lib/vietqr.ts` and drawn with `qrcode`; account numbers are never sent to a third-party service.
- Dress code colours live in `trip_day_dress_colors` and must use a key from a fixed palette that is kept in sync between `TripDayDressColor.PALETTE` (BE) and `lib/dressColors.ts` (FE).
- Itinerary and checklist write endpoints return the **whole** resource (`ItineraryResponse` / `ChecklistResponse`), and the FE writes it straight into the cache.

**Frontend** (`src/`):
- `types/`: mirrors the Java DTOs 1:1.
- `api/`: axios calls only. The `lib/api.ts` interceptor attaches the JWT. On a 401 it clears the token and fires an event that `AuthProvider` listens for.
- `hooks/`: TanStack Query hooks; UI components never call `api/` directly.
- `pages/`, `components/`. `components/ui/` is generated by Shadcn; avoid hand-editing it.
- Routing:
  - `ProtectedRoute` sends logged-out users to `/login?returnTo=…`, and `PublicOnlyRoute` sends logged-in users on to `returnTo`. This keeps invite links working across login.
  - `/join/:code` is public.
- Trip covers are either an http(s) URL or `preset:<key>`, which `lib/covers.ts` renders as a gradient. The backend validates both forms.
- Image upload: `ImageUploadButton` → `useUploadImage` → `lib/imageCompress.ts` (resizes on the client to at most 1920px and encodes WebP, or JPEG on Safari) → `api/media.ts`. That call must override `Content-Type: multipart/form-data`; otherwise axios turns the FormData into JSON.
- Query keys live in `tripKeys` (`hooks/useTrips.ts`). The availability and days keys sit **under** `detail(tripId)`, so invalidating a trip's detail refreshes them too. The availability PUT returns the full matrix, which is written straight into the cache.
- `useAvailabilityEditor` applies changes optimistically, debounces them by 600 ms, and sends them one request at a time. `AvailabilityGrid` lets you paint across cells by releasing pointer capture on `pointerdown` (needed on touch screens) and setting `touch-none` on your own row.
- Itinerary drag and drop uses `@dnd-kit`: Pointer, Touch (150 ms delay) and Keyboard sensors, a drag handle, and a DragOverlay. Collision detection checks day pills first (`pointerWithin`), then falls back to `closestCenter`. Dropping on another day's pill calls `move`; dropping within the list calls `reorder` with an optimistic update. dnd ids are built in `components/itinerary/dndIds.ts`.
- No realtime: `lib/queryClient.ts` polls every active query every 15 s while the browser tab is visible (`staleTime` 5 s, refetch on focus), so other members' changes show up without F5. Static queries opt out with `refetchInterval: false`. A mutation whose result is written into the cache should `cancelQueries` in `onMutate` so an in-flight poll can't overwrite it. The new-expense form stores *excluded* members, so people who join while it is open are included automatically.
- `setDetail` in `useTripCacheSync` invalidates **every** child query under `detail(tripId)`, so locking or unlocking refreshes availability, days, itinerary and checklist.
