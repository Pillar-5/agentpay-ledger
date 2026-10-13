/**
 * Stable machine-readable error codes returned to API consumers.
 * Raw provider response bodies are never exposed; provider failures are
 * classified into one of the PAYMENT_PROVIDER_* codes.
 */
export const ERROR_CODES = [
  "ORDER_NOT_FOUND",
  "INVOICE_NOT_FOUND",
  "PAYMENT_REQUEST_NOT_FOUND",
  "PAYMENT_NOT_FOUND",
  "CUSTOMER_NOT_FOUND",
  "MERCHANT_NOT_FOUND",
  "ORDER_ALREADY_PAID",
  "INVOICE_ALREADY_PAID",
  "ORDER_NOT_PAYABLE",
  "PAYMENT_PROVIDER_NOT_CONFIGURED",
  "PAYMENT_PROVIDER_UNAVAILABLE",
  "PAYMENT_PROVIDER_AUTH_FAILED",
  "PAYMENT_PROVIDER_FORBIDDEN",
  "PAYMENT_PROVIDER_ACCOUNT_NOT_READY",
  "PAYMENT_PROVIDER_RATE_LIMITED",
  "PAYMENT_AMOUNT_INVALID",
  "PAYMENT_AMOUNT_EXCEEDS_LIMIT",
  "PAYMENT_AMOUNT_BELOW_MINIMUM",
  "PAYMENT_ASSET_NOT_ALLOWED",
  "PAYMENT_NETWORK_NOT_ALLOWED",
  "PAYMENT_EXPIRES_TOO_FAR",
  "IDEMPOTENCY_CONFLICT",
  "PAYMENT_STATUS_UNKNOWN",
  "RECONCILIATION_CONFLICT",
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "WEBHOOK_SIGNATURE_INVALID",
  "WEBHOOK_EVENT_DUPLICATE",
  "CALLBACK_URL_INVALID",
  "RATE_LIMITED",
  "INTERNAL_ERROR"
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: ErrorCode, message: string, status = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function errorStatus(code: ErrorCode): number {
  switch (code) {
    case "ORDER_NOT_FOUND":
    case "INVOICE_NOT_FOUND":
    case "PAYMENT_REQUEST_NOT_FOUND":
    case "PAYMENT_NOT_FOUND":
    case "CUSTOMER_NOT_FOUND":
    case "MERCHANT_NOT_FOUND":
    case "NOT_FOUND":
      return 404;
    case "UNAUTHORIZED":
    case "PAYMENT_PROVIDER_AUTH_FAILED":
      return 401;
    case "FORBIDDEN":
    case "PAYMENT_PROVIDER_FORBIDDEN":
      return 403;
    case "IDEMPOTENCY_CONFLICT":
    case "RECONCILIATION_CONFLICT":
    case "ORDER_ALREADY_PAID":
    case "INVOICE_ALREADY_PAID":
    case "CONFLICT":
      return 409;
    case "PAYMENT_PROVIDER_NOT_CONFIGURED":
    case "PAYMENT_PROVIDER_ACCOUNT_NOT_READY":
    case "ORDER_NOT_PAYABLE":
    case "VALIDATION_ERROR":
    case "PAYMENT_AMOUNT_INVALID":
    case "PAYMENT_AMOUNT_EXCEEDS_LIMIT":
    case "PAYMENT_AMOUNT_BELOW_MINIMUM":
    case "PAYMENT_ASSET_NOT_ALLOWED":
    case "PAYMENT_NETWORK_NOT_ALLOWED":
    case "PAYMENT_EXPIRES_TOO_FAR":
    case "CALLBACK_URL_INVALID":
    case "WEBHOOK_SIGNATURE_INVALID":
      return 422;
    case "PAYMENT_PROVIDER_RATE_LIMITED":
    case "RATE_LIMITED":
      return 429;
    case "PAYMENT_PROVIDER_UNAVAILABLE":
      return 502;
    case "PAYMENT_STATUS_UNKNOWN":
      return 503;
    default:
      return 500;
  }
}
