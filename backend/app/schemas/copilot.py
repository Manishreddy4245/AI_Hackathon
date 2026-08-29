from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class CopilotQueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = None


class CopilotCardSchema(BaseModel):
    title: str
    subtitle: Optional[str] = None
    detail: Optional[str] = None
    badge: Optional[str] = None


class CopilotActionButtonSchema(BaseModel):
    label: str
    route: str


class CopilotActionProposalSchema(BaseModel):
    action_type: str = "schedule_interview"
    summary: str
    details: Dict[str, Any] = Field(default_factory=dict)
    requires_confirmation: bool = True
    confirmed: bool = False
    executed: bool = False
    error: Optional[str] = None


class CopilotResponseSchema(BaseModel):
    id: str
    sender: str = "assistant"
    text: str
    timestamp: str
    cards: Optional[List[CopilotCardSchema]] = None
    actionButton: Optional[CopilotActionButtonSchema] = None
    actionProposal: Optional[CopilotActionProposalSchema] = None


class CopilotActionExecuteRequest(BaseModel):
    action_type: str
    details: Dict[str, Any]


class CopilotActionExecuteResponse(BaseModel):
    status: str
    message: str
    interview: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
