import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { AppRoutes } from "./routes";

afterEach(cleanup);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("AppRoutes", () => {
  it("renders the placeholder public route at /login (ROUTER-01)", () => {
    renderAt("/login");

    expect(screen.getByText("Login Screen")).toBeTruthy();
  });

  it("wraps the placeholder protected route so an unauthenticated visitor is redirected to /login (ROUTER-01)", () => {
    renderAt("/");

    expect(screen.getByText("Login Screen")).toBeTruthy();
    expect(screen.queryByText("Home Screen")).toBeNull();
  });
});
