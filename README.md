# Roadmap Markets

GenLayer-native markets for trading whether crypto teams actually ship roadmap milestones.

Current network target:

- GenLayer Bradbury testnet
- live contract: `0x233fd4Ac6670663e9725B1A7E3dCeD29FA96eCa4`
- deploy tx: `0xf18ba5e0f7560a724f7254411cbcbca5f3576c808da8cfe95df727d613163abd`
- live proof: [runtime/bradbury-proof.json](./runtime/bradbury-proof.json)

Current build status:

- contract core implemented
- deterministic checklist resolution helpers implemented
- standalone contract bundler added
- direct tests for resolution and payout math added
- minimal web shell added and verified with Next production build
- deployed to GenLayer Bradbury
- live Bradbury market creation proof captured in [runtime/bradbury-proof.json](./runtime/bradbury-proof.json)
- earlier Studio resolution/claim proof retained in [runtime/studionet-proof.json](./runtime/studionet-proof.json)

Current MVP shape:

- one market type: `ship_by_date`
- binary `YES / NO` positions with MetaMask wallet connection via `genlayer-js` SDK
- GenLayer resolves milestone delivery from live evidence
- winners claim from a simple pari-mutuel pool
- frontend uses `genlayer-js` client-side SDK — users sign transactions directly with their wallet
- there is no server-side contract bridge in the live app; contract reads/writes happen directly from the client through `genlayer-js`

Wallet integration:

- frontend uses `genlayer-js` (v0.27.3) built on viem for client-side contract interaction
- MetaMask connects to GenLayer Bradbury chain (chain ID 4221 / `0x107D`)
- reads work without a wallet; writes require wallet connection
- each user's positions are attributed to their own wallet address via `gl.message.sender_address`

Core contract:

- [roadmap_market.py](./contracts/roadmap_market.py)
- [roadmap_market_utils.py](./contracts/roadmap_market_utils.py)
- [roadmap_market_standalone.py](./contracts/roadmap_market_standalone.py)

Direct tests:

- [test_roadmap_market_utils.py](./tests/direct/test_roadmap_market_utils.py)
- [test_build_contract_bundle.py](./tests/direct/test_build_contract_bundle.py)

Web shell:

- [page.tsx](./web/app/page.tsx)
- [market-console.tsx](./web/app/components/market-console.tsx)

Useful commands:

```bash
cd /home/qdee/roadmap-markets
python3 scripts/build_contract_bundle.py
uv run pytest tests/direct
python3 -m py_compile contracts/roadmap_market.py contracts/roadmap_market_utils.py contracts/roadmap_market_standalone.py

cd /home/qdee/roadmap-markets/web
npm run build
```

Write-path hardening:

- all deploy/write scripts now route through [run_serialized_genlayer.sh](./scripts/run_serialized_genlayer.sh)
- writes acquire a signer lock at `/tmp/roadmap-markets-genlayer-signer.lock` by default
- override with:
  - `ROADMAP_MARKETS_SIGNER_LOCK`
  - `ROADMAP_MARKETS_SIGNER_LOCK_TIMEOUT`

Live Bradbury proof:

- current Bradbury deployment: `0x233fd4Ac6670663e9725B1A7E3dCeD29FA96eCa4`
- deploy tx: `0xf18ba5e0f7560a724f7254411cbcbca5f3576c808da8cfe95df727d613163abd`
- current visible markets:
  - `market-1` `Roadmap Markets`
  - `market-2` `Ethereum Glamsterdam`
  - `market-3` `Solana Alpenglow`
  - `market-4` `Aave V4`
- note: Bradbury RPC is still flaky enough that some write commands return receipt-polling errors after the transaction has already reached `ACCEPTED`; the proof file records the tx hashes plus the read-back market snapshots that confirm final market visibility

Archived Studio resolution proof:

- Studio deployment: `0xC8F8B0F33054002cb7C186de1C8F97e2Aa19b0D6`
- deploy tx: `0x3b0ae5dee4f64315bdbe70f29e7457b9166df5d75e4daac9daa817008670fb92`
- `market-1` resolved `YES` with full checklist agreement and a successful claim for `198`
- `market-2` resolved `NO` with full checklist agreement and a quoted payout of `179`
- evidence pages are fixed public fixtures served from jsDelivr at fixture commit `628fa3e0d9c50c1f34230703696602b728c94c1f`

Backend hardening proof:

- blank-question `create_market` was re-verified on a scratch deployment at `0x8e75A1418724Aa3191E3e2511870780b2f0ad0e0`
- deploy tx: `0x050266599d85b06b4bf4c2de40dffff303bfe972bc85e3157aad9f2feadbc34c`
- the CLI still coerced the blank `question` arg to `0`, and the hardened contract stored the correct fallback question instead of failing
- a live parallel-write smoke test on that scratch deployment serialized cleanly through the signer lock and landed on sequential nonces `62` and `63`
- proof artifact: [runtime/create-market-hardening-proof.json](./runtime/create-market-hardening-proof.json)

Current limitation:

- deadline text is stored and evaluated by the resolver prompt, but not enforced as an onchain timestamp gate yet
- positions use credit amounts (not native GEN token value) — native-value settlement is a follow-up after Studio supports payable writes
