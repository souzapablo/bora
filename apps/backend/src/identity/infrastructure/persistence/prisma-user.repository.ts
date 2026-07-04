import { Injectable } from "@nestjs/common";
import { Prisma, type PrismaClient } from "@prisma/client";

import { err, ok, type Result } from "../../../shared/result";
import type { User } from "../../domain/entities/user";
import type { AuthError } from "../../domain/errors/auth-error";
import type { NewUser, UserRepositoryPort } from "../../domain/ports/user-repository.port";
import type { Email } from "../../domain/value-objects/email";
import { PrismaService } from "../../../shared/prisma/prisma.service";

import { toDomain, toPersistence } from "./user.mapper";

type UserDelegateClient = Pick<PrismaClient, "user">;

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email: email.value } });
    return row ? toDomain(row) : null;
  }

  async create(data: NewUser, tx?: UserDelegateClient): Promise<Result<User, AuthError>> {
    const client = tx ?? this.prisma;

    try {
      const row = await client.user.create({ data: toPersistence(data) });
      return ok(toDomain(row));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return err({ code: "AUTH_DUPLICATE_EMAIL" });
      }
      throw error;
    }
  }
}
