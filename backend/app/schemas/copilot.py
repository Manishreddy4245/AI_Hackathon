from typing import List, Optional
from pydantic import BaseModel

class CopilotQueryRequest(BaseModel):
    query: str

class CopilotCardSchema(BaseModel):
    title: str
    subtitle: Optional[str] = None
    detail: Optional[str] = None
    badge: Optional[str] = None

class CopilotActionButtonSchema(BaseModel):
    label: str
    route: str

class CopilotResponseSchema(BaseModel):
    id: str
    sender: str = "assistant"
    text: str
    timestamp: str
    cards: Optional[List[CopilotCardSchema]] = None
    actionButton: Optional[CopilotActionButtonSchema] = None
