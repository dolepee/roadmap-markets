#!/usr/bin/env bash
set -euo pipefail

PATCH_FILE="/home/qdee/roadmap-markets/scripts/genlayer_dns_patch.cjs"

if [ -n "${NODE_OPTIONS:-}" ]; then
  export NODE_OPTIONS="--require ${PATCH_FILE} ${NODE_OPTIONS}"
else
  export NODE_OPTIONS="--require ${PATCH_FILE}"
fi

exec genlayer "$@"
