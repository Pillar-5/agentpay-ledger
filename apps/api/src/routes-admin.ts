import type { FastifyInstance } from "fastify";
import { DomainError } from "@agentpay/core";

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/invoices/:id/cancel", async (req) => {
    const { getDb } = await import("./db.js");
    const { audit, toJson } = await import("./store.js");
    const db = getDb();
    const { id } = req.params as { id: string };
    const inv = db.prepare("SELECT * FROM invoices WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!inv) throw new DomainError("INVOICE_NOT_FOUND", "Invoice not found.", 404);
    if (inv["status"] === "paid") throw new DomainError("INVOICE_ALREADY_PAID", "Already paid.", 409);
    const ts = new Date().toISOString();
    db.prepare("UPDATE invoices SET status = 'cancelled', updated_at = ? WHERE id = ?").run(ts, id);
    audit(db, { action: "invoice.cancelled", entityType: "invoice", entityId: id });
    const updated = db.prepare("SELECT * FROM invoices WHERE id = ?").get(id) as Record<string, unknown>;
    return { invoice: toJson(updated) };
  });

  app.post("/api/payment-requests/:id/cancel", async (req) => {
    const { getDb } = await import("./db.js");
    const { audit, toJson } = await import("./store.js");
    const db = getDb();
    const { id } = req.params as { id: string };
    const pr = db.prepare("SELECT * FROM payment_requests WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!pr) throw new DomainError("PAYMENT_REQUEST_NOT_FOUND", "Not found.", 404);
    if (pr["status"] === "paid") throw new DomainError("ORDER_ALREADY_PAID", "Already paid.", 409);
    const ts = new Date().toISOString();
    db.prepare("UPDATE payment_requests SET status = 'cancelled', updated_at = ? WHERE id = ?").run(ts, id);
    audit(db, { action: "payment_request.cancelled", entityType: "payment_request", entityId: id });
    const updated = db.prepare("SELECT * FROM payment_requests WHERE id = ?").get(id) as Record<string, unknown>;
    return { paymentRequest: toJson(updated) };
  });

  app.get("/api/export/invoices.csv", async (_req, reply) => {
    const { getDb } = await import("./db.js");
    const db = getDb();
    const rows = db.prepare("SELECT id, invoice_number, amount_due, amount_paid, status, issued_at, paid_at FROM invoices ORDER BY created_at DESC").all() as Array<Record<string, unknown>>;
    const lines = ["id,invoice_number,amount_due,amount_paid,status,issued_at,paid_at"];
    for (const r of rows) {
      lines.push([r["id"], r["invoice_number"], r["amount_due"], r["amount_paid"], r["status"], r["issued_at"], r["paid_at"]].map((v) => `"${String(v ?? "")}"`).join(","));
    }
    return reply.header("Content-Type", "text/csv").send(lines.join("\n"));
  });

  app.get("/api/export/payments.csv", async (_req, reply) => {
    const { getDb } = await import("./db.js");
    const db = getDb();
    const rows = db.prepare("SELECT id, payment_request_id, provider_transaction_id, paid_amount, asset, network, status, confirmed_at FROM payments ORDER BY created_at DESC").all() as Array<Record<string, unknown>>;
    const lines = ["id,payment_request_id,provider_transaction_id,paid_amount,asset,network,status,confirmed_at"];
    for (const r of rows) {
      lines.push([r["id"], r["payment_request_id"], r["provider_transaction_id"], r["paid_amount"], r["asset"], r["network"], r["status"], r["confirmed_at"]].map((v) => `"${String(v ?? "")}"`).join(","));
    }
    void app;
    return reply.header("Content-Type", "text/csv").send(lines.join("\n"));
  });
}
