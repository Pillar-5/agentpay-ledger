import { DomainError } from "@agentpay/core";
import { parseAmount } from "@agentpay/core";

export { DomainError };

export function parseAmountShim(input: string): string {
  try {
    return parseAmount(input).normalized;
  } catch {
    throw new DomainError("PAYMENT_AMOUNT_INVALID", "Amount is invalid.", 422);
  }
}
