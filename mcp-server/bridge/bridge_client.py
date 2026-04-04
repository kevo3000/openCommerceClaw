import os
import sys
from kurrentdbclient import KurrentDBClient, StreamState, NewEvent
from kurrentdbclient.exceptions import NotFoundError
import json

def client():
    uri = os.environ.get('KURRENTDB_CONNECTION_STRING','http://localhost:2113')
    k = KurrentDBClient(uri=uri)
    cmd = sys.argv[1] if len(sys.argv)>1 else ''
    if cmd=='read_stream':
        stream = sys.argv[2]
        limit = int(sys.argv[3]) if len(sys.argv)>3 else 10
        events = k.get_stream(stream_name=stream, resolve_links=True, limit=limit)
        out = []
        for e in events:
            out.append({'type': e.type, 'stream': getattr(e,'stream_name',None), 'data': e.data.decode('utf-8')})
        print(json.dumps(out))
    elif cmd=='list_streams':
        limit = int(sys.argv[2]) if len(sys.argv)>2 else 100
        events = k.read_stream(stream_name='$streams', resolve_links=True, limit=limit)
        streams = [e.stream_name for e in events]
        print(json.dumps(streams))
    elif cmd=='write_event':
        stream = sys.argv[2]
        event_type = sys.argv[3]
        data = json.loads(sys.argv[4])
        metadata = json.loads(sys.argv[5]) if len(sys.argv)>5 else {}
        event = NewEvent(type=event_type, data=bytes(json.dumps(data),'utf-8'), content_type='application/json', metadata=bytes(json.dumps(metadata),'utf-8'))
        k.append_to_stream(stream_name=stream, events=[event], current_version=StreamState.ANY)
        print('OK')
    else:
        print('unknown command', file=sys.stderr)

if __name__=='__main__':
    client()
