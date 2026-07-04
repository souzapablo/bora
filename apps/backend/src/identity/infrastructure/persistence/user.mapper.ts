import type { User as PrismaUser } from "@prisma/client";

import { User } from "../../domain/entities/user";
import type { NewUser } from "../../domain/ports/user-repository.port";
import { Email } from "../../domain/value-objects/email";
import { Timezone } from "../../domain/value-objects/timezone";

/** Translates a Prisma `User` row into the ORM-free domain `User` entity. */
export function toDomain(row: PrismaUser): User {
  return new User(row.id, new Email(row.email), row.passwordHash, new Timezone(row.timezone), row.createdAt);
}

/** Translates a domain `NewUser` into the plain data shape Prisma's `create()` expects. */
export function toPersistence(data: NewUser): { email: string; passwordHash: string; timezone: string } {
  return {
    email: data.email.value,
    passwordHash: data.passwordHash,
    timezone: data.timezone.value,
  };
}
