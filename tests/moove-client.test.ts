import { describe, expect, it } from "vitest";
import { MooveClient } from "../packages/moove/src/client.js";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("moove client", () => {
  it("creates a payment link", async () => {
    const client = new MooveClient({
      baseUrl: "https://api.moove.xyz",
      apiKey: "k",
      fetchImpl: (async () => jsonResponse(200, { id: "a", url: "https://x/y" })) as typeof fetch
    });
    const out = await client.createPaymentLink({ toAmount: "1.00" });
    expect(out.id).toBe("a");
  });
  it("maps auth failure", async () => {
    const client = new MooveClient({
      baseUrl: "https://api.moove.xyz",
      apiKey: "bad",
      fetchImpl: (async () => jsonResponse(401, { errors: [{ message: "bad", code: "INVALID_API_KEY" }] })) as typeof fetch
    });
    await expect(client.createPaymentLink({ toAmount: "1.00" })).rejects.toMatchObject({ status: 401 });
  });
  it("rejects malformed responses", async () => {
    const client = new MooveClient({
      baseUrl: "https://api.moove.xyz",
      apiKey: "k",
      fetchImpl: (async () => jsonResponse(200, { nope: 1 })) as typeof fetch
    });
    await expect(client.createPaymentLink({ toAmount: "1.00" })).rejects.toMatchObject({ code: "MALFORMED" });
  });
});
