import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { TestDb } from "../test/testcontainers-postgres";
import { setupTestDb, teardownTestDb } from "../test/testcontainers-postgres";

import { AppModule } from "./app.module";

describe("AppController (integration)", () => {
  let app: INestApplication;
  let db: TestDb;

  // AppModule now wires IdentityModule (PrismaModule + PrismaService), so booting it here
  // requires a real, reachable database — same Testcontainers harness T9 established.
  beforeAll(async () => {
    db = await setupTestDb();
    process.env.DATABASE_URL = db.container.getConnectionUri();
    process.env.JWT_ACCESS_SECRET = "test-jwt-secret";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await teardownTestDb(db);
  });

  it("responds on the root health route", async () => {
    const response = await request(app.getHttpServer()).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
