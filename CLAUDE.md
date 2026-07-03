# CLAUDE.md

Structural rules for the Bora repo. These are non-negotiable — read this before touching `apps/backend`.

Full context lives in Confluence: [Roadmap](https://pablosouza.atlassian.net/wiki/spaces/Bora/pages/851969/Roadmap), [Architecture & Modularity](https://pablosouza.atlassian.net/wiki/spaces/Bora/pages/753665), [Domain Model](https://pablosouza.atlassian.net/wiki/spaces/Bora/pages/524523), [Tech Stack](https://pablosouza.atlassian.net/wiki/spaces/Bora/pages/622613). This file states the rules; Confluence has the reasoning.

## Module boundaries

The backend is a modular monolith: one NestJS deployment, four bounded-context modules with hard internal boundaries.

- **Identity & Access** — User table, ABAC policy definitions
- **Productivity** — Habit + Task tables
- **Gamification** — CharacterProfile table (xp, level)
- **Mental Health** — MoodEntry table

Each module is layered `domain/` → `application/` → `infrastructure/`:

```
apps/backend/src/
  identity/{domain,application,infrastructure}/
  productivity/{domain,application,infrastructure}/
  gamification/{domain,application,infrastructure}/
  mental-health/{domain,application,infrastructure}/
  shared/            # EventEmitter2 setup, AbacGuard, Zod validation pipe
```

A module never queries another module's tables directly, even though all four share one Postgres schema. Access only through that module's own repository.

## ORM-free domain layer

`domain/` never imports Prisma, TypeORM, or NestJS decorators. It is plain TypeScript: aggregates, value objects, domain services.

Persistence lives entirely in `infrastructure/`: a Repository implementation plus a Mapper that translates Prisma rows to domain objects and back. `application/` (controllers, use-cases) depends on `domain/` and the Repository interface — never on Prisma types directly.

## Cross-module communication

Modules talk only through in-process domain events via NestJS `EventEmitter2` — never by importing another module's service or repository.

Example: Gamification never calls into Productivity. It subscribes to `HabitCompleted` / `TaskCompleted`, loads its own `CharacterProfile`, and updates it in a separate, eventually-consistent transaction. The event handler lives in the *subscribing* module's `application/` layer, not the publisher's.

Event handlers must be idempotent, even though v1 runs single-process with no broker.

## Design → Backend → Frontend gate

Every feature ticket settles design and domain decisions before backend work starts, and backend before frontend. Don't start a backend task whose design/domain shape is still open; don't start frontend work against an API that hasn't landed.

## What not to build (yet)

- No microservices, message broker, or API gateway
- No Postgres schema-per-module — isolation is enforced by the Repository pattern, not the database
- No shared "data" module that registers every table for every module
