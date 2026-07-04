import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { RequireAuth } from "./RequireAuth";

afterEach(cleanup);

function renderGuarded(isAllowed: boolean, redirectTo = "/login", redirectLabel = "Login Page") {
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route path={redirectTo} element={<div>{redirectLabel}</div>} />
        <Route
          path="/protected"
          element={
            <RequireAuth isAllowed={isAllowed} redirectTo={redirectTo}>
              <div>Protected Content</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  it("redirects to redirectTo and hides children when isAllowed is false (ROUTER-03)", () => {
    renderGuarded(false);

    expect(screen.getByText("Login Page")).toBeTruthy();
    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  it("renders children unmodified when isAllowed is true (ROUTER-04)", () => {
    renderGuarded(true);

    expect(screen.getByText("Protected Content")).toBeTruthy();
    expect(screen.queryByText("Login Page")).toBeNull();
  });

  it("redirects to the caller-supplied path, proving no destination is hardcoded in app/ (ROUTER-03)", () => {
    renderGuarded(false, "/welcome", "Welcome Page");

    expect(screen.getByText("Welcome Page")).toBeTruthy();
    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  it("imports nothing from any feature module (ROUTER-02)", () => {
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(path.join(dirname, "RequireAuth.tsx"), "utf-8");

    expect(source).not.toMatch(/from\s+["'][^"']*features\//);
  });
});
