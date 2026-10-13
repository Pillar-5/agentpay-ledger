import type { Invoice, Order } from "./models.js";
import type { PaymentRequest } from "./records.js";
import type { InvoiceStatus, PaymentRequestStatus, PaymentStatus } from "./statuses.js";

export interface ProviderObservation {
  linkStatus: PaymentRequestStatus;
  receivedAmount: string | null;
  providerTransactionId: string | null;
  blockchainTx: string | null;
  network: string | null;
  asset: string | null;
  paidAmount: string | null;
}

export interface ReconcileInput {
  invoice: Pick<Invoice, "status" | "amountDue" | "amountPaid">;
  paymentRequest: Pick<PaymentRequest, "status" | "requestedAmount" | "expiresAt">;
  order: Pick<Order, "status">;
  observation: ProviderObservation;
  existingPaymentForTransaction: boolean;
  now?: Date;
}

export interface ReconciliationDecision {
  paymentRequestStatus: PaymentRequestStatus;
  createPayment: boolean;
  paymentStatus: PaymentStatus;
  invoiceStatus: InvoiceStatus;
  orderStatus: Order["status"];
  eventType: string;
  reason: string;
  duplicate: boolean;
}
const AMOUNT_RE = /^\d+(\.\d+)?$/;

function fracLen(v: string): number {
  const i = v.indexOf(".");
  return i === -1 ? 0 : v.length - i - 1;
}

function scaled(v: string, scale: number): bigint {
  const p = v.split(".") as [string, string?];
  const w = p[0];
  const f = p[1] ?? "";
  return BigInt(`${w}${(f + "0".repeat(scale)).slice(0, scale)}`);
}

export function amountsEqualSafe(a: string, b: string): boolean {
  if (!AMOUNT_RE.test(a) || !AMOUNT_RE.test(b)) return false;
  const s = Math.max(fracLen(a), fracLen(b));
  return scaled(a, s) === scaled(b, s);
}
export function decideReconciliation(input: ReconcileInput): ReconciliationDecision {
  const base: ReconciliationDecision = {
    paymentRequestStatus: input.paymentRequest.status,
    createPayment: false,
    paymentStatus: "pending",
    invoiceStatus: input.invoice.status,
    orderStatus: input.order.status,
    eventType: "payment_observed",
    reason: "No state change.",
    duplicate: false
  };
  const obs = input.observation;
  if (obs.linkStatus === "unknown") {
    return { ...base, eventType: "reconciliation_failed", reason: "Provider status unknown." };
  }
  if (obs.providerTransactionId && input.existingPaymentForTransaction) {
    const pr = input.paymentRequest.status === "paid" ? "paid" : obs.linkStatus;
    return {
      ...base,
      paymentRequestStatus: pr,
      paymentStatus: "confirmed",
      eventType: "duplicate_payment_ignored",
      reason: `Transaction ${obs.providerTransactionId} already recorded.`,
      duplicate: true
    };
  }
  if (input.invoice.status === "paid") {
    const pr = input.paymentRequest.status === "paid" ? "paid" : obs.linkStatus;
    const or = input.order.status === "pending_payment" ? "paid" : input.order.status;
    return {
      ...base,
      paymentRequestStatus: pr,
      orderStatus: or,
      eventType: "duplicate_payment_ignored",
      reason: "Invoice already paid.",
      duplicate: true
    };
  }
  return finishDecision(input, base);
}
function finishDecision(input: ReconcileInput, base: ReconciliationDecision): ReconciliationDecision {
  const obs = input.observation;
  const nowMs = (input.now ?? new Date()).getTime();
  const exp = input.paymentRequest.expiresAt;
  const expMs = exp === null ? NaN : Date.parse(exp);
  if (!Number.isNaN(expMs) && expMs <= nowMs && obs.linkStatus === "pending") {
    return { ...base, paymentRequestStatus: "expired", reason: "Past expiry time." };
  }
  if (obs.linkStatus === "paid") {
    const received = obs.receivedAmount ?? obs.paidAmount;
    const full = received === null || amountsEqualSafe(received, input.invoice.amountDue);
    return {
      ...base,
      paymentRequestStatus: "paid",
      createPayment: true,
      paymentStatus: "confirmed",
      invoiceStatus: full ? "paid" : "partially_paid",
      orderStatus: full ? "paid" : input.order.status,
      eventType: "reconciliation_completed",
      reason: full ? "Settled amount satisfies invoice." : "Settled amount differs.",
      duplicate: false
    };
  }
  if (obs.linkStatus === "expired") {
    return { ...base, paymentRequestStatus: "expired", reason: "Provider reports not payable." };
  }
  if (obs.linkStatus === "failed") {
    return {
      ...base,
      paymentRequestStatus: "failed",
      paymentStatus: "failed",
      reason: "Provider reports failed payment."
    };
  }
  if (obs.linkStatus === "cancelled") {
    return { ...base, paymentRequestStatus: "cancelled", reason: "Cancelled locally." };
  }
  const pr = input.paymentRequest.status === "created" ? "pending" : input.paymentRequest.status;
  return { ...base, paymentRequestStatus: pr, reason: "Payment still pending." };
}
