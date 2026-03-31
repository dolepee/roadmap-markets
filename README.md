# Roadmap Markets

Trade whether crypto teams actually ship roadmap milestones.

Roadmap Markets is a GenLayer-native prediction market for subjective delivery questions that normal oracle markets handle badly. Instead of resolving only objective events like price or block height, this contract resolves questions such as:

- Did a team actually ship the promised feature?
- Is the product live and usable, not just announced?
- Do docs, repo activity, and public chain evidence support the launch claim?

GenLayer is the core of the product, not a bolt-on. At resolution time, validators fetch live public evidence, run the same checklist, and settle the market when the checklist output agrees.

## Links

- Live app: `https://roadmap-markets.vercel.app`
- GitHub: `https://github.com/dolepee/roadmap-markets`
- Bradbury proof: [runtime/bradbury-proof.json](./runtime/bradbury-proof.json)
- Archived Studio proof: [runtime/studionet-proof.json](./runtime/studionet-proof.json)

## Why GenLayer

This product needs three things that conventional prediction market stacks do not handle well:

1. Live web evidence at resolution time
2. Subjective evaluation of whether a milestone was meaningfully delivered
3. Appeal-friendly consensus instead of one manual committee or one oracle feed

Resolution uses a deterministic four-field checklist:

- `product_live`
- `feature_usable`
- `docs_or_changelog_live`
- `repo_or_chain_evidence`

If validators independently produce the same checklist booleans, the market settles. That is the core mechanism.

## Current Network

- Network: GenLayer Bradbury testnet
- Live contract: `0x233fd4Ac6670663e9725B1A7E3dCeD29FA96eCa4`
- Deploy tx: `0xf18ba5e0f7560a724f7254411cbcbca5f3576c808da8cfe95df727d613163abd`

## Live Bradbury Markets

- `market-1` Roadmap Markets demo
- `market-2` Ethereum Glamsterdam
- `market-3` Solana Alpenglow
- `market-4` Aave V4

The current proof file records the exact create tx hashes and read-back market snapshots:

- [runtime/bradbury-proof.json](./runtime/bradbury-proof.json)

## Product Scope

Current MVP:

- one market type: `ship_by_date`
- `YES / NO` positions
- MetaMask wallet flow via `genlayer-js`
- GenLayer-based milestone resolution from live evidence
- credit-based internal position accounting

Current limitation:

- positions are credit-based, not native-GEN collateralized
- deadline text is stored and shown, but not enforced by onchain timestamp gating yet
- Bradbury RPC is flaky enough that some writes reach `ACCEPTED` before the CLI receipt polling finishes

That last point is handled in the proof files by recording both the tx hash and the read-back contract state.

## Contract Files

- [contracts/roadmap_market.py](./contracts/roadmap_market.py)
- [contracts/roadmap_market_utils.py](./contracts/roadmap_market_utils.py)
- [contracts/roadmap_market_standalone.py](./contracts/roadmap_market_standalone.py)
- [contracts/roadmap_market_bradbury.py](./contracts/roadmap_market_bradbury.py)

## Tests

- [tests/direct/test_roadmap_market_utils.py](./tests/direct/test_roadmap_market_utils.py)
- [tests/direct/test_build_contract_bundle.py](./tests/direct/test_build_contract_bundle.py)

Run locally:

```bash
cd /home/qdee/roadmap-markets
uv run pytest tests/direct

cd /home/qdee/roadmap-markets/web
npm run build
```

## Frontend

The live app uses:

- client-side wallet connection and writes through `genlayer-js`
- a server-side `/api/markets` read route for stable Bradbury market-board reads on Vercel

Key files:

- [web/app/page.tsx](./web/app/page.tsx)
- [web/app/components/hero.tsx](./web/app/components/hero.tsx)
- [web/app/components/market-admin.tsx](./web/app/components/market-admin.tsx)
- [web/app/api/markets/route.ts](./web/app/api/markets/route.ts)
- [web/lib/wallet-context.tsx](./web/lib/wallet-context.tsx)

## Demo Notes

For the demo, the safest flow is:

1. show the live market board with the four seeded markets
2. connect wallet
3. open a market detail panel
4. show the evidence links and checklist model
5. do one controlled live write at most
6. confirm state by refresh/read, not by assuming instant finality

There is a short demo script here:

- [submission/DEMO_SCRIPT.md](./submission/DEMO_SCRIPT.md)

There is also a paste-ready submission summary here:

- [submission/DORAHACKS_COPY.md](./submission/DORAHACKS_COPY.md)
