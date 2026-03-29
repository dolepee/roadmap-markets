import { MarketConsole } from "./components/market-console";
import { MarketAdmin } from "./components/market-admin";

export default function HomePage() {
  return (
    <main className="page">
      <MarketConsole />
      <MarketAdmin />
    </main>
  );
}
