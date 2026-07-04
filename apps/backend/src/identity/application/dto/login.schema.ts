import { z } from "zod";

/**
 * Login request DTO. `.strict()` rejects any unknown field (AUTH-20). Password has no
 * minimum length here — that's a registration-time policy, not a login-time one; any
 * non-empty string is submitted for verification against the stored hash.
 */
export const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();

export type LoginDto = z.infer<typeof loginSchema>;
