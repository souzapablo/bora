/**
 * Controller-internal success shape shared by every auth use-case that issues a session.
 * `refreshToken` never appears in the JSON response body — the controller only ever
 * places it into the `Set-Cookie` header (design.md Response Shapes).
 */
export interface AuthSuccess {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}
