import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import "../../tokens/index.css";
import { StreakBadge } from "./StreakBadge";

afterEach(cleanup);

describe("StreakBadge", () => {
  it("displays count when active", () => {
    render(<StreakBadge active count={7} />);
    expect(screen.getByText("7").textContent).toBe("7");
  });

  it("displays count when inactive", () => {
    render(<StreakBadge active={false} count={3} />);
    expect(screen.getByText("3").textContent).toBe("3");
  });

  it("renders active and inactive states with visually distinct computed colors", () => {
    const { container: activeContainer } = render(<StreakBadge active count={1} />);
    const { container: inactiveContainer } = render(<StreakBadge active={false} count={1} />);

    const activeStyle = getComputedStyle(activeContainer.firstElementChild as Element);
    const inactiveStyle = getComputedStyle(inactiveContainer.firstElementChild as Element);

    expect(activeStyle.backgroundColor).not.toBe(inactiveStyle.backgroundColor);
  });

  it("has zero hardcoded color/px values outside var() in StreakBadge.module.css", () => {
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const cssPath = path.join(dirname, "StreakBadge.module.css");
    const css = readFileSync(cssPath, "utf-8");
    const withoutVarCalls = css.replace(/var\([^)]*\)/g, "");

    expect(withoutVarCalls).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(withoutVarCalls).not.toMatch(/rgba?\(/);
    expect(withoutVarCalls).not.toMatch(/\b\d+px\b/);
  });
});
