# Roadmap Markets

Trade whether crypto teams actually ship.

## Product

Roadmap Markets is a GenLayer-native market for trading crypto project execution risk.

Users take `YES / NO` positions on milestone questions like:

- Will `Project X` launch mainnet by June 30?
- Will `Protocol Y` ship a usable feature before token unlock?
- Will `App Z` open working deposits and withdrawals by date?

This is not a generic price prediction market. The wedge is subjective milestone resolution over live public evidence.

## Why This Fits GenLayer

GenLayer is strongest when:

- the question depends on live web evidence
- the answer is subjective, not a simple oracle lookup
- validators need structured equivalence around a non-deterministic judgment
- appeals matter when the resolution is close

Roadmap Markets uses GenLayer for the hardest part of the product: resolving whether a team actually delivered something meaningful.

## User Value

For traders:

- hedge launch and roadmap risk
- profit when teams miss milestones or overperform expectations
- trade on execution quality instead of pure price speculation

For projects:

- create credibility around public delivery commitments
- let the market price roadmap confidence in real time

For GenLayer:

- users bridge stablecoins because the market category is hard to run elsewhere
- fees exist from day one through market creation, trading, and settlement

## Differentiation

Normal prediction markets are strong when the answer is objective:

- did BTC hit a price
- did an election result occur
- did a contract deploy

Roadmap Markets is for subjective milestone questions:

- was the feature actually usable
- did the product meaningfully launch
- was the release more than an announcement page
- did the project satisfy the stated rubric before deadline

That is the part simple oracle systems handle poorly.

## MVP Scope

Keep the first version narrow.

One market type:

- `ship_by_date`

One settlement model:

- binary `YES / NO`

One collateral:

- testnet stablecoin or market credits

One question template:

- "Will <project> deliver <milestone> by <date>?"

One user loop:

1. create market
2. buy `YES`
3. buy `NO`
4. resolve market
5. claim winnings

## Market Design

Each market contains:

- project name
- milestone text
- deadline
- evidence URLs
- resolution rubric
- fee basis points

Example market:

- Project: `DemoProtocol`
- Milestone: `Launch a public beta with wallet connect and working swap by 2026-04-30`
- Evidence URLs:
  - project website
  - docs
  - public app URL
  - GitHub repo

## Resolution Design

This is the critical design decision.

Do not ask the model an open-ended question like "Did they ship?"

Use a fixed checklist and derive the final outcome deterministically.

Required output shape:

```json
{
  "product_live": true,
  "feature_usable": true,
  "docs_or_changelog_live": true,
  "repo_or_chain_evidence": true,
  "resolution": "YES",
  "notes": "Public beta loads, wallet connect works, swap route executes in test flow."
}
```

Final resolution rule:

- `YES` only if all required checklist conditions are `true` before the deadline
- otherwise `NO`

Validator equivalence:

- compare exact booleans for the checklist fields
- compare exact final `resolution`
- ignore wording drift in `notes`

This keeps GenLayer consensus tight and avoids the earlier class of open-ended divergence.

## Contract Architecture

Start with one contract.

Core methods:

```text
create_market(question, project_name, milestone_text, deadline, evidence_urls, fee_bps)
buy_yes(market_id, amount)
buy_no(market_id, amount)
resolve_market(market_id)
claim(market_id)
```

Stored state:

- market metadata
- pool balances
- user positions
- deadline
- resolution status
- final ruling
- claimed status

## Frontend

Keep the UI simple and crypto-native.

Screens:

- home: active markets
- market detail: question, deadline, evidence URLs, buy panel
- resolution view: checklist and final verdict
- portfolio: positions and claimable payouts

Do not build:

- advanced charting
- leverage
- social feed
- many market categories
- complex LP mechanics in the MVP

## Execution Plan

### Phase 1: Contract Core

1. Define the market schema and payout model.
2. Implement market creation.
3. Implement `YES / NO` position buying.
4. Implement claim logic for settled markets.

### Phase 2: Resolution Engine

1. Build the fixed checklist schema.
2. Implement `resolve_market` with `gl.vm.run_nondet`.
3. Fetch live evidence URLs inside the nondeterministic block.
4. Compare structured booleans only in equivalence.

### Phase 3: Frontend

1. List markets.
2. Open market detail.
3. Buy `YES / NO`.
4. Display deadline and evidence.
5. Show resolution and claim flow.

### Phase 4: Proof and Demo

1. Deploy in GenLayer Studio first.
2. Create two demo markets:
   - one that resolves `YES`
   - one that resolves `NO`
3. Verify stored outputs and claim flow.
4. Deploy a checkpoint version to Bradbury.

## 7-Day Build Plan

### Day 1

- lock scope
- define market schema
- define checklist resolution schema
- choose one payout model

### Day 2

- scaffold contract
- implement market creation
- implement `buy_yes` and `buy_no`

### Day 3

- implement position accounting
- implement claim flow
- add direct tests for accounting logic

### Day 4

- implement fixed-schema resolution
- use live evidence fetching
- implement strict equivalence on booleans

### Day 5

- build minimal frontend
- create/open market pages
- wire write and read flows

### Day 6

- deploy in Studio
- run one `YES` and one `NO` market
- record proof artifacts

### Day 7

- Bradbury checkpoint
- polish README
- record demo video

## Demo Plan

Use one crisp market with public evidence.

Example:

- "Will DemoProtocol launch a working public beta by April 30?"

Demo flow:

1. Create the market.
2. Buy `YES`.
3. Buy `NO`.
4. Advance to resolution.
5. Show GenLayer reading live app/docs/repo evidence.
6. Show structured checklist.
7. Resolve to `YES` or `NO`.
8. Claim winnings.

## Risks

### Resolution ambiguity

Mitigation:

- use crisp, narrow milestones
- use fixed checklists
- avoid vague "big launch" wording

### Demo liquidity looks thin

Mitigation:

- seed both sides in the demo
- optimize for proof of loop, not market depth

### Overbuilding the trading UI

Mitigation:

- focus on resolution correctness
- keep the interface minimal

## Why This Can Win the Hackathon

- prediction markets are already an accepted GenLayer use case
- the differentiator is not price markets, but subjective milestone markets
- the product is crypto-native and financially legible
- the contract uses GenLayer where it is actually strongest
- the demo is easy to understand: trade whether teams actually ship

## Submission Positioning

Primary message:

- "Trade whether crypto teams actually ship."

Secondary message:

- "A GenLayer-native execution-risk market for roadmap milestones."

## Sources

- https://docs.genlayer.com/understand-genlayer-protocol/typical-use-cases
- https://www.genlayer.com/how-it-works
- https://www.genlayer.com/about
- https://www.genlayer.com/news/announcing-testnet-bradbury
- https://docs.genlayer.com/developers/intelligent-contracts/examples/prediction
