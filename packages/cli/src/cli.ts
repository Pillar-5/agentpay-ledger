import { createAgentPayClient } from "@agentpay/sdk";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

function out(v: unknown): void {
  if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(v, null, 2)}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(v, null, 2)}\n`);
  }
}

async function main(): Promise<void> {
  const baseUrl = process.env["AGENTPAY_BASE_URL"] ?? "http://localhost:3000";
  const apiKey = process.env["AGENTPAY_API_KEY"];
  const client = createAgentPayClient({ baseUrl, apiKey });
  const cmd = process.argv[2] ?? "status";
  if (cmd === "status") {
    out(await client.getStatus());
    return;
  }
  if (cmd === "order") {
    const sub = process.argv[3];
    if (sub === "create") {
      const description = arg("--description") ?? "Example service";
      const amount = arg("--amount") ?? "10.00";
      out(await client.createOrder({ description, amount }));
      return;
    }
    if (sub === "get") {
      out(await client.getOrder(process.argv[4] ?? ""));
      return;
    }
  }
  if (cmd === "invoice") {
    out(await client.getInvoice(process.argv[4] ?? ""));
    return;
  }
  if (cmd === "payment") {
    const sub = process.argv[3];
    if (sub === "create") {
      out(await client.createPaymentRequest(process.argv[4] ?? ""));
      return;
    }
    if (sub === "get") {
      out(await client.getPaymentRequest(process.argv[4] ?? ""));
      return;
    }
    if (sub === "refresh") {
      out(await client.refreshPaymentStatus(process.argv[4] ?? ""));
      return;
    }
  }
  if (cmd === "payments") {
    out(await client.getPaymentRequest(process.argv[4] ?? ""));
    return;
  }
  throw new Error(`Unknown command: ${cmd}`);
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
