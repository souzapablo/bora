export class RefreshToken {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly tokenHash: string,
    readonly expiresAt: Date,
    readonly revokedAt: Date | null,
    readonly createdAt: Date,
  ) {}
}
