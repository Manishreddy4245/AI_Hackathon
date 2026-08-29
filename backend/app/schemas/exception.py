from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class ExceptionSchema(BaseModel):
    id: str
    title: str
    description: str
    severity: str  # critical, warning, info
    status: str    # open, in_review, resolved, ignored
    category: str  # scheduling, candidate, panel, room, drive, notification
    timestamp: str
    affectedEntity: str
    aiRecommendation: str
    suggestedActionText: str
    recommendedAction: Optional[str] = None
    actionText: Optional[str] = None
    actionRoute: Optional[str] = None
    candidateAvailable: Optional[bool] = True
    panelAvailable: Optional[bool] = True
    roomAvailable: Optional[bool] = True
    resolvedBy: Optional[str] = None
    resolved_at: Optional[str] = None
    created_at: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class ExceptionStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Target status: open, in_review, resolved, or ignored")
    notes: Optional[str] = None

class ExceptionCreateRequest(BaseModel):
    title: str
    description: str
    severity: str = "warning"
    status: str = "open"
    category: str = "scheduling"
    affectedEntity: str
    aiRecommendation: str
    suggestedActionText: str
    actionRoute: Optional[str] = None
    candidateAvailable: Optional[bool] = True
    panelAvailable: Optional[bool] = True
    roomAvailable: Optional[bool] = True

class AgentActivitySchema(BaseModel):
    id: str
    timestamp: str
    title: str
    category: str
    detail: str
    type: str  # autonomous_ai, officer_action, system
