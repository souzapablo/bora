# STATE

## Decisions

### AD-004
- **Decision**: Local dev environments use a root-level `docker-compose.yml` for the shared dev Postgres (+ Adminer for browsing it) — not for the backend or frontend themselves, which keep running natively via `pnpm`. Canonical dev DB port is `5435` (avoids clashing with a locally-installed Postgres on the default `5432`); `apps/backend/.env.example` was updated to match. This coexists with, and does not replace, Testcontainers for the backend's integration/e2e suite — those spin up their own ephemeral Postgres per run, unrelated to the compose stack.
- **Reason**: The repo had no documented answer for "how do I get a local Postgres" beyond "any reachable instance, docker or not," and `.env.example` (5432) and `.env.development` (5435) had already drifted to disagree with each other. User wants full containerization (backend/frontend in compose too) deferred — that's slower iteration without bind-mount hot reload, not worth it yet for a two-app monorepo everyone runs with `pnpm dev` anyway.
- **Trade-off**: Backend/frontend still need Node/pnpm installed locally rather than "clone and `docker compose up`" for the whole stack. Two Postgres mechanisms exist (compose for dev-loop, Testcontainers for tests) — intentional for isolation, but a newcomer needs the README section to understand why.
- **Scope**: Repo root (`docker-compose.yml`), `apps/backend/.env.example`. Documented in `README.md` and Confluence (Tech Stack / local environment section).
- **Date**: 2026-07-04
- **Status**: active

### AD-003
- **Decision**: Backend conventions established by BORA-21 (Identity & Access module, first real backend slice) become the standard for every future `apps/backend` module: (1) Prisma as the ORM, one `apps/backend/prisma/schema.prisma` shared across all four bounded contexts, each module's `infrastructure/` only touching its own tables via its own repository; (2) Zod request validation via a small hand-rolled `ZodValidationPipe` in `shared/validation/` (not the `nestjs-zod` package); (3) **errors are values, not exceptions** — every use-case returns `Result<T, E>` (`shared/result.ts`) for expected outcomes; there are exactly two sanctioned throw sites app-wide (`ZodValidationPipe`, and the controller's `unwrap()` call), both wrapping a domain error in one shared `AppException` (`shared/errors/`); (4) every HTTP error response, with no exception, is RFC 7807 Problem Details (`application/problem+json`: `type/title/status/detail/instance` + a `code` extension) emitted by one global `ProblemDetailsFilter`; error codes are namespaced `<MODULE>_<REASON>` (e.g. `AUTH_DUPLICATE_EMAIL`), each module owns its own error-catalog file merged into one `shared/errors/error-catalog.ts`; (5) rate limiting, where a module needs custom stateful semantics (failure-counting, reset-on-success) beyond a flat per-route count, is a hand-rolled in-memory limiter rather than `@nestjs/throttler`; (6) argon2id (OWASP baseline params) for any future password/secret hashing; (7) high-entropy opaque tokens (e.g. refresh tokens) are sha256-hashed at rest and looked up via a unique DB index, not run through a salted KDF.
- **Reason**: BORA-21 is the first module built in the backend, so its design.md necessarily chose these primitives from scratch (see `.specs/features/bora-21-auth-backend/design.md` Tech Decisions for full rationale per item). Point (3)/(4) were revised mid-design after user feedback: an earlier draft used a thrown `DomainError` hierarchy + `DomainExceptionFilter`, replaced with the Result/Problem-Details system because throwing for *expected* business outcomes (duplicate email, invalid credentials, etc.) hides them from a use-case's type signature, and Nest's default `{statusCode,message,error}` error shape isn't a standard, client-parseable envelope. Recording all of this now avoids each future module re-deciding the same questions or drifting to a different pattern.
- **Trade-off**: Locks in Prisma/argon2/hand-rolled-rate-limiter/Result-pattern as the house style even though none has been proven at scale yet. The Result pattern's safety depends on code-review discipline (TypeScript can't mechanically forbid a stray `throw` inside a use-case) — flagged as a design.md risk, not fully solved. Revisit any single item if it becomes a real bottleneck rather than re-deciding per-module.
- **Scope**: All `apps/backend/src/**` modules (Identity & Access now; Productivity, Gamification, Mental Health when built). Matching updates made to `CLAUDE.md` (`shared/` folder-tree comment) and the Tech Stack / Architecture & Modularity / Domain Model Confluence pages.
- **Date**: 2026-07-03
- **Status**: active

### AD-002
- **Decision**: BORA-21 (backend User aggregate, registration/login endpoints, JWT + refresh cookie, argon2) proceeds even though its Jira dependency BORA-20 ("Design: Login/Register screen") is Cancelled rather than Done. The Design→Backend gate is treated as satisfied for this ticket by the existing Confluence Domain Model (`User` aggregate, VOs, `UserRegistered` event) and Tech Stack (Auth section: JWT + refresh cookie, argon2, ABAC, REST/Zod) pages, since BORA-21 is backend-only with no UI surface.
- **Reason**: BORA-20 was cancelled for the same reason BORA-8 dropped its Figma phase (AD-001) — no budget for a paid design-tool MCP seat. The domain/auth shape BORA-21 needs was never actually gated on a visual Figma mock; it's fully specified in the Domain Model and Tech Stack Confluence pages already.
- **Trade-off**: No visual reference exists for the Login/Register screen; BORA-22 (frontend) will need to design the UI directly against the API contract and existing frontend design-system tokens rather than a Figma handoff.
- **Scope**: BORA-21 and its dependents (BORA-22 frontend). Precedent for any future subtask whose only blocker is a cancelled Figma design subtask.
- **Date**: 2026-07-03
- **Status**: active

### AD-001
- **Decision**: Frontend styling uses plain CSS custom properties for design tokens and CSS Modules (`.module.css`) for component styles — no Tailwind, no CSS-in-JS, no JS/TS token objects, no design-tool export pipeline.
- **Reason**: BORA-8 dropped its Figma/Canva design-tool phase (no budget for a paid design-tool MCP seat, not viable to build manually). `apps/frontend` had no styling convention yet, so this ticket set the first one. CSS Modules is zero-dependency (Vite supports it natively) and CSS custom properties need no build tooling to sync from a design tool that no longer exists.
- **Trade-off**: No component-variant tooling or visual catalog (e.g. Storybook) comes for free; variant/state coverage is expressed as component props instead of a design tool's native variant system.
- **Scope**: `apps/frontend/src/design-system/` and all future frontend tickets that add or consume components/styles.
- **Date**: 2026-07-03
- **Status**: active

## Handoff

