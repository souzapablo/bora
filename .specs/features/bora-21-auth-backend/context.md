# BORA-21 Backend Auth Context

**Gathered:** 2026-07-03
**Spec:** `.specs/features/bora-21-auth-backend/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Backend-only: `User` aggregate (Identity & Access module), registration endpoint, login endpoint, refresh endpoint, logout endpoint, JWT access token issuance, refresh-token persistence/rotation, argon2 password hashing. No UI (BORA-22, separate ticket, consumes this API). No ABAC policy engine wiring beyond what's needed to issue/validate the access token (`PolicyService`/`AbacGuard` is Domain Model's stated design but its actual policy rules are out of scope here — this ticket only produces the authenticated `User` identity the guard will later consume).

Gate note: BORA-20 (visual Figma design for this screen) is Cancelled. Per AD-002 in STATE.md, the domain/auth shape is instead sourced from the Domain Model and Tech Stack Confluence pages, which already fully specify the `User` aggregate and auth mechanism.

---

## Implementation Decisions

### Refresh token strategy

- Refresh tokens are DB-persisted, not stateless JWTs. A `RefreshToken` record (hashed token value, `userId`, `expiresAt`, `revokedAt`) lives in Identity & Access infrastructure (own table, same Postgres schema — per CLAUDE.md this doesn't cross module boundaries since only the Identity & Access module's repository touches it).
- Every refresh call rotates: the presented token is marked revoked and a new one is issued (new DB row + new cookie).
- Reuse detection: if a client presents a refresh token that is already `revoked`, treat it as likely theft — revoke every other active `RefreshToken` row for that `userId` (the whole token family), forcing full re-login on all devices/sessions.

### Login error policy

- Both "no such user" and "wrong password" return the same generic `401` with message "Invalid email or password." No enumeration signal in status code, message, or timing-sensitive shortcuts (still run the argon2 verify against a dummy hash when the user isn't found, so response time doesn't leak existence).

### Rate limiting

- Basic per-(email, IP) throttle on the login endpoint is in scope for this ticket: max 5 failed attempts per 15-minute window: on the 6th failure within the window, respond `429` until the window elapses. Threshold/window are tunable constants, not hardcoded magic numbers scattered in code.
- Registration gets a coarser IP-only throttle to blunt bulk account creation (exact threshold: agent's discretion, see below).

### Logout scope

- Logout is in scope as a P2 endpoint: revokes the `RefreshToken` row matching the presented cookie and clears the cookie. Does not attempt to invalidate the still-live access token (short TTL makes this an accepted window, per Agent's Discretion below).

### Agent's Discretion

- Exact access/refresh token TTLs, password minimum-length policy, and the registration-endpoint rate-limit threshold are treated as tunable defaults (mirrors the Domain Model's own precedent for the XP curve: "pick a simple placeholder to unblock building, adjust once it's in real use"). Chosen defaults and rationale are recorded in spec.md's Assumptions & Open Questions table, not decided here.
- Whether the rate-limit counter lives in-memory (single-process, acceptable for weekend-scope MVP per Tech Stack) or in Postgres is an implementation/design-phase call, not a product decision — left to Design.

### Declined / Undiscussed Gray Areas → Assumptions

- Email verification flow: not raised — Tech Stack states "Full self-serve registration built from v1" with no mention of a verification step, read as confirmation email verification is out of scope for v1. Logged as an assumption in spec.md.
- Password reset / forgot-password flow: not discussed — treated as a separate future ticket, out of scope here (logged in Deferred Ideas below).
- Password complexity rules beyond minimum length (e.g. requiring symbols): not discussed — logged as an assumption (length-only policy) in spec.md.

---

## Specific References

No specific product/UX references — this is a backend-only ticket with no visual surface. Behavior follows the Domain Model and Tech Stack Confluence pages already in the repo.

---

## Deferred Ideas

- Password reset / forgot-password flow — separate future ticket.
- Email verification — separate future ticket, not implied as needed by Tech Stack's "full self-serve registration" note.
- Full ABAC policy rule set (`PolicyService` beyond "you can only access your own data") — tracked elsewhere per Tech Stack, not this ticket's concern beyond producing the authenticated identity.
