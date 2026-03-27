#!/bin/bash
# Example curl to post a test message to your Rocket.Chat Incoming Webhook
# Replace WEBHOOK_URL below (or set env var ROCKET_WEBHOOK)
WEBHOOK_URL=${ROCKET_WEBHOOK:-"https://your.rocket.chat/hooks/REPLACE_ME"}

curl -s -X POST "$WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test message from webhook_notify example"}'
