import { z } from "zod";

export const mooveLinkStatusSchema = z.enum(["active", "completed", "inactive"]);
export type MooveLinkStatus = z.infer<typeof mooveLinkStatusSchema>;

const tokenChainSchema = z
  .object({
    chainType: z.string(),
    chainId: z.union([z.string(), z.number()]).optional(),
    name: z.string().optional()
  })
  .passthrough();

const tokenSchema = z
  .object({
    address: z.string(),
    decimals: z.number(),
    symbol: z.string(),
    name: z.string(),
    chain: tokenChainSchema.optional()
  })
  .passthrough();

export const paymentLinkSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    toAmount: z.string().nullable().optional(),
    destinationAddress: z.string(),
    url: z.string(),
    dateCreated: z.string(),
    status: mooveLinkStatusSchema,
    description: z.string().nullable().optional(),
    maxUsage: z.number().nullable().optional(),
    receivedAmount: z.string().nullable().optional(),
    expirationDate: z.string().nullable().optional(),
    transactionUrl: z.string().nullable().optional(),
    type: z.string().optional(),
    token: tokenSchema.optional()
  })
  .passthrough();

export type MoovePaymentLink = z.infer<typeof paymentLinkSchema>;

export const paymentLinkCreationSchema = z.object({
  id: z.string(),
  url: z.string()
});
export type MoovePaymentLinkCreation = z.infer<typeof paymentLinkCreationSchema>;

export const listEnvelopeSchema = z.object({
  data: z.array(paymentLinkSchema),
  limit: z.number(),
  offset: z.number(),
  nextOffset: z.number().nullable()
});
export type MooveListEnvelope = z.infer<typeof listEnvelopeSchema>;
export const createBodySchema = {
  parse(input: { toAmount: string; description?: string; maxUsage?: number; expirationDate?: string }) {
    if (typeof input.toAmount !== "string" || input.toAmount.length === 0) {
      throw new Error("toAmount is required");
    }
    if (input.description !== undefined && input.description.length > 500) {
      throw new Error("description too long");
    }
    if (input.maxUsage !== undefined && (!Number.isInteger(input.maxUsage) || input.maxUsage < 1)) {
      throw new Error("maxUsage invalid");
    }
    return input;
  }
};
export interface ListQuery {
  status?: "active" | "inactive" | "completed";
  offset?: number;
  limit?: number;
  q?: string;
  date_from?: string;
  date_to?: string;
}

export function parseListQuery(q: ListQuery): ListQuery {
  if (q.offset !== undefined && (!Number.isInteger(q.offset) || q.offset < 0)) {
    throw new Error("offset invalid");
  }
  if (q.limit !== undefined && (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 100)) {
    throw new Error("limit invalid");
  }
  return q;
}
