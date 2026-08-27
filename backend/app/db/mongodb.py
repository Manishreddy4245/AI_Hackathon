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

    def skip(self, *args, **kwargs):
        if hasattr(self._cursor, "skip"):
            self._cursor = self._cursor.skip(*args, **kwargs)
        return self

    def limit(self, *args, **kwargs):
        if hasattr(self._cursor, "limit"):
            self._cursor = self._cursor.limit(*args, **kwargs)
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

    async def delete_many(self, *args, **kwargs):
        return self._coll.delete_many(*args, **kwargs)

    async def count_documents(self, *args, **kwargs) -> int:
        return self._coll.count_documents(*args, **kwargs)

    async def distinct(self, *args, **kwargs) -> List[Any]:
        return self._coll.distinct(*args, **kwargs)

    def aggregate(self, *args, **kwargs) -> AsyncMockCursor:
        return AsyncMockCursor(self._coll.aggregate(*args, **kwargs))

    async def create_index(self, *args, **kwargs):
        if hasattr(self._coll, "create_index"):
            return self._coll.create_index(*args, **kwargs)
        return None

    async def drop(self, *args, **kwargs):
        if hasattr(self._coll, "drop"):
            return self._coll.drop(*args, **kwargs)
        return None

    async def find_one_and_update(self, *args, **kwargs):
        if hasattr(self._coll, "find_one_and_update"):
            return self._coll.find_one_and_update(*args, **kwargs)
        return None

    async def find_one_and_delete(self, *args, **kwargs):
        if hasattr(self._coll, "find_one_and_delete"):
            return self._coll.find_one_and_delete(*args, **kwargs)
        return None

    async def replace_one(self, *args, **kwargs):
        if hasattr(self._coll, "replace_one"):
            return self._coll.replace_one(*args, **kwargs)
        return None

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
    """Initialize PyMongo AsyncMongoClient connection to live MongoDB Atlas."""
    logger.info("Initializing PyMongo AsyncMongoClient connection to %s", settings.MONGODB_URI)
    try:
        real_client = AsyncMongoClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000
        )
        # Test ping to confirm server is up
        await real_client.admin.command("ping")
        db_manager.client = real_client
        db_manager.db = real_client[settings.MONGODB_DATABASE]
        db_manager.is_mock = False
        logger.info("=========================================================================")
        logger.info("  LIVE DATABASE CONFIRMED: Connected to MongoDB Atlas '%s'", settings.MONGODB_DATABASE)
        logger.info("=========================================================================")
    except Exception as e:
        allow_mock = getattr(settings, "TESTING", False) or getattr(settings, "ALLOW_MOCK_DB", False)
        if allow_mock:
            logger.warning("Test mode active: Live MongoDB connection failed (%s). Fallback to in-memory test DB.", str(e))
            db_manager.client = None
            db_manager.db = AsyncMockDatabase(settings.MONGODB_DATABASE)
            db_manager.is_mock = True
        else:
            db_manager.client = None
            db_manager.db = None
            db_manager.is_mock = False
            logger.critical("=========================================================================")
            logger.critical("  CRITICAL ERROR: LIVE MONGODB ATLAS CONNECTION FAILED!")
            logger.critical("  Reason: %s", str(e))
            logger.critical("  Silent fallback to in-memory mock DB is DISABLED in production mode.")
            logger.critical("=========================================================================")
            raise ConnectionError(f"CRITICAL: Failed to connect to live MongoDB Atlas database '{settings.MONGODB_DATABASE}': {str(e)}")

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

