#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${GENLAYER_RPC:-}"
ADDRESS="${CONTRACT_ADDRESS:-}"

QUESTION="${1:-}"
PROJECT_NAME="${2:-}"
MILESTONE_TEXT="${3:-}"
DEADLINE_TEXT="${4:-}"
PRODUCT_URL="${5:-}"
DOCS_URL="${6:-}"
REPO_URL="${7:-}"
CHAIN_URL="${8:-}"
FEE_BPS="${9:-250}"

if [ -z "$RPC_URL" ] || [ -z "$ADDRESS" ] || [ -z "$PROJECT_NAME" ] || [ -z "$MILESTONE_TEXT" ] || [ -z "$DEADLINE_TEXT" ]; then
  echo "Usage: CONTRACT_ADDRESS=0x... GENLAYER_RPC=http://... $0 <question> <project_name> <milestone_text> <deadline_text> <product_url> <docs_url> <repo_url> <chain_url> [fee_bps]"
  exit 1
fi

"$(dirname "$0")/run_serialized_genlayer.sh" write "$ADDRESS" create_market --args "$QUESTION" "$PROJECT_NAME" "$MILESTONE_TEXT" "$DEADLINE_TEXT" "$PRODUCT_URL" "$DOCS_URL" "$REPO_URL" "$CHAIN_URL" "$FEE_BPS" --rpc "$RPC_URL"
