const checklistCards = [
  {
    key: "product_live",
    title: "product_live",
    description: "A public product surface is reachable at the supplied product URL."
  },
  {
    key: "feature_usable",
    title: "feature_usable",
    description: "The promised feature appears usable, not merely announced."
  },
  {
    key: "docs_or_changelog_live",
    title: "docs_or_changelog_live",
    description: "Docs, release notes, or changelog evidence is publicly available."
  },
  {
    key: "repo_or_chain_evidence",
    title: "repo_or_chain_evidence",
    description: "Repository or onchain evidence supports real delivery."
  }
];

const workflow = [
  {
    step: "Create Market",
    detail: "Open a ship-by-date market around a real roadmap promise and attach the evidence URLs that matter."
  },
  {
    step: "Take Positions",
    detail: "Traders buy YES or NO before resolution. The MVP uses internal credits, but the market math is live."
  },
  {
    step: "Resolve with GenLayer",
    detail: "At resolution time the contract fetches product pages, docs, repos, and chain pages, then evaluates the same four-field checklist across validators."
  },
  {
    step: "Claim Winnings",
    detail: "Winners split the losing pool minus the protocol fee, proportional to their stake."
  }
];

export function MarketConsole() {
  return (
    <>
      <section className="hero heroPanel">
        <div className="heroCopy">
          <p className="eyebrow">GenLayer Prediction Markets</p>
          <h1>Trade whether crypto teams actually ship.</h1>
          <p className="lede">
            Roadmap Markets turns roadmap execution into a live market. GenLayer resolves the hard
            part: it fetches public evidence at settlement time and validates the same deterministic
            checklist across independent validators.
          </p>
          <div className="heroActions">
            <a className="buttonLink" href="#market-board">
              View live market board
            </a>
            <a className="buttonLink secondary" href="#how-it-works">
              See how resolution works
            </a>
          </div>
        </div>

        <aside className="heroAside card">
          <p className="cardLabel">Why GenLayer</p>
          <h2>No oracle feed. No committee call.</h2>
          <p>
            At resolution time the contract reads the product page, docs, repo, and chain evidence.
            Validators evaluate the same fixed checklist. If the booleans match, the market settles.
          </p>
          <div className="miniStats">
            <div>
              <span>Evidence sources</span>
              <strong>4 live URLs</strong>
            </div>
            <div>
              <span>Equivalence</span>
              <strong>Exact booleans</strong>
            </div>
            <div>
              <span>Outcome</span>
              <strong>YES / NO</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid sectionSpacing">
        <article className="card col-7">
          <p className="cardLabel">Structured Resolution</p>
          <h2>The checklist is the product.</h2>
          <p>
            The contract does not ask an open-ended question like &quot;did they ship?&quot; It asks
            for a strict four-field checklist and derives YES or NO deterministically from those
            booleans.
          </p>
          <div className="checklistGrid">
            {checklistCards.map((item) => (
              <div className="checklistCard" key={item.key}>
                <span className="checklistBadge">FIELD</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="card col-5">
          <p className="cardLabel">Resolution Shape</p>
          <h2>Deterministic by design.</h2>
          <pre className="snippet snippetCompact">{`{
  "product_live": true,
  "feature_usable": true,
  "docs_or_changelog_live": true,
  "repo_or_chain_evidence": true
}`}</pre>
          <p className="tiny">
            Validators independently evaluate the same evidence against the same checklist. If their
            booleans match, the market settles. No fuzzy scoring layer sits between the evidence and
            the settlement.
          </p>
        </article>
      </section>

      <section className="card sectionSpacing" id="how-it-works">
        <div className="sectionHeader">
          <div>
            <p className="cardLabel">How It Works</p>
            <h2>Market flow</h2>
          </div>
          <p className="sectionNote">
            Winners split the losing pool minus protocol fee, proportional to stake. The current
            Studio MVP uses internal credits, but the payout accounting is live.
          </p>
        </div>
        <div className="workflowGrid">
          {workflow.map((item, index) => (
            <div className="workflowStep" key={item.step}>
              <span className="stepIndex">{index + 1}</span>
              <div>
                <h3>{item.step}</h3>
                <p>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
