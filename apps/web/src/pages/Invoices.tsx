import { useQuery } from "@tanstack/react-query";

interface Row { id: string; invoiceNumber: string; amountDue: string; amountPaid: string; status: string }

async function list(): Promise<Row[]> {
  const r = await fetch("/api/invoices");
  const d = (await r.json()) as { invoices: Row[] };
  return d.invoices ?? [];
}

export function Invoices(): JSX.Element {
  const q = useQuery({ queryKey: ["invoices"], queryFn: list });
  return (
    <section>
      <h2>Invoices</h2>
      {(q.data ?? []).length === 0 && !q.isLoading && <p>No invoices yet.</p>}
      <table>
        <thead><tr><th>Number</th><th>Due</th><th>Paid</th><th>Status</th></tr></thead>
        <tbody>
          {(q.data ?? []).map((i) => (
            <tr key={i.id}><td>{i.invoiceNumber}</td><td>{i.amountDue}</td><td>{i.amountPaid}</td><td>{i.status}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
