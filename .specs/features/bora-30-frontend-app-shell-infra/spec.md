# Frontend: App Shell, Router, API Client, TanStack Query Setup (BORA-30) Specification

## Problem Statement

`apps/frontend` has no routing, no HTTP client, and no server-state layer yet — only a placeholder `<App/>` and design-system tokens/components. BORA-22 (Login/Register UI) is blocked on this: a login screen shouldn't have to invent the app's routing/data-fetching conventions from scratch. This ticket builds the reusable infra every future frontend feature will sit on top of.

## Goals

- [ ] A frontend developer can add a new route to the app by editing one central route table — no provider wiring required.
- [ ] A frontend developer can call the backend via a typed API client that surfaces RFC 7807 Problem Details errors distinctly from network failures.
- [ ] BORA-22 (and every later feature needing auth) can plug token-injection and 401-refresh-retry into the API client without BORA-30 knowing anything about the identity feature.
- [ ] BORA-22 can gate a route behind auth using a generic, reusable wrapper — without app/ importing anything from features/identity.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Actual auth logic (token storage, refresh calls, login/logout) | Owned by BORA-22 — this ticket only ships the *seams* (extension points) auth plugs into. |
| Real feature routes (habits, mood, etc.) | Those features don't exist yet; only a placeholder public + placeholder protected route are needed to prove the wrapper works. |
| Sentry / error-tracking wiring | Tech Stack already decided Sentry for v1, but wiring it is a separate concern from routing/data-fetching infra; no ticket currently covers it. |
| Zod response-schema validation inside the API client | `packages/shared` doesn't export any real schemas yet (only a placeholder type) — each feature validates its own responses at the call site once its schemas exist, per the modular "don't pre-abstract" rule in Frontend Architecture & Components. |
| Dark mode toggle UI | Already deferred by existing Confluence decision (Frontend Architecture & Components: token structure only). |
| TanStack Query Devtools | Nice-to-have (P2), not required for BORA-22 to proceed. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Router library | React Router v7 | User-confirmed: lowest-friction pick for a Vite+React PWA that doesn't need file-based routing; huge ecosystem/docs. | y |
| API client shape | Thin native-`fetch` wrapper, no dependency added | User-confirmed: matches "REST + shared Zod schemas" from Tech Stack; avoids adding Axios for a need `fetch` already covers. | y |
| Auth extension points | API client exposes `getAuthHeader` (request) and `onUnauthorized` (response) hooks; BORA-30 ships them unused | User-confirmed: keeps BORA-30 auth-agnostic while giving BORA-22 a documented seam instead of having to wrap/monkey-patch the client later. | y |
| Route guard | Generic `RequireAuth`-style wrapper takes an `isAllowed` predicate/hook as a prop — no import from `features/identity` | User-confirmed: reusable for any future gated route, not identity-specific. | y |
| Router mode | Component-based (`<BrowserRouter>` + `<Routes>`/`<Route>`), not React Router's data-router/loader mode | User-confirmed: nothing in this ticket needs loaders/actions yet (no route-level data fetching — that's what TanStack Query is for). | y |
| TanStack Query client defaults | `retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 0` (TanStack's own defaults for the rest) | User-confirmed: reasonable baseline for a mobile-first PWA where refetch-on-focus is often unwanted (app reopened from background). | y |
| Concurrent 401 handling | The API client calls `onUnauthorized` once per failing request; it does **not** de-duplicate simultaneous 401s into a single refresh call | BORA-30 has no refresh logic to reason about concurrency for; de-duplication (if needed) is BORA-22's problem since it owns the refresh call and token state. | n — logged, flagged for BORA-22 to consider |
| Malformed/non-JSON error bodies | Client rejects with a generic typed `ApiError` (`code: "UNKNOWN"`) rather than throwing an unhandled parse exception | A non-conforming error body (not valid `problem+json`) shouldn't crash the caller; treated as an edge case, not a new requirement. | n — logged |

**Open questions:** none — all resolved above (user-confirmed) or logged as assumptions with rationale.

---

## User Stories

### P1: App shell mounts with global providers ⭐ MVP

**User Story**: As a frontend developer, I want a root app shell that wires up the router and TanStack Query provider so that every future feature gets routing and server-state for free.

**Why P1**: Nothing else in this ticket (or BORA-22) can exist without this wiring landing first.

**Acceptance Criteria**:

1. WHEN the app boots THEN `main.tsx` SHALL render a single root component (`app/AppProviders.tsx` or equivalent) that wraps the router and a `QueryClientProvider`, replacing today's placeholder `<App/>` render.
2. WHEN the `QueryClient` is constructed THEN it SHALL use the documented defaults (`retry: 1`, `refetchOnWindowFocus: false`) defined in one place (`lib/query/queryClient.ts`), not inline at the call site.
3. WHEN a new feature needs a route THEN it SHALL be addable by editing one central route table (`app/routes.tsx`) without touching provider setup in `main.tsx`.

**Independent Test**: Run `pnpm --filter frontend dev`, confirm the app renders without errors and React Query Devtools (if enabled) shows an initialized, empty query cache.

---

### P1: Router with a generic protected-route wrapper ⭐ MVP

**User Story**: As a frontend developer, I want a router with a reusable auth-gate wrapper so that BORA-22 can protect routes without app/ knowing what "authenticated" means.

**Why P1**: BORA-22's placeholder home route must redirect unauthenticated visitors to `/login` — this is the mechanism it will use.

**Acceptance Criteria**:

1. WHEN the app boots THEN React Router v7 SHALL be configured in component mode (`<BrowserRouter>`) with a central route table (`app/routes.tsx`) containing at least one placeholder public route and one placeholder protected route.
2. WHEN a route is marked protected THEN it SHALL be wrapped in a generic `RequireAuth` component accepting an `isAllowed: boolean` (or equivalent hook-based check) and a `redirectTo` path as props — zero imports from any `features/*` code.
3. WHEN `isAllowed` is false THEN `RequireAuth` SHALL redirect to the caller-supplied `redirectTo` path (no hardcoded path inside `app/`).
4. WHEN `isAllowed` is true THEN `RequireAuth` SHALL render its children unmodified.

**Independent Test**: Render the placeholder protected route with `isAllowed={false}` and confirm it redirects to the configured path; render with `isAllowed={true}` and confirm the protected content renders.

---

### P1: Typed API client core ⭐ MVP

**User Story**: As a frontend developer, I want a typed HTTP client that decodes backend errors so that every feature gets consistent, typed error handling instead of hand-rolling `fetch` per feature.

**Why P1**: BORA-22's register/login calls need to distinguish `AUTH_DUPLICATE_EMAIL` from a network failure — this client is what makes that distinction possible.

**Acceptance Criteria**:

1. WHEN any code calls the client's request function THEN it SHALL build the URL from `VITE_API_URL` + a relative path, set `Content-Type: application/json`, and send `credentials: "include"` (required for the httpOnly refresh cookie).
2. WHEN the backend responds with a non-2xx status and a valid `application/problem+json` body THEN the client SHALL reject with a typed `ApiError` object (`{ code, status, detail? }`) built from that body — never a raw `Response` or untyped `Error`. (The RFC 7807 `title` is present on the wire but intentionally not surfaced on `ApiError`: callers branch on the machine-readable `code`, not the human `title` — see `design.md` and AD-005.)
3. WHEN the `fetch` call itself fails before any HTTP response (offline, DNS, CORS) THEN the client SHALL reject with a distinct typed `ApiNetworkError` so callers can tell "no server reached" apart from a real Problem Details error.
4. WHEN a non-2xx response body is not valid `problem+json` (malformed or wrong content-type) THEN the client SHALL reject with a generic typed `ApiError` (`code: "UNKNOWN"`) rather than throwing an unhandled parse exception.
5. WHEN a 2xx response has a JSON body THEN the client SHALL return the parsed JSON as-is (no schema validation inside the client itself — see Out of Scope).

**Independent Test**: Point the client at a running backend; call a route that 404s and confirm a typed `ApiError` with the right `code`; stop the backend and confirm a typed `ApiNetworkError` instead.

---

### P1: API client auth extension points ⭐ MVP

**User Story**: As the developer building BORA-22, I want documented hooks on the API client so that I can add token injection and 401-refresh-retry without modifying BORA-30's code.

**Why P1**: Without this seam, BORA-22 would have to fork or wrap the client, duplicating request/error-decoding logic.

**Acceptance Criteria**:

1. WHEN the API client is constructed THEN it SHALL accept an optional `getAuthHeader: () => string | undefined` hook; if supplied and it returns a value, that value SHALL be merged into the request's `Authorization` header before sending.
2. WHEN a request receives a 401 response and an `onUnauthorized: () => Promise<boolean>` hook was supplied THEN the client SHALL call it and, if it resolves `true`, retry the original request exactly once; if it resolves `false` or no hook was supplied, the client SHALL reject with the typed `ApiError` as normal.
3. WHEN no hooks are supplied (BORA-30's own usage/tests) THEN the client SHALL behave identically to the core client with no auth behavior — hooks are additive, not required.

**Independent Test**: Construct the client with a stub `getAuthHeader` and confirm the header is present on an outgoing request (inspect via a test double / MSW-less fetch mock); construct with a stub `onUnauthorized` returning `true` and confirm exactly one retry occurs on a simulated 401.

---

### P2: TanStack Query Devtools in development

**User Story**: As a frontend developer, I want the Query Devtools panel available in dev builds so that I can inspect query/cache state while building features.

**Why P2**: Convenience for future feature development, not a BORA-22 blocker.

**Acceptance Criteria**:

1. WHEN the app runs in development (`import.meta.env.DEV`) THEN the TanStack Query Devtools panel SHALL be mounted; WHEN built for production THEN it SHALL be excluded from the bundle.

**Independent Test**: `pnpm --filter frontend dev` shows the devtools toggle; `pnpm --filter frontend build` output contains no devtools code (spot-check bundle).

---

## Edge Cases

- WHEN `VITE_API_URL` is missing THEN the existing `validateEnv()` boot check already throws — the API client relies on this and does not re-validate it itself.
- WHEN a caller passes a relative path without a leading `/` THEN the client SHALL normalize it (prefix with `/`) before building the full URL.
- WHEN two requests fail with 401 concurrently THEN each independently invokes `onUnauthorized` (no de-duplication in BORA-30 — see Assumptions).
- WHEN a protected route's `isAllowed` check is still loading (e.g. session rehydration in progress) THEN that loading-state handling belongs to whatever feature supplies `isAllowed` (e.g. BORA-22), not to `RequireAuth` itself — `RequireAuth`'s contract is a synchronous boolean.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Task(s) | Status |
| --------------- | ----------- | ------ | ------- | ------- |
| SHELL-01 | P1: App shell (provider wiring) | Done | T1, T7, T8 | Verified |
| SHELL-02 | P1: App shell (query client defaults) | Done | T4 | Verified |
| SHELL-03 | P1: App shell (central route table) | Done | T6, T7 | Verified* |
| ROUTER-01 | P1: Router (setup + placeholder routes) | Done | T1, T6 | Verified |
| ROUTER-02 | P1: Router (RequireAuth props contract) | Done | T5 | Verified |
| ROUTER-03 | P1: Router (redirect on disallowed) | Done | T5 | Verified |
| ROUTER-04 | P1: Router (render on allowed) | Done | T5 | Verified |
| API-01 | P1: API client (request building) | Done | T3 | Verified |
| API-02 | P1: API client (typed ApiError decoding) | Done | T2, T3 | Verified |
| API-03 | P1: API client (typed ApiNetworkError) | Done | T2, T3 | Verified |
| API-04 | P1: API client (malformed error body) | Done | T2, T3 | Verified |
| API-05 | P1: API client (2xx passthrough) | Done | T3 | Verified |
| API-06 | P1: API client (getAuthHeader hook) | Done | T3 | Verified |
| API-07 | P1: API client (onUnauthorized retry-once) | Done | T3 | Verified |
| API-08 | P1: API client (no-hooks default behavior) | Done | T3 | Verified |
| DEVTOOLS-01 | P2: Query Devtools (dev only) | Done | T1, T7, T8 | Verified* |

**ID format:** `[CATEGORY]-[NUMBER]` (`SHELL`, `ROUTER`, `API`, `DEVTOOLS`)

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 16 total, 16 implemented + Verifier-PASS (6/6 mutants killed) ✅ (see `validation.md`)

**\* Spec-precision boundaries** (non-blocking, per `validation.md`): SHELL-03's "add a route by editing only `routes.tsx`" is a structural property (tests prove the table renders, not the no-rewiring guarantee); DEVTOOLS-01's prod-bundle exclusion is a build-time property verified empirically via a `dist/` bundle spot-check, with the unit test asserting only the DEV-guard mechanism.

---

## Success Criteria

- [ ] BORA-22 can start immediately after this ticket lands, with no routing/data-fetching decisions left for it to make.
- [ ] A new route can be added by one person touching only `app/routes.tsx`.
- [ ] The API client distinguishes network failures from decoded backend errors in every call site that needs it.
- [ ] `RequireAuth` has zero references to `features/identity` (or any other feature) anywhere in `app/`.
