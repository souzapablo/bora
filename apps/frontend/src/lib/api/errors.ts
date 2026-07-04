/**
 * Typed errors the API client rejects with, so callers can `instanceof`-discriminate
 * a decoded backend error (RFC 7807 Problem Details, per the backend's ProblemDetailsFilter)
 * from a transport failure. Every rejected request settles as exactly one of these.
 */

/** A decoded non-2xx backend response (or an undecodable one, with `code: "UNKNOWN"`). */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly detail?: string,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

/** A failure before any HTTP response arrived (offline, DNS, CORS). */
export class ApiNetworkError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "ApiNetworkError";
  }
}
