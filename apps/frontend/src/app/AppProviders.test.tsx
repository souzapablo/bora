import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Keep the dev-only devtools deterministic in jsdom: resolve the lazy import to a no-op.
vi.mock("@tanstack/react-query-devtools", () => ({
  ReactQueryDevtools: () => null,
}));

import { AppProviders } from "./AppProviders";

afterEach(cleanup);

describe("AppProviders", () => {
  it("mounts the router and query provider, rendering routed content without throwing (SHELL-01)", () => {
    // At "/", the placeholder protected route redirects to /login — proving BrowserRouter drives
    // the central route table inside the providers.
    expect(() => render(<AppProviders />)).not.toThrow();
    expect(screen.getByText("Login Screen")).toBeTruthy();
  });

  it("guards the Query Devtools behind import.meta.env.DEV via a dynamic import (DEVTOOLS-01)", () => {
    // Verifies the exclusion *mechanism*; actual absence from the prod bundle is asserted by the
    // T8 build spot-check (a build-time property not observable from a jsdom unit test).
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(path.join(dirname, "AppProviders.tsx"), "utf-8");

    expect(source).toMatch(/import\.meta\.env\.DEV/);
    expect(source).toMatch(/import\(\s*["']@tanstack\/react-query-devtools["']\s*\)/);
  });
});
