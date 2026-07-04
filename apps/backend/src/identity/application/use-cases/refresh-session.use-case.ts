import type { AuthError } from "../../domain/errors/auth-error";
import type { AccessTokenIssuerPort } from "../../domain/ports/access-token-issuer.port";
import type { RefreshTokenRepositoryPort } from "../../domain/ports/refresh-token-repository.port";
import { generateRawToken, hashToken } from "../../infrastructure/tokens/refresh-token-generator";
import { REFRESH_TOKEN_TTL_MS } from "../auth.constants";
import type { AuthSuccess } from "../auth-success";
import { err, ok, type Result } from "../../../shared/result";

/**
 * Exchanges a presented refresh cookie for a new access token, rotating the refresh
 * token on every use. Reuse of an already-rotated-out token triggers whole-family
 * revocation (AUTH-15) before returning the generic invalid-session error.
 */
export class RefreshSessionUseCase {
  constructor(
    private readonly refreshTokenRepo: RefreshTokenRepositoryPort,
    private readonly tokenIssuer: AccessTokenIssuerPort,
  ) {}

  async execute(rawToken: string | undefined): Promise<Result<AuthSuccess, AuthError>> {
    if (!rawToken) {
      return err({ code: "AUTH_MISSING_REFRESH_TOKEN" });
    }

    const existing = await this.refreshTokenRepo.findByTokenHash(hashToken(rawToken));
    if (!existing) {
      return err({ code: "AUTH_INVALID_REFRESH_TOKEN" });
    }

    if (existing.revokedAt) {
      await this.refreshTokenRepo.revokeAllActiveForUser(existing.userId);
      return err({ code: "AUTH_REFRESH_TOKEN_REUSED" });
    }

    if (existing.expiresAt < new Date()) {
      return err({ code: "AUTH_REFRESH_TOKEN_EXPIRED" });
    }

    await this.refreshTokenRepo.revoke(existing.id);

    const newRawToken = generateRawToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    const newRefreshToken = await this.refreshTokenRepo.create({
      userId: existing.userId,
      tokenHash: hashToken(newRawToken),
      expiresAt,
    });

    const accessToken = this.tokenIssuer.issue({ sub: existing.userId });

    return ok({
      accessToken,
      refreshToken: newRawToken,
      refreshExpiresAt: newRefreshToken.expiresAt,
    });
  }
}
