import { describe, expect, it } from "vitest";

import { Argon2PasswordHasher, DUMMY_HASH } from "./argon2-password-hasher";

describe("Argon2PasswordHasher", () => {
  const hasher = new Argon2PasswordHasher();

  it("hashes a password to an argon2id string and verifies it correctly", async () => {
    const hash = await hasher.hash("correct-horse-battery-staple");

    expect(hash.startsWith("$argon2id$")).toBe(true);
    await expect(hasher.verify(hash, "correct-horse-battery-staple")).resolves.toBe(true);
  });

  it("fails verification for the wrong plaintext", async () => {
    const hash = await hasher.hash("correct-horse-battery-staple");

    await expect(hasher.verify(hash, "wrong")).resolves.toBe(false);
  });

  it("resolves (does not throw) when verifying against DUMMY_HASH", async () => {
    await expect(hasher.verify(DUMMY_HASH, "anything")).resolves.toBe(false);
  });
});
