import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { PrismaService } from "../../../shared/prisma/prisma.service";
import type { TestDb } from "../../../../test/testcontainers-postgres";
import { resetDb, setupTestDb, teardownTestDb } from "../../../../test/testcontainers-postgres";

import { PrismaRefreshTokenRepository } from "./prisma-refresh-token.repository";

describe("PrismaRefreshTokenRepository (integration)", () => {
  let db: TestDb;
  let repo: PrismaRefreshTokenRepository;

  beforeAll(async () => {
    db = await setupTestDb();
    repo = new PrismaRefreshTokenRepository(db.prisma as unknown as PrismaService);
  }, 120_000);

  afterAll(async () => {
    await teardownTestDb(db);
  });

  beforeEach(async () => {
    await resetDb(db.prisma);
  });

  async function createTestUser(email: string): Promise<string> {
    const user = await db.prisma.user.create({
      data: { email, passwordHash: "hash", timezone: "America/Sao_Paulo" },
    });
    return user.id;
  }

  const futureDate = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  it("create/findByTokenHash round-trip correctly", async () => {
    const userId = await createTestUser("dana@example.com");

    const created = await repo.create({ userId, tokenHash: "hash-1", expiresAt: futureDate() });

    expect(created.tokenHash).toBe("hash-1");
    expect(created.userId).toBe(userId);
    expect(created.revokedAt).toBeNull();

    const found = await repo.findByTokenHash("hash-1");
    expect(found?.id).toBe(created.id);
    expect(found?.userId).toBe(userId);
  });

  it("revoke(id) sets revokedAt on exactly that row", async () => {
    const userId = await createTestUser("erin@example.com");
    const tokenA = await repo.create({ userId, tokenHash: "hash-a", expiresAt: futureDate() });
    const tokenB = await repo.create({ userId, tokenHash: "hash-b", expiresAt: futureDate() });

    await repo.revoke(tokenA.id);

    const rowA = await repo.findByTokenHash("hash-a");
    const rowB = await repo.findByTokenHash("hash-b");
    expect(rowA?.revokedAt).not.toBeNull();
    expect(rowB?.revokedAt).toBeNull();
  });

  it("revokeAllActiveForUser revokes only that user's active rows, leaves already-revoked and other users' rows untouched (AUTH-15)", async () => {
    const userId = await createTestUser("frank@example.com");
    const otherUserId = await createTestUser("gina@example.com");

    const active1 = await repo.create({ userId, tokenHash: "u-active-1", expiresAt: futureDate() });
    const active2 = await repo.create({ userId, tokenHash: "u-active-2", expiresAt: futureDate() });
    const alreadyRevoked = await repo.create({ userId, tokenHash: "u-revoked", expiresAt: futureDate() });
    await repo.revoke(alreadyRevoked.id);
    const preRevokedAt = (await repo.findByTokenHash("u-revoked"))?.revokedAt;

    const otherActive = await repo.create({
      userId: otherUserId,
      tokenHash: "other-active",
      expiresAt: futureDate(),
    });

    await expect(repo.revokeAllActiveForUser(userId)).resolves.not.toThrow();

    const rowActive1 = await repo.findByTokenHash("u-active-1");
    const rowActive2 = await repo.findByTokenHash("u-active-2");
    const rowAlreadyRevoked = await repo.findByTokenHash("u-revoked");
    const rowOtherActive = await repo.findByTokenHash("other-active");

    expect(rowActive1?.revokedAt).not.toBeNull();
    expect(rowActive2?.revokedAt).not.toBeNull();
    expect(rowAlreadyRevoked?.revokedAt?.getTime()).toBe(preRevokedAt?.getTime());
    expect(rowOtherActive?.revokedAt).toBeNull();
  });
});
