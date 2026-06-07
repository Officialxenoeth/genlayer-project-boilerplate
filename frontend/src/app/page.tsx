import ContractMonitor from "@/components/ContractMonitor";

// The contract address is injected at build-time via .env
// Add  NEXT_PUBLIC_CONTRACT_ADDRESS=0x...  to frontend/.env
const CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export default function Home() {
  if (!CONTRACT_ADDRESS) {
    return (
      <main className="cm-root">
        <div className="cm-card cm-error">
          <strong>Missing configuration</strong>
          <p>
            Set <code>NEXT_PUBLIC_CONTRACT_ADDRESS</code> in{" "}
            <code>frontend/.env</code> and restart the dev server.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="cm-root">
      <ContractMonitor contractAddress={CONTRACT_ADDRESS} />
    </main>
  );
}
