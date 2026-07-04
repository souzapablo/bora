/**
 * Shared Testcontainers Postgres test harness.
 *
 * Requires a reachable Docker daemon. Every test file (and any CI/local run) that imports
 * this module will fail to set up its database if Docker isn't available — this is expected
 * and by design (see tasks.md's Environment caveat for BORA-21 T9).
 */
import { execFileSync } from "node:child_process";

import { PrismaClient } from "@prisma/client";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";

export interface TestDb {
  prisma: PrismaClient;
  container: StartedPostgreSqlContainer;
}

const PRISMA_CLI_ENTRYPOINT = require.resolve("prisma/build/index.js");

/**
 * Starts an ephemeral Postgres container, runs the committed Prisma migrations against it,
 * and returns a `PrismaClient` connected to it.
 */
export async function setupTestDb(): Promise<TestDb> {
  const container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const connectionUri = container.getConnectionUri();

  execFileSync(process.execPath, [PRISMA_CLI_ENTRYPOINT, "migrate", "deploy"], {
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
