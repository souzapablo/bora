import { describe, expect, it } from "vitest";

import { Email } from "./email";

describe("Email", () => {
  it("normalizes by trimming whitespace and lowercasing", () => {
    expect(new Email(" Foo@X.com ").value).toBe("foo@x.com");
  });

  it("treats differently-cased emails as equal", () => {
    expect(new Email("a@b.com").equals(new Email("A@B.com"))).toBe(true);
  });
});
