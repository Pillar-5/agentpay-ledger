import fp from "fastify-plugin";
import type { AppEnv } from "./config.js";
import { mooveConfigured } from "./config.js";
import { DomainError } from "@agentpay/core";

export interface Ctx {
  env: AppEnv;
  requestId: string;
}

export function errorBody(code: string, message: string, requestId: string): unknown {
  return { error: { code, message, requestId } };
}

export const plugin = fp<{ env: AppEnv }>(
  async (fastify, opts): Promise<void> => {
    fastify.addHook("onRequest", async (req, reply) => {
      const id = (req.headers["x-request-id"] as string) || crypto.randomUUID();
      (req as unknown as { requestId: string }).requestId = id;
      void reply.header("x-request-id", id);
    });
    fastify.setErrorHandler((err, req, reply) => {
      const id = (req as unknown as { requestId?: string }).requestId ?? "unknown";
      if (err instanceof DomainError) {
        void reply.status(err.status).send(errorBody(err.code, err.message, id));
        return;
      }
      const status = (err as { statusCode?: number }).statusCode ?? 500;
      const msg = status >= 500 ? "Internal server error." : (err as Error).message ?? "Internal server error.";
      void reply.status(status).send(errorBody("INTERNAL_ERROR", msg, id));
    });
    fastify.decorate("agentpayEnv", opts.env);
    fastify.decorate("mooveReady", () => mooveConfigured(opts.env));
  },
  { fastify: "5.x", name: "agentpay-plugin" }
);

declare module "fastify" {
  interface FastifyInstance {
    agentpayEnv: AppEnv;
    mooveReady: () => boolean;
  }
}
