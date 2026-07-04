import * as argon2 from "argon2";

import type { PasswordHasherPort } from "../../domain/ports/password-hasher.port";

// Precomputed argon2id hash (same params as ARGON2_OPTIONS below) of an arbitrary fixed
// string, generated once offline — never regenerated at runtime. Used by the login use-case
// to run a verify() against *something* when the submitted email doesn't match any user, so
// the response time doesn't distinguish "unknown email" from "wrong password" (AUTH-08).
export const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$J+OaL+QEKT0ZJNf1XmO/9w$y05Iu8YKUQS4NdmfBekrO3w9b2XjV/B0//SpTKVQlDI";

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export class Argon2PasswordHasher implements PasswordHasherPort {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, ARGON2_OPTIONS);
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
