#!/bin/bash
# Usage: bridge.sh read_stream <stream> [limit]
#        bridge.sh list_streams [limit]
#        bridge.sh write_event <stream> <event_type> '<json_data>' '<json_metadata>'
set -e
cmd="$1"; shift
docker exec -i mcp-server python /app/bridge/bridge_client.py "$cmd" "$@"
