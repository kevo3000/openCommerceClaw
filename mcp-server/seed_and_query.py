from kurrentdbclient import KurrentDBClient, NewEvent, StreamState
import os, json

uri = os.environ.get('KURRENTDB_CONNECTION_STRING','esdb://localhost:2113?tls=false')
client = KurrentDBClient(uri=uri)

seed_events = [
    {
        'stream':'campaigns',
        'type':'CampaignCreated',
        'data':{
            'campaignId':'CAMP-001','name':'Spring Sale','start':'2026-04-10','end':'2026-04-20','discount':20
        },
        'metadata':{'source':'broadleaf-tool','user':'automation'}
    },
    {
        'stream':'campaigns',
        'type':'CampaignUpdated',
        'data':{
            'campaignId':'CAMP-001','name':'Spring Sale - Extended','end':'2026-04-25'
        },
        'metadata':{'source':'broadleaf-tool','user':'automation'}
    },
    {
        'stream':'campaigns',
        'type':'CampaignActivated',
        'data':{
            'campaignId':'CAMP-001','activatedBy':'system'
        },
        'metadata':{'source':'broadleaf-tool','user':'automation'}
    }
]

written = []
for e in seed_events:
    ev = NewEvent(type=e['type'], data=bytes(json.dumps(e['data']),'utf-8'), content_type='application/json', metadata=bytes(json.dumps(e['metadata']),'utf-8'))
    client.append_to_stream(stream_name=e['stream'], events=[ev], current_version=StreamState.ANY)
    written.append(e)

# read back
events = client.get_stream(stream_name='campaigns', resolve_links=True, backwards=False, limit=100)
result = []
for ev in events:
    result.append({'type':ev.type,'stream':getattr(ev,'stream_name',None),'data':ev.data.decode('utf-8'),'metadata':getattr(ev,'metadata',b'').decode('utf-8') if getattr(ev,'metadata',None) else None})

print('SEED_REQUESTS:')
print(json.dumps(written, indent=2))
print('\nREQUEST_QUERY:')
print('get_stream stream=campaigns, resolve_links=True, limit=100')
print('\nRESULT (native JSON):')
print(json.dumps(result, indent=2))
