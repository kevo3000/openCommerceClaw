#!/usr/bin/env bash
# push_notify_bg.sh <repo_root> <webhook_url> <commit_sha> <commit_url>
set -euo pipefail
REPO_ROOT="$1"
WEBHOOK_URL="$2"
COMMIT_SHA="$3"
COMMIT_URL="$4"
SSH_KEY="~/.ssh/openclaw_deploy_key"
SSH_CMD="ssh -i $SSH_KEY -o StrictHostKeyChecking=no"

pushd "$REPO_ROOT" >/dev/null
push_success=false
for i in 1 2 3; do
  if GIT_SSH_COMMAND="$SSH_CMD" git push origin main; then
    push_success=true
    break
  else
    sleep $((i * 2))
  fi
done
popd >/dev/null

text=""
if [[ "$push_success" == "true" ]]; then
  text="✅ BACKGROUND: pushed $COMMIT_SHA — $COMMIT_URL"
else
  text="❌ BACKGROUND: push failed for $COMMIT_SHA"
fi
PAYLOAD=$(jq -n --arg t "$(date --iso-8601=seconds)" --arg text "$text" --arg sha "$COMMIT_SHA" --arg curl "$COMMIT_URL" '{timestamp:$t,text:$text,commit_sha:$sha,commit_url:$curl}')

curl -s -S -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "$WEBHOOK_URL" || true
