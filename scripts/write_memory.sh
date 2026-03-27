#!/usr/bin/env bash
# write_memory.sh - atomically write MEMORY.md and POST a webhook notification
# Usage: ./scripts/write_memory.sh /path/to/MEMORY.md "content-file-or-stdin" "WEBHOOK_URL"

set -euo pipefail

MEMORY_PATH="${1:-./MEMORY.md}"
CONTENT_SOURCE="${2:-}" # file path or empty for stdin
WEBHOOK_URL="${3:-}"    # required

if [[ -z "$WEBHOOK_URL" ]]; then
  echo "Usage: $0 <memory_path> <content_file|-> <webhook_url>" >&2
  exit 2
fi

TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT

if [[ -z "$CONTENT_SOURCE" || "$CONTENT_SOURCE" == "-" ]]; then
  cat - > "$TMPFILE"
else
  cat "$CONTENT_SOURCE" > "$TMPFILE"
fi

# atomic move
mv "$TMPFILE" "$MEMORY_PATH"

TIMESTAMP=$(date --iso-8601=seconds)
HOST=$(hostname)
PAYLOAD=$(jq -n --arg t "$TIMESTAMP" --arg h "$HOST" --arg p "$MEMORY_PATH" '{timestamp:$t,host:$h,path:$p,summary: "MEMORY.md updated"}')

# send webhook (best-effort; exit non-zero if fails)
curl -s -S -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "$WEBHOOK_URL"

echo "Wrote $MEMORY_PATH and notified $WEBHOOK_URL at $TIMESTAMP"
