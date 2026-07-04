import { describe, expect, it } from "vitest";

import { queryClient } from "./queryClient";

describe("queryClient", () => {
  it("applies retry: 1 as the project-wide query default (SHELL-02)", () => {
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(1);
  });

  it("disables refetchOnWindowFocus by default (SHELL-02)", () => {
    expect(queryClient.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });
});
