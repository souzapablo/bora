import type { AppError } from "./app-error";

export class AppException extends Error {
  constructor(readonly appError: AppError) {
    super(appError.code);
  }
}
