import { JwtService } from "@nestjs/jwt";

import type { AccessTokenIssuerPort } from "../../domain/ports/access-token-issuer.port";

/**
 * Thin wrapper over @nestjs/jwt's JwtService, configured with the app's access-token secret
 * and TTL. Payload is `{ sub: userId }` only (see design.md Tech Decisions).
 *
 * SPEC_DEVIATION: `expiresInSeconds` is a constructor parameter rather than importing
 * `ACCESS_TOKEN_TTL_SECONDS` from `identity/application/auth.constants.ts` directly, because
 * T22 (which defines that constant) hasn't landed yet in this phase — per tasks.md T18's
 * note ("configured with JWT_ACCESS_SECRET + ACCESS_TOKEN_TTL_SECONDS ... or a locally-passed
 * value until T22 lands"). Callers wire the real constant in once T22/T28 land.
 */
export class JwtAccessTokenIssuer implements AccessTokenIssuerPort {
  private readonly jwtService: JwtService;

  constructor(secret: string, expiresInSeconds: number) {
    this.jwtService = new JwtService({
      secret,
      signOptions: { expiresIn: expiresInSeconds },
    });
  }

  issue(payload: { sub: string }): string {
    return this.jwtService.sign(payload);
  }

  verify(token: string): { sub: string } {
    return this.jwtService.verify(token);
  }
}
