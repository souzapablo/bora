# BORA-8 Design System Validation

**Date**: 2026-07-03
**Spec**: `.specs/features/bora-8-design-system/spec.md`
**Diff range**: `e7bba0f..3fa9b16` (11 commits, T1–T11)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## ITERATION 2 (fix round) — 2026-07-03

**Diff range this round**: `3fa9b16..e815596` (fix commit only), full feature range `e7bba0f..e815596`
**Verifier**: fresh independent sub-agent (different session from iteration 1; author of fix ≠ this verifier)

This section re-verifies the 3 issues iteration 1 flagged as FAIL/informational. All 11 previously-PASS criteria were spot-checked (Card AC4 re-confirmed passing, no regression) and trusted from iteration 1 otherwise, per verification scope instructions.

### Fix 1 re-check — P1 AC5 (token propagation)

Fix commit `e815596` adds 3 tests to `Button.test.tsx` (color/spacing/typography token propagation), each asserting two things:
1. `getComputedStyle(document.documentElement).getPropertyValue('--token')` reflects a newly-`setProperty`'d value (proves the custom property itself updates at the cascade root).
2. The component's `.module.css` source uses `var(--token-name)` indirection, not a baked-in literal (proves no component code change is needed for propagation).

**Independent reproduction of the jsdom limitation**: I wrote a scratch test (`getComputedStyle(el).backgroundColor` on an element styled via `var(--my-color)` after setting the custom property on `:root`) and confirmed jsdom returns the literal string `"var(--my-color)"`, never a resolved color — verifying the author's claim is a real environment constraint, not a rationalization. Scratch file was removed after the check; working tree confirmed clean.

**Judgment on the two-part strategy**: legitimate and non-shallow, not a rationalization. Given the confirmed jsdom constraint, no test in this environment could ever assert a truly-resolved end-to-end value — any such test would be theater (it would need to hardcode expectations that jsdom cannot actually produce from the CSS cascade). The two-part decomposition (cascade-root property update + var() indirection in the consuming rule) is the maximal claim the spec's "propagates without code change" requirement can mean, decomposed into its two independently-necessary and jointly-sufficient parts, each backed by a real assertion against real source. The discrimination sensor (below) confirms these tests are not vacuous — breaking the var() indirection kills the test.

| Criterion | file:line + assertion | Result |
| --- | --- | --- |
| P1 AC5 (color token) | `Button.test.tsx:39-52` — `setProperty`/`getPropertyValue` diff on `--color-accent-habit-default` + regex `.primary { ... background-color: var(--color-accent-habit-default) }` | ✅ PASS |
| P1 AC5 (spacing token) | `Button.test.tsx:54-67` — same pattern for `--space-4` + regex on `.md { padding: var(--space-2) var(--space-4) }` | ✅ PASS |
| P1 AC5 (typography token) | `Button.test.tsx:69-82` — same pattern for `--font-size-body` + regex on `.md { font-size: var(--font-size-body) }` | ✅ PASS |

**Verdict**: Fix 1 resolved. Gap closed.

### Fix 2 re-check — Button hover / Input focused states

- `Button.test.tsx:84-98` — fires `fireEvent.mouseOver`, confirms it doesn't throw, then asserts (via CSS-source regex) that `.primary:not(:disabled):hover` and `.secondary:not(:disabled):hover` set a background-color token distinct from each variant's default. jsdom does not live-evaluate `:hover` in `getComputedStyle` (also independently plausible given the confirmed `var()` non-resolution — pseudo-class matching for computed style is a separate, also-unsupported jsdom gap), so structural verification via source-regex is the correct fallback, same reasoning as Fix 1.
- `Input.test.tsx:35-49` — calls `input.focus()`, asserts `document.activeElement === input` (real focus event, not simulated), then asserts via CSS-source regex that `.input:focus` sets `border-color: var(--color-accent-habit-default)` distinct from the base rule's `border-color: var(--color-neutral-300)`.

Both tests exercise a real DOM interaction (`fireEvent.mouseOver`, `.focus()`) in addition to the structural CSS check — this is stronger than a pure source-regex test alone, since it proves the interaction path doesn't throw/break and that focus genuinely lands on the element.

| Criterion | file:line + assertion | Result |
| --- | --- | --- |
| P2 AC2 (Button hover) | `Button.test.tsx:84-98` | ✅ PASS |
| P2 AC3 (Input focused) | `Input.test.tsx:35-49` | ✅ PASS |

**Verdict**: Fix 2 resolved. Gaps closed.

### Fix 3 re-check — afterEach(cleanup) consistency

`Card.test.tsx` and `StreakBadge.test.tsx` now import `cleanup`/`afterEach` and call `afterEach(cleanup)` (previously missing). `Input.test.tsx` also gained it as part of this diff. Current state across all 7 component test files:

| File | `afterEach(cleanup)`? | Uses `screen.*` global queries? | Risk |
| --- | --- | --- | --- |
| Button.test.tsx | No | No (container-scoped only, confirmed by reading full file) | None |
| Input.test.tsx | Yes | Yes | None |
| Card.test.tsx | Yes | No (container-scoped) | None |
| XPBar.test.tsx | No | No (container-scoped, per iteration 1) | None |
| StreakBadge.test.tsx | Yes | Yes | None |
| MoodPicker.test.tsx | Yes (pre-existing) | Yes | None |
| TabBar.test.tsx | Yes (pre-existing) | Yes | None |

Every file that uses `screen.*` global queries now has `afterEach(cleanup)`; every file without it uses only `container`-scoped queries, which are immune to document-leakage. The rule is now consistently applied (cleanup present exactly where `screen.*` is used), closing the latent risk. **Verdict**: Fix 3 resolved.

### Gate Check (iteration 2)

- `pnpm --filter frontend build` — ✅ succeeds, no errors
- `pnpm --filter frontend lint` — ✅ clean, zero errors/warnings
- `pnpm --filter frontend test` — ✅ 46 passed, 0 failed, 0 skipped (9 test files; +5 net vs. iteration 1's 41: +4 in Button, +1 in Input; Card/StreakBadge test counts unchanged, only cleanup added)

### Discrimination Sensor (iteration 2, targeted at fix code)

All mutations applied via direct file edit, tests run, then reverted with `git checkout --`; `git status` confirmed clean after each and after all three.

| # | File:line | Description | Killed? |
| - | --- | --- | --- |
| 1 | `Button.module.css:37` | Hover rule no longer distinct: `.primary:not(:disabled):hover` background-color changed from `var(--color-accent-habit-hover)` to `var(--color-accent-habit-default)` | ✅ Killed — `Button.test.tsx` hover test failed on the `.primary:not(:disabled):hover ... background-color: var(--color-accent-habit-hover)` regex |
| 2 | `Input.module.css:15` | Focus rule no longer distinct: `.input:focus` border-color changed from `var(--color-accent-habit-default)` to `var(--color-neutral-300)` (same as default) | ✅ Killed — `Input.test.tsx` focus test failed on the `.input:focus ... border-color: var(--color-accent-habit-default)` regex |
| 3 | `Button.module.css:23` | Broke var() indirection: `.md` padding changed from `var(--space-2) var(--space-4)` to `var(--space-2) 16px` (baked-in literal, breaking the "no code change needed" propagation claim) | ✅ Killed — both the new spacing-propagation test's var()-indirection regex AND the pre-existing hardcoded-value guard test failed |

**Sensor depth**: lightweight (3 mutations, targeted at fix-round code)
**Result**: 3/3 killed — ✅ PASS

### Summary (iteration 2)

**Overall**: ✅ PASS (upgraded from ⚠️ Issues in iteration 1)

**Spec-anchored check**: 14/14 requirement IDs now covered with non-shallow, evidence-backed tests (DSYS-05, DSYS-07, DSYS-08 closed this round)
**Sensor**: 3/3 mutations killed (targeted at new fix code)
**Gate**: 46 passed, 0 failed, 0 skipped (build, lint, test all clean)

**What changed since iteration 1**: 3 new propagation tests in `Button.test.tsx` (color/spacing/typography), 1 new hover-interaction test in `Button.test.tsx`, 1 new focus-interaction test in `Input.test.tsx`, `afterEach(cleanup)` added to `Card.test.tsx`, `Input.test.tsx`, `StreakBadge.test.tsx`.

**Remaining gaps**: None blocking. The only residual note is the same forward-looking one from iteration 1 (Fix 3 in the original report): components consume `--color-neutral-*` directly rather than semantic `--color-surface`/`--color-text` tokens, so a future dark-mode block would need a small refactor at that time — explicitly out of scope for this ticket and not a defect.

**Next steps**: None. Feature is ready to close.

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | colors.css: neutral 0-900, habit + mood accent scales, `[data-theme="light"]` block |
| T2   | ✅ Done | typography.css: full named type scale |
| T3   | ✅ Done | spacing.css: 8 steps |
| T4   | ✅ Done | tokens/index.css aggregates in stable order; imported once in main.tsx |
| T5   | ✅ Done | Button.tsx + tests |
| T6   | ✅ Done | Input.tsx + tests |
| T7   | ✅ Done | Card.tsx + tests |
| T8   | ✅ Done | XPBar.tsx + tests |
| T9   | ✅ Done | StreakBadge.tsx + tests |
| T10  | ✅ Done | MoodPicker.tsx + tests, SPEC_DEVIATION comment present |
| T11  | ✅ Done | TabBar.tsx + tests |

---

## Spec-Anchored Acceptance Criteria

### P1: Token foundation

| Criterion | Spec-defined outcome | file:line + assertion | Result |
| --- | --- | --- | --- |
| AC1: color tokens file, `:root` + `[data-theme="light"]`, dark-ready structure | Properties present under both blocks; theme-sensitive props not renamed when dark added | `apps/frontend/src/design-system/tokens/colors.css:1-44` — `:root` neutral/accent scale; `:38-44` `[data-theme="light"]` redeclares `--color-surface`, `--color-text`, etc. via `var()` refs to neutral scale | ✅ PASS (structural — no test, correctly a build-gate-only item per Test Coverage Matrix) |
| AC2: neutral + 2 accent sub-palettes, independently consumable | Neutral scale + `--color-accent-habit-*` + `--color-accent-mood-*`, each a full scale | `colors.css:15-31` — 7-step habit scale, 7-step mood scale, distinct hues (amber vs teal) | ✅ PASS |
| AC3: named type scale | heading/body/caption roles as custom properties, values chosen at implementation | `typography.css:5-16` — `--font-size-heading-1/2`, `--font-size-body`, `--font-size-caption`, weights, line-heights | ✅ PASS |
| AC4: named spacing scale | numbered steps, consistent base unit | `spacing.css:1-10` — `--space-1`..`--space-8`, consistent 0.25rem-derived scale | ✅ PASS |
| AC5: token value change propagates to consuming components without code change | verified by test/manual check, one component per token category | No dedicated "change a token, assert component reflects it" test exists anywhere in the diff. `Card.test.tsx` and others assert *current* resolved values, not that a changed value propagates. | ❌ GAP — AC5 not directly covered by any test; components do consume via `var()` (verified structurally and by the Card computed-style test), but the specific "change one token, confirm a consuming component's style updates without editing the component" independent test is not present. |

### P2: Core components

| Criterion | Spec-defined outcome | file:line + assertion | Result |
| --- | --- | --- | --- |
| AC1: all 7 components exist, exact names | `Button`, `Input`, `Card`, `XPBar`, `StreakBadge`, `MoodPicker`, `TabBar` under `components/` | `Button/Button.tsx:17` `export function Button`, `Input/Input.tsx:13`, `Card/Card.tsx:12`, `XPBar/XPBar.tsx:11`, `StreakBadge/StreakBadge.tsx:8`, `MoodPicker/MoodPicker.tsx:13`, `TabBar/TabBar.tsx:14`; each has `index.ts` re-export | ✅ PASS |
| AC2: Button variant×state, color-tokens only | primary/secondary/danger × default/hover/disabled/loading, no hardcoded hex/rgb | `Button.test.tsx:18-30` — 3 variants × 3 states rendered without throw; `:32-41` — regex asserts zero `#hex`/`rgba(`/bare-px outside `var()` in `Button.module.css` | ✅ PASS — but note: "hover" state is CSS `:hover` pseudo-class only (`Button.module.css:36`), not exercised by any test (no `fireEvent.mouseOver` + computed-style assertion). Test loop only varies `disabled`/`loading`, not an explicit hover render check. |
| AC3: Input state, color+spacing tokens | default/focused/error/disabled | `Input.test.tsx:11-21` default/error/disabled rendered; `:23-31` onChange fires with new value | ⚠️ Spec-precision gap — "focused" state is not exercised by any test (no `fireEvent.focus` + assertion), though CSS defines `.input:focus` (`Input.module.css:13`). Spec AC3 explicitly lists `focused` as one of the four states. |
| AC4: Card default + habit + mood accent, visually distinct | neutral/habit/mood variants render; habit and mood resolve to different computed bg/border color | `Card.test.tsx:14-18` all 3 accents render; `:20-29` — `getComputedStyle` diff on `backgroundColor`/`borderColor` between habit and mood containers | ✅ PASS — verified non-shallow via fault injection (see Sensor below) |
| AC5: XPBar empty/partial/full, habit accent | distinct visual width/state at 0/50/100 | `XPBar.test.tsx:11-30` — asserts `style.width` exactly `"0%"`/`"50%"`/`"100%"` per progress value | ✅ PASS |
| AC6: StreakBadge active/broken states, habit accent | visually distinct active vs inactive | `StreakBadge.test.tsx:22-29` — `getComputedStyle(...).backgroundColor` compared not-equal between active/inactive | ✅ PASS |
| AC7: MoodPicker options + selected/unselected, mood accent | every option renders; selected distinct from unselected; click fires onSelect | `MoodPicker.test.tsx:15-21` all options render; `:23-28` `aria-pressed` "true"/"false"; `:30-37` `onSelect` called with clicked mood value | ✅ PASS |
| AC8: TabBar default + active-tab, neutral tokens only | active tab distinct from others | `TabBar.test.tsx:27-33` `aria-selected` "true" for active tab, "false" for others; `:52-63` regex + explicit `not.toMatch(/--color-accent-(habit|mood)-/)` | ✅ PASS |
| AC9: no hardcoded color/spacing/font-size outside tokens, verified by lint/grep in test | zero literal values outside `var()` | Every component test file (`Button`, `Input`, `Card`, `XPBar`, `StreakBadge`, `MoodPicker`, `TabBar`) has an identical regex-based check reading the `.module.css` source and asserting no `#hex`, no `rgba?(`, no bare `\d+px` outside `var()` calls | ✅ PASS — spot-checked manually against all 7 `.module.css` files; confirmed no literal values present (all `border-width: thin`, `border-style: solid` are keyword values, not the checked patterns) |

**Status**: ❌ Gaps present (1 uncovered AC — P1 AC5; 1 spec-precision gap — P2 AC3 `focused` state untested; Button `hover` state also untested but CSS-only per spec wording "styled via ... tokens" not "tested per pseudo-state")

---

## Edge Cases

| Edge case | Result |
| --- | --- |
| New value with no token → must be added as a named token, not hardcoded inline | ✅ Handled — no new one-off values found; all component CSS references existing token names only (spot-checked against `colors.css`/`typography.css`/`spacing.css`) |
| Habit/mood accent on same component type (Card) must remain visually distinct | ✅ Handled and verified non-shallow — `Card.test.tsx:20-29`; confirmed via fault injection (Sensor mutation 3) that the test genuinely fails when habit/mood background colors are made to collide |
| Future `[data-theme="dark"]` block must slot in without rebuilding components | ⚠️ Structurally plausible but **not tested** — `colors.css` redeclares only `--color-surface`, `--color-surface-muted`, `--color-text`, `--color-text-muted`, `--color-border` under `[data-theme="light"]`. None of the 7 components actually consume these theme-sensitive tokens (`--color-surface`, `--color-text`) today — they consume `--color-neutral-*` directly (e.g. `Card.module.css:9` uses `--color-neutral-50`, not `--color-surface`). This means a future dark-mode block redeclaring `--color-surface`/`--color-text` would **not** actually re-theme any of the 7 components as built, since none of them reference those semantic tokens. The token *file* structure supports a dark block without renaming, but the edge case's intent ("component doesn't need to be rebuilt to pick up dark values") is not demonstrated by any consuming component. No test covers this either way. |

---

## Discrimination Sensor

All mutations applied via direct file edit in the working tree, tests run, then reverted with `git checkout --`; confirmed `git status`/`git diff` clean after each and after all three.

| # | File:line | Description | Killed? |
| - | --- | --- | --- |
| 1 | `apps/frontend/src/design-system/components/XPBar/XPBar.tsx:7-9` | Removed upper clamp: `clamp()` changed from `Math.min(max, Math.max(min, value))` to `Math.max(min, value)` (no longer caps at 100) | ✅ Killed — `XPBar.test.tsx` "clamps out-of-range progress above 100 to 100" failed: expected `"100"`, got `"150"` |
| 2 | `apps/frontend/src/design-system/components/MoodPicker/MoodPicker.tsx:20-21` | Flipped selected-state comparison: `mood === selected` → `mood !== selected` (both `className` and `aria-pressed`) | ✅ Killed — `MoodPicker.test.tsx` "shows the selected option..." failed: expected `"true"`, got `"false"` |
| 3 | `apps/frontend/src/design-system/components/Card/Card.module.css:19` | Made `.mood` background-color reuse `--color-accent-habit-50` instead of `--color-accent-mood-50` (habit/mood background collision) | ✅ Killed — `Card.test.tsx` "resolves habit and mood accents to visually distinct computed colors" failed: both resolved to `var(--color-accent-habit-50)` |

**Sensor depth**: lightweight (3 mutations, standard feature)
**Result**: 3/3 killed — ✅ PASS

**Note on `vitest.config.ts` `css: true`**: independently verified as load-bearing, not a red herring. Temporarily removed `css: true` from `apps/frontend/vitest.config.ts` and re-ran `Card.test.tsx`: the "visually distinct computed colors" test failed with both `habitStyle.backgroundColor` and `moodStyle.backgroundColor` resolving to `'rgba(0, 0, 0, 0)'` (CSS Modules not applied under jsdom without `css: true`, so no styles resolve at all). Restored `css: true` and confirmed the test passes again. Change reverted; working tree clean.

**Note on "visually distinct" assertions being non-shallow**: `Card.test.tsx` and `StreakBadge.test.tsx` use `getComputedStyle(...).backgroundColor`/`.borderColor` comparisons, not class-name presence checks. Confirmed via mutation 3 above that these fail correctly when the underlying CSS values collide — not shallow.

---

## Document-Leakage Check (no auto-cleanup, `globals: false`)

`MoodPicker.test.tsx` and `TabBar.test.tsx` both correctly call `afterEach(cleanup)` (required since each renders multiple `it()` blocks using `screen.*` global queries against `document.body`, and a prior render's DOM would otherwise persist and cause ambiguous/duplicate query matches).

Checked all other component test files for the same risk:
- `Button.test.tsx`, `Input.test.tsx`, `XPBar.test.tsx`: no `afterEach(cleanup)`, but also make no `screen.*` global queries across multiple `it()` blocks that could collide (Input's one `screen.getByPlaceholderText` call is in an isolated test with a placeholder unique to that test; XPBar and Button use `container`-scoped queries only). No latent bug — accidental correctness, not a defect, since queries never collide across the specific values used.
- `Card.test.tsx`, `StreakBadge.test.tsx`: use `screen.getByText` (StreakBadge) and `container`-scoped queries (Card) without `afterEach(cleanup)`. `StreakBadge.test.tsx:14,19` call `screen.getByText("7")` and `screen.getByText("3")` in separate `it()` blocks — these happen not to collide today (distinct count values), but this is the same latent risk pattern flagged in the task brief: if two `it()` blocks in this file ever assert on the same `count` value, `getByText` would throw on finding multiple matches (accumulated across un-cleaned-up renders). **Inconsistency**: 2 of 7 component test files use `afterEach(cleanup)`, 5 do not, with no documented rule for when it's required — flagged as a code-quality gap, not a currently-failing test.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ Each component is small, no speculative props beyond spec |
| Surgical changes | ✅ `main.tsx` +1 import line only; `vitest.config.ts` +1 line (`css: true`, justified above) |
| No scope creep | ✅ No dark palette values, no theme toggle, no Storybook — matches Out of Scope table |
| Matches patterns | ✅ Consistent CSS Modules + colocated test pattern across all 7 components; consistent hardcoded-value regex test repeated per component |
| Spec-anchored outcome check | ⚠️ 1 gap (P1 AC5), 1 spec-precision gap (Input `focused` untested) — see above |
| Per-layer Coverage Expectation met | ⚠️ Mostly — Button `hover` and Input `focused` pseudo-states are styled but not test-exercised despite being named explicitly in spec ACs |
| Every test maps to a spec requirement | ✅ No unclaimed tests found — all assertions trace to a DSYS requirement or Done-when criterion |
| Documented guidelines followed | "none — strong defaults applied", per tasks.md Test Coverage Matrix header |

---

## Gate Check

- **Gate command**: `pnpm --filter frontend build` (Build gate, per tasks.md); also ran `pnpm --filter frontend test` and `pnpm --filter frontend lint`
- **Build**: ✅ succeeds (`tsc -b && vite build`), no errors
- **Lint**: ✅ clean, zero errors/warnings
- **Test result**: 41 passed, 0 failed, 0 skipped (9 test files)
- **Test count before feature** (commit `e7bba0f`): 2 (`App.test.tsx`, `env.test.ts`)
- **Test count after feature**: 41
- **Delta**: +39 new tests across 7 new component test files
- **Skipped tests**: none
- **Failures**: none

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| DSYS-01 | Pending | ✅ Verified |
| DSYS-02 | Pending | ✅ Verified |
| DSYS-03 | Pending | ✅ Verified |
| DSYS-04 | Pending | ✅ Verified |
| DSYS-05 | Pending | ✅ Verified (structural + P2 AC9 test coverage) |
| DSYS-06 | Pending | ✅ Verified |
| DSYS-07 | Pending | ⚠️ Needs Fix — hover state untested |
| DSYS-08 | Pending | ⚠️ Needs Fix — focused state untested |
| DSYS-09 | Pending | ✅ Verified |
| DSYS-10 | Pending | ✅ Verified |
| DSYS-11 | Pending | ✅ Verified |
| DSYS-12 | Pending | ✅ Verified |
| DSYS-13 | Pending | ✅ Verified |
| DSYS-14 | Pending | ✅ Verified |

---

## Fix Plans

### Fix 1: P1 AC5 not covered — token-value-change propagation

- **Root cause**: No test in the diff changes a token custom property value and asserts a consuming component's rendered style updates. Current tests only assert against the tokens' current, fixed values.
- **Fix task**: Add a test (e.g. in a scratch/tokens-focused test file, or extend one existing component test) that sets `document.documentElement.style.setProperty('--color-neutral-0', '<new value>')` (or similar), re-renders/re-queries a consuming component (e.g. `Button` primary text color, which uses `--color-neutral-0`), and asserts the computed style reflects the new value — proving the "no component code change needed" claim.
- **Priority**: Major (explicit P1/MVP acceptance criterion, currently zero evidence)

### Fix 2: Button hover state and Input focused state untested

- **Root cause**: Spec P2 AC2 and AC3 explicitly list `hover` (Button) and `focused` (Input) as states in scope; CSS exists (`:hover`, `:focus` pseudo-classes) but no test exercises them via `fireEvent.mouseOver`/`fireEvent.focus` + a computed-style or class assertion.
- **Fix task**: Add one test per component: fire the relevant event and assert a distinct computed style (e.g. `backgroundColor` for Button hover, `borderColor` for Input focus) vs. the default state.
- **Priority**: Minor (CSS is correctly implemented and consumes tokens; only the explicit test assertion for these two specific states is missing)

### Fix 3 (informational, not blocking): dark-mode edge case not demonstrated end-to-end

- **Root cause**: Components consume `--color-neutral-*` directly rather than the theme-sensitive `--color-surface`/`--color-text` tokens defined under `[data-theme="light"]`, so a future `[data-theme="dark"]` block would not automatically re-theme the 7 components as built today.
- **Fix task**: Out of scope for this ticket per spec's explicit deferral of dark values/toggle — but worth a note for the Phase 2 ticket that introduces dark mode: components will need to be migrated from `--color-neutral-*` to the semantic `--color-surface`/`--color-text` tokens at that time, which is itself a small refactor, not just new token values.
- **Priority**: Cosmetic / forward-looking note, not a defect in this ticket's stated scope

---

## Summary

**Overall**: ⚠️ Issues

**Spec-anchored check**: 12/14 requirement IDs fully matched spec outcome with non-shallow evidence; 1 AC with no test coverage (P1 AC5); 1 spec-precision gap (Input `focused` state, plus a related minor gap on Button `hover`)

**Sensor**: 3/3 mutations killed

**Gate**: 41 passed, 0 failed (build, lint, test all clean)

**What works**: Tokens are well-structured (neutral/habit/mood scales, theme-attribute block present); all 7 components exist, correctly named, exported; hardcoded-value guard tests are real (regex-based, not shallow) and pass on all 7 `.module.css` files; Card/StreakBadge "visually distinct" tests are genuinely discriminating (confirmed via fault injection); MoodPicker's `Mood` type placeholder is correctly flagged with an accurate `SPEC_DEVIATION` comment matching design.md's documented risk; `vitest.config.ts`'s `css: true` addition is necessary and genuinely functional, not a red herring.

**Issues found**:
1. P1 AC5 (token-change propagation) has zero test evidence — Fix 1 above.
2. Button `hover` and Input `focused` states are styled but not test-exercised, despite being named explicitly in spec P2 AC2/AC3 — Fix 2 above.
3. Inconsistent `afterEach(cleanup)` usage across component test files (2 of 7 use it) — latent document-leakage risk if future edits to `StreakBadge.test.tsx` or `Card.test.tsx` add colliding `screen.*` queries; not currently causing a failure.

**Next steps**: Route Fix 1 and Fix 2 as fix tasks to an implementer (author ≠ verifier); re-run this Verifier after. Fix 3 is a forward note only, not a blocking gap for this ticket's scope.
