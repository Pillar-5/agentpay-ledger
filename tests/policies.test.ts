import { describe, expect, it } from "vitest";
import { checkPaymentPolicy } from "../packages/core/src/policies.js";
import { canTransitionInvoice, canTransitionOrder, mapMooveLinkStatus } from "../packages/core/src/statuses.js";

describe("policies and states", () => {
  it("enforces amount limits", () => {
    expect(() => checkPaymentPolicy({ maxAmount: "5" }, { amount: "10", currency: "USDC", orderStatus: "pending_payment" })).toThrow();
  });
  it("rejects non-payable orders", () => {
    expect(() => checkPaymentPolicy({}, { amount: "1", currency: "USDC", orderStatus: "paid" })).toThrow();
  });
  it("maps provider states", () => {
    expect(mapMooveLinkStatus("active")).toBe("pending");
    expect(mapMooveLinkStatus("completed")).toBe("paid");
    expect(mapMooveLinkStatus("inactive")).toBe("expired");
  });
  it("guards transitions", () => {
    expect(canTransitionOrder("draft", "pending_payment")).toBe(true);
    expect(canTransitionOrder("paid", "draft")).toBe(false);
    expect(canTransitionInvoice("paid", "issued")).toBe(false);
  });
});
