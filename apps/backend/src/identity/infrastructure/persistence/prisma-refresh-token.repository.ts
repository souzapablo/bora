import { Injectable } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";

import type { RefreshToken } from "../../domain/entities/refresh-token";
import type {
  NewRefreshToken,
  RefreshTokenRepositoryPort,
} from "../../domain/ports/refresh-token-repository.port";
import { PrismaService } from "../../../shared/prisma/prisma.service";

import { toDomain, toPersistence } from "./refresh-token.mapper";

type RefreshTokenDelegateClient = Pick<PrismaClient, "refreshToken">;

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: NewRefreshToken, tx?: RefreshTokenDelegateClient): Promise<RefreshToken> {
    const client = tx ?? this.prisma;
    const row = await client.refreshToken.create({ data: toPersistence(data) });
    return toDomain(row);
  }

  async findByTokenHash(hash: string): Promise<RefreshToken | null> {
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    return row ? toDomain(row) : null;
  }

  async revoke(id: string, tx?: RefreshTokenDelegateClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  async revokeAllActiveForUser(userId: string, tx?: RefreshTokenDelegateClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
