import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "../packages/moove/src/webhooks.js";

describe("webhook signature", () => {
  it("accepts a valid signature", () => {
    const secret = "whsec_test";
    const raw = Buffer.from(JSON.stringify({ id: "1" }));
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = `v1=${createHmac("sha256", secret).update(Buffer.concat([Buffer.from(`${ts}.`), raw])).digest("hex")}`;
    expect(verifyWebhookSignature({ rawBody: raw, signature: sig, timestamp: ts, secret })).toBe(true);
  });
  it("rejects stale timestamps", () => {
    const raw = Buffer.from("x");
    expect(verifyWebhookSignature({ rawBody: raw, signature: "v1=abc", timestamp: "1", secret: "s" })).toBe(false);
  });
});
