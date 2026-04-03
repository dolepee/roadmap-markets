# Roadmap Markets

Trade whether crypto teams actually ship roadmap milestones.

Roadmap Markets is a GenLayer native prediction market for subjective delivery questions that normal oracle markets handle badly. Instead of resolving only objective events like price or block height, this contract resolves questions such as:

1. Did a team actually ship the promised feature?
2. Is the product live and usable, not just announced?
3. Do docs, repo activity, and public chain evidence support the launch claim?

GenLayer is the core of the product, not a bolt on. At resolution time, validators fetch live public evidence, run the same checklist, and settle the market when the checklist output agrees.

## Links

Live app: https://roadmap-markets.vercel.app

GitHub: https://github.com/dolepee/roadmap-markets

## Why GenLayer

This product needs three things that conventional prediction market stacks do not handle well:

1. Live web evidence at resolution time
2. Subjective evaluation of whether a milestone was meaningfully delivered
3. Appeal friendly consensus instead of one manual committee or one oracle feed

Resolution uses a deterministic four field checklist:

`product_live`, `feature_usable`, `docs_or_changelog_live`, `repo_or_chain_evidence`

If validators independently produce the same checklist booleans, the market settles. That is the core mechanism.

## Current Network

Network: GenLayer Studionet (chain ID 61999)

Live contract: `0x63061A4ba7343E925cC34DAc70F8961c524a893D`

RPC: `https://studio.genlayer.com/api`

## Live Markets

1. **Ethereum Pectra** Will the Ethereum Pectra upgrade be activated on Mainnet before June 2025?
2. **Monad Mainnet** Will Monad launch its mainnet by Q4 2025?
3. **Aave V4** Will Aave launch V4 on Ethereum mainnet by Q2 2026?
4. **Solana Firedancer** Will Solana ship the Firedancer validator client to mainnet by Q3 2025?

## Product Scope

Current MVP:

1. One market type: `ship_by_date`
2. YES / NO positions
3. MetaMask wallet flow via `genlayer-js`
4. GenLayer based milestone resolution from live evidence
5. Credit based internal position accounting

Current limitations:

1. Positions are credit based, not native GEN collateralized
2. Deadline text is stored and shown, but not enforced by onchain timestamp gating yet

## Contract Files

[contracts/roadmap_market.py](./contracts/roadmap_market.py)

[contracts/roadmap_market_utils.py](./contracts/roadmap_market_utils.py)

[contracts/roadmap_market_standalone.py](./contracts/roadmap_market_standalone.py)

## Tests

[tests/direct/test_roadmap_market_utils.py](./tests/direct/test_roadmap_market_utils.py)

[tests/direct/test_build_contract_bundle.py](./tests/direct/test_build_contract_bundle.py)

Run locally:

```bash
uv run pytest tests/direct
cd web && npm run build
```

## Frontend

The live app uses client side wallet connection and writes through `genlayer-js`, plus a server side `/api/markets` read route for stable market board reads on Vercel.

Key files:

[web/app/page.tsx](./web/app/page.tsx)

[web/app/components/hero.tsx](./web/app/components/hero.tsx)

[web/app/components/market-admin.tsx](./web/app/components/market-admin.tsx)

[web/app/api/markets/route.ts](./web/app/api/markets/route.ts)

[web/lib/wallet-context.tsx](./web/lib/wallet-context.tsx)

## Demo Flow

1. Show the live market board with the four seeded markets
2. Connect wallet via MetaMask
3. Open a market detail panel
4. Show the evidence links and checklist model
5. Buy a YES or NO position on a market
6. Confirm state by refresh
