from typing import Optional
from pydantic import BaseModel

class NotificationSchema(BaseModel):
    id: str
    title: str
    message: str
    timestamp: str
    read: bool
    important: bool
    type: str
    recipientRole: str
    recipientName: str
    relatedRoute: Optional[str] = None
    relatedDriveName: Optional[str] = None
    relatedCandidateName: Optional[str] = None

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str
    recipientRole: str
    recipientName: str
