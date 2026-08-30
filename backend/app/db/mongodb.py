import asyncio
import logging
from typing import Optional, Any, List, Dict
from pymongo import AsyncMongoClient
from app.core.config import settings
import os
from pymongo import MongoClient

# Safe import for mongomock (agar nahi milega toh error nahi aayega)
try:
    import mongomock
except ImportError:
    mongomock = None

# Check karein ki app local testing mein hai ya Render (production) par
TESTING = os.getenv("TESTING", "false").lower() == "true"

if TESTING and mongomock is not None:
    # Testing mode mein mock database use hoga
    client = mongomock.MongoClient()
else:
    # Production / Render par real MongoDB connection use hoga
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    client = MongoClient(MONGO_URL)

db = client.get_database("dipeshkumarvu98_db_user")  # Yahan apna database name daalein

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
    _clients: Dict[int, Any] = {}
    _custom_db: Optional[Any] = None
    is_mock: bool = False

    def _get_loop_id(self) -> int:
        try:
            return id(asyncio.get_running_loop())
        except RuntimeError:
            return 0

    @property
    def client(self) -> Optional[Any]:
        lid = self._get_loop_id()
        if lid in self._clients:
            return self._clients[lid]
        # If a client exists across event loops, obtain client for current loop
        if self._clients and not self.is_mock:
            try:
                c = AsyncMongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
                self._clients[lid] = c
                return c
            except Exception:
                pass
            return next(iter(self._clients.values()), None)
        return None

    @client.setter
    def client(self, val: Optional[Any]) -> None:
        lid = self._get_loop_id()
        if val is None:
            self._clients.clear()
        else:
            self._clients[lid] = val

    @property
    def db(self) -> Optional[Any]:
        if self._custom_db is not None:
            return self._custom_db
        c = self.client
        if c is not None:
            return c[settings.MONGODB_DATABASE]
        return None

    @db.setter
    def db(self, val: Optional[Any]) -> None:
        if val is None:
            self._custom_db = None
            self.is_mock = False
        elif isinstance(val, AsyncMockDatabase):
            self._custom_db = val
            self.is_mock = True
        else:
            self._custom_db = val

    async def close_all(self) -> None:
        for c in list(self._clients.values()):
            try:
                if hasattr(c, "close"):
                    await c.close()
            except Exception:
                pass
        self._clients.clear()
        self._custom_db = None
        self.is_mock = False


db_manager = MongoDBManager()

async def connect_to_mongo() -> None:
    """
    Initialize PyMongo AsyncMongoClient connection to MongoDB.
    Fails fast if connection is unavailable. In-memory mock database fallback
    is strictly forbidden during normal application runtime and production.
    """
    from app.core.config import get_safe_db_target
    target = get_safe_db_target()
    target_type = "MongoDB Atlas" if target["is_atlas"] else "Local MongoDB"

    logger.info("Initializing connection to %s (%s, db='%s', env='%s')", target_type, target["host"], target["database"], target["environment"])
    try:
        import certifi
        tls_kwargs = {"tlsCAFile": certifi.where()} if "mongodb+srv" in settings.MONGODB_URI or "mongodb.net" in settings.MONGODB_URI else {}
    except Exception:
        tls_kwargs = {}

    try:
        real_client = AsyncMongoClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            **tls_kwargs
        )
        # Test ping to confirm server is up and responsive
        await real_client.admin.command("ping")
        db_manager.client = real_client
        db_manager.is_mock = False
        logger.info("=========================================================================")
        logger.info("  DATABASE TARGET CONFIRMED:")
        logger.info("  - Type:        %s", target_type)
        logger.info("  - Host:        %s", target["host"])
        logger.info("  - Database:    %s", target["database"])
        logger.info("  - Environment: %s", target["environment"])
        logger.info("=========================================================================")
    except Exception as e:
        await db_manager.close_all()
        logger.critical("=========================================================================")
        logger.critical("  CRITICAL ERROR: MONGODB DATABASE CONNECTION FAILED!")
        logger.critical("  - Type:        %s", target_type)
        logger.critical("  - Host:        %s", target["host"])
        logger.critical("  - Database:    %s", target["database"])
        logger.critical("  - Environment: %s", target["environment"])
        logger.critical("  - Reason:      %s", str(e))
        logger.critical("  Application startup aborted. Persistent MongoDB is required.")
        logger.critical("=========================================================================")
        raise ConnectionError(
            f"CRITICAL: Failed to connect to MongoDB '{target['database']}' at '{target['host']}' ({target_type}): {str(e)}"
        )

async def close_mongo_connection() -> None:
    """Close active MongoDB client connection on application shutdown."""
    logger.info("Closing PyMongo AsyncMongoClient connection...")
    await db_manager.close_all()

def get_database() -> Optional[Any]:
    """Retrieve active Database instance."""
    return db_manager.db

async def ping_database() -> bool:
    """Ping MongoDB server to verify live database responsiveness."""
    if not db_manager.client:
        return False
    try:
        await db_manager.client.admin.command("ping")
        return True
    except Exception as e:
        logger.warning("MongoDB ping check failed: %s", str(e))
        return False



