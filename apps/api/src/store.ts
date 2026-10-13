import { randomUUID } from "node:crypto";
import type { Db } from "./db.js";

function now(): string {
  return new Date().toISOString();
}

function rowToJson<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    if ((camel === "metadata" || camel === "rawProviderReference") && typeof v === "string" && v) {
      try {
        out[camel] = JSON.parse(v) as unknown;
        continue;
      } catch {
        out[camel] = null;
        continue;
      }
    }
    out[camel] = v;
  }
  return out as T;
}

export interface CreateOrderArgs {
  merchantId: string;
  customerId?: string | null;
  externalReference?: string | null;
  description: string;
  amount: string;
  currency: string;
  metadata?: Record<string, unknown> | null;
  id?: string;
}

export function ensureMerchant(db: Db, name: string, externalRef: string | null): Record<string, unknown> {
  const existing = db
    .prepare("SELECT * FROM merchants WHERE external_reference = ? OR name = ?")
    .get(externalRef, name) as Record<string, unknown> | undefined;
  if (existing) return existing;
  const id = randomUUID();
  const ts = now();
  db.prepare(
    "INSERT INTO merchants (id, name, external_reference, moove_handle, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, name, externalRef, null, ts, ts);
  return db.prepare("SELECT * FROM merchants WHERE id = ?").get(id) as Record<string, unknown>;
}
export function createOrder(db: Db, args: CreateOrderArgs): Record<string, unknown> {
  const id = args.id ?? randomUUID();
  const ts = now();
  const meta = args.metadata ? JSON.stringify(args.metadata) : null;
  db.prepare(
    "INSERT INTO orders (id, merchant_id, customer_id, external_reference, description, amount, currency, status, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?, ?)"
  ).run(id, args.merchantId, args.customerId ?? null, args.externalReference ?? null, args.description, args.amount, args.currency, meta, ts, ts);
  const invId = randomUUID();
  const invNo = `INV-${Date.now().toString(36).toUpperCase()}-${id.slice(0, 4).toUpperCase()}`;
  db.prepare(
    "INSERT INTO invoices (id, order_id, invoice_number, amount_due, amount_paid, status, issued_at, due_at, paid_at, created_at, updated_at) VALUES (?, ?, ?, ?, '0', 'payment_pending', ?, ?, NULL, ?, ?)"
  ).run(invId, id, invNo, args.amount, ts, null, ts, ts);
  audit(db, { action: "order.created", entityType: "order", entityId: id, requestId: null, actorType: "api", actorId: null, metadata: null });
  return db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Record<string, unknown>;
}

export function audit(
  db: Db,
  e: { action: string; entityType: string; entityId?: string | null; requestId?: string | null; actorType?: string; actorId?: string | null; metadata?: Record<string, unknown> | null }
): void {
  db.prepare(
    "INSERT INTO audit_events (id, actor_type, actor_id, action, entity_type, entity_id, request_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(randomUUID(), e.actorType ?? "api", e.actorId ?? null, e.action, e.entityType, e.entityId ?? null, e.requestId ?? null, e.metadata ? JSON.stringify(e.metadata) : null, now());
}

export function toJson<T>(row: Record<string, unknown>): T {
  return rowToJson<T>(row);
}
export function recordReconciliation(
  db: Db,
  args: { invoiceId?: string | null; paymentId?: string | null; eventType: string; previousStatus?: string | null; newStatus?: string | null; reason?: string | null }
): void {
  db.prepare(
    "INSERT INTO reconciliation_events (id, invoice_id, payment_id, event_type, previous_status, new_status, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(randomUUID(), args.invoiceId ?? null, args.paymentId ?? null, args.eventType, args.previousStatus ?? null, args.newStatus ?? null, args.reason ?? null, now());
}
