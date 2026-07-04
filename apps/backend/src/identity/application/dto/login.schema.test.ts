import { describe, expect, it } from "vitest";

import { loginSchema } from "./login.schema";

describe("loginSchema", () => {
  const validPayload = { email: "user@example.com", password: "whatever" };

  it("accepts a fully valid login payload", () => {
    const result = loginSchema.safeParse(validPayload);

    expect(result.success).toBe(true);
  });

  it("rejects a malformed email", () => {
    const result = loginSchema.safeParse({ ...validPayload, email: "not-an-email" });

    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ ...validPayload, password: "" });

    expect(result.success).toBe(false);
  });

  it("AUTH-20: rejects a payload with an extra unknown field (.strict())", () => {
    const result = loginSchema.safeParse({ ...validPayload, extra: "field" });

    expect(result.success).toBe(false);
  });
});
