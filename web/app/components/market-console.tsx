const steps = [
  {
    title: "Create Market",
    desc: "Open a market around a real roadmap promise. Attach the product, docs, repo, and chain URLs that matter.",
  },
  {
    title: "Take Positions",
    desc: "Connect your wallet and buy YES or NO before the deadline. Your position is tracked onchain.",
  },
  {
    title: "GenLayer Resolves",
    desc: "At resolution time, validators independently fetch live evidence and evaluate the same 4-field boolean checklist.",
  },
  {
    title: "Claim Winnings",
    desc: "Winners split the losing pool minus protocol fee, proportional to their stake. Claim directly to your wallet.",
  },
];

export function HowItWorks() {
  return (
    <section className="howSection" id="how-it-works">
      <div className="container">
        <h2 className="sectionTitle">How It Works</h2>
        <p className="sectionSub" style={{ marginTop: 8 }}>
          Four steps from market creation to payout.
        </p>
        <div className="howGrid">
          {steps.map((s, i) => (
            <div className="howCard" key={s.title}>
              <span className="howStep">{i + 1}</span>
              <h3 className="howCardTitle">{s.title}</h3>
              <p className="howCardDesc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WhyGenLayer() {
  return (
    <section className="diffSection" id="why-genlayer">
      <div className="container">
        <h2 className="sectionTitle">Why GenLayer</h2>
        <p className="sectionSub" style={{ marginTop: 8 }}>
          The resolution layer is the product, not the UI.
        </p>
        <div className="diffGrid">
          <div className="diffCard">
            <h3 className="diffCardTitle">Structured Resolution, Not Oracle Feeds</h3>
            <p className="diffCardDesc">
              The contract does not ask &ldquo;did they ship?&rdquo; &mdash; it asks for a strict
              four-field boolean checklist and derives YES or NO deterministically. Validators
              independently evaluate the same evidence against the same schema. If the booleans
              match, the market settles. No committee, no subjective vote.
            </p>
            <pre className="diffSchema">{`{
  "product_live":            true,
  "feature_usable":          true,
  "docs_or_changelog_live":  true,
  "repo_or_chain_evidence":  true
}`}</pre>
          </div>
          <div className="diffCard">
            <h3 className="diffCardTitle">Live Evidence, Not Sentiment</h3>
            <p className="diffCardDesc">
              At resolution time the contract fetches the actual product page, documentation,
              repository, and chain explorer. Validators read real delivery artifacts, not token
              price or social hype. The equivalence check compares exact booleans &mdash; no
              fuzzy scoring, no open-ended LLM comparison. This is what makes deterministic
              consensus possible on subjective questions.
            </p>
            <p className="diffCardDesc" style={{ marginTop: 16 }}>
              Evidence URLs are fixed at market creation and served from public CDN fixtures,
              ensuring every validator reads the same source material.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
