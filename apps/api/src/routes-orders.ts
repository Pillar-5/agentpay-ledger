import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DomainError, parseAmountShim } from "./routes-util.js";

const createSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.string().min(1).max(40),
  currency: z.string().min(2).max(12).default("USDC"),
  merchantReference: z.string().max(120).optional(),
  externalReference: z.string().max(120).optional(),
  customer: z.object({
    name: z.string().max(200).optional(),
    email: z.string().email().max(320).optional(),
    externalReference: z.string().max(120).optional()
  }).optional(),
  metadata: z.record(z.unknown()).optional()
});

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/orders", async (req, reply) => {
    const { getDb } = await import("./db.js");
    const { createOrder, ensureMerchant, toJson } = await import("./store.js");
    const db = getDb();
    const body = createSchema.parse(req.body);
    const parsed = parseAmountShim(body.amount);
    const merchant = ensureMerchant(db, body.merchantReference ?? "default", body.merchantReference ?? null);
    let customerId: string | null = null;
    if (body.customer) {
      customerId = randomUUID();
      db.prepare("INSERT INTO customers (id, merchant_id, name, email, external_reference, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        customerId, merchant["id"], body.customer.name ?? null, body.customer.email ?? null,
        body.customer.externalReference ?? null, new Date().toISOString(), new Date().toISOString()
      );
    }
    try {
      const row = createOrder(db, {
        merchantId: String(merchant["id"]),
        customerId,
        externalReference: body.externalReference ?? null,
        description: body.description,
        amount: parsed,
        currency: body.currency,
        metadata: body.metadata ?? null
      });
      return reply.status(201).send({ order: toJson(row) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("UNIQUE")) {
        throw new DomainError("CONFLICT", "Duplicate external reference.", 409);
      }
      throw e;
    }
  });
  app.get("/api/orders", async () => {
    const { getDb } = await import("./db.js");
    const { toJson } = await import("./store.js");
    const db = getDb();
    const rows = db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 100").all() as Array<Record<string, unknown>>;
    return { orders: rows.map((r) => toJson(r)) };
  });

  app.get("/api/orders/:id", async (req, reply) => {
    const { getDb } = await import("./db.js");
    const { toJson } = await import("./store.js");
    const db = getDb();
    const { id } = req.params as { id: string };
    const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) {
      throw new DomainError("ORDER_NOT_FOUND", "Order not found.", 404);
    }
    const invoice = db.prepare("SELECT * FROM invoices WHERE order_id = ?").get(id) as Record<string, unknown> | undefined;
    const pr = invoice
      ? (db.prepare("SELECT * FROM payment_requests WHERE invoice_id = ? ORDER BY created_at DESC LIMIT 1").get(invoice["id"]) as Record<string, unknown> | undefined)
      : undefined;
    return reply.send({ order: toJson(row), invoice: invoice ? toJson(invoice) : null, paymentRequest: pr ? toJson(pr) : null });
  });
}


