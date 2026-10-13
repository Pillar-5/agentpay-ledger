/**
 * Decimal-safe money handling.
 *
 * Amounts are represented as decimal strings (for example "49.99") and never as
 * JavaScript numbers. All parsing, comparison and addition is done with BigInt
 * scaled to the operand precision so no floating-point arithmetic is involved.
 */

const AMOUNT_PATTERN = /^\d+(\.\d+)?$/;

export const MAX_AMOUNT_DECIMALS = 18;
export const MAX_AMOUNT_VALUE = "999999999999.999999999999";

export interface ParsedAmount {
  /** Original input with insignificant trailing zeros removed. */
  normalized: string;
  /** Number of fractional digits. */
  decimals: number;
}

export function parseAmount(input: string): ParsedAmount {
  if (typeof input !== "string" || input.length === 0 || input.length > 40) {
    throw new Error("INVALID_AMOUNT");
  }
  const trimmed = input.trim();
  if (!AMOUNT_PATTERN.test(trimmed)) {
    throw new Error("INVALID_AMOUNT");
  }
  const [whole, frac = ""] = trimmed.split(".") as [string, string];
  const strippedWhole = whole.replace(/^0+(?=\d)/, "");
  const decimals = frac.length;
  if (decimals > MAX_AMOUNT_DECIMALS) {
    throw new Error("INVALID_AMOUNT_PRECISION");
  }
  const normalizedFrac = frac.replace(/0+$/, "");
  const normalized =
    normalizedFrac.length > 0 ? `${strippedWhole}.${normalizedFrac}` : strippedWhole;
  if (compareAmounts(normalized, "0") <= 0) {
    throw new Error("INVALID_AMOUNT_NON_POSITIVE");
  }
  if (compareAmounts(normalized, MAX_AMOUNT_VALUE) > 0) {
    throw new Error("INVALID_AMOUNT_TOO_LARGE");
  }
  return { normalized, decimals };
}

function scaleTo(value: string, decimals: number): bigint {
  const [whole, frac = ""] = value.split(".") as [string, string];
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(`${whole}${padded}` === "" ? "0" : `${whole}${padded}`);
}

function decimalsOf(value: string): number {
  const idx = value.indexOf(".");
  return idx === -1 ? 0 : value.length - idx - 1;
}

/** Compare two decimal strings: -1, 0 or 1. */
export function compareAmounts(a: string, b: string): number {
  const scale = Math.max(decimalsOf(a), decimalsOf(b));
  const left = scaleTo(a, scale);
  const right = scaleTo(b, scale);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/** True when two decimal strings represent the same numeric value. */
export function amountsEqual(a: string, b: string): boolean {
  return compareAmounts(a, b) === 0;
}

/** Add two decimal strings, returning a normalized decimal string. */
export function addAmounts(a: string, b: string): string {
  const scale = Math.max(decimalsOf(a), decimalsOf(b));
  const total = scaleTo(a, scale) + scaleTo(b, scale);
  const negative = total < 0n;
  const digits = (negative ? -total : total).toString().padStart(scale + 1, "0");
  if (scale === 0) return `${negative ? "-" : ""}${digits}`;
  const whole = digits.slice(0, digits.length - scale).replace(/^0+(?=\d)/, "");
  const frac = digits.slice(digits.length - scale).replace(/0+$/, "");
  const result = frac.length > 0 ? `${whole}.${frac}` : whole;
  return negative ? `-${result}` : result;
}

export function isValidAmount(input: unknown): input is string {
  if (typeof input !== "string") return false;
  try {
    parseAmount(input);
    return true;
  } catch {
    return false;
  }
}
