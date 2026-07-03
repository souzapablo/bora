import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MoodPicker, type Mood } from "./MoodPicker";

const options: Mood[] = ["great", "good", "okay", "low", "bad"];

afterEach(cleanup);

describe("MoodPicker", () => {
  it("renders every option in options", () => {
    render(<MoodPicker options={options} onSelect={() => {}} />);

    for (const mood of options) {
      expect(screen.getByRole("button", { name: mood })).toBeTruthy();
    }
  });

  it("shows the selected option with a selected state distinct from unselected ones", () => {
    render(<MoodPicker options={options} selected="good" onSelect={() => {}} />);

    expect(screen.getByRole("button", { name: "good" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "great" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("fires onSelect with the clicked option", () => {
    const handleSelect = vi.fn();
    render(<MoodPicker options={options} onSelect={handleSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "okay" }));

    expect(handleSelect).toHaveBeenCalledWith("okay");
  });

  it("has zero hardcoded color/px values outside var() in MoodPicker.module.css", () => {
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const cssPath = path.join(dirname, "MoodPicker.module.css");
    const css = readFileSync(cssPath, "utf-8");
    const withoutVarCalls = css.replace(/var\([^)]*\)/g, "");

    expect(withoutVarCalls).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(withoutVarCalls).not.toMatch(/rgba?\(/);
    expect(withoutVarCalls).not.toMatch(/\b\d+px\b/);
  });
});
