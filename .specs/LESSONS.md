# Lessons Playbook

> Hand-maintained fallback — no Python interpreter was available in this environment (`python3`/`py` resolve to the Windows Store stub, not a real interpreter), so `scripts/lessons.py` could not run. Entries below are tracked manually per the no-script fallback in `references/lessons.md`. Accounting is best-effort until a real Python is available to take over `.specs/lessons.json`.

## Candidate (not yet promoted — needs 1 more corroborating feature)

- **L-003** (`spec_deviation`, first seen: `bora-3-repo-scaffolding`): When a per-package script deviates from the design doc's literal command even for a technically sound reason, mark the deviation with an inline comment or equivalent doc note so it is not silently undocumented.
- **L-004** (`ac_gap`, first seen: `bora-8-design-system`): When a spec's acceptance criterion asserts that changing a shared config/token value propagates to consumers without code changes, write a test that actually mutates the value at runtime and re-asserts a consumer's resolved output, not just a test of the consumer's current fixed values.
- **L-005** (`spec_precision_gap`, first seen: `bora-8-design-system`): When a spec's variant/state matrix names a pseudo-class-driven state (hover, focus), add a test that fires the corresponding event and asserts a distinct computed style, not just that the CSS rule exists in the stylesheet.
- **L-006** (`spec_deviation`, first seen: `bora-8-design-system`): When a component's prop type stands in for a not-yet-defined domain model, mark it with an inline SPEC_DEVIATION comment naming the missing domain source and the condition under which it must be revisited.
- **L-007** (`spec_deviation`, first seen: `bora-30-frontend-app-shell-infra`): When the design deliberately narrows a data shape that a spec AC enumerates (e.g. drops a field the AC lists in an error/DTO object), reconcile the spec text to the design at implementation time — don't leave the spec asserting a field the code intentionally omits. The Verifier will flag it as a spec↔impl deviation otherwise.

## Confirmed

- **L-001 / L-002** (`spec_precision_gap`, first seen: `bora-3-repo-scaffolding`; corroborated: `bora-30-frontend-app-shell-infra`): When a spec designates a manual/external verification method (DevTools inspection, CI dashboard observation, production-bundle spot-check) for an acceptance criterion, flag it as a spec-precision gap rather than silently passing it from static file evidence alone. Verify the *mechanism* in a unit test where possible, and confirm the actual runtime/build property with the appropriate out-of-band check (e.g. grep the built `dist/` bundle). Corroboration: BORA-30 DEVTOOLS-01 — the unit test asserts the `import.meta.env.DEV` guard + dynamic import, while real prod-bundle exclusion was verified by grepping `dist/assets/*.js`.
