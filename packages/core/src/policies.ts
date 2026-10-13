import { DomainError } from "./errors.js";
import { compareAmounts, parseAmount } from "./money.js";

export interface PaymentPolicy {
  minAmount?: string;
  maxAmount?: string;
  /** Maximum lifetime of a payment request in seconds. */
  maxExpirySeconds?: number;
  /** ISO 4217 codes or token symbols allowed as the settlement descriptor. */
  allowedCurrencies?: string[];
  allowedNetworks?: string[];
}

export const DEFAULT_POLICY: PaymentPolicy = {
  minAmount: "0.01",
  maxAmount: "1000000",
  maxExpirySeconds: 60 * 60 * 24 * 30
};

export interface PaymentPolicyInput {
  amount: string;
  currency: string;
  network?: string;
  expiresAt?: string | null;
  orderStatus: string;
  now?: Date;
}

export function checkPaymentPolicy(policy: PaymentPolicy, input: PaymentPolicyInput): void {
  const merged: PaymentPolicy = { ...DEFAULT_POLICY, ...policy };
  const parsed = (() => {
    try {
      return parseAmount(input.amount);
    } catch {
      throw new DomainError("PAYMENT_AMOUNT_INVALID", "Payment amount is invalid.", 422);
    }
  })();

  if (input.orderStatus !== "pending_payment" && input.orderStatus !== "draft") {
    throw new DomainError(
      "ORDER_NOT_PAYABLE",
      `Order in status '${input.orderStatus}' cannot take a payment.`,
      422
    );
  }

  if (merged.minAmount !== undefined && compareAmounts(parsed.normalized, merged.minAmount) < 0) {
    throw new DomainError(
      "PAYMENT_AMOUNT_BELOW_MINIMUM",
      `Amount ${parsed.normalized} is below the minimum of ${merged.minAmount}.`,
      422
    );
  }
  if (merged.maxAmount !== undefined && compareAmounts(parsed.normalized, merged.maxAmount) > 0) {
    throw new DomainError(
      "PAYMENT_AMOUNT_EXCEEDS_LIMIT",
      `Amount ${parsed.normalized} exceeds the maximum of ${merged.maxAmount}.`,
      422
    );
  }
  if (merged.allowedCurrencies && merged.allowedCurrencies.length > 0) {
    const allowed = merged.allowedCurrencies.map((c) => c.toUpperCase());
    if (!allowed.includes(input.currency.toUpperCase())) {
      throw new DomainError(
        "PAYMENT_ASSET_NOT_ALLOWED",
        `Currency '${input.currency}' is not allowed by policy.`,
        422
      );
    }
  }
  if (
    merged.allowedNetworks &&
    merged.allowedNetworks.length > 0 &&
    input.network !== undefined &&
    input.network !== null &&
    input.network !== ""
  ) {
    const allowed = merged.allowedNetworks.map((n) => n.toLowerCase());
    if (!allowed.includes(input.network.toLowerCase())) {
      throw new DomainError(
        "PAYMENT_NETWORK_NOT_ALLOWED",
        `Network '${input.network}' is not allowed by policy.`,
        422
      );
    }
  }
  if (input.expiresAt !== undefined && input.expiresAt !== null) {
    const expires = new Date(input.expiresAt);
    if (Number.isNaN(expires.getTime())) {
      throw new DomainError("VALIDATION_ERROR", "expires_at is not a valid timestamp.", 422);
    }
    const now = input.now ?? new Date();
    if (expires.getTime() <= now.getTime()) {
      throw new DomainError("VALIDATION_ERROR", "expires_at must be in the future.", 422);
    }
    if (merged.maxExpirySeconds !== undefined) {
      const maxMs = merged.maxExpirySeconds * 1000;
      if (expires.getTime() - now.getTime() > maxMs) {
        throw new DomainError(
          "PAYMENT_EXPIRES_TOO_FAR",
          "Requested expiry exceeds the policy limit.",
          422
        );
      }
    }
  }
}
