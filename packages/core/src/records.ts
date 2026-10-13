import type { PaymentRequestStatus, PaymentStatus } from "./statuses.js";

export interface PaymentRequest {
  id: string;
  invoiceId: string;
  merchantId: string;
  provider: string;
  providerReference: string | null;
  paymentUrl: string | null;
  requestedAmount: string;
  paymentAsset: string | null;
  network: string | null;
  status: PaymentRequestStatus;
  expiresAt: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  paymentRequestId: string;
  providerTransactionId: string | null;
  blockchainTransactionHash: string | null;
  network: string | null;
  asset: string | null;
  requestedAmount: string;
  paidAmount: string;
  status: PaymentStatus;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationEvent {
  id: string;
  invoiceId: string | null;
  paymentId: string | null;
  eventType: string;
  previousStatus: string | null;
  newStatus: string | null;
  reason: string | null;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actorType: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  requestId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
