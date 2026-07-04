# Frontend: App Shell, Router, API Client, TanStack Query Setup (BORA-30) Validation

**Date**: 2026-07-04
**Spec**: `.specs/features/bora-30-frontend-app-shell-infra/spec.md`
**Diff range**: `c1aa3a2..3cbe76c` (base main → head)
**Verifier**: independent sub-agent (author ≠ verifier), read-only over the real implementation tree
**Verdict**: ✅ **PASS** (with 3 minor spec-precision gaps flagged, none blocking)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1: add deps | ✅ Done | `react-router-dom@^7`, `@tanstack/react-query@^5` in deps; `@tanstack/react-query-devtools@^5` in devDeps |
| T2: errors.ts | ✅ Done | `ApiError`/`ApiNetworkError`, 4 unit tests |
| T3: client.ts | ✅ Done | `createApiClient`, 16 unit tests |
| T4: queryClient.ts | ✅ Done | 2 unit tests |
| T5: RequireAuth.tsx | ✅ Done | 4 unit tests |
| T6: routes.tsx | ✅ Done | 2 unit tests |
| T7: AppProviders.tsx | ✅ Done | 2 unit tests |
| T8: main.tsx swap + cleanup | ✅ Done | `App.tsx`/`App.test.tsx` removed; full build gate green |

All 8 tasks committed within the range. No blocked/partial tasks.

> Note: The working tree carries one pre-existing, non-behavioral cosmetic edit to `AppProviders.tsx` (a single blank line for import grouping) that predates this verification. It is not a Verifier mutation and does not affect any assertion.

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| **SHELL-01** app boots → `main.tsx` renders single root wrapping router + `QueryClientProvider` | AppProviders wraps both providers; entry renders only it | `src/app/AppProviders.tsx:25-34` wraps `QueryClientProvider`+`BrowserRouter`+`AppRoutes`; `src/main.tsx:12` renders `<AppProviders/>`; smoke: `AppProviders.test.tsx:21-22` — `expect(() => render(<AppProviders/>)).not.toThrow()` + `getByText("Login Screen")` | ✅ PASS (entry swap itself is build-gate-verified, not unit-asserted — per tasks matrix) |
| **SHELL-02** QueryClient uses documented defaults in one place | `retry:1`, `refetchOnWindowFocus:false` from `lib/query/queryClient.ts` | `queryClient.test.ts:7` — `expect(queryClient.getDefaultOptions().queries?.retry).toBe(1)`; `:11` — `...refetchOnWindowFocus).toBe(false)` | ✅ PASS |
| **SHELL-03** new route addable by editing one central route table without touching provider setup | Central `app/routes.tsx` is the single edit point | `routes.tsx:14-28` is the single `<Routes>` table; `AppProviders.tsx:27` renders `<AppRoutes/>`; `routes.test.tsx:18-29` renders routes | ⚠️ Spec-precision gap — the "single-file-edit / no provider wiring touched" property is structural and not directly asserted by any test (only that the table renders) |
| **ROUTER-01** BrowserRouter component mode + central table with ≥1 public + ≥1 protected placeholder | `/login` public renders; `/` protected redirects | `routes.test.tsx:19-22` — public `/login` renders "Login Screen"; `:24-29` — `/` redirects to "Login Screen", "Home Screen" absent; component mode: `AppProviders.tsx:26` `<BrowserRouter>` | ✅ PASS |
| **ROUTER-02** protected route wrapped in generic `RequireAuth(isAllowed, redirectTo)`, zero `features/*` imports | Props contract + no feature import | `RequireAuth.tsx:17` props signature; `RequireAuth.test.tsx:53-58` — source-scan `expect(source).not.toMatch(/from\s+["'][^"']*features\//)` | ✅ PASS |
| **ROUTER-03** `isAllowed=false` → redirect to caller `redirectTo` (no hardcoded path) | Navigate to supplied path | `RequireAuth.test.tsx:32-37` (`/login`) + `:46-51` (`/welcome`, proving caller-owned) | ✅ PASS |
| **ROUTER-04** `isAllowed=true` → render children unmodified | Children shown, no redirect | `RequireAuth.test.tsx:39-44` — `getByText("Protected Content")`, `queryByText("Login Page")` null | ✅ PASS |
| **API-01** request builds URL `VITE_API_URL`+path, `Content-Type: application/json`, `credentials:"include"` | exact URL, header, credentials | `client.test.ts:38` URL `toBe("http://localhost:3000/health")`; `:40` `credentials).toBe("include")`; `:41` `Content-Type` `toBe("application/json")` | ✅ PASS |
| **API-02** non-2xx + valid `problem+json` → typed `ApiError` from body | `{code, title, detail?, status}` | `client.test.ts:65-70` — `rejects.toMatchObject({code:"AUTH_DUPLICATE_EMAIL", status:409, detail:"..."})`; `:70` `toBeInstanceOf(ApiError)` | ⚠️ Spec-precision gap — spec AC lists a `title` field; design & impl `ApiError` deliberately omit `title` (`errors.ts:8-17` has only code/status/detail), so `title` is neither captured nor asserted. code/status/detail fully covered |
| **API-03** fetch fails pre-response → distinct `ApiNetworkError` | typed network error, not ApiError | `client.test.ts:78` `rejects.toBeInstanceOf(ApiNetworkError)`; `:79` `not.toBeInstanceOf(ApiError)` | ✅ PASS |
| **API-04** non-2xx body not valid `problem+json` → `ApiError("UNKNOWN", status)`, no parse throw | UNKNOWN code, status preserved | `client.test.ts:88` wrong content-type `toMatchObject({code:"UNKNOWN", status:502})`; `:97` malformed body `{code:"UNKNOWN", status:500}` | ✅ PASS |
| **API-05** 2xx JSON → return parsed as-is | body returned unchanged | `client.test.ts:107` `resolves.toEqual(payload)`; edge 2xx-invalid-JSON `:114` `{code:"UNKNOWN", status:200}` | ✅ PASS |
| **API-06** `getAuthHeader()` value merged into `Authorization` | header set when value returned; unset when undefined | `client.test.ts:125` `Authorization).toBe("Bearer token-123")`; `:134` undefined → header null | ✅ PASS |
| **API-07** 401 + `onUnauthorized→true` retries exactly once; `→false`/absent → reject `ApiError` | one retry max; else reject | `client.test.ts:145-147` retry once (fetch×2, hook×1); `:155-160` second 401 rejects, hook not re-called; `:168-169` false → no retry (fetch×1); `:176-177` absent → reject | ✅ PASS |
| **API-08** no hooks → identical to core client | 2xx resolves, no Authorization | `client.test.ts:184-185` resolves + Authorization null; `:176` 401 no-hook rejects | ✅ PASS |
| **DEVTOOLS-01** dev → devtools mounted; prod → excluded from bundle | DEV-guarded dynamic import; absent from prod build | `AppProviders.test.tsx:31` source-scan `toMatch(/import\.meta\.env\.DEV/)`; `:32` dynamic `import("@tanstack/react-query-devtools")`; **prod exclusion confirmed empirically** by Verifier — `grep` of `dist/` after `build` finds no `ReactQueryDevtools`/`react-query-devtools` | ✅ PASS (unit test is structural source-scan; behavioral prod-exclusion verified via build spot-check) |

**Status**: 13/16 ✅ PASS · 3 ⚠️ spec-precision gaps (SHELL-03 architectural property, API-02 dropped `title`, and DEVTOOLS-01 relying on build spot-check rather than a behavioral unit assertion — the last is inherent to a bundle-inspection criterion). None blocking.

---

## Edge Cases

- [x] `VITE_API_URL` missing → relies on boot-time `validateEnv()` (`src/env.ts`, covered by `env.test.ts`); client does not re-validate — matches spec. No client-level test needed.
- [x] Relative path without leading `/` normalized → `client.test.ts:44-51` — `request("health")` → URL `.../health`.
- [x] Concurrent 401s each invoke `onUnauthorized` (no de-dup) → `client.test.ts:188-197` — `onUnauthorized).toHaveBeenCalledTimes(2)` for two concurrent requests.
- [x] `isAllowed` loading-state belongs to the supplying feature, not `RequireAuth` (contract is a synchronous boolean) → out of scope by design; `RequireAuth.tsx:17` takes `isAllowed: boolean`. N/A to test here.

---

## Gate Check

- **Gate command**: `pnpm --filter frontend typecheck && pnpm --filter frontend lint && pnpm --filter frontend test && pnpm --filter frontend build`
- **Result**: typecheck ✅ · lint ✅ · **test: 75 passed, 0 failed, 0 skipped (14 files)** · build ✅
- **Test count**: 75 total (feature added 30 new tests across errors/client/queryClient/RequireAuth/routes/AppProviders; removed `App.test.tsx` = documented net change per T8, not a silent deletion).
- **Prod-bundle spot-check (DEVTOOLS-01)**: `dist/assets/` contains a single `index-*.js`; `grep` finds no devtools reference → devtools tree-shaken out of production. ✅
- **Failures**: none.

---

## Discrimination Sensor

Sensor depth: **lightweight** (6 behavior-level mutations, one at a time, injected via Edit in the working tree and reverted immediately after each run).

| # | File:line | Mutation | Test that fired | Killed? |
| - | --------- | -------- | --------------- | ------- |
| 1 | `lib/api/client.ts:57` | Dropped `credentials: "include"` from fetch init | `client.test.ts:40` (API-01) | ✅ Killed |
| 2 | `lib/api/client.ts:21` | `normalizePath` → no-op (`return path`) | `client.test.ts:44-50` relative-path edge (API-01) | ✅ Killed |
| 3 | `lib/api/client.ts:69-73` | Always retry after 401 regardless of `onUnauthorized` result | `client.test.ts:163-169` `onUnauthorized→false` must not retry (API-07) | ✅ Killed |
| 4 | `lib/query/queryClient.ts:12` | `retry: 1` → `retry: 3` | `queryClient.test.ts:7` (SHELL-02) | ✅ Killed |
| 5 | `app/RequireAuth.tsx:18` | Inverted guard `if (!isAllowed)` → `if (isAllowed)` | `RequireAuth.test.tsx:32,39,46` (ROUTER-03/04) — 3 tests failed | ✅ Killed |
| 6 | `app/routes.tsx:20-24` | Removed `RequireAuth` wrapper from `/` protected route | `routes.test.tsx:24-29` redirect (ROUTER-01) | ✅ Killed |

**Result**: 6/6 killed — ✅ PASS. Tests are discriminating for credentials, path normalization, retry-at-most-once, query defaults, the auth-gate condition, and the protected-route wrapping.

**Tree integrity**: all mutations reverted; `git status --short apps/frontend` shows only the pre-existing cosmetic `AppProviders.tsx` blank-line change (not introduced by verification). No source file left mutated.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code (no features beyond spec) | ✅ |
| Surgical changes / only required files touched | ✅ |
| No scope creep (no premature Zod/Sentry/de-dup, per Out of Scope) | ✅ |
| Matches existing patterns (Vitest, explicit imports, `afterEach(cleanup)`, source-scan for arch rules) | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ✅ except API-02 `title` (flagged) |
| Per-layer coverage (API client all branches 1:1 to API-01..08 + edges; guard happy/redirect paths) | ✅ |
| Every test maps to a spec AC / edge case — no unclaimed tests | ✅ |
| Documented guidelines followed | ✅ (`CLAUDE.md` backend-only; no frontend test-depth guideline → strong defaults, per tasks matrix) |
| `app/` + `lib/` have zero `features/*` imports (design key property) | ✅ (asserted for RequireAuth; no feature imports present elsewhere) |

---

## Spec-Precision Gaps (ranked, non-blocking)

1. **API-02 — `title` field dropped.** Spec AC-02 defines `ApiError` as `{ code, title, detail?, status }`, but `design.md` and `errors.ts:8-17` deliberately model it as `{ code, status, detail? }` (no `title`). The RFC 7807 `title` is neither captured from the response body nor asserted. Impl faithfully follows design; this is a spec↔design reconciliation the spec text was not updated to reflect. Low impact (callers branch on `code`), but a genuine deviation from the literal spec outcome.
2. **SHELL-03 — architectural "single edit point" not directly asserted.** Tests prove the central route table renders, but nothing asserts that adding a route requires touching only `routes.tsx` (no provider rewiring). Structurally satisfied by the code layout; not test-guarded.
3. **DEVTOOLS-01 — unit assertion is a source-scan, not behavioral.** The dev-mount/prod-exclude behavior is inherently a build-time property (spec's own Independent Test is a bundle inspection). Verified empirically here via the build spot-check; the unit test only pattern-matches the source.

---

## Requirement Traceability Update

| Requirement | Previous | New |
| ----------- | -------- | --- |
| SHELL-01 | Implementing | ✅ Verified |
| SHELL-02 | Implementing | ✅ Verified |
| SHELL-03 | Implementing | ✅ Verified (⚠️ structural-only coverage) |
| ROUTER-01..04 | Implementing | ✅ Verified |
| API-01, API-03..08 | Implementing | ✅ Verified |
| API-02 | Implementing | ✅ Verified (⚠️ `title` field dropped vs spec) |
| DEVTOOLS-01 | Implementing | ✅ Verified (build spot-check) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 16/16 ACs traced to `file:line` evidence; 13 exact matches, 3 spec-precision gaps flagged.
**Sensor**: 6/6 mutations killed.
**Gate**: 75 passed, 0 failed; typecheck/lint/build all green; devtools absent from prod bundle.

**What works**: Every P1 MVP requirement (app shell wiring, component-mode router, generic auth-gate with zero feature coupling, typed fetch client with Problem-Details decoding, network-error discrimination, malformed-body fallback, auth extension seams with retry-at-most-once) plus the P2 dev-only devtools. Tests are discriminating.

**Issues found**: No blocking issues. Three non-blocking spec-precision gaps (ranked above) — the most notable being the `title` field the spec lists on `ApiError` but the implementation omits (a design decision the spec text didn't capture).

**Next steps**: Optionally reconcile spec.md API-02 with the design (drop `title` from the AC, or add it to `ApiError` and its decoding) so spec and code agree. No fix task is required for the feature to land.
