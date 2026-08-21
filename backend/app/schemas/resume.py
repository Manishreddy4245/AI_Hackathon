from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

class CategorizedSkillSchema(BaseModel):
    name: str
    category: str = "Technical"
    status: str = "Detected"  # Detected, Strong, Good, Needs Improvement, Missing

class ProjectSchema(BaseModel):
    name: str
    description: Optional[str] = None
    techStack: List[str] = Field(default_factory=list)

class CertificationSchema(BaseModel):
    name: str
    issuer: Optional[str] = None
    date: Optional[str] = None

class ExperienceSchema(BaseModel):
    role: str
    company: Optional[str] = None
    duration: Optional[str] = None
    description: Optional[str] = None

class ExtractedProfileSchema(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    education: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    skills: List[CategorizedSkillSchema] = Field(default_factory=list)
    raw_skills: List[str] = Field(default_factory=list)
    projects: List[ProjectSchema] = Field(default_factory=list)
    certifications: List[CertificationSchema] = Field(default_factory=list)
    experience: List[ExperienceSchema] = Field(default_factory=list)

class ResumeUploadResponse(BaseModel):
    resume_id: str
    student_id: str
    profile: ExtractedProfileSchema
    readiness_score: int
    filename: str
    file_type: str
    uploaded_at: str

class PlacementRecommendationSchema(BaseModel):
    drive_id: str
    company: str
    role: str
    company_logo: Optional[str] = None
    package_lpa: Optional[float] = None
    location: Optional[str] = None
    match_score: int
    eligible: bool
    eligibility_reasons: List[str] = Field(default_factory=list)
    missing_requirements: List[str] = Field(default_factory=list)
    matched_skills: List[str] = Field(default_factory=list)
    skill_gaps: List[str] = Field(default_factory=list)
    matched_preferred_skills: List[str] = Field(default_factory=list)
    missing_preferred_skills: List[str] = Field(default_factory=list)
    recommendation: str

class SkillGapItemSchema(BaseModel):
    skill: str
    category: str = "Technical"
    demand: int = 1
    student_status: str = "missing"  # missing, detected
    importance: str = "Important"   # Critical, Important, Optional

class SkillGapResponseSchema(BaseModel):
    student_id: str
    total_drives_analyzed: int
    skill_gaps: List[SkillGapItemSchema]
