import { AppException } from "./errors/app-exception";
import type { AppError } from "./errors/app-error";

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function unwrap<T, E extends AppError>(result: Result<T, E>): T {
  if (!result.ok) {
    throw new AppException(result.error);
  }

  return result.value;
}
