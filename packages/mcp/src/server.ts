import { runTool, TOOLS } from "./index.js";

async function main(): Promise<void> {
  process.stdout.write(`${JSON.stringify({ tools: TOOLS })}\n`);
  const name = process.argv[2];
  const raw = process.argv[3] ?? "{}";
  if (!name) return;
  const found = TOOLS.find((t) => t === name);
  if (!found) throw new Error(`Unknown tool: ${name}`);
  const result = await runTool(found, JSON.parse(raw) as Record<string, unknown>);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
