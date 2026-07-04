import { describe, expect, it, vi } from "vitest";

import { User } from "../../domain/entities/user";
import { UserRegistered } from "../../domain/events/user-registered";
import type { AccessTokenIssuerPort } from "../../domain/ports/access-token-issuer.port";
import type { PasswordHasherPort } from "../../domain/ports/password-hasher.port";
import type { RateLimiterPort } from "../../domain/ports/rate-limiter.port";
import type { RefreshTokenRepositoryPort } from "../../domain/ports/refresh-token-repository.port";
import type { UserRepositoryPort } from "../../domain/ports/user-repository.port";
import { Email } from "../../domain/value-objects/email";
import { Timezone } from "../../domain/value-objects/timezone";
import { err, ok } from "../../../shared/result";

import { RegisterUserUseCase } from "./register-user.use-case";

function makeUser(): User {
  return new User(
    "user-1",
    new Email("new-user@example.com"),
    "argon2-hash",
    new Timezone("America/Sao_Paulo"),
    new Date(),
  );
}

function makeDeps() {
  const userRepo: UserRepositoryPort = {
    findByEmail: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(ok(makeUser())),
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
    hash: vi.fn().mockResolvedValue("argon2-hash"),
    verify: vi.fn(),
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
  const eventEmitter = { emit: vi.fn() };

  return { userRepo, refreshTokenRepo, hasher, tokenIssuer, rateLimiter, eventEmitter };
}

const dto = { email: "new-user@example.com", password: "correct-horse", timezone: "America/Sao_Paulo" };

describe("RegisterUserUseCase", () => {
  it("AUTH-01: returns ok(AuthSuccess) and emits UserRegistered on success", async () => {
    const deps = makeDeps();
    const useCase = new RegisterUserUseCase(
      deps.userRepo,
      deps.refreshTokenRepo,
      deps.hasher,
      deps.tokenIssuer,
      deps.rateLimiter,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deps.eventEmitter as any,
    );

    const result = await useCase.execute(dto, "1.2.3.4");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.accessToken).toBe("jwt-token");
    expect(result.value.refreshToken).toEqual(expect.any(String));

    expect(deps.eventEmitter.emit).toHaveBeenCalledWith(
      UserRegistered.name,
      expect.objectContaining({ userId: "user-1", email: "new-user@example.com" }),
    );
  });

  it("AUTH-02: returns err(AUTH_DUPLICATE_EMAIL) when the email pre-check finds an existing user, and never hashes the password", async () => {
    const deps = makeDeps();
    (deps.userRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(makeUser());
    const useCase = new RegisterUserUseCase(
      deps.userRepo,
      deps.refreshTokenRepo,
      deps.hasher,
      deps.tokenIssuer,
      deps.rateLimiter,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deps.eventEmitter as any,
    );

    const result = await useCase.execute(dto, "1.2.3.4");

    expect(result).toEqual({ ok: false, error: { code: "AUTH_DUPLICATE_EMAIL" } });
    expect(deps.hasher.hash).not.toHaveBeenCalled();
  });

  it("AUTH-06: returns err(AUTH_RATE_LIMITED) before any repo/hasher call when the IP is blocked", async () => {
    const deps = makeDeps();
    (deps.rateLimiter.isBlocked as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const useCase = new RegisterUserUseCase(
      deps.userRepo,
      deps.refreshTokenRepo,
      deps.hasher,
      deps.tokenIssuer,
      deps.rateLimiter,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deps.eventEmitter as any,
    );

    const result = await useCase.execute(dto, "1.2.3.4");

    expect(result).toEqual({ ok: false, error: { code: "AUTH_RATE_LIMITED" } });
    expect(deps.userRepo.findByEmail).not.toHaveBeenCalled();
    expect(deps.userRepo.create).not.toHaveBeenCalled();
    expect(deps.hasher.hash).not.toHaveBeenCalled();
  });

  it("AUTH-05 (unit-level): propagates err(AUTH_DUPLICATE_EMAIL) unchanged when create() hits the race outcome", async () => {
    const deps = makeDeps();
    (deps.userRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      err({ code: "AUTH_DUPLICATE_EMAIL" }),
    );
    const useCase = new RegisterUserUseCase(
      deps.userRepo,
      deps.refreshTokenRepo,
      deps.hasher,
      deps.tokenIssuer,
      deps.rateLimiter,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deps.eventEmitter as any,
    );

    const result = await useCase.execute(dto, "1.2.3.4");

    expect(result).toEqual({ ok: false, error: { code: "AUTH_DUPLICATE_EMAIL" } });
    expect(deps.refreshTokenRepo.create).not.toHaveBeenCalled();
  });
});
