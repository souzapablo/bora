# Lessons Playbook

> Hand-maintained fallback — no Python interpreter was available in this environment (`python3`/`py` resolve to the Windows Store stub, not a real interpreter), so `scripts/lessons.py` could not run. Entries below are tracked manually per the no-script fallback in `references/lessons.md`. Accounting is best-effort until a real Python is available to take over `.specs/lessons.json`.

## Candidate (not yet promoted — needs 1 more corroborating feature)

- **L-001 / L-002** (`spec_precision_gap`, first seen: `bora-3-repo-scaffolding`): When a spec designates a manual/external verification method (DevTools inspection, CI dashboard observation) for an acceptance criterion, flag it as a spec-precision gap rather than silently passing it from static file evidence alone.
- **L-003** (`spec_deviation`, first seen: `bora-3-repo-scaffolding`): When a per-package script deviates from the design doc's literal command even for a technically sound reason, mark the deviation with an inline comment or equivalent doc note so it is not silently undocumented.

## Confirmed

(none yet)
