import type { AuthError } from "../../domain/errors/auth-error";
import type { AccessTokenIssuerPort } from "../../domain/ports/access-token-issuer.port";
import type { PasswordHasherPort } from "../../domain/ports/password-hasher.port";
import type { RateLimiterPort } from "../../domain/ports/rate-limiter.port";
import type { RefreshTokenRepositoryPort } from "../../domain/ports/refresh-token-repository.port";
import type { UserRepositoryPort } from "../../domain/ports/user-repository.port";
import { Email } from "../../domain/value-objects/email";
import { DUMMY_HASH } from "../../infrastructure/hashing/argon2-password-hasher";
import { generateRawToken, hashToken } from "../../infrastructure/tokens/refresh-token-generator";
import { LOGIN_MAX_FAILED_ATTEMPTS, LOGIN_WINDOW_MS, REFRESH_TOKEN_TTL_MS } from "../auth.constants";
import type { AuthSuccess } from "../auth-success";
import type { LoginDto } from "../dto/login.schema";
import { err, ok, type Result } from "../../../shared/result";

/**
 * Logs a user in. Rate limit is keyed by (normalized email, IP) and counts only failed
 * attempts, resetting on success (AUTH-10/AUTH-11) — the reason design.md rejected
 * @nestjs/throttler in favor of a hand-rolled limiter. Unknown-email and wrong-password
 * converge on the same generic error and both run a password verify (real or dummy hash)
 * so response timing doesn't leak which case occurred (AUTH-08/AUTH-09).
 */
export class LoginUserUseCase {
  constructor(
    private readonly userRepo: UserRepositoryPort,
    private readonly refreshTokenRepo: RefreshTokenRepositoryPort,
    private readonly hasher: PasswordHasherPort,
    private readonly tokenIssuer: AccessTokenIssuerPort,
    private readonly rateLimiter: RateLimiterPort,
  ) {}

  async execute(dto: LoginDto, ip: string): Promise<Result<AuthSuccess, AuthError>> {
    const email = new Email(dto.email);
    const rateLimitOpts = { max: LOGIN_MAX_FAILED_ATTEMPTS, windowMs: LOGIN_WINDOW_MS };
    const rateLimitKey = `login:${email.value}:${ip}`;

    if (this.rateLimiter.isBlocked(rateLimitKey, rateLimitOpts)) {
      return err({ code: "AUTH_RATE_LIMITED" });
    }

    const user = await this.userRepo.findByEmail(email);

    const passwordMatches = user
      ? await this.hasher.verify(user.passwordHash, dto.password)
      : await this.hasher.verify(DUMMY_HASH, dto.password).then(() => false);

    if (!user || !passwordMatches) {
      this.rateLimiter.recordAttempt(rateLimitKey, rateLimitOpts);
      return err({ code: "AUTH_INVALID_CREDENTIALS" });
    }

    this.rateLimiter.reset(rateLimitKey);

    const rawToken = generateRawToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    const refreshToken = await this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt,
    });

    const accessToken = this.tokenIssuer.issue({ sub: user.id });

    return ok({
      accessToken,
      refreshToken: rawToken,
      refreshExpiresAt: refreshToken.expiresAt,
    });
  }
}
