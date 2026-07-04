import type { INestApplication } from "@nestjs/common";
import { Controller, Get, Module, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppException } from "../errors/app-exception";

import { ProblemDetailsFilter } from "./problem-details.filter";

@Controller("test")
class ThrowingController {
  @Get("app-exception")
  throwAppException(): never {
    throw new AppException({
      code: "VALIDATION_FAILED",
      detail: "Request validation failed",
    });
  }

  @Get("validation-failed")
  throwValidationFailed(): never {
    throw new AppException({
      code: "VALIDATION_FAILED",
      detail: "Request validation failed",
      meta: { errors: [{ path: "password", message: "too short" }] },
    });
  }

  @Get("unexpected")
  throwUnexpected(): never {
    throw new Error("boom");
  }

  @Get("http-exception")
  throwHttpException(): never {
    throw new NotFoundException("Widget not found");
  }
}

@Module({
  controllers: [ThrowingController],
})
class TestAppModule {}

describe("ProblemDetailsFilter (integration)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns RFC 7807 problem+json body for a thrown AppException", async () => {
    const response = await request(app.getHttpServer()).get("/test/app-exception");

    expect(response.status).toBe(400);
    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.body).toMatchObject({
      type: "https://bora.dev/errors/VALIDATION_FAILED",
      title: "Validation failed",
      status: 400,
      detail: "Request validation failed",
      instance: "/test/app-exception",
      code: "VALIDATION_FAILED",
    });
  });

  it("returns 500 + code INTERNAL_ERROR with no stack trace for a thrown plain Error", async () => {
    const response = await request(app.getHttpServer()).get("/test/unexpected");

    expect(response.status).toBe(500);
    expect(response.body.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(response.body)).not.toContain("boom");
    expect(JSON.stringify(response.body).toLowerCase()).not.toContain("at throwuncontroller");
  });

  it("includes the errors[] array from meta for a VALIDATION_FAILED AppException", async () => {
    const response = await request(app.getHttpServer()).get("/test/validation-failed");

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_FAILED");
    expect(response.body.errors).toEqual([{ path: "password", message: "too short" }]);
  });

  it("preserves the status of a thrown Nest HttpException instead of collapsing it to 500", async () => {
    const response = await request(app.getHttpServer()).get("/test/http-exception");

    expect(response.status).toBe(404);
    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.body).toMatchObject({
      status: 404,
      code: "HTTP_404",
      title: "Widget not found",
      instance: "/test/http-exception",
    });
  });

  it("preserves the 404 Nest generates for an unmatched route instead of collapsing it to 500", async () => {
    const response = await request(app.getHttpServer()).get("/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("HTTP_404");
  });
});
