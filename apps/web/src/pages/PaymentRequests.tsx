import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface Row { id: string; requestedAmount: string; status: string; paymentUrl: string | null; providerReference: string | null; updatedAt: string }

async function list(): Promise<Row[]> {
  const r = await fetch("/api/payment-requests");
  const d = (await r.json()) as { paymentRequests: Row[] };
  return d.paymentRequests ?? [];
}

export function PaymentRequests(): JSX.Element {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["prs"], queryFn: list });
  const refresh = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/payment-requests/${id}/refresh`, { method: "POST" });
      return r.json() as Promise<unknown>;
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["prs"] })
  });
  return (
    <section>
      <h2>Payment requests</h2>
      {(q.data ?? []).length === 0 && !q.isLoading && <p>No payments recorded.</p>}
      <table>
        <thead><tr><th>ID</th><th>Amount</th><th>Status</th><th>Link</th><th>Action</th></tr></thead>
        <tbody>
          {(q.data ?? []).map((p) => (
            <tr key={p.id}>
              <td>{p.id.slice(0, 8)}</td>
              <td>{p.requestedAmount}</td>
              <td>{p.status === "pending" ? "Payment pending" : p.status}</td>
              <td>{p.paymentUrl ? <a href={p.paymentUrl}>Open payment link</a> : "Provider status unavailable"}</td>
              <td><button type="button" onClick={() => refresh.mutate(p.id)}>Refresh status</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
