import { MooveApiError } from "./errors.js";
import { createBodySchema, listEnvelopeSchema, paymentLinkCreationSchema } from "./schemas.js";
import { parseListQuery } from "./schemas.js";
import type { ListQuery, MooveListEnvelope, MoovePaymentLink } from "./schemas.js";
import type { MoovePaymentLinkCreation } from "./schemas.js";

export interface ClientOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
}

export interface CreateInput {
  toAmount: string;
  description?: string;
  maxUsage?: number;
  expirationDate?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
export class MooveClient {
  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;
  private maxRetries: number;
  private fetchImpl: typeof fetch;

  constructor(o: ClientOptions) {
    this.baseUrl = o.baseUrl.replace(/\/$/, "");
    this.apiKey = o.apiKey;
    this.timeoutMs = o.timeoutMs ?? 10000;
    this.maxRetries = o.maxRetries ?? 3;
    this.fetchImpl = o.fetchImpl ?? fetch;
  }

  async createPaymentLink(input: CreateInput): Promise<MoovePaymentLinkCreation> {
    const body = createBodySchema.parse(input);
    const res = await this.call("POST", "/v1/payment-link", body, false);
    const data: unknown = await res.json();
    const parsed = paymentLinkCreationSchema.safeParse(data);
    if (!parsed.success) {
      throw new MooveApiError({ status: res.status, code: "MALFORMED", message: "Bad create response." });
    }
    return parsed.data;
  }

  async listPaymentLinks(q?: ListQuery): Promise<MooveListEnvelope> {
    const parsed = parseListQuery(q ?? {});
    const sp = new URLSearchParams();
    if (parsed.status) sp.set("status", parsed.status);
    if (parsed.offset !== undefined) sp.set("offset", String(parsed.offset));
    if (parsed.limit !== undefined) sp.set("limit", String(parsed.limit));
    if (parsed.q) sp.set("q", parsed.q);
    if (parsed.date_from) sp.set("date_from", parsed.date_from);
    if (parsed.date_to) sp.set("date_to", parsed.date_to);
    const suffix = sp.size > 0 ? `?${sp.toString()}` : "";
    const res = await this.call("GET", `/v1/payment-link${suffix}`, undefined, true);
    const data: unknown = await res.json();
    const env = listEnvelopeSchema.safeParse(data);
    if (!env.success) {
      throw new MooveApiError({ status: res.status, code: "MALFORMED", message: "Bad list response." });
    }
    return env.data;
  }
  async getPaymentLink(id: string): Promise<MoovePaymentLink> {
    const page = await this.listPaymentLinks({ q: id, limit: 100 });
    const found = page.data.find((l) => l.id === id);
    if (!found) {
      throw new MooveApiError({ status: 404, code: "CANNOT_FIND_PAYMENT_LINK", message: "No link." });
    }
    return found;
  }

  async getPaymentStatus(id: string): Promise<{ link: MoovePaymentLink; receivedAmount: string | null }> {
    const link = await this.getPaymentLink(id);
    return { link, receivedAmount: link.receivedAmount ?? null };
  }

  async getSupportedAssets(): Promise<Array<{ symbol: string; decimals: number; chainType: string }>> {
    const page = await this.listPaymentLinks({ limit: 100 });
    const out = new Map<string, { symbol: string; decimals: number; chainType: string }>();
    for (const l of page.data) {
      if (!l.token) continue;
      const key = `${l.token.chain?.chainType ?? "?"}:${l.token.address}`;
      if (!out.has(key)) {
        out.set(key, { symbol: l.token.symbol, decimals: l.token.decimals, chainType: l.token.chain?.chainType ?? "?" });
      }
    }
    return [...out.values()];
  }
  private async call(method: string, path: string, body: unknown, retryGet: boolean): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    let attempt = 0;
    let last: unknown = null;
    while (attempt <= this.maxRetries) {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), this.timeoutMs);
      try {
        const init: RequestInit = {
          method,
          headers: { "X-API-Key": this.apiKey, ...(body ? { "Content-Type": "application/json" } : {}) },
          signal: ctl.signal
        };
        if (body) init.body = JSON.stringify(body);
        const res = await this.fetchImpl(url, init);
        if (res.ok) return res;
        const err = await this.toError(res);
        if (!retryGet) throw err;
        if (!err.retryable || attempt === this.maxRetries) throw err;
        last = err;
      } catch (e) {
        if (e instanceof MooveApiError) throw e;
        last = new MooveApiError({ status: 0, code: "NETWORK", message: "Network error.", retryable: true });
        if (!retryGet) throw last;
        if (attempt === this.maxRetries) throw last;
      } finally {
        clearTimeout(t);
      }
      attempt += 1;
      await delay(Math.min(200 * 2 ** attempt, 3000));
    }
    throw last instanceof Error ? last : new Error("Retries exhausted.");
  }

  private async toError(res: Response): Promise<MooveApiError> {
    let code = String(res.status);
    let message = `Moove failed with ${res.status}.`;
    try {
      const data = (await res.json()) as { errors?: Array<{ message?: string; code?: string }> };
      const first = data.errors?.[0];
      if (first?.code) code = first.code;
      if (first?.message) message = first.message;
    } catch {
      // keep defaults
    }
    const retryable = res.status === 429 || res.status >= 500;
    return new MooveApiError({ status: res.status, code, message, retryable, providerCode: code });
  }
}
