import { describe, expect, it } from "vitest";
import { addAmounts, amountsEqual, compareAmounts, parseAmount } from "../packages/core/src/money.js";

describe("money", () => {
  it("parses and normalizes amounts", () => {
    expect(parseAmount("49.99").normalized).toBe("49.99");
    expect(parseAmount("100.0000000").normalized).toBe("100");
  });
  it("rejects invalid amounts", () => {
    for (const bad of ["0", "-1", "abc", "", "1.2345678901234567890"]) {
      expect(() => parseAmount(bad)).toThrow();
    }
  });
  it("compares without floats", () => {
    expect(compareAmounts("0.1", "0.10")).toBe(0);
    expect(amountsEqual("1.5", "1.50")).toBe(true);
    expect(addAmounts("0.1", "0.2")).toBe("0.3");
  });
});
