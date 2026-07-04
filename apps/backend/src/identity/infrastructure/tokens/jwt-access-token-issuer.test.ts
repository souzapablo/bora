import { describe, expect, it } from "vitest";

import { JwtAccessTokenIssuer } from "./jwt-access-token-issuer";

describe("JwtAccessTokenIssuer", () => {
  const issuer = new JwtAccessTokenIssuer("test-secret", 900);

  it("issues a JWT string for a given payload", () => {
    const token = issuer.issue({ sub: "u1" });

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("verifies an issued token and returns its payload", () => {
    const token = issuer.issue({ sub: "u1" });

    expect(issuer.verify(token)).toMatchObject({ sub: "u1" });
  });

  it("throws when verifying a tampered token", () => {
    expect(() => issuer.verify("tampered.token.value")).toThrow();
  });
});
