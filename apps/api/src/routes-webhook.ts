import type { FastifyInstance } from "fastify";
import { webhookEventSchema, verifyWebhookSignature } from "@agentpay/moove";
import { DomainError, mapMooveTransactionStatus } from "@agentpay/core";

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/webhooks/moove", async (req, reply) => {
    const { getDb } = await import("./db.js");
    const { audit } = await import("./store.js");
    const db = getDb();
    const secret = app.agentpayEnv.MOOVE_WEBHOOK_SECRET;
    if (!secret) {
      throw new DomainError("PAYMENT_PROVIDER_NOT_CONFIGURED", "Webhook secret not configured.", 422);
    }
    const sig = req.headers["moove-signature"] as string | undefined;
    const ts = req.headers["moove-timestamp"] as string | undefined;
    const eventId = req.headers["moove-event-id"] as string | undefined;
    if (!sig || !ts || !eventId) {
      throw new DomainError("WEBHOOK_SIGNATURE_INVALID", "Missing webhook headers.", 422);
    }
    const raw = Buffer.from(JSON.stringify(req.body ?? {}));
    const ok = verifyWebhookSignature({ rawBody: raw, signature: sig, timestamp: ts, secret });
    if (!ok) {
      throw new DomainError("WEBHOOK_SIGNATURE_INVALID", "Invalid signature.", 422);
    }
    const seen = db.prepare("SELECT event_id FROM webhook_events WHERE event_id = ?").get(eventId) as { event_id: string } | undefined;
    if (seen) {
      return reply.send({ received: true, duplicate: true });
    }
    const parsed = webhookEventSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new DomainError("VALIDATION_ERROR", "Invalid webhook body.", 422);
    }
    db.prepare("INSERT INTO webhook_events (event_id, received_at) VALUES (?, ?)").run(eventId, new Date().toISOString());
    audit(db, { action: "webhook.received", entityType: "webhook", entityId: eventId, metadata: { type: parsed.data.type } });
    void mapMooveTransactionStatus;
    return reply.send({ received: true });
  });
}
