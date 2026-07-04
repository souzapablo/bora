# BORA-21 Backend Auth Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/bora-21-auth-backend/design.md`
**Status**: Draft

**Environment caveat (confirmed with user):** this sandbox has no Docker/`psql`. Integration tests (Prisma repos) and e2e tests (full HTTP flow) use **Testcontainers** (`testcontainers` + `@testcontainers/postgresql`) to spin up an ephemeral Postgres per test run — the user's explicit choice over a manual docker-compose harness or mocking Prisma. Any task whose Gate is `full` or `build` **requires a Docker daemon reachable from wherever the gate runs**. Tasks T2, T9, T20, T21, T28, T29 are marked "⚠️ Docker required" — write the code and tests in this session, but the gate itself must be run (and confirmed passing) in an environment with Docker before the task is considered verified.

---

## Test Coverage Matrix

> Generated from codebase (5 existing files sampled: `env.ts`/`env.test.ts`, `app.controller.ts`/`app.controller.spec.ts`, `app.module.ts`) and spec.md/design.md. No `AGENTS.md`/`CONTRIBUTING.md`/coverage-threshold config found in `apps/backend` or repo root — strong defaults applied, calibrated to the two naming conventions already in use: `*.test.ts` for pure-function unit tests (`env.test.ts`), `*.spec.ts` for Nest-bootstrapped integration/e2e tests via `supertest` (`app.controller.spec.ts`).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain (VOs, entities, ports, error catalog) | unit | All branches; 1:1 to spec ACs (AUTH-19 email normalization, AUTH-20 timezone validation); pure entities/ports with no branching get build-gate only | `apps/backend/src/**/*.test.ts` | `pnpm --filter backend exec vitest run <file>` |
| Application (use-cases, Zod DTOs) | unit | All branches; 1:1 to spec ACs; mocked ports (no real DB/network) | `apps/backend/src/**/*.test.ts` | `pnpm --filter backend exec vitest run <file>` |
| Infrastructure — pure logic (hasher, token generator, rate limiter) | unit | All branches incl. edge/expiry/pruning cases | `apps/backend/src/**/*.test.ts` | `pnpm --filter backend exec vitest run <file>` |
| Infrastructure — Prisma repositories | integration | Key query paths + error handling (P2002 race, revoke/revokeAllActiveForUser scoping) | `apps/backend/src/**/*.spec.ts` | `pnpm --filter backend test` (⚠️ Docker) |
| Shared (Result, AppException, ZodValidationPipe, ProblemDetailsFilter) | unit / integration | Result+AppException+Pipe: all branches (unit). Filter: needs a bootstrapped Nest app to exercise `ArgumentsHost` (integration, no DB) | pipe/result/exception: `*.test.ts`; filter: `*.spec.ts` | `pnpm --filter backend exec vitest run <file>` |
| Controller / e2e (full HTTP flow) | e2e | Every route: happy path + every listed edge case + error path (all 20 spec ACs) | `apps/backend/src/**/*.spec.ts` | `pnpm --filter backend test` (⚠️ Docker) |
| Prisma schema | none | Build/generate/migrate gate only | `apps/backend/prisma/schema.prisma` | `pnpm --filter backend exec prisma generate` / `migrate` |
| Entities with no behavior (`User`, `RefreshToken` domain classes, ports, constants) | none | Build gate only — no branches to test | n/a | `pnpm --filter backend typecheck` |

## Parallelism Assessment

> Generated from codebase — confirm before Execute.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --- | --- | --- | --- |
| unit (`*.test.ts`, mocked ports / pure functions) | Yes | No shared state; each test constructs its own mocks/instances, matches `env.test.ts`'s pure-function style | `apps/backend/src/env.test.ts` — no fixtures, no shared store |
| integration (`*.spec.ts`, Prisma + Testcontainers) | No | New pattern in this repo — every integration test in this feature shares one Postgres container + the same `User`/`RefreshToken` tables (truncated between tests), so concurrent files would race on truncation | No existing sample; default to sequential per instructions when a new pattern's safety can't be proven from prior code |
| e2e (`*.spec.ts`, full Nest app + Testcontainers + supertest) | No | Same shared-container/table concern as integration, **plus** `InMemoryRateLimiter` is a module-scoped in-memory `Map` shared across requests within one bootstrapped app instance — concurrent test files hitting the same app would cross-pollute rate-limit counters | `app.controller.spec.ts` boots one `INestApplication` per file in `beforeAll`; design.md's `InMemoryRateLimiter` component (single `Map`, no per-test partition) |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only (no DB) | `pnpm --filter backend exec vitest run <new-test-file(s)>` |
| Full | After tasks with integration/e2e tests (⚠️ requires Docker) | `pnpm --filter backend test` |
| Build | After phase completion or config/entity-only tasks | `pnpm --filter backend typecheck && pnpm --filter backend lint && pnpm --filter backend test` (⚠️ `test` leg requires Docker once any `*.spec.ts` exists) |

---

## Execution Plan

### Phase 1: Shared Foundation & Test Infra (mostly sequential)

```
T1 → T2 ─┬─────────────────────────┐
         │                         │
T3 ──┬──→ T4 ──┬──→ T7             │
     ├──→ T5   │                   │
     └──→ T6   │                   │
                                   │
T2 → T8 → T9 ←─────────────────────┘
```

### Phase 2: Identity Domain (parallel OK after T3/T5 from Phase 1)

```
     ┌→ T10 ─┐
     ├→ T11 ─┼→ T12 → T13
     ├→ T14
     └→ T15
```

### Phase 3: Identity Infrastructure (parallel OK, then repos sequential)

```
     ┌→ T16 ─┐
T13 ─┼→ T17 ─┼         T9 ──┐
     ├→ T18 ─┤               ├→ T20 → T21
     └→ T19 ─┘         T14 ──┘
```

### Phase 4: Identity Application / Use Cases (parallel OK)

```
          ┌→ T24 ─┐
T22 ──┬──→ T25 ─┤
T23 ──┴──→ T26 ─┤
          └→ T27 ─┘
```

### Phase 5: Wiring & E2E (sequential)

```
T28 → T29
```

---

## Task Breakdown

### T1: Install auth dependencies + extend env config

**What**: Add `prisma`, `@prisma/client`, `zod`, `argon2`, `@nestjs/jwt`, `cookie-parser`, `@types/cookie-parser` (dev), `testcontainers`, `@testcontainers/postgresql` (dev) to `apps/backend/package.json`; extend `BackendEnv`/`REQUIRED_KEYS` in `env.ts` with `DATABASE_URL` and `JWT_ACCESS_SECRET`; add both to `.env.example`.
**Where**: `apps/backend/package.json`, `apps/backend/src/env.ts`, `apps/backend/src/env.test.ts`, `apps/backend/.env.example`
**Depends on**: None
**Reuses**: `apps/backend/src/env.ts` fail-fast pattern (per design.md Code Reuse Analysis)
**Requirement**: (infra prerequisite, no direct AUTH-ID)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `pnpm install` succeeds with new deps resolved
- [ ] `validateEnv` throws naming `DATABASE_URL`/`JWT_ACCESS_SECRET` when missing
- [ ] `env.test.ts` extended with a case per new required key (matches existing `PORT` case style)
- [ ] `.env.example` documents both new vars with placeholder values

**Tests**: unit
**Gate**: quick — `pnpm --filter backend exec vitest run src/env.test.ts`

**Commit**: `chore(backend): add auth deps and extend env validation`

---

### T2: Define Prisma schema (User, RefreshToken)

**What**: Author `apps/backend/prisma/schema.prisma` with the `User` and `RefreshToken` models exactly as specified in design.md's Data Models section; run `prisma generate` to produce typed client (schema-only, no live DB needed for `generate`).
**Where**: `apps/backend/prisma/schema.prisma`
**Depends on**: T1
**Reuses**: n/a (first Prisma schema in repo)
**Requirement**: (infra prerequisite for AUTH-01, AUTH-05, AUTH-12, AUTH-15)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `User` model: `id` (cuid), `email` (unique), `passwordHash`, `timezone`, `createdAt`, `updatedAt`, `refreshTokens` relation
- [ ] `RefreshToken` model: `id`, `userId` (+ relation), `tokenHash` (unique), `expiresAt`, `revokedAt` (nullable), `createdAt`, `@@index([userId])`
- [ ] `pnpm --filter backend exec prisma generate` succeeds

**Tests**: none (schema/build gate only)
**Gate**: build — `pnpm --filter backend typecheck`

**Commit**: `feat(backend): add Prisma schema for User and RefreshToken`

---

### T3: `shared/errors` — AppError + AppException [P]

**What**: `interface AppError { code, detail?, meta? }` and `class AppException extends Error { constructor(readonly appError: AppError) }`.
**Where**: `apps/backend/src/shared/errors/app-error.ts`, `apps/backend/src/shared/errors/app-exception.ts`
**Depends on**: None
**Reuses**: n/a
**Requirement**: (infra prerequisite, house convention per AD-003)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `AppError` interface matches design.md exactly
- [ ] `AppException` stores `appError` and sets `Error.message` to `appError.code`
- [ ] Unit test: constructing `AppException({code:'X'})` exposes `.appError.code === 'X'` and `.message === 'X'`

**Tests**: unit
**Gate**: quick — `pnpm --filter backend exec vitest run src/shared/errors/app-exception.test.ts`

**Commit**: `feat(backend): add AppError/AppException shared types`

---

### T4: `shared/errors/error-catalog.ts`

**What**: `interface ErrorCatalogEntry { status, title }`; `ERROR_CATALOG` merging `VALIDATION_ERROR_CATALOG` (`VALIDATION_FAILED: 400`) and `INTERNAL_ERROR_CATALOG` (`INTERNAL_ERROR: 500`) as the two non-module catalogs that exist at this point.
**Where**: `apps/backend/src/shared/errors/error-catalog.ts`
**Depends on**: T3
**Reuses**: n/a
**Requirement**: (infra prerequisite)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `ERROR_CATALOG.VALIDATION_FAILED` → `{status: 400, title: ...}`
- [ ] `ERROR_CATALOG.INTERNAL_ERROR` → `{status: 500, title: ...}`
- [ ] Merge is a plain object spread so a later module catalog (T14) can extend it without changing this file's exported shape
- [ ] Unit test asserts both entries' `status`

**Tests**: unit
**Gate**: quick — `pnpm --filter backend exec vitest run src/shared/errors/error-catalog.test.ts`

**Commit**: `feat(backend): add base error catalog (validation, internal)`

---

### T5: `shared/result.ts` [P]

**What**: `Result<T,E>` type, `ok()`, `err()`, `unwrap()` (throws `new AppException(result.error)` on the error branch).
**Where**: `apps/backend/src/shared/result.ts`
**Depends on**: T3
**Reuses**: n/a
**Requirement**: (infra prerequisite, AD-003 point 3)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `ok(v)` → `{ok:true, value:v}`; `err(e)` → `{ok:false, error:e}`
- [ ] `unwrap(ok(v))` returns `v`
- [ ] `unwrap(err(e))` throws `AppException` whose `.appError === e`

**Tests**: unit
**Gate**: quick — `pnpm --filter backend exec vitest run src/shared/result.test.ts`

**Commit**: `feat(backend): add Result/ok/err/unwrap shared primitive`

---

### T6: `shared/validation/zod-validation.pipe.ts` [P]

**What**: `ZodValidationPipe implements PipeTransform` — parses `@Body()` against a Zod schema; on failure throws `AppException({code:'VALIDATION_FAILED', detail:'Request validation failed', meta:{errors}})`.
**Where**: `apps/backend/src/shared/validation/zod-validation.pipe.ts`
**Depends on**: T3
**Reuses**: n/a
**Requirement**: AUTH-20 (strict schema behavior, generically)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Valid input against a test `.strict()` Zod schema passes through parsed/typed
- [ ] Invalid input (missing field, wrong type) throws `AppException` with `code: 'VALIDATION_FAILED'` and `meta.errors` populated
- [ ] Extra/unknown field on a `.strict()` schema throws the same way (AUTH-20 mechanism)

**Tests**: unit
**Gate**: quick — `pnpm --filter backend exec vitest run src/shared/validation/zod-validation.pipe.test.ts`

**Commit**: `feat(backend): add ZodValidationPipe`

---

### T7: `shared/filters/problem-details.filter.ts`

**What**: Global `@Catch() ProblemDetailsFilter` — `AppException` → looks up `appError.code` in `ERROR_CATALOG` for status/title, emits RFC 7807 body; anything else → logged, client gets generic `INTERNAL_ERROR` body, never a stack trace.
**Where**: `apps/backend/src/shared/filters/problem-details.filter.ts`
**Depends on**: T3, T4
**Reuses**: n/a
**Requirement**: (infra prerequisite for every AC's error response shape)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] A minimal test Nest app with one throwing controller route, bootstrapped in the test, registers this filter and returns `application/problem+json` with `type/title/status/detail/instance/code` for a thrown `AppException`
- [ ] A route throwing a plain `Error` (unexpected) returns `500` + `code: 'INTERNAL_ERROR'`, no stack trace in the body
- [ ] `VALIDATION_FAILED` case includes the `errors[]` array from `meta`

**Tests**: integration (no DB — bootstraps a throwaway Nest app only)
**Gate**: quick — `pnpm --filter backend exec vitest run src/shared/filters/problem-details.filter.spec.ts`

**Commit**: `feat(backend): add global ProblemDetailsFilter`

---

### T8: `shared/prisma/prisma.service.ts` + `prisma.module.ts`

**What**: `PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy`; `@Global() PrismaModule` exporting it.
**Where**: `apps/backend/src/shared/prisma/prisma.service.ts`, `apps/backend/src/shared/prisma/prisma.module.ts`
**Depends on**: T2
**Reuses**: n/a
**Requirement**: (infra prerequisite)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `PrismaService.onModuleInit` calls `$connect()`, `onModuleDestroy` calls `$disconnect()`
- [ ] `PrismaModule` is `@Global()` and exports `PrismaService`
- [ ] No connection attempted at import time (only on Nest lifecycle hooks) — verified by a build-only check, no live DB needed here

**Tests**: none (build gate only — connection behavior gets real coverage once T9's harness exercises it)
**Gate**: build — `pnpm --filter backend typecheck`

**Commit**: `feat(backend): add global PrismaService/PrismaModule`

---

### T9: Testcontainers Postgres test harness ⚠️ Docker required

**What**: A shared test-helper module that starts a `PostgreSqlContainer` (from `@testcontainers/postgresql`) once per test file, points `PrismaService` at it, runs the Prisma migration against it (this is where `prisma/migrations/` is first generated and committed, since no local Postgres exists to do this ahead of time), exposes a `resetDb()` truncate helper (`User`, `RefreshToken`), and tears the container down on `afterAll`.
**Where**: `apps/backend/test/testcontainers-postgres.ts`
**Depends on**: T2, T8
**Reuses**: n/a (first integration-test harness in repo)
**Requirement**: (infra prerequisite for AUTH-05, AUTH-15, and the full e2e suite)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `prisma/migrations/` folder exists in the repo with a migration matching T2's schema, generated against the ephemeral container
- [x] Harness exposes `setupTestDb()` (starts container + migrates + returns a connected `PrismaClient`) and `resetDb(prisma)` (truncates both tables)
- [x] A smoke test (`testcontainers-postgres.spec.ts`) starts the harness, inserts and reads back one row, calls `resetDb`, confirms the table is empty, tears down cleanly
- [x] Documented at the top of the file: requires a reachable Docker daemon; CI/local runs without one will fail this and every task downstream that depends on it

**Tests**: integration
**Gate**: full — `pnpm --filter backend test` (⚠️ Docker — CONFIRMED passing via WSL2 Docker daemon exposed over `DOCKER_HOST=tcp://127.0.0.1:2375`; initial authoring pass had no Docker reachable, which surfaced a real Windows bug — `execFileSync` invoking the `prisma.CMD` shim without `shell:true` failed with EINVAL — fixed by resolving and invoking `prisma/build/index.js` directly via `process.execPath`)

**Commit**: `test(backend): add Testcontainers Postgres harness and initial migration`

---

### T10: `Email` value object [P]

**What**: `class Email` — constructor normalizes (lowercase + trim), `.value: string`, `.equals(other: Email): boolean`.
**Where**: `apps/backend/src/identity/domain/value-objects/email.ts`
**Depends on**: None
**Reuses**: n/a
**Requirement**: AUTH-19 (email normalization)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `new Email(' Foo@X.com ').value === 'foo@x.com'`
- [ ] `new Email('a@b.com').equals(new Email('A@B.com'))` is `true`

**Tests**: unit
**Gate**: quick — `pnpm --filter backend exec vitest run src/identity/domain/value-objects/email.test.ts`

**Commit**: `feat(backend): add Email value object`

---

### T11: `Timezone` value object [P]

**What**: `class Timezone` — constructor validates via `Intl.DateTimeFormat('en-US', {timeZone: tz})` (try/catch, invariant-guard throw per design.md Tech Decisions), `.value: string`; also export a standalone `isValidIanaTimezone(tz: string): boolean` (same check, non-throwing) for reuse by the Zod schema in T23.
**Where**: `apps/backend/src/identity/domain/value-objects/timezone.ts`
**Depends on**: None
**Reuses**: n/a
**Requirement**: AUTH-04, AUTH-20 (timezone validation)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `new Timezone('America/Sao_Paulo').value === 'America/Sao_Paulo'`
- [ ] `new Timezone('Not/AZone')` throws
- [ ] `isValidIanaTimezone('America/Sao_Paulo') === true`, `isValidIanaTimezone('bogus') === false`

**Tests**: unit
**Gate**: quick — `pnpm --filter backend exec vitest run src/identity/domain/value-objects/timezone.test.ts`

**Commit**: `feat(backend): add Timezone value object and IANA validator`

---

### T12: `User` + `RefreshToken` domain entities

**What**: Plain data classes per design.md's Domain-layer mirror — `User { id, email: Email, passwordHash, timezone: Timezone, createdAt }`, `RefreshToken { id, userId, tokenHash, expiresAt, revokedAt, createdAt }`. No behavior beyond the constructor.
**Where**: `apps/backend/src/identity/domain/entities/user.ts`, `apps/backend/src/identity/domain/entities/refresh-token.ts`
**Depends on**: T10, T11
**Reuses**: n/a
**Requirement**: (infra prerequisite)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Both classes match design.md's field lists and types exactly
- [ ] No TypeScript errors; no Prisma/Nest imports (ORM-free per CLAUDE.md)

**Tests**: none (build gate only — no branches)
**Gate**: build — `pnpm --filter backend typecheck`

**Commit**: `feat(backend): add User and RefreshToken domain entities`

---

### T13: Identity domain ports

**What**: `UserRepositoryPort`, `RefreshTokenRepositoryPort`, `PasswordHasherPort`, `AccessTokenIssuerPort`, `RateLimiterPort` interfaces exactly as specified in design.md's `identity/domain/` Interfaces list, including the optional-transaction-client parameter on write methods (per design.md's "Repository write methods... accept an optional Prisma transaction client").
**Where**: `apps/backend/src/identity/domain/ports/*.ts`
**Depends on**: T12
**Reuses**: `shared/result.ts` (T5)
**Requirement**: (infra prerequisite)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] All five interfaces present with exact method signatures from design.md
- [ ] `UserRepositoryPort.create` returns `Promise<Result<User, AuthError>>` (imports `AuthError` type — forward-declared here or imported once T14 lands; if T14 hasn't landed yet, stub the type locally and note the TODO — resolved when T14 completes)

**Tests**: none (build gate only — interfaces have no runtime behavior)
**Gate**: build — `pnpm --filter backend typecheck`

**Commit**: `feat(backend): add identity domain ports`

---

### T14: `AuthError` types + `AUTH_ERROR_CATALOG` [P]

**What**: `AuthErrorCode` union (7 codes per spec/design), `AuthError extends AppError`, `AUTH_ERROR_CATALOG: Record<AuthErrorCode, ErrorCatalogEntry>` matching design.md's Error Handling Strategy table exactly (statuses: `AUTH_DUPLICATE_EMAIL` 409, all others 401). Wire `AUTH_ERROR_CATALOG` into the shared `ERROR_CATALOG` merge from T4.
**Where**: `apps/backend/src/identity/domain/errors/auth-error.ts` (new), `apps/backend/src/shared/errors/error-catalog.ts` (modify — add the merge)
**Depends on**: T4
**Reuses**: `shared/errors/error-catalog.ts` merge point
**Requirement**: (infra prerequisite for every AUTH-* error-path AC)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] All 7 codes present: `AUTH_DUPLICATE_EMAIL`, `AUTH_INVALID_CREDENTIALS`, `AUTH_RATE_LIMITED`, `AUTH_MISSING_REFRESH_TOKEN`, `AUTH_INVALID_REFRESH_TOKEN`, `AUTH_REFRESH_TOKEN_EXPIRED`, `AUTH_REFRESH_TOKEN_REUSED`
- [ ] Unit test asserts each code's `status` in the merged `ERROR_CATALOG` matches design.md's table (409 for duplicate email, 401 for the other six, 429 handled separately — note: `AUTH_RATE_LIMITED` is 429, not 401; verify against design.md table precisely)
- [ ] `error-catalog.test.ts` (from T4) extended to assert the merge includes at least one `AUTH_*` code after this task, proving composition works

**Tests**: unit
**Gate**: quick — `pnpm --filter backend exec vitest run src/identity/domain/errors/auth-error.test.ts src/shared/errors/error-catalog.test.ts`

**Commit**: `feat(backend): add AUTH_ERROR_CATALOG and merge into shared catalog`

---

### T15: `UserRegistered` domain event [P]

**What**: `class UserRegistered { userId: string; email: string; occurredAt: Date }`.
**Where**: `apps/backend/src/identity/domain/events/user-registered.ts`
**Depends on**: None
**Reuses**: n/a
**Requirement**: AUTH-01 (emitted on successful registration)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Class matches design.md's field list; no TypeScript errors

**Tests**: none (build gate only)
**Gate**: build — `pnpm --filter backend typecheck`

**Commit**: `feat(backend): add UserRegistered domain event`

---

### T16: `Argon2PasswordHasher` [P]

**What**: `implements PasswordHasherPort` using `argon2.hash`/`argon2.verify` with OWASP argon2id params (`memoryCost:19456, timeCost:2, parallelism:1`); export a precomputed `DUMMY_HASH` constant (a valid argon2id hash of an arbitrary fixed string, computed once, not regenerated per call) for the timing-safe unknown-email path.
**Where**: `apps/backend/src/identity/infrastructure/hashing/argon2-password-hasher.ts`
**Depends on**: T13
**Reuses**: n/a
**Requirement**: AUTH-01 (password hashing), AUTH-08 (dummy-hash timing safety)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `hash(plain)` returns an argon2id string; `verify(hash(plain), plain)` is `true`; `verify(hash(plain), 'wrong')` is `false`
- [x] `verify(DUMMY_HASH, 'anything')` resolves without throwing (proves it's a well-formed hash suitable for the timing-safe path)

**Tests**: unit
**Gate**: quick — `pnpm --filter backend exec vitest run src/identity/infrastructure/hashing/argon2-password-hasher.test.ts`

**Commit**: `feat(backend): add Argon2PasswordHasher`

---

### T17: Refresh-token generator [P]

**What**: `generateRawToken(): string` (`crypto.randomBytes(32).toString('base64url')`), `hashToken(raw: string): string` (`crypto.createHash('sha256').update(raw).digest('hex')`).
**Where**: `apps/backend/src/identity/infrastructure/tokens/refresh-token-generator.ts`
**Depends on**: None
**Reuses**: n/a
**Requirement**: AUTH-01, AUTH-12 (refresh token issuance/rotation)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `generateRawToken()` returns a base64url string, two calls produce different values
- [x] `hashToken(x)` is deterministic (same input → same output) and different for different inputs
- [x] `hashToken` output is a 64-char hex string (sha256)

**Tests**: unit
**Gate**: quick — `pnpm --filter backend exec vitest run src/identity/infrastructure/tokens/refresh-token-generator.test.ts`

**Commit**: `feat(backend): add refresh token generator/hasher`

---

### T18: `JwtAccessTokenIssuer` [P]

**What**: `implements AccessTokenIssuerPort` — thin wrapper over `@nestjs/jwt`'s `JwtService`, configured with `JWT_ACCESS_SECRET` + `ACCESS_TOKEN_TTL_SECONDS` (from T22's constants, or a locally-passed value until T22 lands).
**Where**: `apps/backend/src/identity/infrastructure/tokens/jwt-access-token-issuer.ts`
**Depends on**: T13, T1
**Reuses**: n/a
**Requirement**: AUTH-01, AUTH-07, AUTH-12 (access token issuance)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `issue({sub:'u1'})` returns a JWT string
- [x] `verify(issue({sub:'u1'}))` returns `{sub:'u1'}`
- [x] `verify('tampered.token.value')` throws/rejects

**Tests**: unit
**Gate**: quick — `pnpm --filter backend exec vitest run src/identity/infrastructure/tokens/jwt-access-token-issuer.test.ts`

**Commit**: `feat(backend): add JwtAccessTokenIssuer`

---

### T19: `InMemoryRateLimiter` [P]

**What**: `implements RateLimiterPort` — `Map<string, number[]>` of attempt timestamps per key; `isBlocked`/`recordAttempt` prune entries older than `windowMs` before counting; `reset(key)` clears a key.
**Where**: `apps/backend/src/identity/infrastructure/rate-limit/in-memory-rate-limiter.ts`
**Depends on**: T13
**Reuses**: n/a
**Requirement**: AUTH-06, AUTH-10, AUTH-11 (rate limiting)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Under threshold: `isBlocked` is `false`
- [x] At/over threshold within window: `isBlocked` is `true` (use vitest fake timers to control `windowMs`)
- [x] `reset(key)` clears prior attempts for that key
- [x] Entries older than `windowMs` are pruned and don't count toward the block

**Tests**: unit
**Gate**: quick — `pnpm --filter backend exec vitest run src/identity/infrastructure/rate-limit/in-memory-rate-limiter.test.ts`

**Commit**: `feat(backend): add InMemoryRateLimiter`

---

### T20: `PrismaUserRepository` + mapper ⚠️ Docker required

**What**: `implements UserRepositoryPort` — `findByEmail`, `create()` (catches Prisma `P2002` on `email`, returns `err({code:'AUTH_DUPLICATE_EMAIL'})` instead of rethrowing, accepts optional tx client). `user.mapper.ts` translates Prisma row ⇄ domain `User` both directions.
**Where**: `apps/backend/src/identity/infrastructure/persistence/prisma-user.repository.ts`, `apps/backend/src/identity/infrastructure/persistence/user.mapper.ts`
**Depends on**: T9, T14, T13
**Reuses**: `shared/prisma/PrismaService` (T8), Testcontainers harness (T9)
**Requirement**: AUTH-01, AUTH-02, AUTH-05 (registration + duplicate/race handling)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `create()` persists a `User` row and returns `ok(User)` with hashed password stored verbatim (repo doesn't hash — that's the use-case's job)
- [x] `create()` on a pre-existing email returns `err({code:'AUTH_DUPLICATE_EMAIL'})`, never throws, no row created
- [x] AUTH-05: two concurrent `create()` calls for the same normalized email against the real Testcontainers Postgres — exactly one resolves `ok`, the other resolves `err(AUTH_DUPLICATE_EMAIL)`, never a thrown exception, and a subsequent count query shows exactly one row
- [x] `findByEmail` returns `null` for no match, mapped `User` for a match

**Tests**: integration
**Gate**: full — `pnpm --filter backend test` (⚠️ Docker)

**Commit**: `feat(backend): add PrismaUserRepository with race-safe create`

---

### T21: `PrismaRefreshTokenRepository` + mapper ⚠️ Docker required

**What**: `implements RefreshTokenRepositoryPort` — `create`, `findByTokenHash`, `revoke(id)`, `revokeAllActiveForUser(userId)` (revokes only rows where `revokedAt IS NULL`, scoped by `userId`). `refresh-token.mapper.ts` translates Prisma row ⇄ domain `RefreshToken`.
**Where**: `apps/backend/src/identity/infrastructure/persistence/prisma-refresh-token.repository.ts`, `apps/backend/src/identity/infrastructure/persistence/refresh-token.mapper.ts`
**Depends on**: T9, T14, T13, T20
**Reuses**: `shared/prisma/PrismaService` (T8), Testcontainers harness (T9), a helper to insert a test `User` (from T20's test setup)
**Requirement**: AUTH-12, AUTH-15 (rotation + family revocation)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `create`/`findByTokenHash` round-trip correctly
- [x] `revoke(id)` sets `revokedAt` on exactly that row
- [x] AUTH-15 repo-level: `revokeAllActiveForUser(userId)` revokes every row for that `userId` where `revokedAt IS NULL`, leaves already-revoked rows' original `revokedAt` untouched (or re-revokes idempotently — assert it doesn't error), and leaves other users' active rows untouched

**Tests**: integration
**Gate**: full — `pnpm --filter backend test` (⚠️ Docker)

**Commit**: `feat(backend): add PrismaRefreshTokenRepository with family revocation`

---

### T22: `auth.constants.ts` [P]

**What**: `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_MS`, `LOGIN_MAX_FAILED_ATTEMPTS`, `LOGIN_WINDOW_MS`, `REGISTER_MAX_ATTEMPTS`, `REGISTER_WINDOW_MS`, `REFRESH_COOKIE_NAME`, `REFRESH_COOKIE_PATH` — exact values from design.md.
**Where**: `apps/backend/src/identity/application/auth.constants.ts`
**Depends on**: None
**Reuses**: n/a
**Requirement**: (infra prerequisite — backs the tunable-default assumptions in spec.md)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] All 8 constants present with the exact values from design.md's Components section

**Tests**: none (build gate only)
**Gate**: build — `pnpm --filter backend typecheck`

**Commit**: `feat(backend): add auth constants`

---

### T23: Register/Login Zod DTO schemas

**What**: `registerSchema = z.object({email, password: min(8), timezone: refine(isValidIanaTimezone)}).strict()`; `loginSchema = z.object({email, password: min(1)}).strict()`.
**Where**: `apps/backend/src/identity/application/dto/register.schema.ts`, `apps/backend/src/identity/application/dto/login.schema.ts`
**Depends on**: T11 (reuses `isValidIanaTimezone`)
**Reuses**: `identity/domain/value-objects/timezone.ts` (T11)
**Requirement**: AUTH-03, AUTH-04, AUTH-20

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] AUTH-03: password `< 8` chars fails `registerSchema.safeParse`
- [x] AUTH-04: malformed email fails; invalid IANA timezone string fails
- [x] AUTH-20: an extra unknown field fails both schemas (`.strict()`)
- [x] A fully valid register payload and a fully valid login payload both pass

**Tests**: unit
**Gate**: quick — `pnpm --filter backend exec vitest run src/identity/application/dto/register.schema.test.ts src/identity/application/dto/login.schema.test.ts`

**Commit**: `feat(backend): add register/login Zod schemas`

---

### T24: `RegisterUserUseCase`

**What**: `execute(dto, ip): Promise<Result<AuthSuccess, AuthError>>` — checks register rate limit first, then duplicate-email pre-check, hashes password, creates `User` + initial `RefreshToken` in one transaction, issues access token, emits `UserRegistered` via `EventEmitter2`.
**Where**: `apps/backend/src/identity/application/use-cases/register-user.use-case.ts`
**Depends on**: T14, T16, T17, T18, T19, T20, T21, T22
**Reuses**: all ports (mocked in the test)
**Requirement**: AUTH-01, AUTH-02, AUTH-05, AUTH-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] AUTH-01: success returns `ok(AuthSuccess)`, `EventEmitter2.emit` called with a `UserRegistered` payload
- [x] AUTH-02: mocked repo returns `err(AUTH_DUPLICATE_EMAIL)` → use-case returns that error and the mocked hasher's `hash()` is asserted **not called**
- [x] AUTH-06: mocked rate limiter `isBlocked` returns `true` → returns `err(AUTH_RATE_LIMITED)` before any repo/hasher call
- [x] AUTH-05 (unit-level): repo's `create()` mock returns `err(AUTH_DUPLICATE_EMAIL)` (simulating the P2002 race outcome) → use-case propagates it unchanged, no `500`

**Tests**: unit
**Gate**: quick — `pnpm --filter backend exec vitest run src/identity/application/use-cases/register-user.use-case.test.ts`

**Commit**: `feat(backend): add RegisterUserUseCase`

---

### T25: `LoginUserUseCase`

**What**: `execute(dto, ip): Promise<Result<AuthSuccess, AuthError>>` — checks login rate limit (keyed by normalized email + IP) first, looks up user, verifies password (or dummy hash if not found), on success resets the failure counter and issues tokens, on failure records the attempt and returns the generic invalid-credentials error.
**Where**: `apps/backend/src/identity/application/use-cases/login-user.use-case.ts`
**Depends on**: T14, T16, T18, T19, T20, T22
**Reuses**: all ports (mocked in the test)
**Requirement**: AUTH-07, AUTH-08, AUTH-09, AUTH-10, AUTH-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] AUTH-07: valid credentials → `ok(AuthSuccess)`
- [x] AUTH-08: unknown email → `err(AUTH_INVALID_CREDENTIALS)` **and** mocked `hasher.verify(DUMMY_HASH, ...)` is asserted called
- [x] AUTH-09: wrong password for existing user → identical `err(AUTH_INVALID_CREDENTIALS)`
- [x] AUTH-10: mocked rate limiter `isBlocked` true → `err(AUTH_RATE_LIMITED)`, mocked `hasher.verify` asserted **not called**
- [x] AUTH-11: success path calls `rateLimiter.reset(key)`

**Tests**: unit
**Gate**: quick — `pnpm --filter backend exec vitest run src/identity/application/use-cases/login-user.use-case.test.ts`

**Commit**: `feat(backend): add LoginUserUseCase`

---

### T26: `RefreshSessionUseCase`

**What**: `execute(rawToken: string | undefined): Promise<Result<AuthSuccess, AuthError>>` — missing token → error; hash + lookup; not found → error; found but expired → error; found but already revoked → `revokeAllActiveForUser` then error; otherwise revoke old, create new, issue new access token (rotation).
**Where**: `apps/backend/src/identity/application/use-cases/refresh-session.use-case.ts`
**Depends on**: T14, T18, T21, T22
**Reuses**: `RefreshTokenRepositoryPort`, `AccessTokenIssuerPort` (mocked in the test)
**Requirement**: AUTH-12, AUTH-13, AUTH-14, AUTH-15, AUTH-16

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] AUTH-12: valid unrevoked/unexpired token → old row revoked, new row created, new access token issued
- [x] AUTH-13: `rawToken === undefined` → `err(AUTH_MISSING_REFRESH_TOKEN)`, no repo call
- [x] AUTH-14: mocked `findByTokenHash` returns a row with `expiresAt` in the past → `err(AUTH_REFRESH_TOKEN_EXPIRED)`, no new token issued
- [x] AUTH-15 (unit-level): mocked `findByTokenHash` returns a row with `revokedAt` set → `revokeAllActiveForUser(userId)` asserted called, returns `err(AUTH_REFRESH_TOKEN_REUSED)`
- [x] AUTH-16: mocked `findByTokenHash` returns `null` → `err(AUTH_INVALID_REFRESH_TOKEN)`

**Tests**: unit
**Gate**: quick — `pnpm --filter backend exec vitest run src/identity/application/use-cases/refresh-session.use-case.test.ts`

**Commit**: `feat(backend): add RefreshSessionUseCase`

---

### T27: `LogoutUseCase`

**What**: `execute(rawToken: string | undefined): Promise<void>` — if a matching row exists, revoke it; always resolves successfully (no error branch, per spec AC18).
**Where**: `apps/backend/src/identity/application/use-cases/logout.use-case.ts`
**Depends on**: T21, T22
**Reuses**: `RefreshTokenRepositoryPort` (mocked in the test)
**Requirement**: AUTH-17, AUTH-18

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] AUTH-17: valid token → mocked `revoke()` called with the matching row's id
- [x] AUTH-18: `undefined`/unmatched token → resolves without throwing, `revoke()` not called

**Tests**: unit
**Gate**: quick — `pnpm --filter backend exec vitest run src/identity/application/use-cases/logout.use-case.test.ts`

**Commit**: `feat(backend): add LogoutUseCase`

---

### T28: Wire `IdentityModule`/`AppModule`/`main.ts` + `AuthController` + happy-path e2e ⚠️ Docker required

**What**: `IdentityModule` (imports `PrismaModule`, `JwtModule.registerAsync`, provides all ports→implementations via DI tokens, provides the 4 use-cases and `AuthController`). Update `AppModule` to import `IdentityModule` and register `EventEmitterModule.forRoot()`. Update `main.ts` to add `cookieParser()` middleware and `app.useGlobalFilters(new ProblemDetailsFilter())`. `AuthController` — `POST /auth/register|login|refresh|logout`, each calling its use-case then `unwrap(result)`, setting/clearing the refresh cookie via `@Res({passthrough:true})`.
**Where**: `apps/backend/src/identity/infrastructure/identity.module.ts`, `apps/backend/src/identity/application/auth.controller.ts`, `apps/backend/src/app.module.ts` (modify), `apps/backend/src/main.ts` (modify)
**Depends on**: T6, T7, T8, T9, T23, T24, T25, T26, T27, T20, T21
**Reuses**: `apps/backend/src/app.module.ts`, `main.ts` bootstrap pattern (per design.md Code Reuse Analysis); Testcontainers harness (T9)
**Requirement**: AUTH-01 (e2e), AUTH-07 (e2e), AUTH-12 (e2e), AUTH-17 (e2e)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] App boots with `IdentityModule` wired, no DI resolution errors
- [x] e2e (Testcontainers-backed `INestApplication`, matching `app.controller.spec.ts`'s `beforeAll`/`afterAll` bootstrap style): register → `201`, `Set-Cookie` present with `HttpOnly; Secure; SameSite=None; Path=/auth`, body has `accessToken`
- [x] e2e: login with those credentials → `200` + fresh cookie
- [x] e2e: refresh with that cookie → `200` + new cookie, old cookie's underlying row now revoked (verified via a direct Prisma query in the test)
- [x] e2e: logout → `204`, `Set-Cookie` cleared (`Max-Age=0`)

**Tests**: e2e
**Gate**: full — `pnpm --filter backend test` (⚠️ Docker)

**Commit**: `feat(backend): wire IdentityModule and AuthController, happy-path e2e`

---

### T29: Full error-path/edge-case e2e suite ⚠️ Docker required

**What**: Extend e2e coverage (new spec file alongside T28's, or appended to it) with every remaining spec AC and edge case not yet covered end-to-end.
**Where**: `apps/backend/src/identity/application/auth.error-paths.spec.ts`
**Depends on**: T28
**Reuses**: T28's e2e app bootstrap + Testcontainers harness
**Requirement**: AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-08, AUTH-09, AUTH-10, AUTH-11, AUTH-13, AUTH-14, AUTH-15, AUTH-16, AUTH-18, AUTH-19, AUTH-20

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] AUTH-02: register same email twice → `409`, generic message, second attempt does not create a row
- [x] AUTH-03/04: `400` + Zod `errors[]` for short password / malformed email / invalid timezone
- [x] AUTH-05: two concurrent `POST /auth/register` for the same email (via `Promise.all`) → exactly one `201`, the other `409`, never `500`
- [x] AUTH-06: 11th registration from the same IP within the window → `429` (test uses an isolated app instance and 12 rapid sequential real requests against the real thresholds/window — no waiting required since all requests land within the same rolling window)
- [x] AUTH-08/09: unknown email and wrong password both → `401`, identical body/status
- [x] AUTH-10/11: 6th failed login within window → `429`; a subsequent successful login after a prior failure resets the counter (verified via a following wrong attempt not being immediately blocked)
- [x] AUTH-13/14/16: missing / expired (row's `expiresAt` manipulated directly via test Prisma client, since waiting 30 real days isn't feasible) / unmatched refresh cookie all → `401`
- [x] AUTH-15: replay the original (now-rotated-out) refresh cookie after one successful `/auth/refresh` → `401`, **and** the second-generation cookie issued by that refresh is also now revoked and fails — proving whole-family revocation
- [x] AUTH-18: logout with no cookie → `204` idempotently
- [x] AUTH-19: register with a mixed-case email then log in with the lowercase form → succeeds (proves case-normalization applied consistently; the whitespace-trim half of this edge case cannot be exercised over HTTP since Zod's `z.string().email()` rejects padded input before it reaches normalization — covered instead at the `Email` VO unit-test layer, see auth.error-paths.spec.ts's inline note)
- [x] AUTH-20: request body with an unknown extra field → `400`; a tampered/malformed refresh cookie value → treated identically to "no matching row" (`401`, not `500`, no stack trace leaked)
- [x] Every response asserted against `status` + `code` (never Nest's default `{statusCode,message,error}` shape), per design.md's Tasks-phase note

**Tests**: e2e
**Gate**: full — `pnpm --filter backend test` (⚠️ Docker)

**Commit**: `test(backend): cover auth error paths, rate limits, and token reuse e2e`

---

## Parallel Execution Map

```
Phase 1 (mostly sequential):
  T1 → T2 ┬→ T8 → T9
          └───────────┐
  T3 ┬→ T4 → T7        │  (T7 also needs T3/T4 above)
     ├→ T5             │
     └→ T6             │
  (T9 needs T2 and T8)

Phase 2 (parallel after T3/T5 land):
  T10 [P] ┐
  T11 [P] ┼→ T12 → T13
  T14 [P] ┘
  T15 [P]

Phase 3 (parallel, then repos sequential):
  T16 [P]
  T17 [P]      T9, T14, T13 complete, then:
  T18 [P]  →     T20 → T21
  T19 [P]

Phase 4 (parallel):
  T22 [P] ┐
  T23     ┼→ T24 [P], T25 [P], T26 [P], T27 [P]

Phase 5 (sequential):
  T28 → T29
```

**Parallelism constraint:** A task marked `[P]` must have ALL of these:
- No unfinished dependencies
- Required test type is parallel-safe (per the Parallelism Assessment above) — every `[P]` task here is `unit`-tested (Parallel-Safe: Yes) or untested (build gate only); no `[P]` task carries an `integration`/`e2e` test
- No shared mutable state with other `[P]` tasks in the same phase

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 config change (deps + env) | ✅ Granular |
| T2 | 1 schema file | ✅ Granular |
| T3 | 2 tightly-coupled types, 1 concept (error envelope) | ✅ Granular (cohesive) |
| T4 | 1 file | ✅ Granular |
| T5 | 1 file, 1 concept | ✅ Granular |
| T6 | 1 file, 1 pipe | ✅ Granular |
| T7 | 1 file, 1 filter | ✅ Granular |
| T8 | 2 tightly-coupled files, 1 concept (Prisma lifecycle) | ✅ Granular (cohesive) |
| T9 | 1 test-infra module | ✅ Granular |
| T10 | 1 value object | ✅ Granular |
| T11 | 1 value object + 1 exported helper | ✅ Granular (cohesive) |
| T12 | 2 plain data classes, no behavior | ✅ Granular (cohesive) |
| T13 | 5 interfaces, 1 concept (ports) | ✅ Granular (cohesive) |
| T14 | 1 error-code set + catalog + 1-line merge edit | ✅ Granular (cohesive) |
| T15 | 1 event class | ✅ Granular |
| T16 | 1 adapter | ✅ Granular |
| T17 | 2 tiny pure functions, 1 concept | ✅ Granular (cohesive) |
| T18 | 1 adapter | ✅ Granular |
| T19 | 1 adapter | ✅ Granular |
| T20 | 1 repository + its mapper, 1 concept | ✅ Granular (cohesive) |
| T21 | 1 repository + its mapper, 1 concept | ✅ Granular (cohesive) |
| T22 | 1 constants file | ✅ Granular |
| T23 | 2 small schemas, 1 concept (request DTOs) | ✅ Granular (cohesive) |
| T24 | 1 use-case | ✅ Granular |
| T25 | 1 use-case | ✅ Granular |
| T26 | 1 use-case | ✅ Granular |
| T27 | 1 use-case | ✅ Granular |
| T28 | Module + controller + 2 bootstrap edits — this is the designated wiring/merge-forward task per the Tasks-phase "resolving compilation dependencies" rule (controller can't be tested standalone) | ✅ Granular given its role — not splittable further without producing untestable intermediate tasks |
| T29 | 1 test file (no new source) | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | None | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | None | (root of its own branch) | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T3 | T3 → T5 | ✅ Match |
| T6 | T3 | T3 → T6 | ✅ Match |
| T7 | T3, T4 | T4 → T7 (T3 transitively via T4) | ✅ Match |
| T8 | T2 | T2 → T8 | ✅ Match |
| T9 | T2, T8 | T8 → T9 (and T2 → T8 → T9 transitively) | ✅ Match |
| T10 | None | Phase 2 root [P] | ✅ Match |
| T11 | None | Phase 2 root [P] | ✅ Match |
| T12 | T10, T11 | T10, T11 → T12 | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |
| T14 | T4 | Phase 2 root [P] (cross-phase dep on T4 from Phase 1, shown in Task Breakdown "Depends on") | ✅ Match |
| T15 | None | Phase 2 root [P] | ✅ Match |
| T16 | T13 | Phase 3 root [P] (dep on T13 from Phase 2) | ✅ Match |
| T17 | None | Phase 3 root [P] | ✅ Match |
| T18 | T13, T1 | Phase 3 root [P] (deps from Phases 1–2) | ✅ Match |
| T19 | T13 | Phase 3 root [P] | ✅ Match |
| T20 | T9, T14, T13 | T9/T14/T13 → T20 | ✅ Match |
| T21 | T9, T14, T13, T20 | T20 → T21 | ✅ Match |
| T22 | None | Phase 4 root [P] | ✅ Match |
| T23 | T11 | Phase 4 root (dep on T11 from Phase 2) | ✅ Match |
| T24 | T14,T16,T17,T18,T19,T20,T21,T22 | T22/T23 → T24 [P] | ✅ Match |
| T25 | T14,T16,T18,T19,T20,T22 | T22/T23 → T25 [P] | ✅ Match |
| T26 | T14,T18,T21,T22 | T22/T23 → T26 [P] | ✅ Match |
| T27 | T21,T22 | T22/T23 → T27 [P] | ✅ Match |
| T28 | T6,T7,T8,T9,T23,T24,T25,T26,T27,T20,T21 | Phase 5 root (all Phase 1–4 outputs) | ✅ Match |
| T29 | T28 | T28 → T29 | ✅ Match |

No mismatches. No `[P]`-flagged task depends on another `[P]` task in the same phase.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | env config (existing pattern) | unit (matches existing `env.test.ts`) | unit | ✅ OK |
| T2 | Prisma schema | none | none | ✅ OK |
| T3 | Shared (AppError/AppException) | unit | unit | ✅ OK |
| T4 | Shared (error catalog) | unit | unit | ✅ OK |
| T5 | Shared (Result) | unit | unit | ✅ OK |
| T6 | Shared (Zod pipe) | unit | unit | ✅ OK |
| T7 | Shared (filter) | unit/integration (filter needs bootstrapped app) | integration | ✅ OK |
| T8 | Shared (Prisma service) | none (build gate; real behavior covered by T9+) | none | ✅ OK |
| T9 | Test infra | integration | integration | ✅ OK |
| T10 | Domain VO | unit | unit | ✅ OK |
| T11 | Domain VO | unit | unit | ✅ OK |
| T12 | Domain entities | none (no branches) | none | ✅ OK |
| T13 | Domain ports | none (interfaces) | none | ✅ OK |
| T14 | Domain errors/catalog | unit | unit | ✅ OK |
| T15 | Domain event | none (no branches) | none | ✅ OK |
| T16 | Infra (hasher) | unit | unit | ✅ OK |
| T17 | Infra (token generator) | unit | unit | ✅ OK |
| T18 | Infra (JWT issuer) | unit | unit | ✅ OK |
| T19 | Infra (rate limiter) | unit | unit | ✅ OK |
| T20 | Infra (Prisma repo) | integration | integration | ✅ OK |
| T21 | Infra (Prisma repo) | integration | integration | ✅ OK |
| T22 | Application constants | none | none | ✅ OK |
| T23 | Application DTOs | unit | unit | ✅ OK |
| T24 | Application use-case | unit | unit | ✅ OK |
| T25 | Application use-case | unit | unit | ✅ OK |
| T26 | Application use-case | unit | unit | ✅ OK |
| T27 | Application use-case | unit | unit | ✅ OK |
| T28 | Application controller + module wiring | e2e | e2e | ✅ OK |
| T29 | e2e test file only | e2e | e2e | ✅ OK |

No violations. No task defers its required tests to "a later task" — T28/T29 is the intentional merge-forward for the controller's e2e coverage, per the Tasks-phase resolving-compilation-dependencies rule (the controller cannot be exercised over HTTP before its module is wired).

---

## Tips

- **[P] = Order-free** — no inter-task dependency within the phase.
- **⚠️ Docker required** — T2 (migration generation only), T9, T20, T21, T28, T29. Everything else runs fully in this sandbox.
- **One commit per task** — commit messages listed per task above.
- **Requirement ID = Traceable** — 20/20 AUTH-* IDs mapped across T6, T10, T14, T20, T21, T23, T24–T27, T28, T29 (see table below).

## Requirement Traceability (updated)

| Requirement ID | Story | Tasks | Status |
| --- | --- | --- | --- |
| AUTH-01 | Register — success | T24 (unit), T28 (e2e) | Mapped |
| AUTH-02 | Register — duplicate email | T24 (unit), T29 (e2e) | Mapped |
| AUTH-03 | Register — password validation | T23 (unit), T29 (e2e) | Mapped |
| AUTH-04 | Register — email/timezone validation | T11, T23 (unit), T29 (e2e) | Mapped |
| AUTH-05 | Register — concurrent duplicate race | T20 (integration), T29 (e2e) | Mapped |
| AUTH-06 | Register — IP throttle | T24 (unit), T29 (e2e) | Mapped |
| AUTH-07 | Login — success | T25 (unit), T28 (e2e) | Mapped |
| AUTH-08 | Login — unknown email generic error | T25 (unit), T29 (e2e) | Mapped |
| AUTH-09 | Login — wrong password generic error | T25 (unit), T29 (e2e) | Mapped |
| AUTH-10 | Login — rate-limit lockout | T19, T25 (unit), T29 (e2e) | Mapped |
| AUTH-11 | Login — failure counter reset | T25 (unit), T29 (e2e) | Mapped |
| AUTH-12 | Refresh — success/rotation | T26 (unit), T28 (e2e) | Mapped |
| AUTH-13 | Refresh — missing cookie | T26 (unit), T29 (e2e) | Mapped |
| AUTH-14 | Refresh — expired token | T26 (unit), T29 (e2e) | Mapped |
| AUTH-15 | Refresh — reuse detection/family revocation | T21 (integration), T26 (unit), T29 (e2e) | Mapped |
| AUTH-16 | Refresh — unmatched token | T26 (unit), T29 (e2e) | Mapped |
| AUTH-17 | Logout — success | T27 (unit), T28 (e2e) | Mapped |
| AUTH-18 | Logout — idempotent no-cookie | T27 (unit), T29 (e2e) | Mapped |
| AUTH-19 | Edge case: email normalization | T10 (unit), T29 (e2e) | Mapped |
| AUTH-20 | Edge case: strict Zod schemas / tampered cookie | T6, T23 (unit), T29 (e2e) | Mapped |

**Coverage:** 20/20 mapped, 0 unmapped.
