import { describe, expect, it } from "vitest";
import { createAgentPayClient } from "../packages/sdk/src/index.js";

describe("sdk", () => {
  it("calls order endpoints", async () => {
    const calls: string[] = [];
    const client = createAgentPayClient({
      baseUrl: "http://x",
      fetchImpl: (async (url: unknown, init?: { method?: string }) => {
        calls.push(`${init?.method ?? "GET"} ${String(url)}`);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }) as typeof fetch
    });
    await client.createOrder({ description: "a", amount: "1.00" });
    await client.getOrder("1");
    expect(calls.join(",")).toContain("/api/orders");
  });
});
