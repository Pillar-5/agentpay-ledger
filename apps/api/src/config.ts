import { z } from "zod";

const urlSchema = z.string().url().refine((v) => v.startsWith("http://") || v.startsWith("https://"), {
  message: "URL must be http or https."
});

export const envSchema = z.object({
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().default("./data/agentpay.sqlite"),
  MOOVE_API_BASE_URL: z.string().default("https://api.moove.xyz"),
  MOOVE_API_KEY: z.string().optional(),
  MOOVE_HANDLE: z.string().optional(),
  MOOVE_WEBHOOK_SECRET: z.string().optional(),
  PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  AGENTPAY_API_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().default("http://localhost:5173")
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse({
    APP_ENV: source["APP_ENV"],
    API_PORT: source["API_PORT"],
    DATABASE_URL: source["DATABASE_URL"],
    MOOVE_API_BASE_URL: source["MOOVE_API_BASE_URL"],
    MOOVE_API_KEY: emptyToUndef(source["MOOVE_API_KEY"]),
    MOOVE_HANDLE: emptyToUndef(source["MOOVE_HANDLE"]),
    MOOVE_WEBHOOK_SECRET: emptyToUndef(source["MOOVE_WEBHOOK_SECRET"]),
    PUBLIC_APP_URL: source["PUBLIC_APP_URL"],
    LOG_LEVEL: source["LOG_LEVEL"],
    AGENTPAY_API_KEY: emptyToUndef(source["AGENTPAY_API_KEY"]),
    CORS_ORIGIN: source["CORS_ORIGIN"]
  });
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  if (parsed.data.APP_ENV === "production") {
    if (parsed.data.PUBLIC_APP_URL.startsWith("http://")) {
      throw new Error("PUBLIC_APP_URL must be https in production.");
    }
    void urlSchema;
  }
  return parsed.data;
}

function emptyToUndef(v: string | undefined): string | undefined {
  if (v === undefined) return undefined;
  const t = v.trim();
  return t.length === 0 ? undefined : v;
}

export function mooveConfigured(env: AppEnv): boolean {
  return Boolean(env.MOOVE_API_KEY && env.MOOVE_API_KEY.length > 0);
}
