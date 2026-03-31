#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${1:-${GENLAYER_RPC:-}}"
CONTRACT_FILE="${2:-${CONTRACT_FILE:-contracts/roadmap_market_standalone.py}}"

if [ -z "$RPC_URL" ]; then
  echo "Usage: $0 <rpc-url> [contract-file]"
  echo "Or set GENLAYER_RPC in the environment."
  exit 1
fi

echo "Deploying RoadmapMarket to: $RPC_URL"
echo "Using contract file: $CONTRACT_FILE"
"$(dirname "$0")/run_serialized_genlayer.sh" deploy --contract "$CONTRACT_FILE" --rpc "$RPC_URL"
