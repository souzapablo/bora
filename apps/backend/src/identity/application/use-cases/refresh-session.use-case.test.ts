import { describe, expect, it, vi } from "vitest";

import { RefreshToken } from "../../domain/entities/refresh-token";
import type { AccessTokenIssuerPort } from "../../domain/ports/access-token-issuer.port";
import type { RefreshTokenRepositoryPort } from "../../domain/ports/refresh-token-repository.port";

import { RefreshSessionUseCase } from "./refresh-session.use-case";

function makeActiveToken(): RefreshToken {
  return new RefreshToken(
    "rt-1",
    "user-1",
    "old-hash",
    new Date(Date.now() + 60_000),
    null,
    new Date(),
  );
}

function makeDeps() {
  const refreshTokenRepo: RefreshTokenRepositoryPort = {
    create: vi.fn().mockResolvedValue({
      id: "rt-2",
      userId: "user-1",
      tokenHash: "new-hash",
      expiresAt: new Date(Date.now() + 1000),
      revokedAt: null,
      createdAt: new Date(),
    }),
    findByTokenHash: vi.fn().mockResolvedValue(makeActiveToken()),
    revoke: vi.fn(),
    revokeAllActiveForUser: vi.fn(),
  };
  const tokenIssuer: AccessTokenIssuerPort = {
    issue: vi.fn().mockReturnValue("jwt-token"),
    verify: vi.fn(),
  };

  return { refreshTokenRepo, tokenIssuer };
}

describe("RefreshSessionUseCase", () => {
  it("AUTH-12: a valid, unrevoked, unexpired token rotates — old revoked, new created, new access token issued", async () => {
    const deps = makeDeps();
    const useCase = new RefreshSessionUseCase(deps.refreshTokenRepo, deps.tokenIssuer);

    const result = await useCase.execute("raw-token");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.accessToken).toBe("jwt-token");
    expect(deps.refreshTokenRepo.revoke).toHaveBeenCalledWith("rt-1");
    expect(deps.refreshTokenRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }),
    );
  });

  it("AUTH-13: a missing token returns err(AUTH_MISSING_REFRESH_TOKEN) with no repo call", async () => {
    const deps = makeDeps();
    const useCase = new RefreshSessionUseCase(deps.refreshTokenRepo, deps.tokenIssuer);

    const result = await useCase.execute(undefined);

    expect(result).toEqual({ ok: false, error: { code: "AUTH_MISSING_REFRESH_TOKEN" } });
    expect(deps.refreshTokenRepo.findByTokenHash).not.toHaveBeenCalled();
  });

  it("AUTH-14: an expired token returns err(AUTH_REFRESH_TOKEN_EXPIRED) and issues no new token", async () => {
    const deps = makeDeps();
    const expired = new RefreshToken(
      "rt-1",
      "user-1",
      "old-hash",
      new Date(Date.now() - 1000),
      null,
      new Date(),
    );
    (deps.refreshTokenRepo.findByTokenHash as ReturnType<typeof vi.fn>).mockResolvedValue(expired);
    const useCase = new RefreshSessionUseCase(deps.refreshTokenRepo, deps.tokenIssuer);

    const result = await useCase.execute("raw-token");

    expect(result).toEqual({ ok: false, error: { code: "AUTH_REFRESH_TOKEN_EXPIRED" } });
    expect(deps.tokenIssuer.issue).not.toHaveBeenCalled();
    expect(deps.refreshTokenRepo.create).not.toHaveBeenCalled();
  });

  it("AUTH-15 (unit-level): a revoked (reused) token triggers whole-family revocation and returns err(AUTH_REFRESH_TOKEN_REUSED)", async () => {
    const deps = makeDeps();
    const revoked = new RefreshToken(
      "rt-1",
      "user-1",
      "old-hash",
      new Date(Date.now() + 60_000),
      new Date(),
      new Date(),
    );
    (deps.refreshTokenRepo.findByTokenHash as ReturnType<typeof vi.fn>).mockResolvedValue(revoked);
    const useCase = new RefreshSessionUseCase(deps.refreshTokenRepo, deps.tokenIssuer);

    const result = await useCase.execute("raw-token");

    expect(result).toEqual({ ok: false, error: { code: "AUTH_REFRESH_TOKEN_REUSED" } });
    expect(deps.refreshTokenRepo.revokeAllActiveForUser).toHaveBeenCalledWith("user-1");
  });

  it("AUTH-16: a token hash with no matching row returns err(AUTH_INVALID_REFRESH_TOKEN)", async () => {
    const deps = makeDeps();
    (deps.refreshTokenRepo.findByTokenHash as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const useCase = new RefreshSessionUseCase(deps.refreshTokenRepo, deps.tokenIssuer);

    const result = await useCase.execute("raw-token");

    expect(result).toEqual({ ok: false, error: { code: "AUTH_INVALID_REFRESH_TOKEN" } });
  });
});
