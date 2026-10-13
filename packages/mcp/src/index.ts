import { createAgentPayClient } from "@agentpay/sdk";

export const TOOLS = [
  "create_order",
  "get_order",
  "create_payment_request",
  "get_payment_status",
  "get_invoice"
] as const;

export type ToolName = (typeof TOOLS)[number];

export async function runTool(name: ToolName, args: Record<string, unknown>): Promise<unknown> {
  const baseUrl = process.env["AGENTPAY_BASE_URL"] ?? "http://localhost:3000";
  const apiKey = process.env["AGENTPAY_API_KEY"];
  const client = createAgentPayClient({ baseUrl, apiKey });
  switch (name) {
    case "create_order":
      return client.createOrder({
        description: String(args["description"] ?? "MCP order"),
        amount: String(args["amount"] ?? "1.00")
      });
    case "get_order":
      return client.getOrder(String(args["id"] ?? ""));
    case "create_payment_request":
      return client.createPaymentRequest(String(args["orderId"] ?? ""));
    case "get_payment_status":
      return client.getPaymentRequest(String(args["id"] ?? ""));
    case "get_invoice":
      return client.getInvoice(String(args["id"] ?? ""));
  }
}
