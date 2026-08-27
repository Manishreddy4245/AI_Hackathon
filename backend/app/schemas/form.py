from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class FormFieldSchema(BaseModel):
    name: str
    label: str
    field_type: str = "text"
    required: bool = False
    placeholder: Optional[str] = None
    options: Optional[List[str]] = None

class FormCreate(BaseModel):
    title: str
    description: Optional[str] = None
    drive_id: Optional[str] = None
    fields: List[FormFieldSchema] = []
    is_published: bool = True

class FormSchema(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    drive_id: Optional[str] = None
    created_by: str
    created_by_name: str
    fields: List[FormFieldSchema] = []
    is_published: bool = True
    created_at: str
    submission_count: int = 0
    community_post_id: Optional[str] = None

class FormSubmissionCreate(BaseModel):
    answers: Dict[str, Any] = {}

class FormSubmissionSchema(BaseModel):
    id: str
    form_id: str
    drive_id: Optional[str] = None
    student_id: str
    student_name: str
    student_email: str
    answers: Dict[str, Any] = {}
    submitted_at: str
    status: str = "SUBMITTED"