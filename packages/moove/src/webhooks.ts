import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const webhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  createdAt: z.string(),
  data: z
    .object({
      paymentLinkId: z.string(),
      status: z.enum(["active", "completed", "inactive"]),
      amount: z.string().nullable().optional(),
      receivedAmount: z.string(),
      fiatAmount: z.string().nullable().optional(),
      fiatCurrency: z.string().nullable().optional(),
      receivedFiatAmount: z.string().nullable().optional(),
      currentUsage: z.number(),
      maxUsage: z.number().nullable().optional(),
      chainId: z.string(),
      tokenAddress: z.string(),
      description: z.string().nullable().optional(),
      transaction: z
        .object({
          id: z.string(),
          status: z.string(),
          amount: z.string(),
          tokenAddress: z.string(),
          chainId: z.string(),
          sourceTransaction: z.string().nullable().optional(),
          dateCreated: z.string()
        })
        .optional()
    })
    .passthrough()
});

export type MooveWebhookEvent = z.infer<typeof webhookEventSchema>;
export interface VerifyArgs {
  rawBody: Buffer;
  signature: string;
  timestamp: string;
  secret: string;
  toleranceSeconds?: number;
  nowMs?: number;
}

export function verifyWebhookSignature(args: VerifyArgs): boolean {
  const tol = args.toleranceSeconds ?? 300;
  const nowSec = Math.floor((args.nowMs ?? Date.now()) / 1000);
  const ts = Number(args.timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(nowSec - ts) > tol) return false;
  const msg = Buffer.concat([Buffer.from(`${args.timestamp}.`), args.rawBody]);
  const expected = `v1=${createHmac("sha256", args.secret).update(msg).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(args.signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
