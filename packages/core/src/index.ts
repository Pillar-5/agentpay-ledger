import type { Customer, Invoice, Merchant, Order } from "./models.js";
import type { Payment, PaymentRequest, ReconciliationEvent } from "./records.js";
import type { ErrorCode } from "./errors.js";
import * as m from "./money.js";
import * as p from "./policies.js";
import * as r from "./reconcile.js";
import * as s from "./statuses.js";

export type { Customer, Invoice, Merchant, Order };
export type { Payment, PaymentRequest, ReconciliationEvent };
export type { ErrorCode };
export const money = m;
export const policies = p;
export const reconcileEngine = r;
export const statuses = s;
export { DomainError, errorStatus } from "./errors.js";
export { parseAmount } from "./money.js";
export { checkPaymentPolicy, DEFAULT_POLICY } from "./policies.js";
export type { PaymentPolicy, PaymentPolicyInput } from "./policies.js";
export { decideReconciliation, amountsEqualSafe } from "./reconcile.js";
export type { ProviderObservation, ReconcileInput, ReconciliationDecision } from "./reconcile.js";
export {
  canTransitionInvoice,
  canTransitionOrder,
  canTransitionPaymentRequest,
  mapMooveLinkStatus,
  mapMooveTransactionStatus
} from "./statuses.js";
