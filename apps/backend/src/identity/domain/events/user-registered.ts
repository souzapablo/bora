export class UserRegistered {
  constructor(
    readonly userId: string,
    readonly email: string,
    readonly occurredAt: Date,
  ) {}
}
