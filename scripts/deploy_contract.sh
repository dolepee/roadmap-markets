#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${1:-${GENLAYER_RPC:-}}"

if [ -z "$RPC_URL" ]; then
  echo "Usage: $0 <rpc-url>"
  echo "Or set GENLAYER_RPC in the environment."
  exit 1
fi

echo "Deploying RoadmapMarket to: $RPC_URL"
"$(dirname "$0")/run_serialized_genlayer.sh" deploy --contract contracts/roadmap_market_standalone.py --rpc "$RPC_URL"
