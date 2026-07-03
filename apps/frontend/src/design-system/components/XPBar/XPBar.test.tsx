import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { XPBar } from "./XPBar";

describe("XPBar", () => {
  it("renders progress=0 as empty state with zero width", () => {
    const { container } = render(<XPBar progress={0} />);
    const fill = container.querySelector('[role="progressbar"] > div') as HTMLElement;

    expect(fill.style.width).toBe("0%");
  });

  it("renders progress=50 as partial state with 50% width", () => {
    const { container } = render(<XPBar progress={50} />);
    const fill = container.querySelector('[role="progressbar"] > div') as HTMLElement;

    expect(fill.style.width).toBe("50%");
  });

  it("renders progress=100 as full state with 100% width", () => {
    const { container } = render(<XPBar progress={100} />);
    const fill = container.querySelector('[role="progressbar"] > div') as HTMLElement;

    expect(fill.style.width).toBe("100%");
  });

  it("clamps out-of-range progress below 0 to 0", () => {
    const { container } = render(<XPBar progress={-10} />);
    const track = container.querySelector('[role="progressbar"]') as HTMLElement;
    const fill = container.querySelector('[role="progressbar"] > div') as HTMLElement;

    expect(track.getAttribute("aria-valuenow")).toBe("0");
    expect(fill.style.width).toBe("0%");
  });

  it("clamps out-of-range progress above 100 to 100", () => {
    const { container } = render(<XPBar progress={150} />);
    const track = container.querySelector('[role="progressbar"]') as HTMLElement;
    const fill = container.querySelector('[role="progressbar"] > div') as HTMLElement;

    expect(track.getAttribute("aria-valuenow")).toBe("100");
    expect(fill.style.width).toBe("100%");
  });

  it("has zero hardcoded color/px values outside var() in XPBar.module.css", () => {
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const cssPath = path.join(dirname, "XPBar.module.css");
    const css = readFileSync(cssPath, "utf-8");
    const withoutVarCalls = css.replace(/var\([^)]*\)/g, "");

    expect(withoutVarCalls).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(withoutVarCalls).not.toMatch(/rgba?\(/);
    expect(withoutVarCalls).not.toMatch(/\b\d+px\b/);
  });
});
