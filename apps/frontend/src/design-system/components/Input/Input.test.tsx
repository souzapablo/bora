import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Input } from "./Input";

describe("Input", () => {
  it("renders default state without throwing", () => {
    expect(() => render(<Input value="" onChange={() => {}} />)).not.toThrow();
  });

  it("renders error state without throwing", () => {
    expect(() => render(<Input value="" error onChange={() => {}} />)).not.toThrow();
  });

  it("renders disabled state without throwing", () => {
    expect(() => render(<Input value="" disabled onChange={() => {}} />)).not.toThrow();
  });

  it("fires onChange with the new value on user input", () => {
    const handleChange = vi.fn();
    render(<Input value="" onChange={handleChange} placeholder="type here" />);

    const input = screen.getByPlaceholderText("type here");
    fireEvent.change(input, { target: { value: "hello" } });

    expect(handleChange).toHaveBeenCalledWith("hello");
  });

  it("has zero hardcoded color/px values outside var() in Input.module.css", () => {
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const cssPath = path.join(dirname, "Input.module.css");
    const css = readFileSync(cssPath, "utf-8");
    const withoutVarCalls = css.replace(/var\([^)]*\)/g, "");

    expect(withoutVarCalls).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(withoutVarCalls).not.toMatch(/rgba?\(/);
    expect(withoutVarCalls).not.toMatch(/\b\d+px\b/);
  });
});
