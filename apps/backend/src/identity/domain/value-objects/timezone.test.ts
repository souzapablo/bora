import { describe, expect, it } from "vitest";

import { isValidIanaTimezone, Timezone } from "./timezone";

describe("Timezone", () => {
  it("accepts a valid IANA timezone", () => {
    expect(new Timezone("America/Sao_Paulo").value).toBe("America/Sao_Paulo");
  });

  it("throws for an invalid IANA timezone", () => {
    expect(() => new Timezone("Not/AZone")).toThrow();
  });
});

describe("isValidIanaTimezone", () => {
  it("returns true for a valid IANA timezone", () => {
    expect(isValidIanaTimezone("America/Sao_Paulo")).toBe(true);
  });

  it("returns false for an invalid IANA timezone", () => {
    expect(isValidIanaTimezone("bogus")).toBe(false);
  });
});
