import logging
from typing import Optional, Any, List, Dict
import mongomock
from pymongo import AsyncMongoClient
from app.core.config import settings

logger = logging.getLogger("placemind.db")

class AsyncMockCursor:
    def __init__(self, sync_cursor):
        self._cursor = sync_cursor

    def sort(self, *args, **kwargs):
        self._cursor = self._cursor.sort(*args, **kwargs)
        return self

    async def to_list(self, length: Optional[int] = 100) -> List[Dict[str, Any]]:
        items = list(self._cursor)
        if length is not None:
            return items[:length]
        return items

    def __aiter__(self):
        self._items = iter(list(self._cursor))
        return self

    async def __anext__(self):
        try:
            return next(self._items)
        except StopIteration:
            raise StopAsyncIteration

class AsyncMockCollection:
    def __init__(self, sync_coll):
        self._coll = sync_coll

    def find(self, *args, **kwargs) -> AsyncMockCursor:
        return AsyncMockCursor(self._coll.find(*args, **kwargs))

    async def find_one(self, *args, **kwargs) -> Optional[Dict[str, Any]]:
        return self._coll.find_one(*args, **kwargs)

    async def insert_one(self, *args, **kwargs):
        return self._coll.insert_one(*args, **kwargs)

    async def insert_many(self, *args, **kwargs):
        return self._coll.insert_many(*args, **kwargs)

    async def update_one(self, *args, **kwargs):
        return self._coll.update_one(*args, **kwargs)

    async def update_many(self, *args, **kwargs):
        return self._coll.update_many(*args, **kwargs)

    async def delete_one(self, *args, **kwargs):
        return self._coll.delete_one(*args, **kwargs)

    async def count_documents(self, *args, **kwargs) -> int:
        return self._coll.count_documents(*args, **kwargs)

class AsyncMockDatabase:
    def __init__(self, db_name: str = "placemind"):
        self._client = mongomock.MongoClient()
        self._db = self._client[db_name]

    def __getattr__(self, name: str) -> AsyncMockCollection:
        return AsyncMockCollection(self._db[name])

    def __getitem__(self, name: str) -> AsyncMockCollection:
        return AsyncMockCollection(self._db[name])

class MongoDBManager:
    client: Optional[Any] = None
    db: Optional[Any] = None
    is_mock: bool = False

db_manager = MongoDBManager()

async def connect_to_mongo() -> None:
    """Initialize PyMongo AsyncMongoClient or fallback to AsyncMockDatabase."""
    logger.info("Initializing PyMongo AsyncMongoClient connection to %s", settings.MONGODB_URI)
    try:
        real_client = AsyncMongoClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=2000
        )
        # Test ping to confirm server is up
        await real_client.admin.command("ping")
        db_manager.client = real_client
        db_manager.db = real_client[settings.MONGODB_DATABASE]
        db_manager.is_mock = False
        logger.info("PyMongo AsyncMongoClient connected to live MongoDB '%s'", settings.MONGODB_DATABASE)
    except Exception as e:
        logger.warning("Live MongoDB connection failed (%s). Activating in-memory Mongo database engine.", str(e))
        db_manager.client = None
        db_manager.db = AsyncMockDatabase(settings.MONGODB_DATABASE)
        db_manager.is_mock = True
        logger.info("In-memory Mongo database initialized successfully for database '%s'", settings.MONGODB_DATABASE)

async def close_mongo_connection() -> None:
    """Close MongoDB connection."""
    if db_manager.client and not db_manager.is_mock:
        logger.info("Closing PyMongo AsyncMongoClient connection...")
        await db_manager.client.close()
    db_manager.client = None
    db_manager.db = None

def get_database() -> Optional[Any]:
    """Retrieve active Database instance."""
    return db_manager.db

async def ping_database() -> bool:
    """Ping MongoDB server or check mock status."""
    if db_manager.is_mock:
        return True
    if not db_manager.client:
        return False
    try:
        await db_manager.client.admin.command("ping")
        return True
    except Exception as e:
        logger.warning("MongoDB ping check failed: %s", str(e))
        return False

