import { createHash, randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DomainError, checkPaymentPolicy } from "@agentpay/core";
import { MooveApiError, MooveClient } from "@agentpay/moove";

const bodySchema = z.object({
  expiresAt: z.string().optional(),
  maxUsage: z.number().int().min(1).optional(),
  description: z.string().max(500).optional()
});

function fp(obj: unknown): string {
  return createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

export async function paymentRequestRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/orders/:id/payment-request", async (req, reply) => {
    const { getDb } = await import("./db.js");
    const { audit, recordReconciliation, toJson } = await import("./store.js");
    const db = getDb();
    const { id } = req.params as { id: string };
    const body = bodySchema.parse(req.body ?? {});
    const idemKey = req.headers["idempotency-key"] as string | undefined;
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!order) throw new DomainError("ORDER_NOT_FOUND", "Order not found.", 404);
    if (order["status"] === "paid" || order["status"] === "completed") {
      throw new DomainError("ORDER_ALREADY_PAID", "Order is already paid.", 409);
    }
    const invoice = db.prepare("SELECT * FROM invoices WHERE order_id = ?").get(id) as Record<string, unknown> | undefined;
    if (!invoice) throw new DomainError("INVOICE_NOT_FOUND", "Invoice not found.", 404);
    checkPaymentPolicy({}, {
      amount: String(order["amount"]),
      currency: String(order["currency"]),
      orderStatus: String(order["status"]),
      expiresAt: body.expiresAt ?? null
    });
    if (idemKey) {
      const existing = db.prepare("SELECT * FROM idempotency_keys WHERE key = ?").get(idemKey) as { fingerprint: string; response: string } | undefined;
      const current = fp({ order: id, body });
      if (existing) {
        if (existing.fingerprint !== current) {
          throw new DomainError("IDEMPOTENCY_CONFLICT", "Idempotency key reused with different payload.", 409);
        }
        return reply.send(JSON.parse(existing.response) as unknown);
      }
    }
    if (!app.mooveReady()) {
      throw new DomainError("PAYMENT_PROVIDER_NOT_CONFIGURED", "Moove is not configured.", 422);
    }
    const reuse = db.prepare("SELECT * FROM payment_requests WHERE invoice_id = ? AND status IN ('created','pending') ORDER BY created_at DESC LIMIT 1").get(invoice["id"]) as Record<string, unknown> | undefined;
    if (reuse && reuse["provider_reference"] && reuse["payment_url"]) {
      const payload = { paymentRequest: toJson(reuse) };
      if (idemKey) {
        db.prepare("INSERT OR IGNORE INTO idempotency_keys (key, fingerprint, response, created_at) VALUES (?, ?, ?, ?)").run(idemKey, fp({ order: id, body }), JSON.stringify(payload), new Date().toISOString());
      }
      return reply.send(payload);
    }
    const env = app.agentpayEnv;
    const client = new MooveClient({ baseUrl: env.MOOVE_API_BASE_URL, apiKey: env.MOOVE_API_KEY ?? "" });
    let created: { id: string; url: string };
    try {
      created = await client.createPaymentLink({
        toAmount: String(order["amount"]),
        description: body.description ?? String(order["description"]),
        maxUsage: 1,
        ...(body.expiresAt !== undefined ? { expirationDate: body.expiresAt } : {})
      });
    } catch (e) {
      audit(db, { action: "payment_request_failed", entityType: "order", entityId: id, metadata: { reason: classify(e) } });
      throw classifyError(e);
    }
    const prId = randomUUID();
    const ts = new Date().toISOString();
    db.prepare("INSERT INTO payment_requests (id, invoice_id, merchant_id, provider, provider_reference, payment_url, requested_amount, payment_asset, network, status, expires_at, last_checked_at, created_at, updated_at) VALUES (?, ?, ?, 'moove', ?, ?, ?, ?, NULL, 'pending', ?, ?, ?, ?)").run(
      prId, invoice["id"], order["merchant_id"], created.id, created.url, String(order["amount"]), String(order["currency"]), body.expiresAt ?? null, ts, ts, ts
    );
    db.prepare("UPDATE invoices SET status = 'payment_pending', updated_at = ? WHERE id = ?").run(ts, invoice["id"]);
    recordReconciliation(db, { invoiceId: String(invoice["id"]), eventType: "payment_request_created", previousStatus: String(invoice["status"]), newStatus: "payment_pending", reason: `provider ${created.id}` });
    audit(db, { action: "payment_request.created", entityType: "payment_request", entityId: prId });
    const row = db.prepare("SELECT * FROM payment_requests WHERE id = ?").get(prId) as Record<string, unknown>;
    const payload = { paymentRequest: toJson(row) };
    if (idemKey) {
      db.prepare("INSERT OR IGNORE INTO idempotency_keys (key, fingerprint, response, created_at) VALUES (?, ?, ?, ?)").run(idemKey, fp({ order: id, body }), JSON.stringify(payload), ts);
    }
    return reply.status(201).send(payload);
  });
}

function classify(e: unknown): string {
  if (e instanceof MooveApiError) return e.code;
  return "PROVIDER_ERROR";
}

function classifyError(e: unknown): DomainError {
  if (e instanceof MooveApiError) {
    if (e.status === 401) return new DomainError("PAYMENT_PROVIDER_AUTH_FAILED", "Moove auth failed.", 401);
    if (e.status === 403) return new DomainError("PAYMENT_PROVIDER_FORBIDDEN", "Moove scope missing.", 403);
    if (e.status === 409) return new DomainError("PAYMENT_PROVIDER_ACCOUNT_NOT_READY", "Moove account not ready.", 422);
    if (e.status === 429) return new DomainError("PAYMENT_PROVIDER_RATE_LIMITED", "Moove rate limited.", 429);
    if (e.status === 422) return new DomainError("PAYMENT_AMOUNT_INVALID", "Moove rejected the amount.", 422);
    return new DomainError("PAYMENT_PROVIDER_UNAVAILABLE", "Moove unavailable.", 502);
  }
  return new DomainError("PAYMENT_PROVIDER_UNAVAILABLE", "Moove unavailable.", 502);
}

