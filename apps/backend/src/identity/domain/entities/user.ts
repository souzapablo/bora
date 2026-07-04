import type { Email } from "../value-objects/email";
import type { Timezone } from "../value-objects/timezone";

export class User {
  constructor(
    readonly id: string,
    readonly email: Email,
    readonly passwordHash: string,
    readonly timezone: Timezone,
    readonly createdAt: Date,
  ) {}
}
