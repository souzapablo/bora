import type { RefreshToken as PrismaRefreshToken } from "@prisma/client";

import { RefreshToken } from "../../domain/entities/refresh-token";
import type { NewRefreshToken } from "../../domain/ports/refresh-token-repository.port";

/** Translates a Prisma `RefreshToken` row into the ORM-free domain `RefreshToken` entity. */
export function toDomain(row: PrismaRefreshToken): RefreshToken {
  return new RefreshToken(row.id, row.userId, row.tokenHash, row.expiresAt, row.revokedAt, row.createdAt);
}

/** Translates a domain `NewRefreshToken` into the plain data shape Prisma's `create()` expects. */
export function toPersistence(
  data: NewRefreshToken,
): { userId: string; tokenHash: string; expiresAt: Date } {
  return {
    userId: data.userId,
    tokenHash: data.tokenHash,
    expiresAt: data.expiresAt,
  };
}
