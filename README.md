# Roadmap Markets

GenLayer-native markets for trading whether crypto teams actually ship roadmap milestones.

Current build status:

- contract core implemented
- deterministic checklist resolution helpers implemented
- standalone contract bundler added
- direct tests for resolution and payout math added
- minimal web shell added and verified with Next production build
- deployed to GenLayer Studio
- live `YES` and `NO` resolution proof captured in [runtime/studionet-proof.json](./runtime/studionet-proof.json)
- live claim flow proven on Studio

Current MVP shape:

- one market type: `ship_by_date`
- binary `YES / NO` positions with internal credit accounting for the first Studio loop
- GenLayer resolves milestone delivery from live evidence
- winners claim from a simple pari-mutuel pool

Credit note:

- the MVP uses internal credits for position accounting because the current Studio/CLI path does not expose payable writes cleanly
- the pari-mutuel math, fee accounting, and proportional payout logic are live and verified
- native-value settlement is a deployment module, not an architecture rewrite

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

Live Studio proof:

- current Studio deployment: `0xC8F8B0F33054002cb7C186de1C8F97e2Aa19b0D6`
- deploy tx: `0x3b0ae5dee4f64315bdbe70f29e7457b9166df5d75e4daac9daa817008670fb92`
- `market-1` resolved `YES` with full checklist agreement and a successful claim for `198`
- `market-2` resolved `NO` with full checklist agreement and a quoted payout of `179`
- evidence pages are fixed public fixtures served from jsDelivr at fixture commit `628fa3e0d9c50c1f34230703696602b728c94c1f`
- note: the canonical `market-1` `buy_yes` transaction landed during an earlier Studio RPC timeout; the new proof manifest records the confirmed market and position state even though that single tx hash was not recovered locally

Backend hardening proof:

- blank-question `create_market` was re-verified on a scratch deployment at `0x8e75A1418724Aa3191E3e2511870780b2f0ad0e0`
- deploy tx: `0x050266599d85b06b4bf4c2de40dffff303bfe972bc85e3157aad9f2feadbc34c`
- the CLI still coerced the blank `question` arg to `0`, and the hardened contract stored the correct fallback question instead of failing
- a live parallel-write smoke test on that scratch deployment serialized cleanly through the signer lock and landed on sequential nonces `62` and `63`
- proof artifact: [runtime/create-market-hardening-proof.json](./runtime/create-market-hardening-proof.json)

Current limitation:

- positions use internal credits for now because the current CLI path does not expose payable writes cleanly
- native-value settlement is a follow-up slice after the contract loop is proven live
- deadline text is stored and evaluated by the resolver prompt, but not enforced as an onchain timestamp gate yet
