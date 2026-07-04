import { Module } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { AuthController } from "../application/auth.controller";
import { ACCESS_TOKEN_TTL_SECONDS } from "../application/auth.constants";
import { LoginUserUseCase } from "../application/use-cases/login-user.use-case";
import { LogoutUseCase } from "../application/use-cases/logout.use-case";
import { RefreshSessionUseCase } from "../application/use-cases/refresh-session.use-case";
import { RegisterUserUseCase } from "../application/use-cases/register-user.use-case";
import { PrismaModule } from "../../shared/prisma/prisma.module";

import { Argon2PasswordHasher } from "./hashing/argon2-password-hasher";
import { PrismaRefreshTokenRepository } from "./persistence/prisma-refresh-token.repository";
import { PrismaUserRepository } from "./persistence/prisma-user.repository";
import { InMemoryRateLimiter } from "./rate-limit/in-memory-rate-limiter";
import { JwtAccessTokenIssuer } from "./tokens/jwt-access-token-issuer";

export const USER_REPOSITORY = "IDENTITY_USER_REPOSITORY";
export const REFRESH_TOKEN_REPOSITORY = "IDENTITY_REFRESH_TOKEN_REPOSITORY";
export const PASSWORD_HASHER = "IDENTITY_PASSWORD_HASHER";
export const ACCESS_TOKEN_ISSUER = "IDENTITY_ACCESS_TOKEN_ISSUER";
export const RATE_LIMITER = "IDENTITY_RATE_LIMITER";

/**
 * Wires the Identity & Access bounded-context module: ports -> concrete adapters via DI
 * tokens, the four use-cases, and the AuthController. Per CLAUDE.md, this is the only place
 * outside `application/`'s controller that composes the module's dependency graph.
 */
@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: RATE_LIMITER, useClass: InMemoryRateLimiter },
    {
      provide: ACCESS_TOKEN_ISSUER,
      useFactory: () =>
        new JwtAccessTokenIssuer(process.env.JWT_ACCESS_SECRET as string, ACCESS_TOKEN_TTL_SECONDS),
    },
    {
      provide: RegisterUserUseCase,
      useFactory: (
        userRepo: PrismaUserRepository,
        refreshTokenRepo: PrismaRefreshTokenRepository,
        hasher: Argon2PasswordHasher,
        tokenIssuer: JwtAccessTokenIssuer,
        rateLimiter: InMemoryRateLimiter,
        eventEmitter: EventEmitter2,
      ) =>
        new RegisterUserUseCase(userRepo, refreshTokenRepo, hasher, tokenIssuer, rateLimiter, eventEmitter),
      inject: [
        USER_REPOSITORY,
        REFRESH_TOKEN_REPOSITORY,
        PASSWORD_HASHER,
        ACCESS_TOKEN_ISSUER,
        RATE_LIMITER,
        EventEmitter2,
      ],
    },
    {
      provide: LoginUserUseCase,
      useFactory: (
        userRepo: PrismaUserRepository,
        refreshTokenRepo: PrismaRefreshTokenRepository,
        hasher: Argon2PasswordHasher,
        tokenIssuer: JwtAccessTokenIssuer,
        rateLimiter: InMemoryRateLimiter,
      ) => new LoginUserUseCase(userRepo, refreshTokenRepo, hasher, tokenIssuer, rateLimiter),
      inject: [USER_REPOSITORY, REFRESH_TOKEN_REPOSITORY, PASSWORD_HASHER, ACCESS_TOKEN_ISSUER, RATE_LIMITER],
    },
    {
      provide: RefreshSessionUseCase,
      useFactory: (refreshTokenRepo: PrismaRefreshTokenRepository, tokenIssuer: JwtAccessTokenIssuer) =>
        new RefreshSessionUseCase(refreshTokenRepo, tokenIssuer),
      inject: [REFRESH_TOKEN_REPOSITORY, ACCESS_TOKEN_ISSUER],
    },
    {
      provide: LogoutUseCase,
      useFactory: (refreshTokenRepo: PrismaRefreshTokenRepository) => new LogoutUseCase(refreshTokenRepo),
      inject: [REFRESH_TOKEN_REPOSITORY],
    },
  ],
})
export class IdentityModule {}
