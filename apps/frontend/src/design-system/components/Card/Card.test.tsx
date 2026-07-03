import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import "../../tokens/index.css";
import { Card, type CardAccent } from "./Card";

afterEach(cleanup);

describe("Card", () => {
  const accents: CardAccent[] = ["neutral", "habit", "mood"];

  for (const accent of accents) {
    it(`renders accent="${accent}" without throwing`, () => {
      expect(() => render(<Card accent={accent}>content</Card>)).not.toThrow();
    });
  }

  it("resolves habit and mood accents to visually distinct computed colors", () => {
    const { container: habitContainer } = render(<Card accent="habit">content</Card>);
    const { container: moodContainer } = render(<Card accent="mood">content</Card>);

    const habitStyle = getComputedStyle(habitContainer.firstElementChild as Element);
    const moodStyle = getComputedStyle(moodContainer.firstElementChild as Element);

    expect(habitStyle.backgroundColor).not.toBe(moodStyle.backgroundColor);
    expect(habitStyle.borderColor).not.toBe(moodStyle.borderColor);
  });

  it("has zero hardcoded color/px values outside var() in Card.module.css", () => {
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const cssPath = path.join(dirname, "Card.module.css");
    const css = readFileSync(cssPath, "utf-8");
    const withoutVarCalls = css.replace(/var\([^)]*\)/g, "");

    expect(withoutVarCalls).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(withoutVarCalls).not.toMatch(/rgba?\(/);
    expect(withoutVarCalls).not.toMatch(/\b\d+px\b/);
  });
});
