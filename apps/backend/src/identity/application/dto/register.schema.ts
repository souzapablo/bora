import { z } from "zod";

import { isValidIanaTimezone } from "../../domain/value-objects/timezone";

/**
 * Registration request DTO. `.strict()` rejects any unknown field (AUTH-20).
 * Password floor is length-only (>= 8 chars, AUTH-03); timezone must be a real
 * IANA zone (AUTH-04), validated via the same check the `Timezone` VO uses.
 */
export const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    timezone: z.string().refine(isValidIanaTimezone),
  })
  .strict();

export type RegisterDto = z.infer<typeof registerSchema>;
