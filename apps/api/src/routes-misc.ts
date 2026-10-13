import type { FastifyInstance } from "fastify";
import { DomainError } from "@agentpay/core";

export async function miscRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/health", async () => {
    const { getDb } = await import("./db.js");
    let database = "ok";
    try {
      getDb().prepare("SELECT 1 AS v").get();
    } catch {
      database = "error";
    }
    return { status: "ok", database, mooveConfigured: app.mooveReady(), time: new Date().toISOString() };
  });

  app.get("/api/status", async () => {
    const { getDb } = await import("./db.js");
    const db = getDb();
    const count = (t: string): number => (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
    return {
      mooveConfigured: app.mooveReady(),
      mooveBaseUrl: app.agentpayEnv.MOOVE_API_BASE_URL,
      orders: count("orders"),
      invoices: count("invoices"),
      paymentRequests: count("payment_requests"),
      payments: count("payments")
    };
  });

  app.get("/api/moove/status", async () => {
    if (!app.mooveReady()) {
      throw new DomainError("PAYMENT_PROVIDER_NOT_CONFIGURED", "Moove is not configured.", 422);
    }
    const { MooveClient } = await import("@agentpay/moove");
    const env = app.agentpayEnv;
    const client = new MooveClient({ baseUrl: env.MOOVE_API_BASE_URL, apiKey: env.MOOVE_API_KEY ?? "" });
    const page = await client.listPaymentLinks({ limit: 1 });
    return { configured: true, reachable: true, totalLinks: (page as { total?: number }).total ?? null };
  });

  app.get("/api/invoices", async () => {
    const { getDb } = await import("./db.js");
    const { toJson } = await import("./store.js");
    const rows = getDb().prepare("SELECT * FROM invoices ORDER BY created_at DESC LIMIT 100").all() as Array<Record<string, unknown>>;
    return { invoices: rows.map((r) => toJson(r)) };
  });

  app.get("/api/invoices/:id", async (req) => {
    const { getDb } = await import("./db.js");
    const { toJson } = await import("./store.js");
    const db = getDb();
    const { id } = req.params as { id: string };
    const row = db.prepare("SELECT * FROM invoices WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) throw new DomainError("INVOICE_NOT_FOUND", "Invoice not found.", 404);
    return { invoice: toJson(row) };
  });

  app.get("/api/invoices/:id/receipt", async (req, reply) => {
    const { getDb } = await import("./db.js");
    const { toJson } = await import("./store.js");
    const db = getDb();
    const { id } = req.params as { id: string };
    const invoice = db.prepare("SELECT * FROM invoices WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!invoice) throw new DomainError("INVOICE_NOT_FOUND", "Invoice not found.", 404);
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(invoice["order_id"]) as Record<string, unknown> | undefined;
    const pr = db.prepare("SELECT * FROM payment_requests WHERE invoice_id = ? ORDER BY created_at DESC LIMIT 1").get(id) as Record<string, unknown> | undefined;
    const receipt = {
      invoiceNumber: invoice["invoice_number"],
      orderReference: order?.["external_reference"] ?? order?.["id"] ?? null,
      amountDue: invoice["amount_due"],
      amountPaid: invoice["amount_paid"],
      status: invoice["status"],
      providerReference: pr?.["provider_reference"] ?? null,
      paymentUrl: pr?.["payment_url"] ?? null,
      paidAt: invoice["paid_at"],
      merchant: order?.["merchant_id"] ?? null
    };
    const accept = String(req.headers.accept ?? "application/json");
    if (accept.includes("text/html")) {
      const html = `<!doctype html><html><body><h1>Payment receipt</h1><p>Invoice: ${receipt.invoiceNumber}</p><p>Amount due: ${receipt.amountDue}</p><p>Amount paid: ${receipt.amountPaid}</p><p>Status: ${receipt.status}</p></body></html>`;
      return reply.header("Content-Type", "text/html").send(html);
    }
    void toJson;
    return { receipt };
  });

  app.get("/api/payments", async () => {
    const { getDb } = await import("./db.js");
    const { toJson } = await import("./store.js");
    const rows = getDb().prepare("SELECT * FROM payments ORDER BY created_at DESC LIMIT 100").all() as Array<Record<string, unknown>>;
    return { payments: rows.map((r) => toJson(r)) };
  });

  app.get("/api/payments/:id", async (req) => {
    const { getDb } = await import("./db.js");
    const { toJson } = await import("./store.js");
    const { id } = req.params as { id: string };
    const row = getDb().prepare("SELECT * FROM payments WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) throw new DomainError("PAYMENT_NOT_FOUND", "Payment not found.", 404);
    return { payment: toJson(row) };
  });

  app.get("/api/audit", async () => {
    const { getDb } = await import("./db.js");
    const { toJson } = await import("./store.js");
    const rows = getDb().prepare("SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 100").all() as Array<Record<string, unknown>>;
    return { audit: rows.map((r) => toJson(r)) };
  });

  app.get("/api/reconciliation-events", async () => {
    const { getDb } = await import("./db.js");
    const { toJson } = await import("./store.js");
    const rows = getDb().prepare("SELECT * FROM reconciliation_events ORDER BY created_at DESC LIMIT 100").all() as Array<Record<string, unknown>>;
    return { events: rows.map((r) => toJson(r)) };
  });
}
