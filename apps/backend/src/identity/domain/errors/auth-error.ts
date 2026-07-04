import type { AppError } from "../../../shared/errors/app-error";
import type { ErrorCatalogEntry } from "../../../shared/errors/error-catalog";

export type AuthErrorCode =
  | "AUTH_DUPLICATE_EMAIL"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_RATE_LIMITED"
  | "AUTH_MISSING_REFRESH_TOKEN"
  | "AUTH_INVALID_REFRESH_TOKEN"
  | "AUTH_REFRESH_TOKEN_EXPIRED"
  | "AUTH_REFRESH_TOKEN_REUSED";

export interface AuthError extends AppError {
  code: AuthErrorCode;
}

export const AUTH_ERROR_CATALOG: Record<AuthErrorCode, ErrorCatalogEntry> = {
  AUTH_DUPLICATE_EMAIL: { status: 409, title: "Email already registered" },
  AUTH_INVALID_CREDENTIALS: { status: 401, title: "Invalid email or password" },
  AUTH_RATE_LIMITED: { status: 429, title: "Too many attempts" },
  AUTH_MISSING_REFRESH_TOKEN: { status: 401, title: "Invalid session" },
  AUTH_INVALID_REFRESH_TOKEN: { status: 401, title: "Invalid session" },
  AUTH_REFRESH_TOKEN_EXPIRED: { status: 401, title: "Invalid session" },
  AUTH_REFRESH_TOKEN_REUSED: { status: 401, title: "Invalid session" },
};
