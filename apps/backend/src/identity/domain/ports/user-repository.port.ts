import type { Result } from "../../../shared/result";
import type { User } from "../entities/user";
import type { AuthError } from "../errors/auth-error";
import type { Email } from "../value-objects/email";
import type { Timezone } from "../value-objects/timezone";

import type { TransactionClient } from "./transaction-client";

export interface NewUser {
  email: Email;
  passwordHash: string;
  timezone: Timezone;
}

export interface UserRepositoryPort {
  findByEmail(email: Email): Promise<User | null>;
  create(data: NewUser, tx?: TransactionClient): Promise<Result<User, AuthError>>;
}
