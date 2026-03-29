#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${GENLAYER_RPC:-}"
ADDRESS="${CONTRACT_ADDRESS:-}"
MARKET_ID="${1:-}"

if [ -z "$RPC_URL" ] || [ -z "$ADDRESS" ] || [ -z "$MARKET_ID" ]; then
  echo "Usage: CONTRACT_ADDRESS=0x... GENLAYER_RPC=http://... $0 <market_id>"
  exit 1
fi

"$(dirname "$0")/genlayer_cli.sh" call "$ADDRESS" get_market --args "$MARKET_ID" --rpc "$RPC_URL"
