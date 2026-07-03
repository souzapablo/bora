import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import "../../tokens/index.css";
import { Button, type ButtonVariant } from "./Button";

const variants: ButtonVariant[] = ["primary", "secondary", "danger"];
const states = [
  { disabled: false, loading: false },
  { disabled: true, loading: false },
  { disabled: false, loading: true },
];

describe("Button", () => {
  for (const variant of variants) {
    for (const state of states) {
      it(`renders variant="${variant}" disabled=${state.disabled} loading=${state.loading} without throwing`, () => {
        expect(() =>
          render(
            <Button variant={variant} disabled={state.disabled} loading={state.loading}>
              Click me
            </Button>,
          ),
        ).not.toThrow();
      });
    }
  }

  // jsdom's CSS engine does not evaluate var(...) to a resolved value (confirmed: getComputedStyle
  // always returns the literal "var(--token-name)" text, even after the custom property changes).
  // Propagation is therefore verified in the two parts a real browser actually needs: (1) the custom
  // property itself updates at the cascade root when set, and (2) Button's declaration is `var(--token-name)`
  // indirection rather than a baked-in value — together these guarantee resolution updates with zero
  // component code change in any CSS-spec-compliant engine.
  it("propagates a changed color token value at the cascade root, consumed via var() indirection with no component code change", () => {
    const before = getComputedStyle(document.documentElement).getPropertyValue("--color-accent-habit-default").trim();

    document.documentElement.style.setProperty("--color-accent-habit-default", "rgb(1, 2, 3)");
    const after = getComputedStyle(document.documentElement).getPropertyValue("--color-accent-habit-default").trim();
    document.documentElement.style.removeProperty("--color-accent-habit-default");

    expect(after).not.toBe(before);
    expect(after).toBe("rgb(1, 2, 3)");

    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(path.join(dirname, "Button.module.css"), "utf-8");
    expect(css).toMatch(/\.primary\s*\{[^}]*background-color:\s*var\(--color-accent-habit-default\)/);
  });

  it("propagates a changed spacing token value at the cascade root, consumed via var() indirection with no component code change", () => {
    const before = getComputedStyle(document.documentElement).getPropertyValue("--space-4").trim();

    document.documentElement.style.setProperty("--space-4", "42px");
    const after = getComputedStyle(document.documentElement).getPropertyValue("--space-4").trim();
    document.documentElement.style.removeProperty("--space-4");

    expect(after).not.toBe(before);
    expect(after).toBe("42px");

    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(path.join(dirname, "Button.module.css"), "utf-8");
    expect(css).toMatch(/\.md\s*\{[^}]*padding:\s*var\(--space-2\)\s*var\(--space-4\)/);
  });

  it("propagates a changed typography token value at the cascade root, consumed via var() indirection with no component code change", () => {
    const before = getComputedStyle(document.documentElement).getPropertyValue("--font-size-body").trim();

    document.documentElement.style.setProperty("--font-size-body", "33px");
    const after = getComputedStyle(document.documentElement).getPropertyValue("--font-size-body").trim();
    document.documentElement.style.removeProperty("--font-size-body");

    expect(after).not.toBe(before);
    expect(after).toBe("33px");

    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(path.join(dirname, "Button.module.css"), "utf-8");
    expect(css).toMatch(/\.md\s*\{[^}]*font-size:\s*var\(--font-size-body\)/);
  });

  it("receives mouseover interaction and is styled distinctly for the hover state on enabled primary/secondary variants", () => {
    const { container } = render(<Button variant="primary">Click me</Button>);
    const button = container.firstElementChild as HTMLElement;

    expect(() => fireEvent.mouseOver(button)).not.toThrow();

    // jsdom's CSS engine does not dynamically re-evaluate :hover in getComputedStyle (no live
    // pseudo-class matching for computed style), so the distinct-styling claim is verified
    // structurally: a `:not(:disabled):hover` rule exists per non-danger variant and sets a
    // different background-color token than the variant's default state.
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(path.join(dirname, "Button.module.css"), "utf-8");
    expect(css).toMatch(/\.primary:not\(:disabled\):hover\s*\{[^}]*background-color:\s*var\(--color-accent-habit-hover\)/);
    expect(css).toMatch(/\.secondary:not\(:disabled\):hover\s*\{[^}]*background-color:\s*var\(--color-neutral-200\)/);
  });

  it("has zero hardcoded color/px values outside var() in Button.module.css", () => {
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const cssPath = path.join(dirname, "Button.module.css");
    const css = readFileSync(cssPath, "utf-8");
    const withoutVarCalls = css.replace(/var\([^)]*\)/g, "");

    expect(withoutVarCalls).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(withoutVarCalls).not.toMatch(/rgba?\(/);
    expect(withoutVarCalls).not.toMatch(/\b\d+px\b/);
  });
});
