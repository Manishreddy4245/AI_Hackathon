from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class PracticeSessionCreateRequest(BaseModel):
    company: str = Field(default="Amazon", description="Target company for the interview practice")
    role: str = Field(default="Software Development Engineer (SDE)", description="Target role")
    job_description: Optional[str] = Field(default=None, description="Optional JD text for deeper context")
    interview_style: str = Field(default="Technical", description="Technical, HR / Behavioral, System Design, Coding Viva, or Mixed")
    topics: List[str] = Field(default_factory=lambda: ["Arrays & Hashing", "Dynamic Programming"], description="Core technical topics")
    custom_topics: List[str] = Field(default_factory=list, description="Custom entered topics")
    experience_level: str = Field(default="Fresher / SDE-1", description="Fresher / SDE-1, Mid-level / SDE-2, Senior / Lead")
    difficulty: str = Field(default="Adaptive", description="Easy, Medium, Hard, Adaptive")
    total_questions: int = Field(default=5, ge=2, le=15, description="Number of questions in session")
    mode: str = Field(default="video", description="text, video, or hybrid")
    voice_gender: Optional[str] = Field(default="female", description="female, male, or neutral")
    voice_accent: Optional[str] = Field(default="indian", description="indian, american, british, or neutral")
    voice_id: Optional[str] = Field(default=None, description="Identifier or name of chosen voice")


class PracticeQuestionResponse(BaseModel):
    session_id: str
    question_index: int
    total_questions: int
    question_text: str
    topic: str
    question_type: str = "technical"  # technical, behavioral, system_design, follow_up, coding
    difficulty: str = "Medium"
    is_final_question: bool = False


class PracticeAnswerSubmitRequest(BaseModel):
    session_id: str
    question_index: int
    answer_text: str = Field(default="", description="Typed answer or confirmed transcript text")
    transcript: Optional[str] = Field(default=None, description="Speech-to-text transcript if recorded")
    audio_video_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Metadata such as duration_seconds, speaking_pace")
    time_taken_seconds: Optional[int] = Field(default=0, description="Time in seconds taken to answer")
    is_skipped: bool = Field(default=False, description="Whether the question was skipped by the student")


class TopicScoreItem(BaseModel):
    topic: str
    score: float = 0.0
    feedback: str = ""


class PracticeSessionEvaluation(BaseModel):
    overall_score: float = 0.0
    technical_score: float = 0.0
    communication_score: float = 0.0
    problem_solving_score: float = 0.0
    readiness_level: str = "Needs Practice"  # Ready for Placements, Needs Minor Refinement, Needs Practice
    topic_scores: List[TopicScoreItem] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    missed_concepts: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    detailed_feedback: str = ""
    suggested_next_topics: List[str] = Field(default_factory=list)
    video_feedback: Optional[Dict[str, Any]] = Field(default=None, description="Objective metrics like duration, structure, and speaking stats")


class PracticeQuestionItem(BaseModel):
    question_index: int
    question_text: str
    topic: str
    question_type: str = "technical"
    difficulty: str = "Medium"


class PracticeAnswerItem(BaseModel):
    question_index: int
    answer_text: str = ""
    transcript: Optional[str] = None
    is_skipped: bool = False
    time_taken_seconds: int = 0
    audio_video_metadata: Optional[Dict[str, Any]] = None
    submitted_at: str = ""


class PracticeSessionDetailResponse(BaseModel):
    session_id: str
    student_id: str
    student_name: Optional[str] = None
    config: Dict[str, Any]
    status: str = "IN_PROGRESS"  # IN_PROGRESS, COMPLETED, ABANDONED
    started_at: str
    completed_at: Optional[str] = None
    current_question_index: int = 1
    total_questions: int = 5
    questions: List[PracticeQuestionItem] = Field(default_factory=list)
    answers: List[PracticeAnswerItem] = Field(default_factory=list)
    current_question: Optional[PracticeQuestionItem] = None
    evaluation: Optional[PracticeSessionEvaluation] = None


class PracticeSessionSummary(BaseModel):
    session_id: str
    student_id: str
    company: str
    role: str
    mode: str
    topics: List[str]
    status: str
    started_at: str
    completed_at: Optional[str] = None
    questions_count: int
    answers_count: int
    overall_score: Optional[float] = None
