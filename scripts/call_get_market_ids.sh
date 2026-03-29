#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${GENLAYER_RPC:-}"
ADDRESS="${CONTRACT_ADDRESS:-}"

if [ -z "$RPC_URL" ] || [ -z "$ADDRESS" ]; then
  echo "Usage: CONTRACT_ADDRESS=0x... GENLAYER_RPC=http://... $0"
  exit 1
fi

"$(dirname "$0")/genlayer_cli.sh" call "$ADDRESS" get_market_ids --rpc "$RPC_URL"
