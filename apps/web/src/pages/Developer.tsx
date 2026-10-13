export function Developer(): JSX.Element {
  return (
    <section>
      <h2>Developer</h2>
      <h3>Create an order</h3>
      <pre>{`curl -X POST http://localhost:3000/api/orders \\
  -H 'Content-Type: application/json' \\
  -d '{"description":"Example service","amount":"10.00"}'`}</pre>
      <h3>SDK example</h3>
      <pre>{`import { createAgentPayClient } from "@agentpay/sdk";
const client = createAgentPayClient({ baseUrl: "http://localhost:3000" });
const order = await client.createOrder({ description: "Example", amount: "10.00" });`}</pre>
      <p>API docs are served from route schemas in development.</p>
    </section>
  );
}
