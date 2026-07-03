# Design System: Tokens + Core Components Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/bora-8-design-system/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: none — no `CONTRIBUTING.md`, no testing section in `CLAUDE.md` (it covers backend module boundaries only), no coverage thresholds in `apps/frontend/vitest.config.ts`. Inferred from existing test samples: `apps/frontend/src/App.test.tsx`, `apps/frontend/src/env.test.ts` (Vitest + `@testing-library/react`, colocated `*.test.tsx`/`*.test.ts` files, `globals: false` so tests import from `"vitest"` explicitly). Strong defaults applied for depth (component tests map 1:1 to spec ACs).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Tokens (CSS custom properties: `colors.css`, `typography.css`, `spacing.css`, `index.css`) | none | Build/import gate only — no logic to unit test; correctness verified visually via consuming components | `apps/frontend/src/design-system/tokens/*.css` | `pnpm --filter frontend build` |
| Components (Button, Input, Card, XPBar, StreakBadge, MoodPicker, TabBar) | unit | 1:1 to each component's spec ACs (every variant/state prop combination rendered and asserted) + a hardcoded-value check per component's `.module.css` (asserts zero literal color/px values outside `var()`), satisfying DSYS-05/DSYS-14 | `apps/frontend/src/design-system/components/<Name>/<Name>.test.tsx` | `pnpm --filter frontend test` |

## Parallelism Assessment

> Generated from codebase — confirm before Execute.

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --- | --- | --- | --- |
| unit (Vitest + Testing Library, jsdom) | Yes | Each test file renders its own component instance in an isolated jsdom environment; no shared backing store, no global mutable state, no setup/teardown touching shared resources | `apps/frontend/vitest.config.ts` (`environment: "jsdom"`, no global setup file); `App.test.tsx` and `env.test.ts` run independently today with no shared fixtures |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only (component tasks) | `pnpm --filter frontend test` |
| Full | After a phase completes (tests + lint + types) | `pnpm --filter frontend test && pnpm --filter frontend lint && pnpm --filter frontend typecheck` |
| Build | After token-only tasks (no tests) or final phase completion | `pnpm --filter frontend build` |

---

## Execution Plan

### Phase 1: Token Category Files (Parallel OK)

Independent CSS files, no shared state, no tests (config layer).

```
T1 [P] ─┐
T2 [P] ─┼──→ (Phase 2: T4)
T3 [P] ─┘
```

### Phase 2: Token Aggregation + Wiring (Sequential)

```
T1, T2, T3 complete, then:
  T4
```

### Phase 3: Core Components (Parallel OK)

All 7 components depend only on tokens existing (T4), not on each other.

```
T4 complete, then:
  ┌── T5  [P]  Button
  ├── T6  [P]  Input
  ├── T7  [P]  Card
  ├── T8  [P]  XPBar
  ├── T9  [P]  StreakBadge
  ├── T10 [P]  MoodPicker
  └── T11 [P]  TabBar
```

3 phases total — at or below the sub-agent offer threshold (>3 phases), so Execute runs inline unless the user requests otherwise.

---

## Task Breakdown

### T1: Create color tokens [P]

**What**: Define `apps/frontend/src/design-system/tokens/colors.css` with neutral/base scale on `:root`, two accent sub-palettes (`--color-accent-habit-*`, `--color-accent-mood-*`) on `:root`, and theme-mode-sensitive values (e.g. `--color-surface`, `--color-text`) redeclared under `[data-theme="light"]`.
**Where**: `apps/frontend/src/design-system/tokens/colors.css`
**Depends on**: None
**Reuses**: n/a (first file)
**Requirement**: DSYS-01, DSYS-02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `:root` defines a neutral/base color scale (e.g. `--color-neutral-0` through `--color-neutral-900`)
- [ ] `:root` defines `--color-accent-habit-*` and `--color-accent-mood-*` namespaces, each a full scale (not a single value), visually distinct hues
- [ ] `[data-theme="light"]` redeclares theme-sensitive tokens (surface/text) referencing the neutral scale, structured so `[data-theme="dark"]` can be added later without renaming any property
- [ ] No TypeScript/build errors (`pnpm --filter frontend build`)

**Tests**: none
**Gate**: build

**Commit**: `feat(design-system): add color tokens with theme-mode and accent sub-palette structure`

---

### T2: Create typography tokens [P]

**What**: Define `apps/frontend/src/design-system/tokens/typography.css` with a named type scale (`--font-family-base`, `--font-size-heading-1`, `--font-size-heading-2`, `--font-size-body`, `--font-size-caption`, `--font-weight-*`, `--line-height-*`).
**Where**: `apps/frontend/src/design-system/tokens/typography.css`
**Depends on**: None
**Reuses**: n/a
**Requirement**: DSYS-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `:root` defines the full named type scale listed above with concrete values
- [ ] No TypeScript/build errors (`pnpm --filter frontend build`)

**Tests**: none
**Gate**: build

**Commit**: `feat(design-system): add typography tokens`

---

### T3: Create spacing tokens [P]

**What**: Define `apps/frontend/src/design-system/tokens/spacing.css` with a numbered spacing scale (`--space-1`, `--space-2`, ...) on a consistent base unit.
**Where**: `apps/frontend/src/design-system/tokens/spacing.css`
**Depends on**: None
**Reuses**: n/a
**Requirement**: DSYS-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `:root` defines a numbered spacing scale with at least 5 steps on a consistent base unit
- [ ] No TypeScript/build errors (`pnpm --filter frontend build`)

**Tests**: none
**Gate**: build

**Commit**: `feat(design-system): add spacing tokens`

---

### T4: Aggregate tokens and wire into app entry

**What**: Create `apps/frontend/src/design-system/tokens/index.css` that `@import`s `colors.css`, `typography.css`, and `spacing.css`; add a single `import "./design-system/tokens/index.css"` to `apps/frontend/src/main.tsx`.
**Where**: `apps/frontend/src/design-system/tokens/index.css`, `apps/frontend/src/main.tsx` (modify)
**Depends on**: T1, T2, T3
**Reuses**: T1–T3 output
**Requirement**: DSYS-01, DSYS-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `tokens/index.css` imports all three token files in a stable order (colors, typography, spacing)
- [ ] `main.tsx` imports `tokens/index.css` exactly once
- [ ] `pnpm --filter frontend build` succeeds and the app renders with token custom properties present on `document.documentElement` (spot-checked via `getComputedStyle`)
- [ ] Gate check passes: `pnpm --filter frontend build`

**Tests**: none
**Gate**: build

**Commit**: `feat(design-system): aggregate tokens and wire into app entry`

---

### T5: Create Button component [P]

**What**: Implement `Button` per design.md — props `variant` (`primary`/`secondary`/`danger`), `size` (`sm`/`md`/`lg`), `disabled`, `loading`; styles consume only color/spacing/typography tokens via `var()`.
**Where**: `apps/frontend/src/design-system/components/Button/Button.tsx`, `Button.module.css`, `index.ts`, `Button.test.tsx`
**Depends on**: T4
**Reuses**: token custom properties from T1–T3
**Requirement**: DSYS-06, DSYS-07, DSYS-05, DSYS-14

**Tools**:
- MCP: NONE
- Skill: `react-composition-patterns`, `react-best-practices`

**Done when**:
- [ ] Component named exactly `Button`, exported from `index.ts`
- [ ] Renders all `variant` × `disabled`/`loading` combinations without throwing (test asserts each)
- [ ] `Button.module.css` contains zero literal `#hex`/`rgb(`/bare-`px` values outside `var()` calls (asserted by a test reading the file's source)
- [ ] Gate check passes: `pnpm --filter frontend test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(design-system): add Button component`

---

### T6: Create Input component [P]

**What**: Implement `Input` per design.md — props `error`, `disabled`, `placeholder`, `value`, `onChange`; styles consume only color/spacing tokens.
**Where**: `apps/frontend/src/design-system/components/Input/Input.tsx`, `Input.module.css`, `index.ts`, `Input.test.tsx`
**Depends on**: T4
**Reuses**: token custom properties from T1–T3
**Requirement**: DSYS-06, DSYS-08, DSYS-05, DSYS-14

**Tools**:
- MCP: NONE
- Skill: `react-composition-patterns`, `react-best-practices`

**Done when**:
- [ ] Component named exactly `Input`, exported from `index.ts`
- [ ] Renders default/error/disabled combinations without throwing (test asserts each); `onChange` fires with the new value on user input
- [ ] `Input.module.css` contains zero literal color/px values outside `var()` calls (asserted by test)
- [ ] Gate check passes: `pnpm --filter frontend test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(design-system): add Input component`

---

### T7: Create Card component [P]

**What**: Implement `Card` per design.md — prop `accent` (`neutral`/`habit`/`mood`), demonstrating both accent contexts on the same component.
**Where**: `apps/frontend/src/design-system/components/Card/Card.tsx`, `Card.module.css`, `index.ts`, `Card.test.tsx`
**Depends on**: T4
**Reuses**: `--color-accent-habit-*` / `--color-accent-mood-*` from T1
**Requirement**: DSYS-06, DSYS-09, DSYS-05, DSYS-14

**Tools**:
- MCP: NONE
- Skill: `react-composition-patterns`, `react-best-practices`

**Done when**:
- [ ] Component named exactly `Card`, exported from `index.ts`
- [ ] Renders `neutral`, `habit`, and `mood` accent variants without throwing; test asserts habit and mood variants resolve to different computed background/border colors (visually distinct, per spec edge case)
- [ ] `Card.module.css` contains zero literal color/px values outside `var()` calls (asserted by test)
- [ ] Gate check passes: `pnpm --filter frontend test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(design-system): add Card component`

---

### T8: Create XPBar component [P]

**What**: Implement `XPBar` per design.md — prop `progress: number` (0–100, clamped), empty/partial/full states derived from value, using the habit accent sub-palette.
**Where**: `apps/frontend/src/design-system/components/XPBar/XPBar.tsx`, `XPBar.module.css`, `index.ts`, `XPBar.test.tsx`
**Depends on**: T4
**Reuses**: `--color-accent-habit-*` from T1
**Requirement**: DSYS-06, DSYS-10, DSYS-05, DSYS-14

**Tools**:
- MCP: NONE
- Skill: `react-composition-patterns`, `react-best-practices`

**Done when**:
- [ ] Component named exactly `XPBar`, exported from `index.ts`
- [ ] Test asserts rendering at `progress` = 0 (empty), a mid-value e.g. 50 (partial), and 100 (full) each render distinct visual width/state
- [ ] Test asserts out-of-range `progress` (e.g. -10, 150) is clamped to [0, 100] per design's Error Handling Strategy
- [ ] `XPBar.module.css` contains zero literal color/px values outside `var()` calls (asserted by test)
- [ ] Gate check passes: `pnpm --filter frontend test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(design-system): add XPBar component`

---

### T9: Create StreakBadge component [P]

**What**: Implement `StreakBadge` per design.md — props `active: boolean`, `count: number`, using the habit accent sub-palette.
**Where**: `apps/frontend/src/design-system/components/StreakBadge/StreakBadge.tsx`, `StreakBadge.module.css`, `index.ts`, `StreakBadge.test.tsx`
**Depends on**: T4
**Reuses**: `--color-accent-habit-*` from T1
**Requirement**: DSYS-06, DSYS-11, DSYS-05, DSYS-14

**Tools**:
- MCP: NONE
- Skill: `react-composition-patterns`, `react-best-practices`

**Done when**:
- [ ] Component named exactly `StreakBadge`, exported from `index.ts`
- [ ] Test asserts `active: true` and `active: false` render visually distinct states (different class/computed style) and both display `count`
- [ ] `StreakBadge.module.css` contains zero literal color/px values outside `var()` calls (asserted by test)
- [ ] Gate check passes: `pnpm --filter frontend test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(design-system): add StreakBadge component`

---

### T10: Create MoodPicker component [P]

**What**: Implement `MoodPicker` per design.md — props `options: Mood[]`, `selected?: Mood`, `onSelect`, using the mood accent sub-palette. `Mood` type is a placeholder per design's flagged risk (no `MoodEntry` domain code exists yet to confirm against).
**Where**: `apps/frontend/src/design-system/components/MoodPicker/MoodPicker.tsx`, `MoodPicker.module.css`, `index.ts`, `MoodPicker.test.tsx`
**Depends on**: T4
**Reuses**: `--color-accent-mood-*` from T1
**Requirement**: DSYS-06, DSYS-12, DSYS-05, DSYS-14

**Tools**:
- MCP: NONE
- Skill: `react-composition-patterns`, `react-best-practices`

**Done when**:
- [ ] Component named exactly `MoodPicker`, exported from `index.ts`
- [ ] Test asserts every option in `options` renders, `selected` option shows a selected state distinct from unselected ones, and clicking an option fires `onSelect` with that option
- [ ] `MoodPicker.module.css` contains zero literal color/px values outside `var()` calls (asserted by test)
- [ ] Gate check passes: `pnpm --filter frontend test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(design-system): add MoodPicker component`

---

### T11: Create TabBar component [P]

**What**: Implement `TabBar` per design.md — props `tabs: {id, label}[]`, `activeId`, `onSelect`, using shared neutral tokens only (no accent).
**Where**: `apps/frontend/src/design-system/components/TabBar/TabBar.tsx`, `TabBar.module.css`, `index.ts`, `TabBar.test.tsx`
**Depends on**: T4
**Reuses**: neutral scale from T1
**Requirement**: DSYS-06, DSYS-13, DSYS-05, DSYS-14

**Tools**:
- MCP: NONE
- Skill: `react-composition-patterns`, `react-best-practices`

**Done when**:
- [ ] Component named exactly `TabBar`, exported from `index.ts`
- [ ] Test asserts all `tabs` render, the tab matching `activeId` shows an active state distinct from the others, clicking a tab fires `onSelect` with its `id`, and an `activeId` not present in `tabs` renders with no tab active (per design's Error Handling Strategy) without throwing
- [ ] `TabBar.module.css` contains zero literal color/px values outside `var()` calls (asserted by test), and contains no `--color-accent-habit-*`/`--color-accent-mood-*` references (neutral-only per DSYS-13)
- [ ] Gate check passes: `pnpm --filter frontend test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(design-system): add TabBar component`

---

## Parallel Execution Map

```
Phase 1 (Parallel):
  T1 [P] ─┐
  T2 [P] ─┼── all independent, any order
  T3 [P] ─┘

Phase 2 (Sequential):
  T1, T2, T3 complete, then:
    T4

Phase 3 (Parallel):
  T4 complete, then:
    ├── T5  [P]  Button
    ├── T6  [P]  Input
    ├── T7  [P]  Card
    ├── T8  [P]  XPBar
    ├── T9  [P]  StreakBadge
    ├── T10 [P]  MoodPicker
    └── T11 [P]  TabBar
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Create color tokens | 1 file | ✅ Granular |
| T2: Create typography tokens | 1 file | ✅ Granular |
| T3: Create spacing tokens | 1 file | ✅ Granular |
| T4: Aggregate tokens and wire into app entry | 1 file + 1 wiring edit | ✅ Granular (cohesive: aggregation is meaningless without the import) |
| T5: Create Button component | 1 component | ✅ Granular |
| T6: Create Input component | 1 component | ✅ Granular |
| T7: Create Card component | 1 component | ✅ Granular |
| T8: Create XPBar component | 1 component | ✅ Granular |
| T9: Create StreakBadge component | 1 component | ✅ Granular |
| T10: Create MoodPicker component | 1 component | ✅ Granular |
| T11: Create TabBar component | 1 component | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | None (Phase 1, parallel) | ✅ Match |
| T2 | None | None (Phase 1, parallel) | ✅ Match |
| T3 | None | None (Phase 1, parallel) | ✅ Match |
| T4 | T1, T2, T3 | T1, T2, T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 (Phase 3, parallel) | ✅ Match |
| T6 | T4 | T4 → T6 (Phase 3, parallel) | ✅ Match |
| T7 | T4 | T4 → T7 (Phase 3, parallel) | ✅ Match |
| T8 | T4 | T4 → T8 (Phase 3, parallel) | ✅ Match |
| T9 | T4 | T4 → T9 (Phase 3, parallel) | ✅ Match |
| T10 | T4 | T4 → T10 (Phase 3, parallel) | ✅ Match |
| T11 | T4 | T4 → T11 (Phase 3, parallel) | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: colors.css | Tokens | none | none | ✅ OK |
| T2: typography.css | Tokens | none | none | ✅ OK |
| T3: spacing.css | Tokens | none | none | ✅ OK |
| T4: index.css + main.tsx wiring | Tokens | none | none | ✅ OK |
| T5: Button | Components | unit | unit | ✅ OK |
| T6: Input | Components | unit | unit | ✅ OK |
| T7: Card | Components | unit | unit | ✅ OK |
| T8: XPBar | Components | unit | unit | ✅ OK |
| T9: StreakBadge | Components | unit | unit | ✅ OK |
| T10: MoodPicker | Components | unit | unit | ✅ OK |
| T11: TabBar | Components | unit | unit | ✅ OK |

All ✅ — no restructuring needed.
