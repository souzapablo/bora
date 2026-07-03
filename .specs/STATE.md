# STATE

## Decisions

### AD-001
- **Decision**: Frontend styling uses plain CSS custom properties for design tokens and CSS Modules (`.module.css`) for component styles — no Tailwind, no CSS-in-JS, no JS/TS token objects, no design-tool export pipeline.
- **Reason**: BORA-8 dropped its Figma/Canva design-tool phase (no budget for a paid design-tool MCP seat, not viable to build manually). `apps/frontend` had no styling convention yet, so this ticket set the first one. CSS Modules is zero-dependency (Vite supports it natively) and CSS custom properties need no build tooling to sync from a design tool that no longer exists.
- **Trade-off**: No component-variant tooling or visual catalog (e.g. Storybook) comes for free; variant/state coverage is expressed as component props instead of a design tool's native variant system.
- **Scope**: `apps/frontend/src/design-system/` and all future frontend tickets that add or consume components/styles.
- **Date**: 2026-07-03
- **Status**: active

## Handoff

