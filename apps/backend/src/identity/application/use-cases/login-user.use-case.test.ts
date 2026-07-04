import { describe, expect, it, vi } from "vitest";

import { User } from "../../domain/entities/user";
import type { AccessTokenIssuerPort } from "../../domain/ports/access-token-issuer.port";
import type { PasswordHasherPort } from "../../domain/ports/password-hasher.port";
import type { RateLimiterPort } from "../../domain/ports/rate-limiter.port";
import type { RefreshTokenRepositoryPort } from "../../domain/ports/refresh-token-repository.port";
import type { UserRepositoryPort } from "../../domain/ports/user-repository.port";
import { Email } from "../../domain/value-objects/email";
import { Timezone } from "../../domain/value-objects/timezone";
import { DUMMY_HASH } from "../../infrastructure/hashing/argon2-password-hasher";

import { LoginUserUseCase } from "./login-user.use-case";

function makeUser(): User {
  return new User(
    "user-1",
    new Email("user@example.com"),
    "stored-hash",
    new Timezone("America/Sao_Paulo"),
    new Date(),
  );
}

function makeDeps() {
  const userRepo: UserRepositoryPort = {
    findByEmail: vi.fn().mockResolvedValue(makeUser()),
    create: vi.fn(),
  };
  const refreshTokenRepo: RefreshTokenRepositoryPort = {
    create: vi.fn().mockResolvedValue({
      id: "rt-1",
      userId: "user-1",
      tokenHash: "hash",
      expiresAt: new Date(Date.now() + 1000),
      revokedAt: null,
      createdAt: new Date(),
    }),
    findByTokenHash: vi.fn(),
    revoke: vi.fn(),
    revokeAllActiveForUser: vi.fn(),
  };
  const hasher: PasswordHasherPort = {
    hash: vi.fn(),
    verify: vi.fn().mockResolvedValue(true),
  };
  const tokenIssuer: AccessTokenIssuerPort = {
    issue: vi.fn().mockReturnValue("jwt-token"),
    verify: vi.fn(),
  };
  const rateLimiter: RateLimiterPort = {
    isBlocked: vi.fn().mockReturnValue(false),
    recordAttempt: vi.fn(),
    reset: vi.fn(),
  };

  return { userRepo, refreshTokenRepo, hasher, tokenIssuer, rateLimiter };
}

const dto = { email: "user@example.com", password: "correct-horse" };

describe("LoginUserUseCase", () => {
  it("AUTH-07: valid credentials return ok(AuthSuccess)", async () => {
    const deps = makeDeps();
    const useCase = new LoginUserUseCase(
      deps.userRepo,
      deps.refreshTokenRepo,
      deps.hasher,
      deps.tokenIssuer,
      deps.rateLimiter,
    );

    const result = await useCase.execute(dto, "1.2.3.4");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.accessToken).toBe("jwt-token");
  });

  it("AUTH-08: unknown email returns err(AUTH_INVALID_CREDENTIALS) and still verifies against DUMMY_HASH", async () => {
    const deps = makeDeps();
    (deps.userRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const useCase = new LoginUserUseCase(
      deps.userRepo,
      deps.refreshTokenRepo,
      deps.hasher,
      deps.tokenIssuer,
      deps.rateLimiter,
    );

    const result = await useCase.execute(dto, "1.2.3.4");

    expect(result).toEqual({ ok: false, error: { code: "AUTH_INVALID_CREDENTIALS" } });
    expect(deps.hasher.verify).toHaveBeenCalledWith(DUMMY_HASH, dto.password);
  });

  it("AUTH-09: wrong password for an existing user returns the identical err(AUTH_INVALID_CREDENTIALS)", async () => {
    const deps = makeDeps();
    (deps.hasher.verify as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const useCase = new LoginUserUseCase(
      deps.userRepo,
      deps.refreshTokenRepo,
      deps.hasher,
      deps.tokenIssuer,
      deps.rateLimiter,
    );

    const result = await useCase.execute(dto, "1.2.3.4");

    expect(result).toEqual({ ok: false, error: { code: "AUTH_INVALID_CREDENTIALS" } });
  });

  it("AUTH-10: rate-limited returns err(AUTH_RATE_LIMITED) and never attempts password verification", async () => {
    const deps = makeDeps();
    (deps.rateLimiter.isBlocked as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const useCase = new LoginUserUseCase(
      deps.userRepo,
      deps.refreshTokenRepo,
      deps.hasher,
      deps.tokenIssuer,
      deps.rateLimiter,
    );

    const result = await useCase.execute(dto, "1.2.3.4");

    expect(result).toEqual({ ok: false, error: { code: "AUTH_RATE_LIMITED" } });
    expect(deps.hasher.verify).not.toHaveBeenCalled();
  });

  it("AUTH-11: a successful login resets the failure counter for that (email, IP) key", async () => {
    const deps = makeDeps();
    const useCase = new LoginUserUseCase(
      deps.userRepo,
      deps.refreshTokenRepo,
      deps.hasher,
      deps.tokenIssuer,
      deps.rateLimiter,
    );

    await useCase.execute(dto, "1.2.3.4");

    expect(deps.rateLimiter.reset).toHaveBeenCalledWith(`login:${dto.email}:1.2.3.4`);
  });
});
