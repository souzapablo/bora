import { describe, expect, it } from "vitest";

import { registerSchema } from "./register.schema";

describe("registerSchema", () => {
  const validPayload = {
    email: "new-user@example.com",
    password: "correct-horse",
    timezone: "America/Sao_Paulo",
  };

  it("accepts a fully valid register payload (AUTH-01 input shape)", () => {
    const result = registerSchema.safeParse(validPayload);

    expect(result.success).toBe(true);
  });

  it("AUTH-03: rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({ ...validPayload, password: "short1" });

    expect(result.success).toBe(false);
  });

  it("AUTH-04: rejects a malformed email", () => {
    const result = registerSchema.safeParse({ ...validPayload, email: "not-an-email" });

    expect(result.success).toBe(false);
  });

  it("AUTH-04: rejects an invalid IANA timezone string", () => {
    const result = registerSchema.safeParse({ ...validPayload, timezone: "Not/AZone" });

    expect(result.success).toBe(false);
  });

  it("AUTH-20: rejects a payload with an extra unknown field (.strict())", () => {
    const result = registerSchema.safeParse({ ...validPayload, extra: "field" });

    expect(result.success).toBe(false);
  });
});
