import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { DomainError, decideReconciliation, mapMooveLinkStatus } from "@agentpay/core";
import { MooveClient } from "@agentpay/moove";

export async function refreshRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/payment-requests", async () => {
    const { getDb } = await import("./db.js");
    const { toJson } = await import("./store.js");
    const rows = getDb().prepare("SELECT * FROM payment_requests ORDER BY created_at DESC LIMIT 100").all() as Array<Record<string, unknown>>;
    return { paymentRequests: rows.map((r) => toJson(r)) };
  });

  app.get("/api/payment-requests/:id", async (req) => {
    const { getDb } = await import("./db.js");
    const { toJson } = await import("./store.js");
    const db = getDb();
    const { id } = req.params as { id: string };
    const row = db.prepare("SELECT * FROM payment_requests WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) throw new DomainError("PAYMENT_REQUEST_NOT_FOUND", "Not found.", 404);
    return { paymentRequest: toJson(row) };
  });

  app.post("/api/payment-requests/:id/refresh", async (req) => {
    const { getDb } = await import("./db.js");
    const { audit, recordReconciliation, toJson } = await import("./store.js");
    const db = getDb();
    const { id } = req.params as { id: string };
    const pr = db.prepare("SELECT * FROM payment_requests WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!pr) throw new DomainError("PAYMENT_REQUEST_NOT_FOUND", "Not found.", 404);
    if (!app.mooveReady()) throw new DomainError("PAYMENT_PROVIDER_NOT_CONFIGURED", "Moove not configured.", 422);
    const ref = pr["provider_reference"] as string | null;
    if (!ref) throw new DomainError("PAYMENT_STATUS_UNKNOWN", "No provider reference.", 503);
    const env = app.agentpayEnv;
    const client = new MooveClient({ baseUrl: env.MOOVE_API_BASE_URL, apiKey: env.MOOVE_API_KEY ?? "" });
    const status = await client.getPaymentStatus(ref);
    const mapped = mapMooveLinkStatus(status.link.status);
    const invoice = db.prepare("SELECT * FROM invoices WHERE id = ?").get(pr["invoice_id"]) as Record<string, unknown>;
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(invoice["order_id"]) as Record<string, unknown>;
    const decision = decideReconciliation({
      invoice: { status: invoice["status"] as never, amountDue: String(invoice["amount_due"]), amountPaid: String(invoice["amount_paid"]) },
      paymentRequest: { status: pr["status"] as never, requestedAmount: String(pr["requested_amount"]), expiresAt: pr["expires_at"] as string | null },
      order: { status: order["status"] as never },
      observation: { linkStatus: mapped, receivedAmount: status.receivedAmount, providerTransactionId: null, blockchainTx: null, network: null, asset: null, paidAmount: null },
      existingPaymentForTransaction: false
    });
    const ts = new Date().toISOString();
    db.prepare("UPDATE payment_requests SET status = ?, last_checked_at = ?, updated_at = ? WHERE id = ?").run(decision.paymentRequestStatus, ts, ts, id);
    if (decision.createPayment) {
      db.prepare("INSERT INTO payments (id, payment_request_id, provider_transaction_id, blockchain_transaction_hash, network, asset, requested_amount, paid_amount, status, confirmed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        randomUUID(), id, null, null, null, pr["payment_asset"], String(pr["requested_amount"]), status.receivedAmount ?? String(pr["requested_amount"]), decision.paymentStatus, ts, ts, ts
      );
    }
    if (decision.invoiceStatus !== invoice["status"]) {
      db.prepare("UPDATE invoices SET status = ?, paid_at = ?, updated_at = ? WHERE id = ?").run(decision.invoiceStatus, decision.invoiceStatus === "paid" ? ts : invoice["paid_at"], ts, invoice["id"]);
    }
    if (decision.orderStatus !== order["status"]) {
      db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").run(decision.orderStatus, ts, order["id"]);
    }
    recordReconciliation(db, { invoiceId: String(invoice["id"]), eventType: decision.eventType, reason: decision.reason });
    audit(db, { action: "payment.status_refreshed", entityType: "payment_request", entityId: id });
    const updated = db.prepare("SELECT * FROM payment_requests WHERE id = ?").get(id) as Record<string, unknown>;
    return { paymentRequest: toJson(updated), status: decision.paymentRequestStatus, reason: decision.reason };
  });
}
