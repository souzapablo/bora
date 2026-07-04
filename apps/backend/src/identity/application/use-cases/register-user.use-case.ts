import type { EventEmitter2 } from "@nestjs/event-emitter";

import type { AuthError } from "../../domain/errors/auth-error";
import { UserRegistered } from "../../domain/events/user-registered";
import type { AccessTokenIssuerPort } from "../../domain/ports/access-token-issuer.port";
import type { PasswordHasherPort } from "../../domain/ports/password-hasher.port";
import type { RateLimiterPort } from "../../domain/ports/rate-limiter.port";
import type { RefreshTokenRepositoryPort } from "../../domain/ports/refresh-token-repository.port";
import type { UserRepositoryPort } from "../../domain/ports/user-repository.port";
import { Email } from "../../domain/value-objects/email";
import { Timezone } from "../../domain/value-objects/timezone";
import { generateRawToken, hashToken } from "../../infrastructure/tokens/refresh-token-generator";
import { REGISTER_MAX_ATTEMPTS, REGISTER_WINDOW_MS, REFRESH_TOKEN_TTL_MS } from "../auth.constants";
import type { AuthSuccess } from "../auth-success";
import type { RegisterDto } from "../dto/register.schema";
import { err, ok, type Result } from "../../../shared/result";

/**
 * Registers a new user. Order of operations per design.md's Error Handling Strategy:
 * rate limit -> duplicate-email pre-check (before hashing) -> hash -> create User +
 * initial RefreshToken -> issue access token -> emit UserRegistered.
 */
export class RegisterUserUseCase {
  constructor(
    private readonly userRepo: UserRepositoryPort,
    private readonly refreshTokenRepo: RefreshTokenRepositoryPort,
    private readonly hasher: PasswordHasherPort,
    private readonly tokenIssuer: AccessTokenIssuerPort,
    private readonly rateLimiter: RateLimiterPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: RegisterDto, ip: string): Promise<Result<AuthSuccess, AuthError>> {
    const rateLimitOpts = { max: REGISTER_MAX_ATTEMPTS, windowMs: REGISTER_WINDOW_MS };
    const rateLimitKey = `register:${ip}`;

    if (this.rateLimiter.isBlocked(rateLimitKey, rateLimitOpts)) {
      return err({ code: "AUTH_RATE_LIMITED" });
    }
    this.rateLimiter.recordAttempt(rateLimitKey, rateLimitOpts);

    const email = new Email(dto.email);
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      return err({ code: "AUTH_DUPLICATE_EMAIL" });
    }

    const passwordHash = await this.hasher.hash(dto.password);
    const timezone = new Timezone(dto.timezone);

    const createResult = await this.userRepo.create({ email, passwordHash, timezone });
    if (!createResult.ok) {
      return err(createResult.error);
    }

    const user = createResult.value;
    const rawToken = generateRawToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    const refreshToken = await this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt,
    });

    const accessToken = this.tokenIssuer.issue({ sub: user.id });

    this.eventEmitter.emit(
      UserRegistered.name,
      new UserRegistered(user.id, user.email.value, new Date()),
    );

    return ok({
      accessToken,
      refreshToken: rawToken,
      refreshExpiresAt: refreshToken.expiresAt,
    });
  }
}
