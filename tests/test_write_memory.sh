#!/usr/bin/env bash
# Simple integration test for write_memory.sh using a local temp webhook receiver
set -euo pipefail

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT
MEMORY="$TMPDIR/MEMORY.md"
HOOK="$TMPDIR/hook.log"

# start a minimal webhook receiver (netcat) in background
# using socat would be nicer but keep portable: use Python simple HTTP server
cat > "$TMPDIR/server.py" <<'PY'
from http.server import BaseHTTPRequestHandler, HTTPServer
import sys
class H(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('content-length',0))
        body = self.rfile.read(length)
        open(sys.argv[1],'ab').write(body+b"\n")
        self.send_response(200)
        self.end_headers()

if __name__=='__main__':
    port=int(sys.argv[2])
    server=HTTPServer(('127.0.0.1',port),H)
    server.serve_forever()
PY

PORT=18080
python3 "$TMPDIR/server.py" "$HOOK" "$PORT" &
SERVER_PID=$!
sleep 0.5

# run the write script
echo "Test content $(date)" | ./scripts/write_memory.sh "$MEMORY" - "http://127.0.0.1:$PORT/"

# wait briefly and check hook log
sleep 0.5
if grep -q "MEMORY.md updated" "$HOOK"; then
  echo "TEST_OK"
  kill $SERVER_PID
  exit 0
else
  echo "TEST_FAIL" >&2
  kill $SERVER_PID
  exit 1
fi
