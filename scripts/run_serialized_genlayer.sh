#!/usr/bin/env bash
set -euo pipefail

LOCK_FILE="${ROADMAP_MARKETS_SIGNER_LOCK:-/tmp/roadmap-markets-genlayer-signer.lock}"
LOCK_TIMEOUT_SECONDS="${ROADMAP_MARKETS_SIGNER_LOCK_TIMEOUT:-180}"

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <genlayer arguments...>" >&2
  exit 1
fi

mkdir -p "$(dirname "$LOCK_FILE")"
exec 9>"$LOCK_FILE"

if ! flock -w "$LOCK_TIMEOUT_SECONDS" 9; then
  echo "Timed out waiting for signer lock: $LOCK_FILE" >&2
  exit 1
fi

echo "Acquired signer lock: $LOCK_FILE" >&2
"$(dirname "$0")/genlayer_cli.sh" "$@"
