from typing import Optional
from pydantic import BaseModel

class ExceptionSchema(BaseModel):
    id: str
    title: str
    description: str
    severity: str
    status: str
    category: str
    timestamp: str
    affectedEntity: str
    aiRecommendation: str
    suggestedActionText: str
    recommendedAction: Optional[str] = None
    actionText: Optional[str] = None
    actionRoute: Optional[str] = None
    resolvedBy: Optional[str] = None
