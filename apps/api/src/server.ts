import { buildServer } from "./app.js";
import { loadEnv } from "./config.js";

async function main(): Promise<void> {
  const env = loadEnv(process.env);
  const app = await buildServer(process.env);
  const shutdown = async (): Promise<void> => {
    try {
      await app.close();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
