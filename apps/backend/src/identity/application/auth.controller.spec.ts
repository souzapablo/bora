import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { TestDb } from "../../../test/testcontainers-postgres";
import { resetDb, setupTestDb, teardownTestDb } from "../../../test/testcontainers-postgres";
import { AppModule } from "../../app.module";
import { ProblemDetailsFilter } from "../../shared/filters/problem-details.filter";
import { hashToken } from "../infrastructure/tokens/refresh-token-generator";

import { REFRESH_COOKIE_NAME } from "./auth.constants";

function getSetCookie(res: request.Response, name: string): { line: string; value: string } | undefined {
  const raw = res.headers["set-cookie"] as unknown as string[] | undefined;
  const line = raw?.find((c) => c.startsWith(`${name}=`));
  if (!line) return undefined;
  const value = line.split(";")[0]?.split("=")[1] ?? "";
  return { line, value };
}

describe("AuthController (e2e happy path)", () => {
  let app: INestApplication;
  let db: TestDb;

  beforeAll(async () => {
    db = await setupTestDb();
    process.env.DATABASE_URL = db.container.getConnectionUri();
    process.env.JWT_ACCESS_SECRET = "test-jwt-secret";

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await teardownTestDb(db);
  });

  it("register -> login -> refresh -> logout all work over real HTTP", async () => {
    await resetDb(db.prisma);

    const registerRes = await request(app.getHttpServer()).post("/auth/register").send({
      email: "alice@example.com",
      password: "correct-horse",
      timezone: "America/Sao_Paulo",
    });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body).toHaveProperty("accessToken");
    const registerCookie = getSetCookie(registerRes, REFRESH_COOKIE_NAME);
    expect(registerCookie).toBeDefined();
    expect(registerCookie?.line).toContain("HttpOnly");
    expect(registerCookie?.line).toContain("Secure");
    expect(registerCookie?.line).toContain("SameSite=None");
    expect(registerCookie?.line).toContain("Path=/auth");

    const loginRes = await request(app.getHttpServer()).post("/auth/login").send({
      email: "alice@example.com",
      password: "correct-horse",
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty("accessToken");
    const loginCookie = getSetCookie(loginRes, REFRESH_COOKIE_NAME);
    expect(loginCookie).toBeDefined();
    expect(loginCookie?.value).not.toBe(registerCookie?.value);

    const refreshRes = await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("Cookie", `${REFRESH_COOKIE_NAME}=${loginCookie?.value}`);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body).toHaveProperty("accessToken");
    const refreshCookie = getSetCookie(refreshRes, REFRESH_COOKIE_NAME);
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie?.value).not.toBe(loginCookie?.value);

    const oldRow = await db.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(loginCookie?.value ?? "") },
    });
    expect(oldRow?.revokedAt).not.toBeNull();

    const logoutRes = await request(app.getHttpServer())
      .post("/auth/logout")
      .set("Cookie", `${REFRESH_COOKIE_NAME}=${refreshCookie?.value}`);

    expect(logoutRes.status).toBe(204);
    const logoutCookie = getSetCookie(logoutRes, REFRESH_COOKIE_NAME);
    expect(logoutCookie).toBeDefined();
    expect(logoutCookie?.line).toContain("Max-Age=0");
  });
});
