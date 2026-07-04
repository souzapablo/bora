import { describe, expect, it } from "vitest";

import { AppException } from "./errors/app-exception";
import { err, ok, unwrap } from "./result";

describe("ok/err", () => {
  it("ok(v) produces {ok:true, value:v}", () => {
    expect(ok("value")).toEqual({ ok: true, value: "value" });
  });

  it("err(e) produces {ok:false, error:e}", () => {
    expect(err({ code: "X" })).toEqual({ ok: false, error: { code: "X" } });
  });
});

describe("unwrap", () => {
  it("returns the value for an ok result", () => {
    expect(unwrap(ok("value"))).toBe("value");
  });

  it("throws AppException whose appError equals the error for an err result", () => {
    const error = { code: "X" };

    expect(() => unwrap(err(error))).toThrow(AppException);

    try {
      unwrap(err(error));
      throw new Error("expected unwrap to throw");
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(AppException);
      expect((thrown as AppException).appError).toBe(error);
    }
  });
});
