# Frontend: App Shell, Router, API Client, TanStack Query Setup (BORA-30) Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/bora-30-frontend-app-shell-infra/design.md`
**Status**: Done — all 8 tasks committed (T1–T8); Verifier PASS (6/6 mutants killed), see `validation.md`

**Task completion** (commit range `c1aa3a2..3cbe76c`):

| Task | Commit | Tests |
| ---- | ------ | ----- |
| T1: add deps | `47bc34e` | build gate |
| T2: errors.ts | `49c6a47` | 4 unit |
| T3: client.ts | `728aa08` | 16 unit |
| T4: queryClient.ts | `d2943e4` | 2 unit |
| T5: RequireAuth.tsx | `4da3ad9` | 4 unit |
| T6: routes.tsx | `10ee51a` | 2 unit |
| T7: AppProviders.tsx | `7b45389` | 2 unit |
| T8: main.tsx swap + cleanup | `3cbe76c` | build gate (75 total) |

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `CLAUDE.md` (backend structural rules only — no frontend test-depth thresholds), `apps/frontend/vitest.config.ts` (jsdom, `globals: false`, no coverage thresholds). No frontend-specific testing guideline exists → **strong defaults applied** for frontend depth. Style/location inferred from existing samples: `App.test.tsx`, `env.test.ts`, `design-system/components/**/*.test.tsx` (Vitest + `@testing-library/react`, explicit `describe/it/expect/vi` imports, no jest-dom matchers, `afterEach(cleanup)`, source-scan assertions for architectural rules).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| API client + typed errors (`lib/api/**`) | unit | All branches; 1:1 to API-01..08 ACs; every listed edge case (malformed/non-JSON error body → `UNKNOWN`, relative-path normalization, 2xx invalid JSON → `UNKNOWN`, concurrent 401 each invokes `onUnauthorized`) | `src/lib/api/*.test.ts` | `pnpm --filter frontend test` |
| Query client config (`lib/query/queryClient.ts`) | unit | Asserts documented defaults per SHELL-02 (`retry: 1`, `refetchOnWindowFocus: false`) read from the single source | `src/lib/query/*.test.ts` | `pnpm --filter frontend test` |
| Route guard (`app/RequireAuth.tsx`) | unit | ROUTER-02/03/04: redirect to `redirectTo` when `isAllowed=false`, render children when `true`, plus source-scan proving zero `features/*` imports | `src/app/*.test.tsx` | `pnpm --filter frontend test` |
| Route table (`app/routes.tsx`) | unit | ROUTER-01: placeholder public route renders; placeholder protected route is `RequireAuth`-wrapped (redirects when disallowed) | `src/app/*.test.tsx` | `pnpm --filter frontend test` |
| App shell / providers (`app/AppProviders.tsx`) | unit (smoke) | SHELL-01/03: renders without throwing and mounts a route inside both providers. DEVTOOLS-01 (dev-only bundling) verified by build spot-check, not a unit test | `src/app/*.test.tsx` | `pnpm --filter frontend test` |
| Entry point / dependency manifest (`main.tsx`, `package.json`) | none | build gate only (createRoot bootstrapping is not meaningfully unit-testable) | — | `pnpm --filter frontend build` |

## Parallelism Assessment

> Generated from codebase — confirm before Execute.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --------- | -------------- | --------------- | -------- |
| unit (Vitest + jsdom) | Yes | Per-file jsdom environment in its own worker; no shared backing store or DB; `afterEach(cleanup)` per file; `fetch` stubbed per-test via `vi.fn`/`vi.stubGlobal`; DOM mutations restored in-test | Existing `src/**/*.test.tsx` run under `vitest run` (default worker parallelism). `TabBar.test.tsx` uses `afterEach(cleanup)`; `Button.test.tsx` mutates then removes `document.documentElement.style` properties within each test — no cross-file shared state. |

## Gate Check Commands

> Generated from codebase — confirm before Execute. This feature has no e2e/integration layer, so **Quick == Full**.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests | `pnpm --filter frontend test` |
| Full | (no separate e2e/integration in scope) same as Quick | `pnpm --filter frontend test` |
| Build | After phase completion or config/entry-only tasks | `pnpm --filter frontend typecheck && pnpm --filter frontend lint && pnpm --filter frontend test && pnpm --filter frontend build` |

---

## Execution Plan

### Phase 1: Foundation (order-free pair)

Install the libraries the rest of the feature imports, and the dependency-free typed errors. Neither depends on the other.

```
T1 [P]
T2 [P]
```

### Phase 2: Core layers (parallel after Phase 1)

Three independent leaf modules, each depending only on a Phase 1 task.

```
T2 ──→ T3 [P]
T1 ──→ T4 [P]
T1 ──→ T5 [P]
```

### Phase 3: Composition (sequential)

Assemble the route table, wire the providers, swap the entry point.

```
T5 ──→ T6 ──→ T7 ──→ T8
        T4 ──────↑
```

(3 phases → inline execution, no per-phase sub-agents.)

---

## Task Breakdown

### T1: Add router + query dependencies [P]

**What**: Add `react-router-dom@^7`, `@tanstack/react-query@^5` (dependencies) and `@tanstack/react-query-devtools@^5` (devDependency — dev-only, tree-shaken by the DEV-guarded dynamic import in T7) to the frontend package, then install.
**Where**: `apps/frontend/package.json` (+ workspace lockfile)
**Depends on**: None
**Reuses**: existing `apps/frontend/package.json` structure.
**Requirement**: SHELL-01, ROUTER-01, DEVTOOLS-01 (enabler)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `react-router-dom` + `@tanstack/react-query` present under `dependencies`; `@tanstack/react-query-devtools` under `devDependencies`
- [ ] `pnpm install` succeeds and updates the lockfile
- [ ] `pnpm --filter frontend typecheck` still passes (no code using the libs yet)
- [ ] Build gate passes: `pnpm --filter frontend build`

**Tests**: none
**Gate**: build

**Commit**: `chore(frontend): add react-router-dom and tanstack query deps`

---

### T2: Typed API error classes [P]

**What**: Create `ApiError` (`code`, `status`, `detail?`, extends `Error`) and `ApiNetworkError` (extends `Error`) so callers can `instanceof`-discriminate decoded backend errors from transport failures.
**Where**: `apps/frontend/src/lib/api/errors.ts` (+ `errors.test.ts`)
**Depends on**: None
**Reuses**: n/a (greenfield).
**Requirement**: API-02, API-03, API-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `ApiError` sets `code`/`status`/`detail` from its constructor and is `instanceof Error`
- [ ] `ApiNetworkError` is a distinct class, `instanceof Error`, not `instanceof ApiError`
- [ ] Unit tests cover both classes' field assignment + `instanceof` discrimination
- [ ] Quick gate passes: `pnpm --filter frontend test`
- [ ] Test count: ≥3 tests pass (no silent deletions)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): add typed ApiError and ApiNetworkError classes`

---

### T3: API client core + auth extension points [P]

**What**: Create `createApiClient(options?)` returning `{ request<T>(path, init?) }`: builds URL from `VITE_API_URL` + normalized path, sets `Content-Type: application/json` and `credentials: "include"`; decodes `application/problem+json` non-2xx bodies into `ApiError`, malformed/non-JSON bodies (2xx or non-2xx) into `ApiError("UNKNOWN", status)`, transport failures into `ApiNetworkError`; returns parsed JSON on 2xx; merges `getAuthHeader()` into `Authorization`; on 401 with `onUnauthorized()` resolving `true`, retries exactly once. Export `apiClient = createApiClient()`.
**Where**: `apps/frontend/src/lib/api/client.ts` (+ `client.test.ts`)
**Depends on**: T2
**Reuses**: `lib/api/errors.ts` (T2); `import.meta.env.VITE_API_URL` (validated at boot by `src/env.ts`).
**Requirement**: API-01, API-02, API-03, API-04, API-05, API-06, API-07, API-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] API-01: URL built from `VITE_API_URL` + path, `Content-Type: application/json`, `credentials: "include"` all asserted on the outgoing request (via a `vi.fn`/`vi.stubGlobal` fetch double)
- [ ] API-02: valid `problem+json` non-2xx → rejects `ApiError` with body's `code`/`status`/`detail`
- [ ] API-03: `fetch` rejection → rejects `ApiNetworkError`
- [ ] API-04: malformed / wrong-content-type error body → rejects `ApiError("UNKNOWN", status)` (no unhandled parse throw)
- [ ] API-05: 2xx JSON body returned as-is; edge: 2xx invalid JSON → `ApiError("UNKNOWN", status)`
- [ ] API-06: `getAuthHeader()` value merged into `Authorization`
- [ ] API-07: 401 + `onUnauthorized→true` retries exactly once; `→false` or absent → rejects `ApiError`
- [ ] API-08: no hooks supplied → behaves identically to core client
- [ ] Edge: relative path without leading `/` is normalized; concurrent 401s each invoke `onUnauthorized` (no de-dup)
- [ ] Quick gate passes: `pnpm --filter frontend test`
- [ ] Test count: ≥12 tests pass (no silent deletions)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): add typed fetch API client with auth extension points`

---

### T4: Shared QueryClient with documented defaults [P]

**What**: Create the single `queryClient` instance with `defaultOptions.queries = { retry: 1, refetchOnWindowFocus: false }`.
**Where**: `apps/frontend/src/lib/query/queryClient.ts` (+ `queryClient.test.ts`)
**Depends on**: T1
**Reuses**: n/a.
**Requirement**: SHELL-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `queryClient.getDefaultOptions().queries.retry === 1`
- [ ] `queryClient.getDefaultOptions().queries.refetchOnWindowFocus === false`
- [ ] Unit test asserts both defaults from the exported instance (proving they live in one place)
- [ ] Quick gate passes: `pnpm --filter frontend test`
- [ ] Test count: ≥2 tests pass (no silent deletions)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): add shared QueryClient with project defaults`

---

### T5: Generic RequireAuth route guard [P]

**What**: Create `RequireAuth({ isAllowed, redirectTo, children })` — renders `children` when `isAllowed`, else `<Navigate to={redirectTo} replace />`. Zero imports from `features/*`.
**Where**: `apps/frontend/src/app/RequireAuth.tsx` (+ `RequireAuth.test.tsx`)
**Depends on**: T1
**Reuses**: `react-router-dom` (`Navigate`).
**Requirement**: ROUTER-02, ROUTER-03, ROUTER-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] ROUTER-03: rendered in a `MemoryRouter` with `isAllowed={false}` redirects to the supplied `redirectTo` (asserted via a sentinel route at that path)
- [ ] ROUTER-04: `isAllowed={true}` renders `children` unmodified
- [ ] ROUTER-02: source-scan test asserts `RequireAuth.tsx` contains no `features/` import
- [ ] Quick gate passes: `pnpm --filter frontend test`
- [ ] Test count: ≥3 tests pass (no silent deletions)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): add generic RequireAuth route guard`

---

### T6: Central route table with placeholder routes

**What**: Create `AppRoutes()` rendering `<Routes>` with one placeholder public route (`/login`, stub element) and one placeholder protected route (`/`, wrapped in `RequireAuth`) — the single file future features edit to add a route.
**Where**: `apps/frontend/src/app/routes.tsx` (+ `routes.test.tsx`)
**Depends on**: T5
**Reuses**: `app/RequireAuth.tsx` (T5); `react-router-dom` (`Routes`, `Route`).
**Requirement**: ROUTER-01, SHELL-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Placeholder public route (`/login`) renders its stub element (mounted in a `MemoryRouter`)
- [ ] Protected route (`/`) is `RequireAuth`-wrapped: redirects when the guard is disallowed, renders content when allowed
- [ ] Quick gate passes: `pnpm --filter frontend test`
- [ ] Test count: ≥2 tests pass (no silent deletions)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): add central route table with placeholder routes`

---

### T7: AppProviders root wiring + dev-only Query Devtools

**What**: Create `AppProviders()` wrapping `<BrowserRouter>` + `<QueryClientProvider client={queryClient}>` around `<AppRoutes/>`, mounting the TanStack Query Devtools only under `import.meta.env.DEV` via a dynamic `import()` so it is excluded from the production bundle.
**Where**: `apps/frontend/src/app/AppProviders.tsx` (+ `AppProviders.test.tsx`)
**Depends on**: T4, T6
**Reuses**: `lib/query/queryClient.ts` (T4), `app/routes.tsx` (T6); `react-router-dom` (`BrowserRouter`), `@tanstack/react-query` (`QueryClientProvider`).
**Requirement**: SHELL-01, SHELL-03, DEVTOOLS-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] SHELL-01: renders without throwing, mounting route content inside both `BrowserRouter` and `QueryClientProvider`
- [ ] DEVTOOLS-01: devtools import is guarded by `import.meta.env.DEV` + dynamic `import()` (verified structurally in the smoke test / source; full prod-exclusion is confirmed by the T8 build spot-check)
- [ ] Quick gate passes: `pnpm --filter frontend test`
- [ ] Test count: ≥1 test passes (no silent deletions)

**Tests**: unit (smoke)
**Gate**: quick

**Commit**: `feat(frontend): add AppProviders root wiring with dev-only devtools`

---

### T8: Swap entry point to AppProviders + remove placeholder App

**What**: Point `main.tsx` at `<AppProviders/>` instead of `<App/>`; delete the now-dead `App.tsx` and `App.test.tsx`.
**Where**: `apps/frontend/src/main.tsx` (modify), `apps/frontend/src/App.tsx` + `apps/frontend/src/App.test.tsx` (delete)
**Depends on**: T7
**Reuses**: `app/AppProviders.tsx` (T7); keeps the existing `validateEnv()` call and token CSS import in `main.tsx`.
**Requirement**: SHELL-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `main.tsx` renders `<AppProviders/>` (still calling `validateEnv()` and importing `design-system/tokens/index.css`)
- [ ] `App.tsx` and `App.test.tsx` removed; no remaining import of them
- [ ] Build gate passes: `pnpm --filter frontend typecheck && pnpm --filter frontend lint && pnpm --filter frontend test && pnpm --filter frontend build`
- [ ] Prod build spot-check: devtools code absent from the `dist/` bundle (DEVTOOLS-01)
- [ ] Test count: full suite passes; `App.test.tsx` intentionally removed (net -1 file, documented here — not a silent deletion)

**Tests**: none (entry point; verified via full build gate)
**Gate**: build

**Commit**: `feat(frontend): mount AppProviders as app root, drop placeholder App`

---

## Parallel Execution Map

```
Phase 1 (order-free):
  ├── T1 [P]  add deps
  └── T2 [P]  errors.ts        } no inter-dependency

Phase 2 (parallel after Phase 1):
  T2 ──→ T3 [P]  client.ts
  T1 ──→ T4 [P]  queryClient.ts
  T1 ──→ T5 [P]  RequireAuth.tsx

Phase 3 (sequential):
  T5 ──→ T6 ──→ T7 ──→ T8
          T4 ──────↑
```

`[P]` = order-free within its phase (no inter-task dependency). Unit tests are parallel-safe (per Parallelism Assessment), so `[P]` is gated only by code dependencies.

---

## Pre-Approval Validation

### Check 1 — Task Granularity

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Add deps | 1 manifest change | ✅ Granular |
| T2: errors.ts | 2 cohesive classes, 1 file | ✅ Granular |
| T3: client.ts | 1 factory function, 1 file | ✅ Granular (many tests = depth, not multiple deliverables) |
| T4: queryClient.ts | 1 config instance, 1 file | ✅ Granular |
| T5: RequireAuth.tsx | 1 component | ✅ Granular |
| T6: routes.tsx | 1 route-table component | ✅ Granular |
| T7: AppProviders.tsx | 1 root component | ✅ Granular |
| T8: main.tsx swap + cleanup | 1 entry edit + 2 deletions (cohesive) | ✅ Granular |

### Check 2 — Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | (root) | ✅ Match |
| T2 | None | (root) | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T1 | T1 → T4 | ✅ Match |
| T5 | T1 | T1 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T4, T6 | T4 → T7, T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |

No task marked `[P]` depends on another `[P]` task in the same phase (T3/T4/T5 depend only on Phase 1 tasks; T1/T2 depend on nothing). ✅

### Check 3 — Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | dependency manifest | none (build gate) | none | ✅ OK |
| T2 | `lib/api/**` (errors) | unit | unit | ✅ OK |
| T3 | `lib/api/**` (client) | unit | unit | ✅ OK |
| T4 | `lib/query/queryClient.ts` | unit | unit | ✅ OK |
| T5 | `app/RequireAuth.tsx` | unit | unit | ✅ OK |
| T6 | `app/routes.tsx` | unit | unit | ✅ OK |
| T7 | `app/AppProviders.tsx` | unit (smoke) | unit | ✅ OK |
| T8 | `main.tsx` (entry) | none (build gate) | none | ✅ OK |

All three checks pass — no ❌.
