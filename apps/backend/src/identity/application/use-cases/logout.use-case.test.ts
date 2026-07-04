import { describe, expect, it, vi } from "vitest";

import { RefreshToken } from "../../domain/entities/refresh-token";
import type { RefreshTokenRepositoryPort } from "../../domain/ports/refresh-token-repository.port";

import { LogoutUseCase } from "./logout.use-case";

function makeDeps() {
  const refreshTokenRepo: RefreshTokenRepositoryPort = {
    create: vi.fn(),
    findByTokenHash: vi.fn().mockResolvedValue(
      new RefreshToken("rt-1", "user-1", "hash", new Date(Date.now() + 1000), null, new Date()),
    ),
    revoke: vi.fn(),
    revokeAllActiveForUser: vi.fn(),
  };

  return { refreshTokenRepo };
}

describe("LogoutUseCase", () => {
  it("AUTH-17: a valid token calls revoke() with the matching row's id", async () => {
    const deps = makeDeps();
    const useCase = new LogoutUseCase(deps.refreshTokenRepo);

    await useCase.execute("raw-token");

    expect(deps.refreshTokenRepo.revoke).toHaveBeenCalledWith("rt-1");
  });

  it("AUTH-18: an undefined token resolves without throwing and never calls revoke()", async () => {
    const deps = makeDeps();
    const useCase = new LogoutUseCase(deps.refreshTokenRepo);

    await expect(useCase.execute(undefined)).resolves.toBeUndefined();
    expect(deps.refreshTokenRepo.revoke).not.toHaveBeenCalled();
  });

  it("AUTH-18: an unmatched token resolves without throwing and never calls revoke()", async () => {
    const deps = makeDeps();
    (deps.refreshTokenRepo.findByTokenHash as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const useCase = new LogoutUseCase(deps.refreshTokenRepo);

    await expect(useCase.execute("unmatched-token")).resolves.toBeUndefined();
    expect(deps.refreshTokenRepo.revoke).not.toHaveBeenCalled();
  });
});
