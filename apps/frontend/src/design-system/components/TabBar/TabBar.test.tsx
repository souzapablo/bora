import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TabBar, type Tab } from "./TabBar";

const tabs: Tab[] = [
  { id: "habits", label: "Habits" },
  { id: "mood", label: "Mood" },
  { id: "profile", label: "Profile" },
];

afterEach(cleanup);

describe("TabBar", () => {
  it("renders all tabs", () => {
    render(<TabBar tabs={tabs} activeId="habits" onSelect={() => {}} />);

    for (const tab of tabs) {
      expect(screen.getByRole("tab", { name: tab.label })).toBeTruthy();
    }
  });

  it("shows the tab matching activeId as active, distinct from the others", () => {
    render(<TabBar tabs={tabs} activeId="mood" onSelect={() => {}} />);

    expect(screen.getByRole("tab", { name: "Mood" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Habits" }).getAttribute("aria-selected")).toBe("false");
    expect(screen.getByRole("tab", { name: "Profile" }).getAttribute("aria-selected")).toBe("false");
  });

  it("fires onSelect with the clicked tab's id", () => {
    const handleSelect = vi.fn();
    render(<TabBar tabs={tabs} activeId="habits" onSelect={handleSelect} />);

    fireEvent.click(screen.getByRole("tab", { name: "Profile" }));

    expect(handleSelect).toHaveBeenCalledWith("profile");
  });

  it("renders with no tab active when activeId is not present in tabs, without throwing", () => {
    expect(() => render(<TabBar tabs={tabs} activeId="nonexistent" onSelect={() => {}} />)).not.toThrow();

    for (const tab of tabs) {
      expect(screen.getByRole("tab", { name: tab.label }).getAttribute("aria-selected")).toBe("false");
    }
  });

  it("has zero hardcoded color/px values outside var() in TabBar.module.css, and no accent token references", () => {
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const cssPath = path.join(dirname, "TabBar.module.css");
    const css = readFileSync(cssPath, "utf-8");
    const withoutVarCalls = css.replace(/var\([^)]*\)/g, "");

    expect(withoutVarCalls).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(withoutVarCalls).not.toMatch(/rgba?\(/);
    expect(withoutVarCalls).not.toMatch(/\b\d+px\b/);
    expect(css).not.toMatch(/--color-accent-habit-/);
    expect(css).not.toMatch(/--color-accent-mood-/);
  });
});
