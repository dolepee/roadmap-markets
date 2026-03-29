#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${GENLAYER_RPC:-}"
ADDRESS="${CONTRACT_ADDRESS:-}"
MARKET_ID="${1:-}"
AMOUNT="${2:-}"

if [ -z "$RPC_URL" ] || [ -z "$ADDRESS" ] || [ -z "$MARKET_ID" ] || [ -z "$AMOUNT" ]; then
  echo "Usage: CONTRACT_ADDRESS=0x... GENLAYER_RPC=http://... $0 <market_id> <amount>"
  exit 1
fi

"$(dirname "$0")/run_serialized_genlayer.sh" write "$ADDRESS" buy_no --args "$MARKET_ID" "$AMOUNT" --rpc "$RPC_URL"
