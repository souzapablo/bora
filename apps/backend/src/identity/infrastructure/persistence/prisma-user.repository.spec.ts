import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { PrismaService } from "../../../shared/prisma/prisma.service";
import type { TestDb } from "../../../../test/testcontainers-postgres";
import { resetDb, setupTestDb, teardownTestDb } from "../../../../test/testcontainers-postgres";
import { Email } from "../../domain/value-objects/email";
import { Timezone } from "../../domain/value-objects/timezone";

import { PrismaUserRepository } from "./prisma-user.repository";

describe("PrismaUserRepository (integration)", () => {
  let db: TestDb;
  let repo: PrismaUserRepository;

  beforeAll(async () => {
    db = await setupTestDb();
    repo = new PrismaUserRepository(db.prisma as unknown as PrismaService);
  }, 120_000);

  afterAll(async () => {
    await teardownTestDb(db);
  });

  beforeEach(async () => {
    await resetDb(db.prisma);
  });

  const newUser = (email: string) => ({
    email: new Email(email),
    passwordHash: "argon2id$fake-hash",
    timezone: new Timezone("America/Sao_Paulo"),
  });

  it("persists a User row and returns ok(User) with the password hash stored verbatim", async () => {
    const result = await repo.create(newUser("alice@example.com"));

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.email.value).toBe("alice@example.com");
    expect(result.value.passwordHash).toBe("argon2id$fake-hash");

    const row = await db.prisma.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
    expect(row.passwordHash).toBe("argon2id$fake-hash");
  });

  it("returns err(AUTH_DUPLICATE_EMAIL) for a pre-existing email, never throws, and creates no row", async () => {
    await repo.create(newUser("bob@example.com"));

    const result = await repo.create(newUser("bob@example.com"));

    expect(result).toEqual({ ok: false, error: { code: "AUTH_DUPLICATE_EMAIL" } });

    const rows = await db.prisma.user.findMany({ where: { email: "bob@example.com" } });
    expect(rows).toHaveLength(1);
  });

  it("lets exactly one of two concurrent create() calls for the same email succeed (AUTH-05)", async () => {
    const [first, second] = await Promise.all([
      repo.create(newUser("race@example.com")),
      repo.create(newUser("race@example.com")),
    ]);

    const oks = [first, second].filter((r) => r.ok);
    const errs = [first, second].filter((r) => !r.ok);

    expect(oks).toHaveLength(1);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatchObject({ ok: false, error: { code: "AUTH_DUPLICATE_EMAIL" } });

    const count = await db.prisma.user.count({ where: { email: "race@example.com" } });
    expect(count).toBe(1);
  });

  it("findByEmail returns null for no match and the mapped User for a match", async () => {
    const noMatch = await repo.findByEmail(new Email("nobody@example.com"));
    expect(noMatch).toBeNull();

    await repo.create(newUser("carol@example.com"));
    const match = await repo.findByEmail(new Email("carol@example.com"));

    expect(match).not.toBeNull();
    expect(match?.email.value).toBe("carol@example.com");
  });
});
