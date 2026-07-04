import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { TestDb } from "../../../test/testcontainers-postgres";
import { resetDb, setupTestDb, teardownTestDb } from "../../../test/testcontainers-postgres";
import { AppModule } from "../../app.module";
import { ProblemDetailsFilter } from "../../shared/filters/problem-details.filter";
import { generateRawToken, hashToken } from "../infrastructure/tokens/refresh-token-generator";

import { REFRESH_COOKIE_NAME } from "./auth.constants";

function getSetCookie(res: request.Response, name: string): { line: string; value: string } | undefined {
  const raw = res.headers["set-cookie"] as unknown as string[] | undefined;
  const line = raw?.find((c) => c.startsWith(`${name}=`));
  if (!line) return undefined;
  const value = line.split(";")[0]?.split("=")[1] ?? "";
  return { line, value };
}

async function bootstrapApp(): Promise<{ app: INestApplication; db: TestDb }> {
  const db = await setupTestDb();
  process.env.DATABASE_URL = db.container.getConnectionUri();
  process.env.JWT_ACCESS_SECRET = "test-jwt-secret";

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalFilters(new ProblemDetailsFilter());
  await app.init();

  return { app, db };
}

describe("Auth error paths and edge cases (e2e)", () => {
  let app: INestApplication;
  let db: TestDb;

  beforeAll(async () => {
    ({ app, db } = await bootstrapApp());
    await resetDb(db.prisma);
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await teardownTestDb(db);
  });

  async function registerUser(email: string, password = "correct-horse-1", timezone = "America/Sao_Paulo") {
    return request(app.getHttpServer()).post("/auth/register").send({ email, password, timezone });
  }

  it("AUTH-02: registering the same email twice returns 409, generic code, and creates no second row", async () => {
    const email = "dup@example.com";
    const first = await registerUser(email);
    expect(first.status).toBe(201);

    const second = await registerUser(email);
    expect(second.status).toBe(409);
    expect(second.body.code).toBe("AUTH_DUPLICATE_EMAIL");

    const count = await db.prisma.user.count({ where: { email } });
    expect(count).toBe(1);
  });

  it("AUTH-03/AUTH-04: invalid payloads return 400 with VALIDATION_FAILED and a populated errors[]", async () => {
    const shortPassword = await registerUser("short-pw@example.com", "short1");
    expect(shortPassword.status).toBe(400);
    expect(shortPassword.body.code).toBe("VALIDATION_FAILED");
    expect(shortPassword.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "password" })]),
    );

    const badEmail = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email: "not-an-email", password: "correct-horse-1", timezone: "America/Sao_Paulo" });
    expect(badEmail.status).toBe(400);
    expect(badEmail.body.code).toBe("VALIDATION_FAILED");
    expect(badEmail.body.errors).toEqual(expect.arrayContaining([expect.objectContaining({ path: "email" })]));

    const badTimezone = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email: "goodtz@example.com", password: "correct-horse-1", timezone: "Not/AZone" });
    expect(badTimezone.status).toBe(400);
    expect(badTimezone.body.code).toBe("VALIDATION_FAILED");
    expect(badTimezone.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "timezone" })]),
    );
  });

  it("AUTH-05: two concurrent registrations for the same email resolve to exactly one 201 and one 409", async () => {
    const email = "race@example.com";

    const [first, second] = await Promise.all([registerUser(email), registerUser(email)]);
    const statuses = [first.status, second.status].sort();

    expect(statuses).toEqual([201, 409]);
    const count = await db.prisma.user.count({ where: { email } });
    expect(count).toBe(1);
  });

  it("AUTH-08/AUTH-09: unknown email and wrong password both return an identical 401 body", async () => {
    const email = "known-user@example.com";
    await registerUser(email, "the-right-password");

    const unknownEmailRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "nobody-here@example.com", password: "whatever123" });

    const wrongPasswordRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email, password: "totally-wrong-pw" });

    expect(unknownEmailRes.status).toBe(401);
    expect(wrongPasswordRes.status).toBe(401);
    expect(unknownEmailRes.body.code).toBe("AUTH_INVALID_CREDENTIALS");
    expect(wrongPasswordRes.body.code).toBe("AUTH_INVALID_CREDENTIALS");
    expect(unknownEmailRes.body).toEqual(wrongPasswordRes.body);
  });

  it("AUTH-10/AUTH-11: 6th failed login within the window is 429; a prior success resets the counter", async () => {
    const email = "login-lockout@example.com";
    const password = "the-real-password-1";
    await registerUser(email, password);

    for (let i = 0; i < 5; i++) {
      const res = await request(app.getHttpServer()).post("/auth/login").send({ email, password: "wrong" });
      expect(res.status).toBe(401);
    }

    const sixth = await request(app.getHttpServer()).post("/auth/login").send({ email, password: "wrong" });
    expect(sixth.status).toBe(429);
    expect(sixth.body.code).toBe("AUTH_RATE_LIMITED");

    // Separate (email, IP) pair for the reset assertion so the lockout above doesn't interfere.
    const resetEmail = "login-reset@example.com";
    await registerUser(resetEmail, password);

    const failOnce = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: resetEmail, password: "wrong" });
    expect(failOnce.status).toBe(401);

    const success = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: resetEmail, password });
    expect(success.status).toBe(200);

    const failAfterSuccess = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: resetEmail, password: "wrong" });
    expect(failAfterSuccess.status).toBe(401);
    expect(failAfterSuccess.body.code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("AUTH-13: refresh with no cookie returns 401 AUTH_MISSING_REFRESH_TOKEN", async () => {
    const res = await request(app.getHttpServer()).post("/auth/refresh");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("AUTH_MISSING_REFRESH_TOKEN");
  });

  it("AUTH-16/AUTH-20: refresh with an unmatched or tampered cookie returns 401 AUTH_INVALID_REFRESH_TOKEN, never 500", async () => {
    const wellFormedButUnmatched = generateRawToken();
    const unmatchedRes = await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE_NAME}=${wellFormedButUnmatched}`);
    expect(unmatchedRes.status).toBe(401);
    expect(unmatchedRes.body.code).toBe("AUTH_INVALID_REFRESH_TOKEN");

    const tamperedRes = await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE_NAME}=not-a-real-token-!!!`);
    expect(tamperedRes.status).toBe(401);
    expect(tamperedRes.body.code).toBe("AUTH_INVALID_REFRESH_TOKEN");
  });

  it("AUTH-14: refresh with an expired token returns 401 AUTH_REFRESH_TOKEN_EXPIRED and issues no new token", async () => {
    const email = "expired-token@example.com";
    const registerRes = await registerUser(email);
    const cookie = getSetCookie(registerRes, REFRESH_COOKIE_NAME);

    await db.prisma.refreshToken.update({
      where: { tokenHash: hashToken(cookie?.value ?? "") },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE_NAME}=${cookie?.value}`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("AUTH_REFRESH_TOKEN_EXPIRED");
    expect(res.body).not.toHaveProperty("accessToken");
  });

  it("AUTH-15: replaying a rotated-out refresh token revokes the whole family", async () => {
    const email = "reuse-family@example.com";
    const registerRes = await registerUser(email);
    const original = getSetCookie(registerRes, REFRESH_COOKIE_NAME);

    const firstRefresh = await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE_NAME}=${original?.value}`);
    expect(firstRefresh.status).toBe(200);
    const secondGen = getSetCookie(firstRefresh, REFRESH_COOKIE_NAME);

    const replayOriginal = await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE_NAME}=${original?.value}`);
    expect(replayOriginal.status).toBe(401);
    expect(replayOriginal.body.code).toBe("AUTH_REFRESH_TOKEN_REUSED");

    const secondGenAfterFamilyRevoke = await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE_NAME}=${secondGen?.value}`);
    expect(secondGenAfterFamilyRevoke.status).toBe(401);
  });

  it("AUTH-18: logout with no cookie is idempotently 204", async () => {
    const res = await request(app.getHttpServer()).post("/auth/logout");
    expect(res.status).toBe(204);
  });

  // Note: Zod's z.string().email() rejects leading/trailing whitespace at the request-validation
  // layer, so an e2e request can never carry a padded email through to the normalization logic —
  // the trim half of AUTH-19 is exercised at the Email VO unit-test layer (email.test.ts). This
  // e2e case covers the reachable half: case-insensitive normalization across register -> login.
  it("AUTH-19: registering with a mixed-case email lets login succeed with the normalized (lowercase) form", async () => {
    const registerRes = await registerUser("Foo@Bar.com", "correct-horse-1");
    expect(registerRes.status).toBe(201);

    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "foo@bar.com", password: "correct-horse-1" });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty("accessToken");
  });

  it("AUTH-20: an unknown extra field on the request body is rejected with 400 VALIDATION_FAILED", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        email: "extra-field@example.com",
        password: "correct-horse-1",
        timezone: "America/Sao_Paulo",
        notAllowed: "nope",
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_FAILED");
  });
});

describe("Auth registration IP throttle (AUTH-06, isolated app)", () => {
  let app: INestApplication;
  let db: TestDb;

  beforeAll(async () => {
    ({ app, db } = await bootstrapApp());
    await resetDb(db.prisma);
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await teardownTestDb(db);
  });

  it("blocks registrations beyond the per-IP threshold with 429, never a 500", async () => {
    // REGISTER_MAX_ATTEMPTS is 10 per hour, keyed by IP only. This app instance has a fresh,
    // isolated InMemoryRateLimiter (own Nest app), so 12 rapid sequential requests from the
    // same test-runner IP deterministically cross the threshold without waiting out the window.
    const responses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email: `throttle-${i}@example.com`, password: "correct-horse-1", timezone: "America/Sao_Paulo" });
      responses.push(res.status);
    }

    expect(responses.slice(0, 10)).toEqual(Array(10).fill(201));
    expect(responses.slice(10)).toEqual([429, 429]);
  });
});
