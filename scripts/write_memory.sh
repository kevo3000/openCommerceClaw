#!/usr/bin/env bash
# write_memory.sh - atomically write MEMORY.md, commit & push to repo, and POST a webhook notification
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

# Commit & push changes (auto-commit + push)
SSH_CMD="ssh -i ~/.ssh/openclaw_deploy_key -o StrictHostKeyChecking=no"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

push_success=false
commit_sha=""
(
  cd "$REPO_ROOT"
  git add "$MEMORY_PATH"
  git commit -m "chore(memory): update MEMORY.md [auto] - $TIMESTAMP" || true
  # capture commit SHA (may be unchanged if nothing new)
  commit_sha=$(git rev-parse HEAD || true)
  # attempt push with retries
  for i in 1 2 3; do
    if GIT_SSH_COMMAND="$SSH_CMD" git push origin main; then
      push_success=true
      break
    else
      sleep $((i * 2))
    fi
  done
)

# prepare payload (include commit SHA and commit URL)
REPO_URL="https://github.com/kevo3000/openCommerceClaw"
commit_url=""
if [[ -n "$commit_sha" ]]; then
  commit_url="$REPO_URL/commit/$commit_sha"
fi
PAYLOAD=$(jq -n --arg t "$TIMESTAMP" --arg h "$HOST" --arg p "$MEMORY_PATH" --arg pushed "${push_success}" --arg sha "$commit_sha" --arg curl "$commit_url" '{timestamp:$t,host:$h,path:$p,pushed:$pushed,commit_sha:$sha,commit_url:$curl,summary: "MEMORY.md updated"}')

# send webhook (best-effort; do not fail the script if webhook fails)
curl -s -S -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "$WEBHOOK_URL" || true

if $push_success; then
  echo "Wrote $MEMORY_PATH, committed and pushed to origin/main, and notified $WEBHOOK_URL at $TIMESTAMP"
else
  echo "Wrote $MEMORY_PATH and notified $WEBHOOK_URL at $TIMESTAMP — push failed, see git logs" >&2
fi
