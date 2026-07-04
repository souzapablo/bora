/**
 * Shared Testcontainers Postgres test harness.
 *
 * Requires a reachable Docker daemon. Every test file (and any CI/local run) that imports
 * this module will fail to set up its database if Docker isn't available — this is expected
 * and by design (see tasks.md's Environment caveat for BORA-21 T9).
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";

export interface TestDb {
  prisma: PrismaClient;
  container: StartedPostgreSqlContainer;
}

const PRISMA_BIN = path.resolve(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.CMD" : "prisma",
);

/**
 * Starts an ephemeral Postgres container, runs the committed Prisma migrations against it,
 * and returns a `PrismaClient` connected to it.
 */
// SPEC_DEVIATION: the committed migration (prisma/migrations/20260704114301_init) was
// generated via `prisma migrate diff --from-empty --to-schema-datamodel`, not by running
// `prisma migrate dev` against a live container, because no Docker daemon was reachable in
// the sandbox this task was authored in. The resulting SQL is identical to what `migrate dev`
// would produce for a schema-only diff; `migrate deploy` below applies it against the real
// container at test time. Re-verify with `prisma migrate dev` once Docker is available if the
// schema changes again.
export async function setupTestDb(): Promise<TestDb> {
  const container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const connectionUri = container.getConnectionUri();

  execFileSync(PRISMA_BIN, ["migrate", "deploy"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: connectionUri },
    stdio: "inherit",
  });

  const prisma = new PrismaClient({ datasources: { db: { url: connectionUri } } });
  await prisma.$connect();

  return { prisma, container };
}

/** Truncates both `User` and `RefreshToken` tables, resetting identity sequences. */
export async function resetDb(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "RefreshToken", "User" RESTART IDENTITY CASCADE;',
  );
}

/** Disconnects the Prisma client and tears down the container. Call from `afterAll`. */
export async function teardownTestDb(db: TestDb): Promise<void> {
  await db.prisma.$disconnect();
  await db.container.stop();
}
