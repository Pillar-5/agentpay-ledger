import { useQuery } from "@tanstack/react-query";

interface Row { id: string; providerTransactionId: string | null; paidAmount: string; status: string; confirmedAt: string | null }

export function Payments(): JSX.Element {
  const q = useQuery({
    queryKey: ["payments"],
    queryFn: async (): Promise<Row[]> => {
      const r = await fetch("/api/payments");
      const d = (await r.json()) as { payments: Row[] };
      return d.payments ?? [];
    }
  });
  return (
    <section>
      <h2>Payments</h2>
      {(q.data ?? []).length === 0 && !q.isLoading && <p>No payments recorded.</p>}
      <ul>
        {(q.data ?? []).map((p) => (
          <li key={p.id}>{p.providerTransactionId ?? p.id.slice(0, 8)} — {p.paidAmount} — {p.status === "confirmed" ? "Payment confirmed" : p.status}</li>
        ))}
      </ul>
    </section>
  );
}
