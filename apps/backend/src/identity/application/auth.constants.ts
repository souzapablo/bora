/** Access token lifetime, in seconds. Kept short per design.md ("short-lived JWT access token"). */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

/** Refresh token lifetime, in milliseconds. */
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Login rate limit: failed attempts allowed per (email, IP) pair within the rolling window. */
export const LOGIN_MAX_FAILED_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** Registration throttle: requests allowed per IP within the rolling window. */
export const REGISTER_MAX_ATTEMPTS = 10;
export const REGISTER_WINDOW_MS = 60 * 60 * 1000;

/** Refresh token cookie name/path. */
export const REFRESH_COOKIE_NAME = "refresh_token";
export const REFRESH_COOKIE_PATH = "/auth";
