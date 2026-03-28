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

# Validate target and check for real changes
pushd "$REPO_ROOT" >/dev/null
changed_files=()
if git ls-files --error-unmatch "$MEMORY_PATH" >/dev/null 2>&1; then
  : # file is tracked
else
  # ensure parent dir tracked; add file will track it
  git add --intent-to-add "$MEMORY_PATH" || true
fi

# Check whether file actually changed
if git diff --quiet -- "$MEMORY_PATH"; then
  # no changes compared to HEAD
  changed_files=()
else
  changed_files=("$MEMORY_PATH")
fi

push_success=false
commit_sha=""

if [[ ${#changed_files[@]} -eq 0 ]]; then
  # nothing to commit
  popd >/dev/null
  if [[ "${NOTIFY_ON_NOCHANGE:-0}" == "1" ]]; then
    text="ℹ️ No changes to commit for $MEMORY_PATH"
    PAYLOAD=$(jq -n --arg t "$TIMESTAMP" --arg h "$HOST" --arg p "$MEMORY_PATH" --arg text "$text" '{timestamp:$t,host:$h,path:$p,summary: "no-change",text:$text}')
    curl -s -S -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "$WEBHOOK_URL" || true
    echo "No changes detected for $MEMORY_PATH; notified and exiting"
  else
    echo "No changes detected for $MEMORY_PATH; nothing to do"
  fi
  exit 0
fi

# commit
git add "${changed_files[@]}"
git commit -m "chore(config): update ${changed_files[*]} [auto] - $TIMESTAMP" || true
commit_sha=$(git rev-parse HEAD || true)
# attempt push with retries or background push
if [[ "${ASYNC_PUSH:-0}" == "1" ]]; then
  # spawn background pusher that will notify once push completes
  COMMIT_URL="https://github.com/kevo3000/openCommerceClaw/commit/$commit_sha"
  nohup ./scripts/push_notify_bg.sh "$REPO_ROOT" "$WEBHOOK_URL" "$commit_sha" "$COMMIT_URL" >/dev/null 2>&1 &
  push_success=false
else
  for i in 1 2 3; do
    if GIT_SSH_COMMAND="$SSH_CMD" git push origin main; then
      push_success=true
      break
    else
      sleep $((i * 2))
    fi
  done
fi
popd >/dev/null

# prepare payload (include commit SHA and commit URL)
REPO_URL="https://github.com/kevo3000/openCommerceClaw"
commit_url=""
if [[ -n "$commit_sha" ]]; then
  commit_url="$REPO_URL/commit/$commit_sha"
fi
# human-readable text for Rocket.Chat incoming webhook
if [[ "$push_success" == "true" || "$push_success" == "True" ]]; then
  text="✅ ${changed_files[*]} updated and pushed: $commit_url"
elif [[ "${ASYNC_PUSH:-0}" == "1" ]]; then
  text="✅ ${changed_files[*]} committed (push in background): $commit_url"
else
  text="❌ ${changed_files[*]} committed locally, but push failed. See repo logs."
fi

PAYLOAD=$(jq -n --arg t "$TIMESTAMP" --arg h "$HOST" --arg p "$MEMORY_PATH" --arg pushed "${push_success}" --arg sha "$commit_sha" --arg curl "$commit_url" --arg text "$text" --argjson files "$(python3 -c 'import json,sys; print(json.dumps(sys.argv[1].split()))' "${changed_files[*]}") '{timestamp:$t,host:$h,path:$p,pushed:$pushed,commit_sha:$sha,commit_url:$curl,changed_files:$files,summary: "config updated",text:$text}')

# send webhook (best-effort; do not fail the script if webhook fails)
curl -s -S -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "$WEBHOOK_URL" || true

if [[ "$push_success" == "true" ]]; then
  echo "Wrote ${changed_files[*]}, committed and pushed to origin/main, and notified $WEBHOOK_URL at $TIMESTAMP"
elif [[ "${ASYNC_PUSH:-0}" == "1" ]]; then
  echo "Wrote ${changed_files[*]}, committed locally and spawned background push notifier, initial notification sent to $WEBHOOK_URL at $TIMESTAMP"
else
  echo "Wrote ${changed_files[*]} and notified $WEBHOOK_URL at $TIMESTAMP — push failed, see git logs" >&2
fi
