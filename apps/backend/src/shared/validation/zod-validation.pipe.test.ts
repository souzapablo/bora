import { describe, expect, it } from "vitest";
import { z } from "zod";

import { AppException } from "../errors/app-exception";
import { ZodValidationPipe } from "./zod-validation.pipe";

const testSchema = z
  .object({
    email: z.string().email(),
    age: z.number(),
  })
  .strict();

describe("ZodValidationPipe", () => {
  it("passes valid input through parsed/typed", () => {
    const pipe = new ZodValidationPipe(testSchema);

    const result = pipe.transform({ email: "a@b.com", age: 30 });

    expect(result).toEqual({ email: "a@b.com", age: 30 });
  });

  it("throws AppException with code VALIDATION_FAILED and populated meta.errors for a missing field", () => {
    const pipe = new ZodValidationPipe(testSchema);

    expect(() => pipe.transform({ email: "a@b.com" })).toThrow(AppException);

    try {
      pipe.transform({ email: "a@b.com" });
      throw new Error("expected pipe.transform to throw");
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(AppException);
      const appException = thrown as AppException;
      expect(appException.appError.code).toBe("VALIDATION_FAILED");
      expect(Array.isArray(appException.appError.meta?.errors)).toBe(true);
      expect((appException.appError.meta?.errors as unknown[]).length).toBeGreaterThan(0);
    }
  });

  it("throws AppException with code VALIDATION_FAILED for a wrong-type field", () => {
    const pipe = new ZodValidationPipe(testSchema);

    try {
      pipe.transform({ email: "a@b.com", age: "not-a-number" });
      throw new Error("expected pipe.transform to throw");
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(AppException);
      expect((thrown as AppException).appError.code).toBe("VALIDATION_FAILED");
    }
  });

  it("throws AppException for an extra/unknown field on a .strict() schema", () => {
    const pipe = new ZodValidationPipe(testSchema);

    try {
      pipe.transform({ email: "a@b.com", age: 30, extra: "field" });
      throw new Error("expected pipe.transform to throw");
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(AppException);
      expect((thrown as AppException).appError.code).toBe("VALIDATION_FAILED");
    }
  });
});
