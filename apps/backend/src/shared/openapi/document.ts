import { extendZodWithOpenApi, OpenApiGeneratorV31, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import { loginSchema } from "../../identity/application/dto/login.schema";
import { registerSchema } from "../../identity/application/dto/register.schema";

extendZodWithOpenApi(z);

const accessTokenResponseSchema = z
  .object({
    accessToken: z.string().openapi({ description: "Short-lived JWT access token" }),
  })
  .openapi("AccessTokenResponse");

const problemDetailsSchema = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number(),
    detail: z.string().optional(),
    instance: z.string().optional(),
    code: z.string(),
    errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  })
  .openapi("ProblemDetails");

const PROBLEM_JSON = "application/problem+json";

function problemResponse(description: string) {
  return {
    description,
    content: { [PROBLEM_JSON]: { schema: problemDetailsSchema } },
  };
}

function buildRegistry(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();

  registry.registerPath({
    method: "post",
    path: "/auth/register",
    tags: ["Auth"],
    summary: "Register a new user and start a session",
    request: {
      body: { content: { "application/json": { schema: registerSchema.openapi("RegisterRequest") } } },
    },
    responses: {
      201: {
        description: "Account created; access token returned, refresh token set as an httpOnly cookie",
        content: { "application/json": { schema: accessTokenResponseSchema } },
      },
      400: problemResponse("Validation failed"),
      409: problemResponse("Email already registered"),
    },
  });

  registry.registerPath({
    method: "post",
    path: "/auth/login",
    tags: ["Auth"],
    summary: "Authenticate with email and password",
    request: {
      body: { content: { "application/json": { schema: loginSchema.openapi("LoginRequest") } } },
    },
    responses: {
      200: {
        description: "Authenticated; access token returned, refresh token set as an httpOnly cookie",
        content: { "application/json": { schema: accessTokenResponseSchema } },
      },
      400: problemResponse("Validation failed"),
      401: problemResponse("Invalid credentials"),
      429: problemResponse("Rate limited"),
    },
  });

  registry.registerPath({
    method: "post",
    path: "/auth/refresh",
    tags: ["Auth"],
    summary: "Exchange the refresh cookie for a new access token",
    responses: {
      200: {
        description: "New access token returned, refresh token rotated via cookie",
        content: { "application/json": { schema: accessTokenResponseSchema } },
      },
      401: problemResponse("Missing, invalid, or reused refresh token"),
    },
  });

  registry.registerPath({
    method: "post",
    path: "/auth/logout",
    tags: ["Auth"],
    summary: "Revoke the current refresh token and clear the session cookie",
    responses: {
      204: { description: "Session ended" },
    },
  });

  return registry;
}

export function buildOpenApiDocument(): ReturnType<OpenApiGeneratorV31["generateDocument"]> {
  const registry = buildRegistry();
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Bora API",
      version: "1.0.0",
      description: "Bora backend — Identity & Access module",
    },
    servers: [{ url: "/" }],
  });
}
