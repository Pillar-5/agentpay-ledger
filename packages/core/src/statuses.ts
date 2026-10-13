export const ORDER_STATUSES = [
  "draft",
  "pending_payment",
  "paid",
  "processing",
  "completed",
  "cancelled"
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const INVOICE_STATUSES = [
  "draft",
  "issued",
  "payment_pending",
  "partially_paid",
  "paid",
  "expired",
  "cancelled"
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_REQUEST_STATUSES = [
  "created",
  "pending",
  "paid",
  "failed",
  "expired",
  "cancelled",
  "unknown"
] as const;
export type PaymentRequestStatus = (typeof PAYMENT_REQUEST_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "confirmed", "failed"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type MooveLinkStatus = "active" | "completed" | "inactive";

const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  draft: ["pending_payment", "cancelled"],
  pending_payment: ["paid", "cancelled"],
  paid: ["processing", "completed", "cancelled"],
  processing: ["completed", "cancelled"],
  completed: [],
  cancelled: []
};

const INVOICE_TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  draft: ["issued", "cancelled"],
  issued: ["payment_pending", "cancelled"],
  payment_pending: ["partially_paid", "paid", "expired", "cancelled"],
  partially_paid: ["paid", "expired", "cancelled"],
  paid: [],
  expired: ["cancelled"],
  cancelled: []
};

const PAYMENT_REQUEST_TRANSITIONS: Record<PaymentRequestStatus, readonly PaymentRequestStatus[]> = {
  created: ["pending", "paid", "failed", "expired", "cancelled", "unknown"],
  pending: ["paid", "failed", "expired", "cancelled", "unknown"],
  paid: [],
  failed: ["pending"],
  expired: ["pending"],
  cancelled: [],
  unknown: ["pending", "paid", "failed", "expired", "cancelled"]
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  return ORDER_TRANSITIONS[from].includes(to);
}

export function canTransitionInvoice(from: InvoiceStatus, to: InvoiceStatus): boolean {
  if (from === to) return true;
  return INVOICE_TRANSITIONS[from].includes(to);
}

export function canTransitionPaymentRequest(
  from: PaymentRequestStatus,
  to: PaymentRequestStatus
): boolean {
  if (from === to) return true;
  return PAYMENT_REQUEST_TRANSITIONS[from].includes(to);
}

/**
 * Map a Moove payment-link status to the normalized internal payment-request state.
 * Source: Moove docs, PaymentLinkData.status is one of active | completed | inactive.
 * An inactive link was deactivated in the dashboard or passed its expirationDate;
 * locally we record it as expired. Expiry based on expires_at is applied by the
 * caller before this mapping when the provider still reports active.
 */
export function mapMooveLinkStatus(status: MooveLinkStatus): PaymentRequestStatus {
  switch (status) {
    case "active":
      return "pending";
    case "completed":
      return "paid";
    case "inactive":
      return "expired";
  }
}

/** Map a Moove webhook transaction status to an internal payment state. */
export function mapMooveTransactionStatus(
  status: "settled" | "processing" | "failed" | string
): PaymentStatus {
  switch (status) {
    case "settled":
      return "confirmed";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}
