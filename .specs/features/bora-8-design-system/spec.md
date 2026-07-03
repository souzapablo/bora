# Design System: Tokens + Core Components Specification

**Jira:** [BORA-8](https://pablosouza.atlassian.net/browse/BORA-8) — Design system: tokens + core components
**Type:** Code (frontend) — Figma/Canva dropped; design and implementation are collapsed into this ticket
**Linked docs:** [Design & Figma Workflow](https://pablosouza.atlassian.net/wiki/spaces/Bora/pages/786433) (superseded by this decision for BORA-8), [Frontend Architecture & Components](https://pablosouza.atlassian.net/wiki/spaces/Bora/pages/983041)

## Problem Statement

No screen in Bora can be built yet — nothing establishes reusable primitives, so every screen would otherwise hardcode styling ad hoc. The original plan routed this through a Figma design phase first. That's dropped: no paid design-tool MCP seat is available, and hand-building the file manually isn't viable. This ticket instead produces the foundation directly in code: color/type/spacing tokens as CSS custom properties, structured for theming, plus the 7 core components every later screen will compose from, built as React components in `apps/frontend/src/design-system/`. The spec itself (this document) is the design record — there is no separate visual design artifact.

## Goals

- [ ] A token set (color, typography, spacing) exists as CSS custom properties in `apps/frontend/src/design-system/tokens/`, structured under a `[data-theme]` attribute so a future dark mode only requires adding a sibling value block
- [ ] 7 core components (Button, Input, Card, XPBar, StreakBadge, MoodPicker, TabBar) exist as React components in `apps/frontend/src/design-system/components/`, each styled exclusively from the token set, with full realistic variant/state coverage (props-driven, e.g. `variant`, `state`, `size`)
- [ ] The tone split (playful/RPG for habit-side, calmer for mood-side) and the dark-mode token *structure* (not a dark palette) are both represented in the token architecture

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| --- | --- |
| Figma or Canva design files | Dropped per user decision: no budget for a paid design-tool MCP seat, and manual design-tool work isn't viable solo. Code is now the design record. |
| Dark color palette (actual dark values) and a theme-toggle UI | Frontend Architecture doc already deferred this — only the token *structure* (light/dark-able via `[data-theme]`) needs to exist now |
| Per-screen designs/pages (Login/Register, Dashboard, Mood check-in, etc.) | Phase 2 work — blocked on this ticket, not part of it |
| Pinning exact numeric values for the type scale / spacing base unit ahead of implementation | Exact values are chosen while building the tokens file itself, not pre-committed in this spec |
| Resolving "Habit dashboard + Task list as one screen or two" | Open question that belongs to Phase 2 screen design, not the design-system ticket |
| Storybook or a visual component catalog | Not requested; components are verified via unit/rendering tests and direct usage, not a separate catalog tool. Can be added later without restructuring. |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here — nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Ticket scope: design tool vs. code | Code only, in `apps/frontend/src/design-system/` | User confirmed: won't pay for another design-tool MCP seat, can't build a Figma/Canva file manually | y |
| Token implementation mechanism | Plain CSS custom properties (`:root` + `[data-theme="light"]` blocks), no CSS-in-JS or Tailwind — matches current frontend stack (plain Vite + React, no styling library installed) | Derived from `apps/frontend/package.json` — no styling dependency exists yet; introducing one is out of scope for this ticket | y — flag if this assumption is wrong before starting |
| Component styling mechanism | CSS Modules (`Button.module.css` colocated with `Button.tsx`) consuming the token custom properties via `var(--token-name)` | Simplest option with zero new dependencies; consistent with Vite's built-in CSS Modules support | y |
| Component variant/state depth | Full realistic states per component (e.g. Button: primary/secondary/danger × default/hover/disabled/loading; sizes where relevant), implemented as component props, not separate components | Matches original full-coverage decision; now expressed as a prop API instead of Figma variant properties | y |
| Tone-split architecture | One token set; two accent-color sub-palettes (habit/RPG-side vs. mood/calm-side) as contextual accent tokens (e.g. `--accent-habit-*`, `--accent-mood-*`), not two parallel themes | Carried over from original decision; now expressed as CSS custom property namespaces | y |
| Type scale & spacing scale values | Not pinned in this spec; chosen while writing the tokens CSS file | Exact values are an implementation-time decision | y |
| Dark mode | Token structure must support a future `[data-theme="dark"]` block; no dark values or toggle UI in this ticket | Matches existing Frontend Architecture doc decision | y |
| Definition of "Done" for this ticket | `apps/frontend/src/design-system/` contains: (a) a tokens module exporting/defining CSS custom properties for color/typography/spacing, organized by theme attribute and accent sub-palette, and (b) all 7 components as React components consuming those tokens exclusively (no hardcoded colors/spacing in component styles), named exactly `Button`, `Input`, `Card`, `XPBar`, `StreakBadge`, `MoodPicker`, `TabBar`, each with tests covering their variant/state matrix | Directly derivable from the Frontend Architecture doc's naming rule, now applied to code instead of Figma | y |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Token foundation exists and is theme-structured ⭐ MVP

**User Story**: As the (solo) developer, I want color, typography, and spacing tokens defined as CSS custom properties organized under a `[data-theme]` structure with habit/mood accent sub-palettes, so that every component and future screen can be built against reusable, theme-able primitives instead of hardcoded values.

**Why P1**: Nothing else (components, screens) can be built correctly without the tokens existing first.

**Acceptance Criteria**:

1. WHEN `apps/frontend/src/design-system/tokens/` is inspected THEN there SHALL exist a color tokens file defining custom properties under `:root` and `[data-theme="light"]`, structured so a `[data-theme="dark"]` block can be added later without renaming or restructuring existing properties.
2. WHEN the color tokens are inspected THEN there SHALL exist neutral/base color tokens shared by all components, AND two accent sub-palettes — one for habit/RPG-side (Productivity + Gamification) components, one for mood/calm-side (Mental Health) components — each consumable independently by the components that need them.
3. WHEN the typography tokens are inspected THEN there SHALL exist a named type scale (e.g. heading/body/caption roles) defined as CSS custom properties, with exact sizes chosen during implementation.
4. WHEN the spacing tokens are inspected THEN there SHALL exist a named spacing scale defined as CSS custom properties (e.g. numbered steps), with exact base unit chosen during implementation.
5. WHEN any token custom property's value is changed THEN every component consuming it via `var(--token-name)` SHALL reflect the new value without a component code change — verified by a test or manual check on at least one component per token category (color, typography, spacing).

**Independent Test**: Import the tokens CSS into a scratch component, render it, confirm computed styles resolve color/typography/spacing values from the custom properties; change one color token's value and confirm a consuming component's rendered style updates without editing the component.

---

### P2: Core components built from tokens

**User Story**: As the (solo) developer, I want the 7 core components (Button, Input, Card, XPBar, StreakBadge, MoodPicker, TabBar) built as React components with full variant/state coverage and consuming the token set, so that Phase 2 screens can compose from finished, reusable primitives instead of styling controls ad hoc.

**Why P2**: Depends on P1's tokens existing; this is the second half of "Done" for the ticket but is logically sequenced after tokens.

**Acceptance Criteria**:

1. WHEN `apps/frontend/src/design-system/components/` is inspected THEN all 7 components SHALL exist as React components, named exactly `Button`, `Input`, `Card`, `XPBar`, `StreakBadge`, `MoodPicker`, `TabBar` (matching the Frontend Architecture doc's naming rule for design↔code traceability).
2. WHEN `Button` is inspected THEN it SHALL support props for at minimum: style (primary/secondary/danger) × state (default/hover/disabled/loading), styled exclusively via color tokens (no hardcoded hex/rgb values in its stylesheet).
3. WHEN `Input` is inspected THEN it SHALL support props for at minimum: state (default/focused/error/disabled), styled via color and spacing tokens.
4. WHEN `Card` is inspected THEN it SHALL support at minimum a default variant and a variant demonstrating both the habit/RPG accent context and the mood/calm accent context, proving the contextual-accent token architecture works in practice.
5. WHEN `XPBar` is inspected THEN it SHALL support variants representing at minimum empty/partial/full progress states, using the habit/RPG accent sub-palette.
6. WHEN `StreakBadge` is inspected THEN it SHALL support variants for at minimum active-streak and broken/inactive-streak states, using the habit/RPG accent sub-palette.
7. WHEN `MoodPicker` is inspected THEN it SHALL support variants covering its selectable mood options and a selected/unselected state per option, using the mood/calm accent sub-palette.
8. WHEN `TabBar` is inspected THEN it SHALL support variants for at minimum default and active-tab-selected states, using shared neutral tokens (it is cross-module chrome, not tone-specific).
9. WHEN any component is inspected THEN it SHALL be implemented so no color, spacing, or font-size value is hardcoded in its stylesheet — every value SHALL resolve via `var(--token-name)`, verified by a lint/grep check as part of the component's test.

**Independent Test**: Render each of the 7 components in a test file with every documented prop combination (variant × state), snapshot or assert on rendered class names/computed styles, and confirm no component's stylesheet contains a literal color/size value outside the tokens file.

---

## Edge Cases

- WHEN a component needs a value no existing token covers (e.g. a one-off shadow or radius) THEN the implementation SHALL add it as a new named token in the tokens file rather than hardcoding it inline, keeping the "components only reference tokens" invariant intact.
- WHEN the habit/RPG and mood/calm accent sub-palettes are applied to the same component type (e.g. `Card`) THEN both variants SHALL remain visually distinct enough to read as intentionally different tones, not near-duplicates.
- WHEN a `[data-theme="dark"]` block is added in a future ticket THEN it SHALL slot into the existing tokens file's structure without requiring any component to be rebuilt (only new custom property values) — this ticket must not paint that future work into a corner.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| DSYS-01 | P1: Color tokens with theme-mode structure | Code | Pending |
| DSYS-02 | P1: Neutral + habit/mood accent sub-palettes | Code | Pending |
| DSYS-03 | P1: Typography scale | Code | Pending |
| DSYS-04 | P1: Spacing scale | Code | Pending |
| DSYS-05 | P1: Components consume tokens, not hardcoded values | Code | Pending |
| DSYS-06 | P2: All 7 components exist, named per doc | Code | Pending |
| DSYS-07 | P2: Button variants/states | Code | Pending |
| DSYS-08 | P2: Input variants/states | Code | Pending |
| DSYS-09 | P2: Card variants (default + both accent contexts) | Code | Pending |
| DSYS-10 | P2: XPBar progress variants | Code | Pending |
| DSYS-11 | P2: StreakBadge state variants | Code | Pending |
| DSYS-12 | P2: MoodPicker option/selection variants | Code | Pending |
| DSYS-13 | P2: TabBar state variants | Code | Pending |
| DSYS-14 | P2: No hardcoded values outside tokens file | Code | Pending |

**ID format:** `DSYS-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 14 total, 0 mapped to tasks, 14 unmapped ⚠️ (this is a Large-scope ticket now that it includes real component implementation — proceed to Design/Tasks phases before Execute, rather than collapsing into Execute's inline list)

---

## Success Criteria

How we know the feature is successful:

- [ ] `apps/frontend/src/design-system/tokens/` defines color/typography/spacing as CSS custom properties, theme-attribute structured (light populated, dark-ready)
- [ ] Habit/RPG and mood/calm accent sub-palettes exist and are visibly distinct when applied
- [ ] All 7 core components exist as React components, correctly named, with full variant/state coverage via props, consuming tokens exclusively (no hardcoded values)
- [ ] A future screen-building ticket can import any of the 7 components and compose a screen without inventing missing states or styling ad hoc
