import type { RefreshTokenRepositoryPort } from "../../domain/ports/refresh-token-repository.port";
import { hashToken } from "../../infrastructure/tokens/refresh-token-generator";

/**
 * Logs a user out by revoking the presented refresh token. Always resolves successfully —
 * there is no error branch (AUTH-18: missing/unmatched token is idempotently a no-op).
 */
export class LogoutUseCase {
  constructor(private readonly refreshTokenRepo: RefreshTokenRepositoryPort) {}

  async execute(rawToken: string | undefined): Promise<void> {
    if (!rawToken) {
      return;
    }

    const existing = await this.refreshTokenRepo.findByTokenHash(hashToken(rawToken));
    if (!existing) {
      return;
    }

    await this.refreshTokenRepo.revoke(existing.id);
  }
}
