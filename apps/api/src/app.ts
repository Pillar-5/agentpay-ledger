import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { loadEnv, mooveConfigured } from "./config.js";
import { closeDb, openDatabase, setDb } from "./db.js";
import { migrate } from "./migrate.js";
import { plugin } from "./plugins.js";
import { ensureDevKey } from "./auth.js";

export async function buildServer(envSource?: NodeJS.ProcessEnv): Promise<ReturnType<typeof Fastify>> {
  const env = loadEnv(envSource ?? process.env);
  const app = Fastify({ logger: { level: env.LOG_LEVEL }, bodyLimit: 1024 * 256 });
  await app.register(cors, { origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",") });
  await app.register(helmet);
  await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });
  await app.register(plugin, { env });
  const dbPath = env.DATABASE_URL.startsWith("file:") ? env.DATABASE_URL.slice(5) : env.DATABASE_URL;
  const db = openDatabase(dbPath === ":memory:" ? ":memory:" : dbPath);
  migrate(db);
  setDb(db);
  if (env.APP_ENV !== "production") {
    const raw = ensureDevKey(db);
    if (raw) app.log.info("Development API key created for local use.");
  }
  const { orderRoutes } = await import("./routes-orders.js");
  const { paymentRequestRoutes } = await import("./routes-payments.js");
  const { refreshRoutes } = await import("./routes-refresh.js");
  const { miscRoutes } = await import("./routes-misc.js");
  const { webhookRoutes } = await import("./routes-webhook.js");
  const { adminRoutes } = await import("./routes-admin.js");
  await app.register(orderRoutes);
  await app.register(paymentRequestRoutes);
  await app.register(refreshRoutes);
  await app.register(miscRoutes);
  await app.register(webhookRoutes);
  await app.register(adminRoutes);
  app.addHook("onClose", (_i, done) => {
    closeDb();
    done();
  });
  void mooveConfigured;
  return app;
}
