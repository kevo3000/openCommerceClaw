Webhook notifier for MEMORY.md

Files created:
- webhook_notify.py  # watcher script
- requirements.txt   # python deps

Usage:
1) Install deps: python3 -m pip install -r requirements.txt
2) Configure webhook: either
   - set environment variable ROCKET_WEBHOOK, or
   - edit WEBHOOK_URL in webhook_notify.py (replace the placeholder)
3) Run the watcher: python3 webhook_notify.py

Security & notes:
- The script posts the content of MEMORY.md to the provided webhook. Do NOT expose secrets in MEMORY.md.
- You must review the webhook URL and its permissions. Anyone with the URL can post to the channel.
- I will not run this script or send any requests for you. You must start it yourself.

If you want this run as a systemd service or triggered via git hook, tell me and I will add the unit/hook file and instructions.
