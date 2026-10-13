import { useQuery } from "@tanstack/react-query";

interface Row { id: string; description: string; amount: string; currency: string; status: string; createdAt: string }

async function list(): Promise<Row[]> {
  const r = await fetch("/api/orders");
  const d = (await r.json()) as { orders: Row[] };
  return d.orders ?? [];
}

export function Orders(): JSX.Element {
  const q = useQuery({ queryKey: ["orders"], queryFn: list });
  return (
    <section>
      <h2>Orders</h2>
      {q.isLoading && <p>Loading.</p>}
      {(q.data ?? []).length === 0 && !q.isLoading && <p>No orders yet.</p>}
      <table>
        <thead><tr><th>ID</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>
          {(q.data ?? []).map((o) => (
            <tr key={o.id}><td>{o.id.slice(0, 8)}</td><td>{o.description}</td><td>{o.amount} {o.currency}</td><td>{o.status}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
