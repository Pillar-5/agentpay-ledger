import { Link, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Overview } from "./pages/Overview.js";
import { Orders } from "./pages/Orders.js";
import { Invoices } from "./pages/Invoices.js";
import { PaymentRequests } from "./pages/PaymentRequests.js";
import { Payments } from "./pages/Payments.js";
import { Audit } from "./pages/Audit.js";
import { Developer } from "./pages/Developer.js";

async function getStatus(): Promise<{ mooveConfigured: boolean }> {
  const r = await fetch("/api/status");
  return (await r.json()) as { mooveConfigured: boolean };
}

export function App(): JSX.Element {
  const status = useQuery({ queryKey: ["status"], queryFn: getStatus });
  const configured = status.data?.mooveConfigured ?? true;
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", margin: "0 auto", maxWidth: 1100, padding: 24 }}>
      <header>
        <h1>AgentPay Ledger</h1>
        <p>Payment orchestration and reconciliation for software agents and digital services.</p>
        {!configured && (
          <p role="alert" style={{ background: "#fff4e5", padding: 12 }}>
            Moove is not configured. Set MOOVE_API_KEY to create payment links.
          </p>
        )}
        <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to="/">Overview</Link>
          <Link to="/orders">Orders</Link>
          <Link to="/invoices">Invoices</Link>
          <Link to="/payment-requests">Payment requests</Link>
          <Link to="/payments">Payments</Link>
          <Link to="/audit">Audit log</Link>
          <Link to="/developer">Developer</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/payment-requests" element={<PaymentRequests />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/developer" element={<Developer />} />
        </Routes>
      </main>
    </div>
  );
}
