from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class CategorizedSkillSchema(BaseModel):
    category: str
    skills: List[str] = Field(default_factory=list)

class ProjectSchema(BaseModel):
    title: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = ""
    technologies: List[str] = Field(default_factory=list)
    techStack: List[str] = Field(default_factory=list)

    def model_post_init(self, __context: Any) -> None:
        if not self.title and self.name:
            self.title = self.name
        elif not self.name and self.title:
            self.name = self.title
        if not self.technologies and self.techStack:
            self.technologies = self.techStack
        elif not self.techStack and self.technologies:
            self.techStack = self.technologies

class CertificationSchema(BaseModel):
    name: str
    issuer: Optional[str] = ""
    year: Optional[str] = ""

class ExperienceSchema(BaseModel):
    role: str
    company: str
    duration: Optional[str] = ""
    description: Optional[str] = ""

class ExtractedProfileSchema(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    education: Optional[str] = None
    branch: Optional[str] = None
    cgpa: Optional[float] = None
    graduation_year: Optional[int] = None
    raw_skills: List[str] = Field(default_factory=list)
    skills_by_category: List[CategorizedSkillSchema] = Field(default_factory=list)
    projects: List[ProjectSchema] = Field(default_factory=list)
    certifications: List[CertificationSchema] = Field(default_factory=list)
    experience: List[ExperienceSchema] = Field(default_factory=list)
    suggested_roles: List[str] = Field(default_factory=list)
    missing_critical_sections: List[str] = Field(default_factory=list)

# Alias for backward compatibility
ResumeProfileSchema = ExtractedProfileSchema

class ResumeUploadResponse(BaseModel):
    resume_id: Optional[str] = None
    student_id: str
    filename: str
    file_type: str
    uploaded_at: str
    readiness_score: int
    extracted_profile: Optional[ExtractedProfileSchema] = None
    profile: Optional[ExtractedProfileSchema] = None
    summary: Optional[str] = "Resume successfully analyzed"

class PlacementRecommendationSchema(BaseModel):
    drive_id: str
    company: str
    role: str
    company_logo: Optional[str] = None
    package_lpa: Optional[float] = None
    salary_text: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = "Full-time"
    source: str = "placemind"
    source_type: str = "college"  # "college" | "external"
    source_label: str = "PlaceMind Campus Drive"
    application_url: Optional[str] = None
    source_url: Optional[str] = None
    posted_at: Optional[str] = None
    description: Optional[str] = None
    min_cgpa: Optional[float] = None
    eligible_branches: List[str] = Field(default_factory=list)
    graduation_year: Optional[int] = None
    deadline: Optional[str] = None
    match_score: int = 0
    eligible: bool = False
    eligibility_reasons: List[str] = Field(default_factory=list)
    missing_requirements: List[str] = Field(default_factory=list)
    matched_skills: List[str] = Field(default_factory=list)
    skill_gaps: List[str] = Field(default_factory=list)
    matched_preferred_skills: List[str] = Field(default_factory=list)
    missing_preferred_skills: List[str] = Field(default_factory=list)
    recommendation: str = ""

class CompanyOpportunityGroupSchema(BaseModel):
    company: str
    company_logo: Optional[str] = None
    source: str = "placemind"
    source_type: str = "college"
    source_label: str = "Campus Placement Drive"
    total_jobs: int = 0
    eligible_jobs: int = 0
    ineligible_jobs: int = 0
    best_match_score: int = 0
    location: Optional[str] = None
    opportunities: List[PlacementRecommendationSchema] = Field(default_factory=list)

class UnifiedOpportunitiesResponseSchema(BaseModel):
    total_opportunities: int = 0
    eligible_count: int = 0
    ineligible_count: int = 0
    total_companies: int = 0
    page: int = 1
    page_size: int = 20
    total_pages: int = 1
    opportunities: List[PlacementRecommendationSchema] = Field(default_factory=list)
    company_groups: List[CompanyOpportunityGroupSchema] = Field(default_factory=list)

class SkillGapItemSchema(BaseModel):
    skill: str
    category: str = "Technical"
    demand: int = 1
    student_status: str = "missing"
    importance: str = "Important"

class SkillGapResponseSchema(BaseModel):
    student_id: str
    total_drives_analyzed: int
    skill_gaps: List[SkillGapItemSchema]
