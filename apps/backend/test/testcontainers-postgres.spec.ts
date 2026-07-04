import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { TestDb } from "./testcontainers-postgres";
import { resetDb, setupTestDb, teardownTestDb } from "./testcontainers-postgres";

describe("Testcontainers Postgres harness (integration)", () => {
  let db: TestDb;

  beforeAll(async () => {
    db = await setupTestDb();
  }, 120_000);

  afterAll(async () => {
    await teardownTestDb(db);
  });

  it("inserts and reads back a row, then resetDb empties the table", async () => {
    const user = await db.prisma.user.create({
      data: {
        email: "smoke-test@example.com",
        passwordHash: "hash",
        timezone: "America/Sao_Paulo",
      },
    });

    const found = await db.prisma.user.findUnique({ where: { id: user.id } });
    expect(found?.email).toBe("smoke-test@example.com");

    await resetDb(db.prisma);

    const remaining = await db.prisma.user.findMany();
    expect(remaining).toHaveLength(0);
  });
});
