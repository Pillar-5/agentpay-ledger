import type { InvoiceStatus, OrderStatus } from "./statuses.js";

export interface Merchant {
  id: string;
  name: string;
  externalReference: string | null;
  mooveHandle: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  merchantId: string;
  name: string | null;
  email: string | null;
  externalReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  merchantId: string;
  customerId: string | null;
  externalReference: string | null;
  description: string;
  amount: string;
  currency: string;
  status: OrderStatus;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  amountDue: string;
  amountPaid: string;
  status: InvoiceStatus;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}
