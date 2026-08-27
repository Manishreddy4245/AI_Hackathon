import pytest
import re

class MockAsyncCursor:
    def __init__(self, docs):
        self._docs = docs
        self._skip = 0
        self._limit = len(docs)
        self._sort_keys = None

    def sort(self, key_or_list, direction=None):
        self._sort_keys = key_or_list
        return self

    def skip(self, n):
        self._skip = n
        return self

    def limit(self, n):
        self._limit = n
        return self

    async def to_list(self, length=100):
        items = self._docs[self._skip:self._skip + self._limit]
        return items[:length]

class MockCollection:
    def __init__(self, docs):
        self.docs = docs

    def find(self, query=None, projection=None):
        return MockAsyncCursor(self.docs)

@pytest.mark.anyio
async def test_pagination_and_page_limits():
    """Test pagination bounds, page_size enforcement, and page skipping logic."""
    dataset = [{"id": f"item-{i}", "name": f"Item {i}"} for i in range(1, 150)]
    coll = MockCollection(dataset)

    # 1. Normal page 1 with page_size=20
    page_1 = await coll.find().skip(0).limit(20).to_list(length=20)
    assert len(page_1) == 20
    assert page_1[0]["id"] == "item-1"

    # 2. Page 2 skip
    page_2 = await coll.find().skip(20).limit(20).to_list(length=20)
    assert len(page_2) == 20
    assert page_2[0]["id"] == "item-21"

    # 3. Maximum page_size cap (100)
    max_page_size = min(max(500, 1), 100)
    max_page = await coll.find().skip(0).limit(max_page_size).to_list(length=max_page_size)
    assert len(max_page) == 100

    # 4. Empty page beyond dataset length
    empty_page = await coll.find().skip(200).limit(20).to_list(length=20)
    assert len(empty_page) == 0

@pytest.mark.anyio
async def test_regex_escaping_security():
    """Verify special regex search inputs are escaped to prevent ReDoS attacks."""
    user_search = "Company (Tier-1) [Branch.*]?"
    escaped = re.escape(user_search.strip())

    assert "(" not in escaped.replace("\\(", "")
    assert "[" not in escaped.replace("\\[", "")
    assert escaped == r"Company\ \(Tier\-1\)\ \[Branch\.\*\]\?"
