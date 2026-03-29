import { Header } from "./components/header";
import { MarketBoard } from "./components/market-admin";
import { HowItWorks, WhyGenLayer } from "./components/market-console";

const CONTRACT = process.env.NEXT_PUBLIC_ROADMAP_MARKET_ADDRESS ?? "";

function shortContract(addr: string) {
  return addr ? `${addr.slice(0, 10)}...${addr.slice(-6)}` : "";
}

export default function HomePage() {
  return (
    <>
      <Header />

      <main>
        {/* Hero */}
        <section className="hero">
          <div className="container">
            <span className="heroBadge">
              <span className="heroBadgeDot" />
              Live on GenLayer Studio
            </span>
            <h1 className="heroTitle">Trade whether crypto teams actually ship.</h1>
            <p className="heroSub">
              Prediction markets for roadmap milestones. GenLayer resolves delivery from
              live public evidence &mdash; no oracles, no committees.
            </p>
            <div className="heroActions">
              <a className="btnPrimary" href="#markets">
                Browse Markets
              </a>
              <a className="btnSecondary" href="#how-it-works">
                How It Works
              </a>
            </div>
          </div>
        </section>

        {/* Markets */}
        <section style={{ paddingBottom: 32 }}>
          <div className="container">
            <MarketBoard />
          </div>
        </section>

        {/* How It Works */}
        <HowItWorks />

        {/* Why GenLayer */}
        <WhyGenLayer />

        {/* Footer */}
        <footer className="footer">
          <div className="container footerInner">
            <span className="footerLabel">Roadmap Markets &middot; GenLayer Bradbury Hackathon</span>
            {CONTRACT && <code className="footerContract">{shortContract(CONTRACT)}</code>}
          </div>
        </footer>
      </main>
    </>
  );
}
