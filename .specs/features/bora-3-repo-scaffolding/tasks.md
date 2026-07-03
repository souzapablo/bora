# Repo + Project Scaffolding Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/bora-3-repo-scaffolding/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from spec + design — no existing repo/tests to sample (`C:\Workspace\bora` is currently empty). Guidelines found: none — strong defaults applied, adapted for an infra-scaffolding ticket (no business/domain logic exists yet; "coverage" here means proving the tooling wiring itself works — DI resolution, PWA dev registration, workspace linking).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Root workspace config (`pnpm-workspace.yaml`, `tsconfig.base.json`, `tsconfig.json`, `eslint.config.js`, `.nvmrc`, `.gitignore`) | none | Build gate only — install/typecheck/lint succeed across the whole workspace | — | `pnpm install && pnpm -r typecheck && pnpm lint` |
| `packages/shared` (placeholder types package) | none | Build gate only — typechecks standalone and via project references from both apps | — | `pnpm --filter @bora/shared typecheck` |
| `apps/frontend` — App entry / root component | unit | Smoke test: renders without throwing, confirms `@bora/shared` import resolves | `apps/frontend/src/**/*.test.tsx` | `pnpm --filter frontend test` |
| `apps/backend` — root/health controller + module bootstrap | integration | Boots the Nest app in-process via `@nestjs/testing`'s `Test.createTestingModule`, asserts the root/health route responds, and proves DI resolves under Vitest+SWC (the design's flagged risk) | `apps/backend/src/**/*.spec.ts` | `pnpm --filter backend test` |
| Env var validation (fail-fast on missing required var) | unit | One test per app proving the dev bootstrap throws when a documented-in-`.env.example` var is absent | `apps/*/src/**/env*.test.ts` | `pnpm --filter <app> test` |
| CI workflow (`.github/workflows/ci.yml`) | none (verified by execution, not a unit test) | Workflow syntax valid; proven by an actual push producing a green Actions run | — | manual: push, observe Actions run |

**Coverage Expectation defaults applied**: Entity/Config/schema layers (root config, `packages/shared`, CI YAML) → none, build-gate only, matching the "no domain logic yet" nature of this ticket. Anything with actual logic (env validation, the Nest bootstrap that proves DI/SWC works) gets real tests, since those are the concrete risk areas flagged in the design's Risks & Concerns table.

## Parallelism Assessment

> Generated from design — no existing test suite to sample; based on the testing approach the design specifies (in-process module creation, no bound ports, no shared DB).

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --- | --- | --- | --- |
| unit (frontend smoke + env validation) | Yes | Pure function / component render in jsdom, no shared external state | Design specifies no build step, no server process for these tests — Vitest's own worker isolation applies |
| integration (backend Nest bootstrap) | Yes | `Test.createTestingModule` builds an in-process Nest app with no real network port bound and no real database (none exists yet) | Design's Error Handling Strategy / Components section: backend has no persistence layer in this ticket, so there's no shared backing store across test files |

## Gate Check Commands

> Generated from design's root package.json scripts (`lint`, `typecheck`, `test` fan out via `pnpm -r` / `pnpm --filter`).

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After a task that adds/modifies one package's tests only | `pnpm --filter <app> test` |
| Full | After a phase that spans multiple packages, or after wiring tasks | `pnpm -r lint && pnpm -r typecheck && pnpm -r test` |
| Build | After the final phase / before declaring the feature done | `pnpm -r lint && pnpm -r typecheck && pnpm -r test && pnpm --filter frontend build` |

---

## Execution Plan

### Phase 1: Foundation (Sequential, then a parallel pair)

```
T1 → T2 → ┬→ T3 [P] ─┐
          └→ T4 [P] ─┘
```

### Phase 2: Package Scaffolds (Sequential gate, then a parallel pair)

```
(T3, T4 done) → T5 → ┬→ T6 [P] ─┐
                      └→ T7 [P] ─┘
```

### Phase 3: Env Wiring + Full Verification (Sequential)

```
(T6, T7 done) → T8 → T9
```

### Phase 4: CI (Sequential)

```
T9 → T10
```

---

## Task Breakdown

### T1: Git init + remote wiring + root `.gitignore`

**What**: Initialize the local git repo, add `origin` pointing at `https://github.com/souzapablo/bora`, create a root `.gitignore` (excludes `node_modules`, `dist`, `**/.env`, `**/.env.local`, `**/.env.development`), and make the first commit.
**Where**: `C:\Workspace\bora\.git`, `C:\Workspace\bora\.gitignore`
**Depends on**: None
**Reuses**: N/A (empty directory)
**Requirement**: SCAF-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `git remote -v` shows `origin` → `https://github.com/souzapablo/bora` (fetch + push)
- [ ] `.gitignore` exists and excludes `node_modules/`, `dist/`, `**/.env`, `**/.env.local`, `**/.env.development`
- [ ] First commit exists on the local repo (not yet pushed — nothing else to push yet)

**Tests**: none
**Gate**: build (`git status` clean, `git log` shows the commit)

**Commit**: `chore(repo): init git repo, add remote, base .gitignore`

---

### T2: Root pnpm workspace declaration + package.json + Node/pnpm pin

**What**: Create `pnpm-workspace.yaml` (declares `apps/*` and `packages/*`), root `package.json` (private, `packageManager` field pinning the resolved pnpm version, `engines.node` pinning Node 22 LTS, aggregate scripts: `lint`, `typecheck`, `test`), and `.nvmrc` set to the same Node 22 LTS version.
**Where**: `pnpm-workspace.yaml`, `package.json`, `.nvmrc`
**Depends on**: T1
**Reuses**: N/A
**Requirement**: SCAF-01, SCAF-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `pnpm-workspace.yaml` declares `apps/*` and `packages/*`
- [ ] root `package.json` has `packageManager: "pnpm@<resolved-version>"`, `engines.node` matching `.nvmrc`, and scripts `lint`/`typecheck`/`test` defined (fanning out via `pnpm -r`, even though no member packages exist yet)
- [ ] `corepack use pnpm@latest-9` (or equivalent) was run to resolve and pin the exact pnpm patch version
- [ ] `pnpm install` runs with zero workspace members with no error (proves the workspace file itself is valid)

**Tests**: none
**Gate**: build (`pnpm install` succeeds)

**Commit**: `chore(repo): declare pnpm workspace, root package.json, pin Node/pnpm`

---

### T3: Root TypeScript base + orchestrating tsconfig [P]

**What**: Create `tsconfig.base.json` (shared strict `compilerOptions`, to be `extends`-ed by every package) and a root `tsconfig.json` (composite build entry, `"files": []`, with a `references` array forward-declaring paths to `./packages/shared`, `./apps/frontend`, `./apps/backend` — those tsconfig.json files don't exist yet; they're created in T5/T6/T7).
**Where**: `tsconfig.base.json`, `tsconfig.json`
**Depends on**: T2
**Reuses**: N/A
**Requirement**: SCAF-01, SCAF-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `tsconfig.base.json` sets `strict: true`, `experimentalDecorators: true`, `emitDecoratorMetadata: true`, `composite: true`, module/target settings appropriate for both a Vite frontend and a Node/NestJS backend
- [ ] Root `tsconfig.json` is valid JSON referencing the three (not-yet-existing) package paths — verified with `tsc --showConfig -p tsconfig.json` (NOT `--build`, since referenced projects don't exist until T5/T6/T7 — full `tsc --build` is exercised later in T9, per the "merge forward" resolution for compilation dependencies)

**Tests**: none
**Gate**: build (`tsc --showConfig -p tsconfig.json` succeeds)

**Commit**: `chore(repo): add root tsconfig.base.json and orchestrating tsconfig.json`

---

### T4: Root ESLint flat config [P]

**What**: Create `eslint.config.js` (flat config) with a shared base block (TS-recommended rules, import ordering) plus two path-scoped override blocks: `apps/frontend/**` (React rules) and `apps/backend/**` (NestJS-friendly rules, e.g. allowing empty constructors for DI). Both override blocks are pre-declared now, even though the directories don't exist yet, so that later per-app tasks never need to touch this shared file (avoids two tasks racing on the same file).
**Where**: `eslint.config.js`
**Depends on**: T2
**Reuses**: N/A
**Requirement**: SCAF-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `eslint.config.js` exports a flat-config array with a base block + `apps/frontend/**` block (React) + `apps/backend/**` block (NestJS-friendly)
- [ ] `pnpm lint` (aggregate script from T2) runs against the empty repo with zero errors (no files to lint yet, but the config itself loads without throwing)

**Tests**: none
**Gate**: build (`pnpm lint` succeeds, i.e. config loads cleanly)

**Commit**: `chore(repo): add shared root ESLint flat config`

---

### T5: `packages/shared` placeholder package

**What**: Scaffold `packages/shared` — `package.json` (name `@bora/shared`, private, no runtime deps), `tsconfig.json` (extends `tsconfig.base.json`, `composite: true`), `src/index.ts` exporting one placeholder (`export type Placeholder = unknown;`).
**Where**: `packages/shared/`
**Depends on**: T3, T4
**Reuses**: `tsconfig.base.json` (T3), `eslint.config.js` base block (T4)
**Requirement**: SCAF-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `packages/shared/package.json` names the package `@bora/shared`
- [ ] `packages/shared/tsconfig.json` extends the root base and is composite
- [ ] `pnpm --filter @bora/shared typecheck` (or equivalent `tsc --noEmit -p packages/shared`) passes with zero errors

**Tests**: none (matrix: Entity/placeholder layer → none, build gate only)
**Gate**: build

**Commit**: `feat(shared): scaffold @bora/shared placeholder package`

---

### T6: `apps/frontend` scaffold — Vite + React + PWA [P]

**What**: Scaffold `apps/frontend` — Vite + React + TypeScript app, `vite-plugin-pwa` pinned to `^0.11.13` or later with `devOptions: { enabled: true }` in `vite.config.ts`, `tsconfig.json` (extends base, references `packages/shared`), `package.json` with `@bora/shared: workspace:*` and a `dev`/`build`/`test`/`typecheck`/`lint` script set, `vitest.config.ts`, a root `App` component that imports `Placeholder` from `@bora/shared` (proving workspace linking), and one smoke test asserting the app renders without throwing.
**Where**: `apps/frontend/`
**Depends on**: T5
**Reuses**: `tsconfig.base.json` (T3), `eslint.config.js` frontend block (T4), `@bora/shared` (T5)
**Requirement**: SCAF-02, SCAF-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `apps/frontend` boots via `pnpm --filter frontend dev`
- [ ] `App` component imports `Placeholder` from `@bora/shared` and typechecks
- [ ] `vite-plugin-pwa` is configured with `devOptions.enabled: true`; manually verified in Chrome DevTools → Application → Manifest that the app is installable while the dev server is running
- [ ] Smoke test renders `App` without throwing
- [ ] Gate check passes: `pnpm --filter frontend test`
- [ ] Test count: 1 test passes (no silent deletions)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(frontend): scaffold Vite+React PWA app`

---

### T7: `apps/backend` scaffold — NestJS + Vitest/SWC [P]

**What**: Scaffold `apps/backend` — NestJS app (`main.ts`, `app.module.ts`, `app.controller.ts` with a root/health route), `package.json` with `@bora/shared: workspace:*`, `vitest`, `unplugin-swc`, `@swc/core`, `tsconfig.json` (extends base, `experimentalDecorators`/`emitDecoratorMetadata: true`, references `packages/shared`), `vitest.config.ts` configured with `unplugin-swc`'s `swc.vite({ module: { type: 'es6' } })` plugin, and one integration test using `Test.createTestingModule` asserting the root route responds and that DI resolves.
**Where**: `apps/backend/`
**Depends on**: T5
**Reuses**: `tsconfig.base.json` (T3), `eslint.config.js` backend block (T4), `@bora/shared` (T5)
**Requirement**: SCAF-03, SCAF-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `apps/backend` boots via `pnpm --filter backend start:dev` with zero errors, no domain modules beyond the default bootstrap
- [ ] `AppModule` imports `Placeholder` from `@bora/shared` (or uses it in the controller) and typechecks
- [ ] `vitest.config.ts` uses `unplugin-swc` with `decoratorMetadata: true` propagated from `tsconfig.json`
- [ ] Integration test boots the app via `Test.createTestingModule`, asserts the root/health route responds, proving DI resolves under Vitest+SWC
- [ ] Gate check passes: `pnpm --filter backend test`
- [ ] Test count: 1 test passes (no silent deletions)

**Tests**: integration
**Gate**: quick

**Commit**: `feat(backend): scaffold NestJS app with Vitest+SWC test setup`

---

### T8: Per-app env files + fail-fast validation

**What**: Create `.env.example` (committed) and `.env.development` (gitignored, already covered by T1's glob pattern) for both `apps/frontend` and `apps/backend`, plus a small validation check per app that throws a clear error at bootstrap if a var documented in `.env.example` is missing (frontend: a small runtime check reading `import.meta.env`; backend: Nest `ConfigModule` with `validationSchema`, or an equivalent manual check).
**Where**: `apps/frontend/.env.example`, `apps/frontend/.env.development`, `apps/frontend/src/env*.ts`, `apps/backend/.env.example`, `apps/backend/.env.development`, `apps/backend/src/env*.ts`
**Depends on**: T6, T7
**Reuses**: `.gitignore` pattern from T1
**Requirement**: SCAF-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `.env.example` exists per app, committed, documents every var the app's dev bootstrap reads
- [ ] `.env.development` exists per app, contains only local/dev-safe placeholder values, and is confirmed absent from `git status` (i.e. actually ignored)
- [ ] Each app's dev bootstrap throws a clear, named error when a required var is missing (unit test proves this per app)
- [ ] Gate check passes: `pnpm --filter frontend test && pnpm --filter backend test`
- [ ] Test count: 2 new tests pass (1 per app), for a running total of 4 (no silent deletions)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(config): add per-app env files and fail-fast env validation`

---

### T9: Full workspace install + typecheck + lint verification

**What**: Run the full install/typecheck/lint/test pass across the now-complete workspace (all three packages exist), fixing any cross-package wiring issues surfaced only once every `tsconfig.json` reference and `eslint.config.js` path-scoped block has real files to match against. This is the task where the root `tsc --build` (forward-declared in T3) is exercised for the first time.
**Where**: repo root (no new packages; fixes land in whichever package's config needs adjustment)
**Depends on**: T8
**Reuses**: Everything from T1–T8
**Requirement**: SCAF-01, SCAF-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `pnpm install` at repo root installs all three workspaces in one pass
- [ ] `pnpm -r typecheck` (root `tsc --build tsconfig.json`) passes with zero errors across all three packages
- [ ] `pnpm lint` passes across the whole repo (no errors from either the frontend or backend override blocks)
- [ ] `pnpm -r test` passes (all 4 tests from T6/T7/T8 still green)
- [ ] Gate check passes: full gate (`pnpm -r lint && pnpm -r typecheck && pnpm -r test`)
- [ ] Test count: 4 tests pass (no silent deletions)

**Tests**: none (integration verification of existing tests/config, not new test code)
**Gate**: full

**Commit**: `chore(repo): fix cross-package wiring, verify full workspace install/typecheck/lint/test`

---

### T10: GitHub Actions CI workflow

**What**: Create `.github/workflows/ci.yml` — triggers on `push`/`pull_request` to `main`; one job, steps: checkout, `pnpm/action-setup`, `actions/setup-node` (Node 22, `cache: pnpm`), `pnpm install --frozen-lockfile`, `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`. Push the full repo history (T1–T9's commits plus this one) to `origin/main` and confirm the Actions run is green. As part of verification, deliberately introduce a one-line lint error, push, confirm the run fails red on the lint step, then revert and push the fix, confirming the run goes green again (proves SCAF-08's fail-loud behavior; the temporary break is never left committed).
**Where**: `.github/workflows/ci.yml`
**Depends on**: T9
**Reuses**: Root `lint`/`typecheck`/`test` scripts (T2)
**Requirement**: SCAF-07, SCAF-08, SCAF-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `.github/workflows/ci.yml` triggers on `push`/`pull_request` to `main` only
- [ ] Workflow runs lint, typecheck, and test as separate steps with no deploy step
- [ ] pnpm dependency cache is keyed on the lockfile via `actions/setup-node`'s `cache: pnpm`
- [ ] Pushed to `https://github.com/souzapablo/bora` `main`; Actions run observed green
- [ ] A deliberately introduced lint error was pushed and observed to fail the run red on the lint step, then reverted and re-verified green (temporary break never left in the final commit)

**Tests**: none (verified by execution, not unit tests — matches the matrix)
**Gate**: build

**Commit**: `ci: add GitHub Actions workflow for lint/typecheck/test on push/PR to main`

---

## Parallel Execution Map

```
Phase 1:
  T1 ──→ T2 ──→ ┬── T3 [P] ──┐
                 └── T4 [P] ──┘
                        │
Phase 2:               ▼
                 T5 ──→ ┬── T6 [P] ──┐
                         └── T7 [P] ──┘
                                │
Phase 3:                       ▼
                         T8 ──→ T9
                                 │
Phase 4:                        ▼
                                T10
```

**Parallelism constraint reminder**: `[P]` pairs (T3/T4, T6/T7) touch disjoint files with no shared mutable state, and their required test types (none, and unit/integration respectively) are marked Parallel-Safe: Yes in the Parallelism Assessment above.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Git init + remote + `.gitignore` | 1 concern (repo bootstrap) | ✅ Granular |
| T2: pnpm workspace + package.json + Node/pnpm pin | 1 concern (workspace root identity) | ✅ Granular |
| T3: Root tsconfig base + orchestrator | 1 concern (TS project structure) | ✅ Granular |
| T4: Root ESLint flat config | 1 file, 1 concern | ✅ Granular |
| T5: `packages/shared` placeholder | 1 package | ✅ Granular |
| T6: `apps/frontend` scaffold | 1 app (cohesive: scaffold + PWA config + 1 smoke test) | ✅ Granular |
| T7: `apps/backend` scaffold | 1 app (cohesive: scaffold + Vitest/SWC config + 1 integration test) | ✅ Granular |
| T8: Per-app env files + validation | 1 concern across 2 apps (cohesive: same change shape applied twice) | ✅ Granular |
| T9: Full workspace verification | 1 concern (cross-package wiring gate) | ✅ Granular |
| T10: CI workflow | 1 file, 1 concern | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | None | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T2 | T2 → T4 | ✅ Match |
| T5 | T3, T4 | T3 → T5, T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T5 | T5 → T7 | ✅ Match |
| T8 | T6, T7 | T6 → T8, T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |

T3/T4 marked `[P]` and do not depend on each other — ✅ consistent. T6/T7 marked `[P]` and do not depend on each other — ✅ consistent.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: Git init | Root config (git/.gitignore) | none | none | ✅ OK |
| T2: pnpm workspace | Root config | none | none | ✅ OK |
| T3: Root tsconfig | Root config | none | none | ✅ OK |
| T4: Root ESLint config | Root config | none | none | ✅ OK |
| T5: `packages/shared` | Entity/placeholder | none | none | ✅ OK |
| T6: `apps/frontend` scaffold | App entry/root component | unit | unit | ✅ OK |
| T7: `apps/backend` scaffold | Root/health controller + bootstrap | integration | integration | ✅ OK |
| T8: Env files + validation | Env validation logic | unit | unit | ✅ OK |
| T9: Full workspace verification | Root config wiring (no new logic layer) | none (integration verification of existing tests) | none | ✅ OK |
| T10: CI workflow | CI config | none (verified by execution) | none | ✅ OK |

No violations — every task with a real logic layer (T6, T7, T8) carries its required test type; config-only tasks correctly carry none.

---

## Tools Question (per skill process, step 6)

Available in this environment: file tools (Read/Write/Edit/Glob/Grep), Bash (git, pnpm, gh CLI), the Atlassian MCP (Jira — could update BORA-3's status/comments as tasks land), and this `tlc-spec-driven` skill itself for Execute. No Context7 or other library-docs MCP is available in this session; research for framework-specific gotchas (like the Vitest/NestJS/PWA details in the design) was done via web search instead.

**For each task above, my default plan is**: file tools + Bash only, no skill/MCP delegation — these are all direct scaffolding tasks with no ambiguity left to resolve. The one optional exception is T10, where I could use the Atlassian MCP to transition BORA-3 or leave a comment once CI is green.

Confirm: plain file tools + Bash for all tasks, and should I transition/comment on BORA-3 in Jira once done (T10), or leave Jira untouched and let you close it manually?
