import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + "/.."))
import certifi
from app.core.config import settings, get_safe_db_target
from pymongo import MongoClient

target = get_safe_db_target()
target_type = 'MongoDB Atlas' if target['is_atlas'] else 'Local MongoDB'

print('=' * 65)
print('STEP 1: CONFIGURATION AUDIT')
print('=' * 65)
print('Config Source:       backend/.env')
print(f'Active Environment:  {target["environment"]}')
print(f'Target Database:     {target["database"]}')
print(f'Target Host:         {target["host"]}')
print(f'Target Type:         {target_type}')
print('-' * 65)

# Verify preconditions
if target['environment'] in ['production', 'staging']:
    print('ABORT: Environment is production/staging.')
    sys.exit(1)

if not target['is_atlas']:
    print('ABORT: Target is NOT MongoDB Atlas.')
    sys.exit(1)

if target['database'] != 'placemind':
    print('ABORT: Target database is not placemind.')
    sys.exit(1)

print('\nSTEP 2: TESTING LIVE CONNECTION TO ATLAS')
tls_kwargs = {'tlsCAFile': certifi.where()} if target['is_atlas'] else {}
try:
    client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=8000, **tls_kwargs)
    client.admin.command('ping')
    print('SUCCESS: Connected to MongoDB Atlas!')
    db = client[settings.MONGODB_DATABASE]
    colls = sorted(db.list_collection_names())
    print(f'Retrieved {len(colls)} collections from Atlas database "{target["database"]}"')
    
    print('\nSTEP 3: PRE-WIPE INVENTORY')
    total_docs = 0
    for c in colls:
        cnt = db[c].count_documents({})
        total_docs += cnt
        print(f'  - {c:<28}: {cnt:>6} document(s)')
    print('-' * 65)
    print(f'TOTAL DOCUMENTS BEFORE WIPE: {total_docs}')
except Exception as e:
    print('CONNECTION FAILED:', str(e))
    sys.exit(1)
