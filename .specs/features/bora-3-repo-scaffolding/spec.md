# Repo + Project Scaffolding Specification

**Jira:** [BORA-3](https://pablosouza.atlassian.net/browse/BORA-3) — Set up repo + project scaffolding
**Epic:** BORA-1 — Phase 0: Foundations

## Problem Statement

Bora is a solo-dev monorepo (Vite+React PWA frontend, NestJS backend, shared types package) rather than two separate repos, so a shared types/DTO package can be used across a Design→Backend→Frontend flow where one feature spans both apps. Right now `C:\Workspace\bora` is an empty directory with no git history, no workspace config, and no apps — no feature work can start until this skeleton exists.

## Goals

- [ ] A working pnpm workspaces monorepo with `apps/frontend`, `apps/backend`, `packages/shared` wired together
- [ ] Both apps runnable locally in dev mode, with the frontend installable as a PWA
- [ ] CI (GitHub Actions) enforcing lint, typecheck, and tests on every push/PR to `main`

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| --- | --- |
| Deploys (Vercel for frontend, Railway for backend+DB) | Native platform deploys on push to `main`, no GitHub Actions deploy scripting — separate concern from this ticket |
| Database / Prisma setup | Separate follow-up ticket |
| ABAC / auth | Separate follow-up ticket |
| Domain modules / business logic | Separate follow-up ticket(s) — backend boots with no domain logic yet |
| Turborepo / Nx / any monorepo build-orchestration tool | Explicitly deferred past v1 per ticket |
| Final contents of `packages/shared` (concrete DTOs/Zod schemas) | Pending API contract decision; this ticket only creates the placeholder package and wiring |
| Git branch protection rules, required-checks configuration on GitHub | Not requested by the ticket; CI runs on push/PR but enforcing it as a merge gate is a repo-settings decision, not scaffolding |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here — nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Test framework | Vitest for both `apps/frontend` and `apps/backend` (NestJS backend uses Vitest instead of the Nest CLI's default Jest scaffold) | User chose one tool for both apps over Jest+Vitest split | y |
| Node.js version | Node 22 LTS, pinned via `.nvmrc` + `engines.node` in each `package.json` | User chose latest LTS for a fresh 2026 project | y |
| Package manager pin | pnpm, pinned via the `packageManager` field in root `package.json` and enabled through Corepack | User chose corepack-managed pnpm over an unpinned global install | y |
| pnpm version | Latest stable pnpm 9.x at time of setup (exact patch resolved during execution via `corepack use pnpm@latest-9`) | Not asked explicitly; kept flexible to avoid pinning to a version that may already be superseded by execution time | n — flag if a specific patch is required |
| GitHub remote | `https://github.com/souzapablo/bora` — repo already exists; local repo is `git init`'d and wired to this remote (no `gh repo create`) | User confirmed the remote already exists | y |
| ESLint config layout | Single root-level flat config (`eslint.config.js`) composing shared rules plus React-specific rules (frontend) and Node/NestJS-specific rules (backend) | User chose shared config over per-app duplication | y |
| CI trigger scope | GitHub Actions workflow runs on `push` and `pull_request` targeting `main` only (trunk-based, per ticket) | Directly stated in the ticket | y |
| PWA "installable" verification | Verified manually via Chrome DevTools → Application → Manifest (installability checklist) during local dev, not via an automated Lighthouse CI gate | Ticket only requires "installable as a PWA" as a dev-server-time property, not a CI gate; no CI tool for this was requested | n — flag if an automated PWA installability check in CI is wanted later |
| `packages/shared` initial contents | Empty placeholder package (valid `package.json` + `tsconfig.json` + a single exported no-op/type, e.g. `export type Placeholder = unknown;`) that both apps import once, to prove workspace linking | Ticket explicitly defers real contents to "API contract decision"; this ticket only needs to prove the wiring works | y |
| `.env.development` gitignoring | Repo-root `.gitignore` excludes `**/.env.development` (and `.env`, `.env.local`) globally; `.env.example` is committed per app | Standard practice, matches ticket's explicit split | y |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Monorepo skeleton runs locally ⭐ MVP

**User Story**: As the (solo) developer, I want a pnpm workspaces monorepo with frontend, backend, and shared packages scaffolded and linked, so that I can start writing feature code against a working local dev environment.

**Why P1**: Nothing else in the project can start until the three workspaces exist, are linked, and run locally. This is the vertical slice: install → run → see both apps working.

**Acceptance Criteria**:

1. WHEN `pnpm install` is run at the repo root THEN the system SHALL install dependencies for all three workspaces (`apps/frontend`, `apps/backend`, `packages/shared`) in one pass with no per-package install step required.
2. WHEN the frontend dev script is run (`pnpm --filter frontend dev`) THEN the system SHALL serve the Vite+React app locally AND the browser SHALL report the app as installable as a PWA (manifest + registered service worker present, verifiable via Chrome DevTools → Application → Manifest).
3. WHEN the backend dev script is run (`pnpm --filter backend start:dev`) THEN the NestJS server SHALL boot successfully with no domain modules registered beyond the default Nest bootstrap (e.g. a health/root endpoint responding), and SHALL NOT error on startup.
4. WHEN either app imports from `@bora/shared` (or the chosen workspace package name) THEN the import SHALL resolve via pnpm workspace linking (no publish/registry round-trip) and typecheck successfully.
5. WHEN the repo is cloned fresh and `.env.example` is copied to `.env.development` per app (with placeholder values) THEN both dev servers SHALL still boot (no required env var may be undocumented in `.env.example`).
6. WHEN a developer inspects git history THEN the local repo SHALL be initialized, committed, and wired to remote `https://github.com/souzapablo/bora` (confirmed via `git remote -v`).

**Independent Test**: Clone the repo fresh, run `pnpm install`, copy each app's `.env.example` to `.env.development`, run both dev scripts in separate terminals, confirm the frontend loads and shows as PWA-installable in DevTools, and the backend responds on its root/health route.

---

### P2: CI enforces lint/typecheck/test on every change

**User Story**: As the (solo) developer, I want GitHub Actions to run lint, typecheck, and tests on every push and PR to `main`, so that regressions are caught automatically instead of relying on manual discipline.

**Why P2**: Valuable safety net, but the repo is usable for local feature work (P1) even before CI exists — CI formalizes what P1 already proves works locally.

**Acceptance Criteria**:

1. WHEN a commit is pushed to `main`, or a PR is opened/updated targeting `main` THEN GitHub Actions SHALL run a workflow that executes, at minimum: ESLint across the workspace, `tsc --noEmit` for each app/package, and Vitest for `apps/frontend` and `apps/backend`.
2. WHEN any of lint, typecheck, or test fails THEN the workflow run SHALL report a failed (non-zero exit) status visible on the commit/PR.
3. WHEN all three checks pass THEN the workflow run SHALL report success, and no deploy step SHALL run as part of this workflow (deploys are out of scope — see Out of Scope).
4. WHEN the workflow runs THEN it SHALL use pnpm (via Corepack) with dependency caching keyed on the lockfile, so repeat runs are not paying full cold-install cost every time.

**Independent Test**: Push a commit that introduces a lint error, confirm the Actions run fails on the lint step; fix it and push again, confirm lint/typecheck/test all pass and the run is green.

---

## Edge Cases

- WHEN `pnpm install` is run without Corepack having activated the pinned pnpm version THEN the system SHALL fail with a clear version-mismatch error rather than silently installing with a different pnpm version (enforced via the `packageManager` field).
- WHEN a developer forgets to create `.env.development` from `.env.example` THEN the dev server SHALL fail fast with a clear missing-env-var error rather than booting into a broken/undefined state.
- WHEN `packages/shared` is modified THEN both apps SHALL pick up the change on next dev-server restart without requiring a manual build/publish step (pure TS workspace linking, no compiled intermediate required for dev).
- WHEN the CI workflow runs on a PR from the same repo (not a fork) THEN it SHALL have access to the same caching as `main` pushes (no separate fork-specific secrets/config needed, since there are no secrets required by lint/typecheck/test).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| SCAF-01 | P1: pnpm workspace install (all 3 packages) | Design | Pending |
| SCAF-02 | P1: Frontend PWA dev server | Design | Pending |
| SCAF-03 | P1: Backend NestJS dev server boots | Design | Pending |
| SCAF-04 | P1: `packages/shared` importable from both apps | Design | Pending |
| SCAF-05 | P1: Per-app `.env.example` / `.env.development` | Design | Pending |
| SCAF-06 | P1: Git init + remote wired to GitHub | Design | Pending |
| SCAF-07 | P2: CI runs lint/typecheck/test on push+PR to `main` | Design | Pending |
| SCAF-08 | P2: CI fails loudly on any check failure | Design | Pending |
| SCAF-09 | P2: CI has no deploy step; pnpm cache keyed on lockfile | Design | Pending |

**ID format:** `SCAF-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 9 total, 0 mapped to tasks, 9 unmapped ⚠️ (Tasks phase not yet run)

---

## Success Criteria

How we know the feature is successful:

- [ ] `pnpm install` at repo root sets up all three workspaces in one command
- [ ] Frontend dev server runs and passes a manual PWA-installability check in Chrome DevTools
- [ ] Backend dev server boots with zero errors and no domain logic
- [ ] `packages/shared` is imported by both apps and typechecks
- [ ] CI pipeline is green on a clean push and correctly fails on an introduced lint error
- [ ] `.env.example` exists per app, committed; `.env.development` exists per app, gitignored, with no production values anywhere in the repo
