import { useQuery } from "@tanstack/react-query";

interface Row { id: string; action: string; entityType: string; entityId: string | null; createdAt: string }

export function Audit(): JSX.Element {
  const q = useQuery({
    queryKey: ["audit"],
    queryFn: async (): Promise<Row[]> => {
      const r = await fetch("/api/audit");
      const d = (await r.json()) as { audit: Row[] };
      return d.audit ?? [];
    }
  });
  return (
    <section>
      <h2>Audit log</h2>
      <ul>
        {(q.data ?? []).map((a) => (
          <li key={a.id}>{a.createdAt} — {a.action} — {a.entityType} {a.entityId?.slice(0, 8) ?? ""}</li>
        ))}
      </ul>
    </section>
  );
}
