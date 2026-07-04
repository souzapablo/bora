# Bora

A modular-monolith backend (NestJS) + frontend (React/Vite) monorepo, managed with pnpm workspaces.

Full context lives in Confluence: [Roadmap](https://pablosouza.atlassian.net/wiki/spaces/Bora/pages/851969/Roadmap), [Architecture & Modularity](https://pablosouza.atlassian.net/wiki/spaces/Bora/pages/753665), [Domain Model](https://pablosouza.atlassian.net/wiki/spaces/Bora/pages/524523), [Tech Stack](https://pablosouza.atlassian.net/wiki/spaces/Bora/pages/622613). See `CLAUDE.md` for the backend's structural rules (module boundaries, ORM-free domain layer, Result-pattern errors).

## Workspace layout

```
apps/
  backend/   # NestJS API — modular monolith (Identity & Access, Productivity, Gamification, Mental Health)
  frontend/  # React + Vite app
packages/     # shared packages (@bora/shared)
.specs/       # feature specs, design docs, task breakdowns, validation reports (tlc-spec-driven workflow)
```

## Prerequisites

- Node (version pinned in `.nvmrc`)
- pnpm (version pinned in `package.json`'s `packageManager` field — enable via `corepack enable`)
- A reachable Postgres instance for the backend (local install, Docker, or a hosted instance) — see `apps/backend/.env.example`
- Docker, if you want to run the backend's integration/e2e test suite (it uses Testcontainers to spin up an ephemeral Postgres per run)

## Getting started

```bash
pnpm install
```

### Backend

```bash
cp apps/backend/.env.example apps/backend/.env
# edit apps/backend/.env — set DATABASE_URL to a real reachable Postgres, and a real JWT_ACCESS_SECRET

pnpm --filter backend exec prisma migrate deploy   # apply migrations
pnpm --filter backend start:dev                     # http://localhost:3000
```

### Frontend

```bash
pnpm --filter frontend dev
```

## Common scripts (run from repo root, across all workspaces)

| Command | What it does |
| --- | --- |
| `pnpm typecheck` | Type-checks every app/package |
| `pnpm lint` | Lints every app/package |
| `pnpm test` | Runs every app/package's test suite |

Scope any of the above to one workspace with `--filter`, e.g. `pnpm --filter backend test`.

Backend tests are tiered — unit tests run with no external dependencies; integration and e2e tests require a reachable Docker daemon (Testcontainers starts a real ephemeral Postgres). If Docker isn't available, `pnpm --filter backend exec vitest run <specific-unit-test-file>` still works standalone.

## Backend API (Identity & Access)

The `/auth/register`, `/auth/login`, `/auth/refresh`, and `/auth/logout` endpoints are implemented (see BORA-21). Full spec, design, and QA test checklist: `.specs/features/bora-21-auth-backend/`.

### API documentation

With the backend running, interactive API docs are served at `http://localhost:3000/docs` ([Scalar](https://github.com/scalar/scalar) API Reference), backed by an OpenAPI 3.1 document at `http://localhost:3000/docs/openapi.json`. The document is generated from the same Zod request schemas the controllers validate against (`@asteasolutions/zod-to-openapi`), so request shapes shown in the docs can't drift from what the API actually accepts. See `apps/backend/src/shared/openapi/document.ts`.
