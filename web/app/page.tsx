import { Header } from "./components/header";
import { MarketBoard } from "./components/market-admin";
import { Hero } from "./components/hero";
import { HowItWorks, WhyGenLayer } from "./components/market-console";

const CONTRACT =
  process.env.NEXT_PUBLIC_ROADMAP_MARKET_ADDRESS ??
  "0x233fd4Ac6670663e9725B1A7E3dCeD29FA96eCa4";

function shortContract(addr: string) {
  return addr ? `${addr.slice(0, 10)}...${addr.slice(-6)}` : "";
}

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />

        {/* Markets */}
        <section className="px-6 pb-8">
          <div className="mx-auto max-w-7xl">
            <MarketBoard />
          </div>
        </section>

        <HowItWorks />
        <WhyGenLayer />

        {/* Footer */}
        <footer className="border-t border-zinc-200 px-6 py-8 dark:border-zinc-800">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
            <span className="text-sm text-zinc-400 dark:text-zinc-600">
              Roadmap Markets &middot; GenLayer Bradbury Hackathon
            </span>
            {CONTRACT && (
              <code className="font-mono text-xs text-zinc-400 dark:text-zinc-700">
                {shortContract(CONTRACT)}
              </code>
            )}
          </div>
        </footer>
      </main>
    </>
  );
}
