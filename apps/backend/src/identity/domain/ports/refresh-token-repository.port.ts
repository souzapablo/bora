import type { RefreshToken } from "../entities/refresh-token";

import type { TransactionClient } from "./transaction-client";

export interface NewRefreshToken {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface RefreshTokenRepositoryPort {
  create(data: NewRefreshToken, tx?: TransactionClient): Promise<RefreshToken>;
  findByTokenHash(hash: string): Promise<RefreshToken | null>;
  revoke(id: string, tx?: TransactionClient): Promise<void>;
  revokeAllActiveForUser(userId: string, tx?: TransactionClient): Promise<void>;
}
