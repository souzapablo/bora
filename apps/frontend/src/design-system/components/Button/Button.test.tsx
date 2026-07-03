import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
