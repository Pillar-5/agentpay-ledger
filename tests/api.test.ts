import { describe, expect, it } from "vitest";
import { buildServer } from "../apps/api/src/app.js";
import { closeDb } from "../apps/api/src/db.js";

describe("api orders", () => {
  it("creates an order and invoice, refuses payment without Moove", async () => {
    const app = await buildServer({
      APP_ENV: "test",
      DATABASE_URL: ":memory:",
      CORS_ORIGIN: "*"
    } as unknown as NodeJS.ProcessEnv);
    try {
      const created = await app.inject({ method: "POST", url: "/api/orders", payload: { description: "Svc", amount: "12.50" } });
      expect(created.statusCode).toBe(201);
      const body = created.json() as { order: { id: string } };
      const fetched = await app.inject({ method: "GET", url: `/api/orders/${body.order.id}` });
      expect(fetched.statusCode).toBe(200);
      const pay = await app.inject({ method: "POST", url: `/api/orders/${body.order.id}/payment-request`, payload: {} });
      expect(pay.statusCode).toBe(422);
      expect(JSON.stringify(pay.json())).toContain("PAYMENT_PROVIDER_NOT_CONFIGURED");
    } finally {
      await app.close();
      closeDb();
    }
  });
});
