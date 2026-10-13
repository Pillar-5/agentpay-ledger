import { useQuery } from "@tanstack/react-query";

async function getJSON(path: string): Promise<Record<string, unknown>> {
  const r = await fetch(path);
  return (await r.json()) as Record<string, unknown>;
}

export function Overview(): JSX.Element {
  const q = useQuery({ queryKey: ["overview"], queryFn: () => getJSON("/api/status") });
  const d = (q.data ?? {}) as Record<string, number | boolean>;
  return (
    <section>
      <h2>Overview</h2>
      {q.isLoading && <p>Loading.</p>}
      {q.data && (
        <ul>
          <li>Orders: {Number(d["orders"] ?? 0)}</li>
          <li>Invoices: {Number(d["invoices"] ?? 0)}</li>
          <li>Payment requests: {Number(d["paymentRequests"] ?? 0)}</li>
          <li>Payments: {Number(d["payments"] ?? 0)}</li>
          <li>Moove: {d["mooveConfigured"] ? "Configured" : "Moove is not configured"}</li>
        </ul>
      )}
      {!q.isLoading && Number(d["orders"] ?? 0) === 0 && <p>No payments recorded yet.</p>}
    </section>
  );
}
