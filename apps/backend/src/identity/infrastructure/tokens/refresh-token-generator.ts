import { createHash, randomBytes } from "node:crypto";

/** Generates a high-entropy opaque refresh token (32 random bytes, base64url-encoded). */
export function generateRawToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Deterministically hashes a raw refresh token for at-rest storage / indexed lookup. */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
