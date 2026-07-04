import { describe, expect, it } from "vitest";

import { generateRawToken, hashToken } from "./refresh-token-generator";

describe("generateRawToken", () => {
  it("returns a base64url string", () => {
    const token = generateRawToken();

    expect(typeof token).toBe("string");
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("produces different values on successive calls", () => {
    expect(generateRawToken()).not.toBe(generateRawToken());
  });
});

describe("hashToken", () => {
  it("is deterministic for the same input", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("differs for different inputs", () => {
    expect(hashToken("abc")).not.toBe(hashToken("xyz"));
  });

  it("returns a 64-character hex string (sha256)", () => {
    const hash = hashToken("abc");

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
