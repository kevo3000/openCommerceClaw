#!/usr/bin/env bash
# workspace-watcher.sh — watches key workspace files for changes,
# auto-commits to git, and posts a diff summary to Rocket.Chat #general.
#
# Usage: nohup bash scripts/workspace-watcher.sh &
# Or run via cron / systemd.

set -euo pipefail

WORKSPACE="/home/kevin/.openclaw/workspace"
WATCH_FILES=("MEMORY.md" "IDENTITY.md" "SOUL.md" "BOOTSTRAP.md" "HEARTBEAT.md" "TOOLS.md" "USER.md")
POLL_INTERVAL=10  # seconds
CHANNEL="rocketchat"
TARGET="#general"

cd "$WORKSPACE"

# Build initial checksums
declare -A CHECKSUMS
for f in "${WATCH_FILES[@]}"; do
    if [[ -f "$f" ]]; then
        CHECKSUMS[$f]=$(md5sum "$f" | awk '{print $1}')
    else
        CHECKSUMS[$f]="missing"
    fi
done

echo "[workspace-watcher] Started. Watching: ${WATCH_FILES[*]}"
echo "[workspace-watcher] Poll interval: ${POLL_INTERVAL}s"

while true; do
    sleep "$POLL_INTERVAL"

    for f in "${WATCH_FILES[@]}"; do
        if [[ -f "$f" ]]; then
            current=$(md5sum "$f" | awk '{print $1}')
        else
            current="missing"
        fi

        prev="${CHECKSUMS[$f]}"

        if [[ "$current" != "$prev" ]]; then
            echo "[workspace-watcher] Change detected: $f"
            CHECKSUMS[$f]="$current"

            # 1) Git commit + push
            git add "$f" 2>/dev/null || true
            DIFF=$(git diff --cached --stat "$f" 2>/dev/null || echo "(no diff available)")
            git commit -m "auto: $f updated by workspace-watcher" 2>/dev/null || true
            git push 2>/dev/null || echo "[workspace-watcher] git push failed (no remote?)"

            # 2) Post to #general via openclaw CLI
            MSG="📝 **Workspace Update:** \`$f\` geändert ($(date '+%Y-%m-%d %H:%M'))
\`\`\`
$DIFF
\`\`\`"
            openclaw message send \
                --channel "$CHANNEL" \
                --target "$TARGET" \
                --message "$MSG" 2>/dev/null \
                || echo "[workspace-watcher] Failed to post to $TARGET"

            echo "[workspace-watcher] Committed + notified for $f"
        fi
    done
done
