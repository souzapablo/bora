export interface AccessTokenIssuerPort {
  issue(payload: { sub: string }): string;
  verify(token: string): { sub: string };
}
