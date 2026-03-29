#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${GENLAYER_RPC:-}"
ADDRESS="${CONTRACT_ADDRESS:-}"
MARKET_ID="${1:-}"
TRADER_ADDRESS="${2:-}"

if [ -z "$RPC_URL" ] || [ -z "$ADDRESS" ] || [ -z "$MARKET_ID" ] || [ -z "$TRADER_ADDRESS" ]; then
  echo "Usage: CONTRACT_ADDRESS=0x... GENLAYER_RPC=http://... $0 <market_id> <trader_address>"
  exit 1
fi

"$(dirname "$0")/genlayer_cli.sh" call "$ADDRESS" get_position --args "$MARKET_ID" "$TRADER_ADDRESS" --rpc "$RPC_URL"
