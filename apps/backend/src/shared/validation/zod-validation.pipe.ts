import type { PipeTransform } from "@nestjs/common";
import type { ZodSchema } from "zod";

import { AppException } from "../errors/app-exception";

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new AppException({
        code: "VALIDATION_FAILED",
        detail: "Request validation failed",
        meta: {
          errors: result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
    }

    return result.data;
  }
}
