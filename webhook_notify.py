#!/usr/bin/env python3
"""
Simple watcher that posts updates to a Rocket.Chat Incoming Webhook when MEMORY.md changes.
Usage:
  1) Install deps: pip install -r requirements.txt
  2) Edit WEBHOOK_URL below or set env var ROCKET_WEBHOOK
  3) Run: python3 webhook_notify.py

The script watches MEMORY.md for content changes (polling every 5s). On change it POSTs a JSON payload to the webhook URL.
"""
import os
import time
import hashlib
import json
import requests

WORKSPACE = os.path.dirname(__file__)
MEMORY_PATH = os.path.join(WORKSPACE, 'MEMORY.md')
WEBHOOK_URL = os.environ.get('ROCKET_WEBHOOK') or 'https://your.rocket.chat/hooks/REPLACE_ME'  # <-- set this
POLL_INTERVAL = 5


def file_hash(path):
    try:
        with open(path, 'rb') as f:
            return hashlib.sha256(f.read()).hexdigest()
    except FileNotFoundError:
        return None


def send_to_rocket(text):
    payload = {'text': text}
    try:
        r = requests.post(WEBHOOK_URL, json=payload, timeout=10)
        r.raise_for_status()
        print('Sent update to Rocket.Chat')
    except Exception as e:
        print('Failed to send to Rocket.Chat:', e)


def main():
    last_hash = file_hash(MEMORY_PATH)
    print('Watching', MEMORY_PATH)
    while True:
        time.sleep(POLL_INTERVAL)
        h = file_hash(MEMORY_PATH)
        if h != last_hash:
            print('Change detected')
            try:
                with open(MEMORY_PATH, 'r', encoding='utf-8') as f:
                    text = f.read()
                summary = 'MEMORY.md updated. Latest content (truncated 2000 chars):\n\n' + text[:2000]
                send_to_rocket(summary)
            except Exception as e:
                print('Error reading/sending memory:', e)
            last_hash = h


if __name__ == '__main__':
    main()
