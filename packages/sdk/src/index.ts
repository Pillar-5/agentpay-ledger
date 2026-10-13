export interface ClientConfig {
  baseUrl: string;
  apiKey: string | undefined;
  fetchImpl?: typeof fetch;
}

export interface OrderInput {
  description: string;
  amount: string;
  currency?: string;
  merchantReference?: string;
  customer?: { name?: string; email?: string; externalReference?: string };
  externalReference?: string;
  metadata?: Record<string, unknown>;
}

async function req<T>(cfg: ClientConfig, path: string, init?: RequestInit): Promise<T> {
  const base = cfg.baseUrl.replace(/\/$/, "");
  const res = await (cfg.fetchImpl ?? fetch)(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(cfg.apiKey ? { "X-API-Key": cfg.apiKey } : {}), ...(init?.headers ?? {}) }
  });
  const data = (await res.json()) as T;
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return data;
}

export function createAgentPayClient(cfg: ClientConfig): {
  createOrder(input: OrderInput): Promise<unknown>;
  getOrder(id: string): Promise<unknown>;
  listOrders(): Promise<unknown>;
  createPaymentRequest(orderId: string, body?: Record<string, unknown>): Promise<unknown>;
  getPaymentRequest(id: string): Promise<unknown>;
  refreshPaymentStatus(id: string): Promise<unknown>;
  getInvoice(id: string): Promise<unknown>;
  listInvoices(): Promise<unknown>;
  getStatus(): Promise<unknown>;
} {
  return {
    createOrder: (input) => req(cfg, "/api/orders", { method: "POST", body: JSON.stringify(input) }),
    getOrder: (id) => req(cfg, `/api/orders/${id}`),
    listOrders: () => req(cfg, "/api/orders"),
    createPaymentRequest: (orderId, body) =>
      req(cfg, `/api/orders/${orderId}/payment-request`, { method: "POST", body: JSON.stringify(body ?? {}) }),
    getPaymentRequest: (id) => req(cfg, `/api/payment-requests/${id}`),
    refreshPaymentStatus: (id) => req(cfg, `/api/payment-requests/${id}/refresh`, { method: "POST" }),
    getInvoice: (id) => req(cfg, `/api/invoices/${id}`),
    listInvoices: () => req(cfg, "/api/invoices"),
    getStatus: () => req(cfg, "/api/status")
  };
}
