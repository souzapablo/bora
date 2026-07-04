# BORA-21: Backend User Aggregate & Auth Endpoints Specification

**Jira:** [BORA-21](https://pablosouza.atlassian.net/browse/BORA-21) (subtask of BORA-17 "Login/Register")
**Context:** `.specs/features/bora-21-auth-backend/context.md`
**Gate note:** BORA-20 (Figma design) is Cancelled — see AD-002 in `.specs/STATE.md`. Domain/auth shape sourced from Confluence Domain Model + Tech Stack instead.

## Problem Statement

Bora has no way for a user to create an account or authenticate. Every other bounded context (Productivity, Gamification, Mental Health) needs a real `userId` to attach data to, and the frontend (BORA-22) needs a working auth API to build against. This ticket delivers the `User` aggregate plus the registration/login/refresh/logout endpoints, JWT access tokens, DB-persisted rotating refresh tokens, and argon2 password hashing — the Identity & Access module's foundational slice.

## Goals

- [ ] A client can register, log in, refresh an access token, and log out entirely through the API (curl/Postman), with no direct DB access.
- [ ] Passwords are never stored or logged in plaintext.
- [ ] A stolen/replayed refresh token is detected and the affected user's whole session family is revoked.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| --- | --- |
| Login/Register UI | BORA-22 (frontend), depends on this ticket's API |
| Full ABAC policy rule set (`PolicyService` beyond "own data" guard) | Tech Stack tracks this separately; this ticket only produces the authenticated identity the guard will consume |
| Password reset / forgot-password flow | Not raised in discussion; separate future ticket (see context.md Deferred Ideas) |
| Email verification | Tech Stack: "Full self-serve registration built from v1" implies no verification gate for v1 |
| Social/OAuth login | Not mentioned anywhere in Tech Stack; email+password only for v1 |
| Shared auth/account with Grana | Tech Stack explicitly defers this: "designed so a future shared account... is easy to plug in later, even though it won't be built in v1" |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here — nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Access token TTL | 15 minutes | Short-lived per Tech Stack ("short-lived JWT access token"); tunable constant, not hardcoded inline | n (agent default, tunable) |
| Refresh token TTL | 30 days | Standard long-lived session window; tunable constant | n (agent default, tunable) |
| Password minimum policy | Length only, ≥8 characters, no symbol/complexity rules | context.md: complexity rules beyond length were undiscussed; simplest policy that's still a real floor, adjustable later | n (agent default, tunable) |
| Login rate-limit threshold | 5 failed attempts / 15-minute rolling window per (email, IP) pair, then 429 | context.md: rate limiting confirmed in-scope; exact threshold undiscussed, chosen as a reasonable brute-force deterrent | n (agent default, tunable) |
| Registration throttle threshold | 10 requests / hour per IP | context.md: coarser IP-only throttle, left to agent discretion; bulk-account-creation deterrent, not a strict security boundary | n (agent default, tunable) |
| Rate-limit counter storage | In-memory (single NestJS process) | Tech Stack: backend is a single long-lived Railway process, no broker/cache in stack yet; in-memory is sufficient and simplest for v1 (resets on deploy — acceptable) | n (design-phase call per context.md) |
| Timezone capture at registration | Client sends `timezone` (IANA string) in the registration payload; backend only validates it's a real IANA zone, does not attempt server-side geo-detection | Domain Model says timezone is "auto-detected at registration" — server has no reliable detection mechanism without an external geo-IP service (not in Tech Stack); auto-detection must happen client-side via `Intl.DateTimeFormat().resolvedOptions().timeZone` and BORA-22 (frontend) sends it | n (assumption, revisit if BORA-22 needs a different contract) |
| Zod schema strictness | Request DTOs use `.strict()` — unknown fields rejected with 400 | No existing Zod convention in repo yet (first Zod usage); `.strict()` is the safer default for new API surface | n (agent default) |
| Email normalization | Lowercase + trim before uniqueness check, lookup, and storage | Prevents `Foo@x.com` / `foo@x.com` being treated as distinct accounts; not discussed explicitly but directly implied by the `Email` VO owning uniqueness | n (assumption) |
| Access token revocation on logout | Not attempted — only the refresh token is revoked; the still-live access token remains valid until its short TTL naturally expires | context.md Agent's Discretion: accepted window given the 15-minute access TTL; avoids needing an access-token blocklist for v1 | n (assumption) |

**Open questions:** none — all resolved above or via context.md discussion.

---

## User Stories

### P1: Register New Account ⭐ MVP

**User Story**: As a new user, I want to register with an email and password so that I get a Bora account and am immediately signed in.

**Why P1**: Nothing else in the system works without an account; this is the entry point.

**Acceptance Criteria**:

1. WHEN a client POSTs a valid email, password (≥8 chars), and IANA timezone to `/auth/register` THEN system SHALL create a `User` (argon2-hashed password, normalized email), emit `UserRegistered`, respond `201` with an access token in the response body, and set an httpOnly/Secure/SameSite=None refresh cookie backed by a new persisted `RefreshToken` row.
2. WHEN a client POSTs an email that already exists (case-insensitive) THEN system SHALL respond `409` with a generic "email already registered" message and SHALL NOT hash or compare the submitted password.
3. WHEN a client POSTs a password shorter than 8 characters THEN system SHALL respond `400` with a Zod validation error and SHALL NOT create a `User`.
4. WHEN a client POSTs a malformed email or an invalid IANA timezone string THEN system SHALL respond `400` with a Zod validation error.
5. WHEN two concurrent registration requests race for the same normalized email THEN system SHALL let exactly one succeed (DB unique constraint on `email`) and the other SHALL receive `409`, never a `500` or a duplicate row.
6. WHEN more than 10 registration requests arrive from the same IP within a rolling hour THEN system SHALL respond `429` for requests beyond the threshold.

**Independent Test**: Register with a new email → `201` + `Set-Cookie` present + access token in body. Repeat with the same email → `409`. Inspect the `User` row directly → `passwordHash` is an argon2 string, never the raw password.

---

### P1: Login ⭐ MVP

**User Story**: As a registered user, I want to log in with my email and password so that I receive a fresh access token and refresh session.

**Why P1**: Registration alone doesn't let a returning user re-authenticate.

**Acceptance Criteria**:

1. WHEN valid credentials are submitted to `/auth/login` THEN system SHALL respond `200` with a fresh access token in the body and set a new refresh cookie backed by a new persisted `RefreshToken` row.
2. WHEN the submitted email doesn't match any `User` THEN system SHALL respond `401` with the message "Invalid email or password", running the argon2 verify against a fixed dummy hash so response time doesn't distinguish this case from a wrong-password case.
3. WHEN the submitted password is wrong for an existing email THEN system SHALL respond `401` with the identical status and message as AC2 (no distinguishing signal).
4. WHEN a 6th failed login attempt occurs for the same (normalized email, IP) pair within a rolling 15-minute window THEN system SHALL respond `429` and SHALL NOT attempt password verification for that request.
5. WHEN a login succeeds for an (email, IP) pair that had prior failed attempts THEN system SHALL reset that pair's failure counter.

**Independent Test**: Log in with wrong password 6 times from the same client → the 6th response is `429`, not `401`. Log in with correct credentials → `200` + `Set-Cookie` header, and the failure counter resets (verified by a subsequent wrong attempt starting a fresh count).

---

### P1: Refresh Access Token ⭐ MVP

**User Story**: As a client whose access token is expiring, I want to exchange my refresh cookie for a new access token so my session continues without re-entering credentials.

**Why P1**: A 15-minute access token is useless without a working refresh path; this is required for any real session to function.

**Acceptance Criteria**:

1. WHEN a client POSTs `/auth/refresh` with a valid, unrevoked, unexpired refresh cookie THEN system SHALL issue a new access token, mark the presented `RefreshToken` row revoked, create and persist a new `RefreshToken` row, and set a new refresh cookie (rotation on every use).
2. WHEN the refresh cookie is missing THEN system SHALL respond `401`.
3. WHEN the refresh cookie corresponds to an expired `RefreshToken` row THEN system SHALL respond `401` and SHALL NOT issue a new access token.
4. WHEN the refresh cookie corresponds to a `RefreshToken` row already marked revoked (reuse of a rotated-out token) THEN system SHALL revoke every other active `RefreshToken` row belonging to that `userId` (whole-family revocation) and respond `401`.
5. WHEN the refresh cookie value doesn't match any `RefreshToken` row THEN system SHALL respond `401` (not `404`, to avoid leaking whether a token ever existed).

**Independent Test**: Log in, capture the refresh cookie. Call `/auth/refresh` once → `200` + a new cookie, old row now revoked. Replay the *original* cookie again → `401`, and the second-generation cookie (issued by the first refresh) is now also revoked and fails, proving family revocation happened.

---

### P2: Logout

**User Story**: As a logged-in user, I want to log out so my current refresh session can't be used again.

**Why P2**: Not required for the register→login→refresh happy path to function, but a natural and low-cost pairing once refresh tokens are DB-persisted and revocable.

**Acceptance Criteria**:

1. WHEN a client POSTs `/auth/logout` with a valid refresh cookie THEN system SHALL mark that `RefreshToken` row revoked and clear the cookie (`Set-Cookie` with past expiry), responding `204`.
2. WHEN a client POSTs `/auth/logout` with no refresh cookie THEN system SHALL respond `204` idempotently — the desired end state (logged out) already holds, so this is not an error.

**Independent Test**: Log in, then log out → `204` + cookie cleared. Attempt `/auth/refresh` with the now-revoked cookie → `401` (covered by Refresh AC4/AC5 behavior for a revoked/unmatched token).

---

## Edge Cases

- WHEN a request body contains unknown fields THEN system SHALL reject with `400` (Zod `.strict()` schemas).
- WHEN an email is submitted with mixed case or leading/trailing whitespace THEN system SHALL normalize (lowercase + trim) before uniqueness check, lookup, and storage.
- WHEN the argon2 hashing itself throws (e.g. OOM) THEN system SHALL respond `500` and SHALL NOT leave a partially-created `User` row (registration is one transaction).
- WHEN the refresh cookie is well-formed but its signature/format is invalid (tampered) THEN system SHALL treat it identically to "no matching `RefreshToken` row" (AC5 of Refresh) — `401`, no stack trace leaked to the client.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| AUTH-01 | P1: Register — success | Verified | ✅ Verified |
| AUTH-02 | P1: Register — duplicate email | Verified | ✅ Verified |
| AUTH-03 | P1: Register — password validation | Verified | ✅ Verified |
| AUTH-04 | P1: Register — email/timezone validation | Verified | ✅ Verified |
| AUTH-05 | P1: Register — concurrent duplicate race | Verified | ✅ Verified |
| AUTH-06 | P1: Register — IP throttle | Verified | ✅ Verified |
| AUTH-07 | P1: Login — success | Verified | ✅ Verified |
| AUTH-08 | P1: Login — unknown email generic error | Verified | ✅ Verified |
| AUTH-09 | P1: Login — wrong password generic error | Verified | ✅ Verified |
| AUTH-10 | P1: Login — rate-limit lockout | Verified | ✅ Verified |
| AUTH-11 | P1: Login — failure counter reset | Verified | ✅ Verified |
| AUTH-12 | P1: Refresh — success/rotation | Verified | ✅ Verified |
| AUTH-13 | P1: Refresh — missing cookie | Verified | ✅ Verified |
| AUTH-14 | P1: Refresh — expired token | Verified | ✅ Verified |
| AUTH-15 | P1: Refresh — reuse detection/family revocation | Verified | ✅ Verified |
| AUTH-16 | P1: Refresh — unmatched token | Verified | ✅ Verified |
| AUTH-17 | P2: Logout — success | Verified | ✅ Verified |
| AUTH-18 | P2: Logout — idempotent no-cookie | Verified | ✅ Verified |
| AUTH-19 | Edge case: email normalization | Verified | ✅ Verified |
| AUTH-20 | Edge case: strict Zod schemas / tampered cookie | Verified | ✅ Verified |

**Coverage:** 20 total, 20/20 verified against `.specs/features/bora-21-auth-backend/validation.md`, 0 unmapped.

---

## Success Criteria

- [ ] A client can complete register → login → refresh → logout entirely via HTTP, with correct status codes and cookie behavior at every step.
- [ ] No plaintext password ever appears in a DB row or a log line.
- [ ] A replayed (already-rotated) refresh token results in full family revocation, verified by a subsequent refresh attempt with a previously-valid sibling token also failing.
- [ ] Login and registration both enforce their respective rate limits, verified by exceeding each threshold in a test.
