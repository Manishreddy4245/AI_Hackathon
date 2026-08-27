import pytest
from app.db.integrity import migrate_legacy_document_keys

class MockAsyncCursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, length=10000):
        return self.docs

class MockCollection:
    def __init__(self, name, docs):
        self.name = name
        self.docs = docs
        self.updated = []

    def find(self, query):
        return MockAsyncCursor(self.docs)

    async def update_one(self, filter_query, update_query):
        self.updated.append((filter_query, update_query))
        return True

class MockDatabase:
    def __init__(self):
        self.applications = MockCollection("applications", [
            {"_id": "app-1", "studentId": "usr-101", "driveId": "drive-202", "companyId": "comp-303", "createdAt": "2026-08-27T10:00:00Z"}
        ])
        self.students = MockCollection("students", [
            {"_id": "usr-101", "rollNumber": "21CS001", "minCgpa": 8.5}
        ])

@pytest.mark.anyio
async def test_migrate_legacy_document_keys():
    """Verify camelCase fields are safely migrated into canonical snake_case keys."""
    mock_db = MockDatabase()
    result = await migrate_legacy_document_keys(mock_db)

    assert result["applications"] == 1
    assert result["students"] == 1

    # Check updated applications document fields
    app_update = mock_db.applications.updated[0][1]["$set"]
    assert app_update["student_id"] == "usr-101"
    assert app_update["drive_id"] == "drive-202"
    assert app_update["company_id"] == "comp-303"
    assert app_update["created_at"] == "2026-08-27T10:00:00Z"

    # Check updated students document fields
    student_update = mock_db.students.updated[0][1]["$set"]
    assert student_update["roll_number"] == "21CS001"
    assert student_update["min_cgpa"] == 8.5
