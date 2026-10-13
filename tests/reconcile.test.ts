import { describe, expect, it } from "vitest";
import { decideReconciliation } from "../packages/core/src/reconcile.js";

function base(over: Record<string, unknown> = {}): Parameters<typeof decideReconciliation>[0] {
  return {
    invoice: { status: "payment_pending", amountDue: "10.00", amountPaid: "0" },
    paymentRequest: { status: "pending", requestedAmount: "10.00", expiresAt: null },
    order: { status: "pending_payment" },
    observation: { linkStatus: "pending", receivedAmount: null, providerTransactionId: null, blockchainTx: null, network: null, asset: null, paidAmount: null },
    existingPaymentForTransaction: false,
    ...(over as Record<string, never>)
  };
}

describe("reconciliation", () => {
  it("settles a full payment", () => {
    const d = decideReconciliation(base({ observation: { linkStatus: "paid", receivedAmount: "10.00", providerTransactionId: "tx1", blockchainTx: null, network: null, asset: null, paidAmount: "10.00" } }));
    expect(d.invoiceStatus).toBe("paid");
    expect(d.orderStatus).toBe("paid");
    expect(d.createPayment).toBe(true);
  });
  it("ignores duplicate transactions", () => {
    const d = decideReconciliation(base({
      observation: { linkStatus: "paid", receivedAmount: "10.00", providerTransactionId: "tx1", blockchainTx: null, network: null, asset: null, paidAmount: "10.00" },
      existingPaymentForTransaction: true
    }));
    expect(d.duplicate).toBe(true);
    expect(d.createPayment).toBe(false);
  });
  it("handles partial payment", () => {
    const d = decideReconciliation(base({ observation: { linkStatus: "paid", receivedAmount: "4.00", providerTransactionId: "tx2", blockchainTx: null, network: null, asset: null, paidAmount: "4.00" } }));
    expect(d.invoiceStatus).toBe("partially_paid");
  });
  it("keeps unknown status unchanged", () => {
    const d = decideReconciliation(base({ observation: { linkStatus: "unknown", receivedAmount: null, providerTransactionId: null, blockchainTx: null, network: null, asset: null, paidAmount: null } }));
    expect(d.eventType).toBe("reconciliation_failed");
  });
  it("ignores observations for paid invoices", () => {
    const d = decideReconciliation(base({
      invoice: { status: "paid", amountDue: "10.00", amountPaid: "10.00" },
      observation: { linkStatus: "paid", receivedAmount: "10.00", providerTransactionId: "tx9", blockchainTx: null, network: null, asset: null, paidAmount: "10.00" }
    }));
    expect(d.duplicate).toBe(true);
  });
});
