"""
MongoDB Document Models using Beanie ODM
"""
from beanie import Document, PydanticObjectId
from pydantic import Field, EmailStr
from typing import Optional, Dict, List
from datetime import datetime, timezone
from enum import Enum


class UserRole(str, Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class User(Document):
    """User document model."""
    username: str = Field(..., unique=True, index=True)
    email: EmailStr = Field(..., unique=True, index=True)
    password_hash: str
    full_name: str
    role: UserRole = UserRole.STUDENT
    is_active: bool = True
    accessibility_mode: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Settings:
        name = "users"


class Question(Document):
    """Question document model."""
    exam_id: PydanticObjectId
    question_text: str
    question_type: str = "mcq"  # "mcq" or "descriptive"
    difficulty: float = 0.5
    points: float = 1.0
    options: Optional[Dict[str, str]] = None
    correct_answer: Optional[str] = None
    model_answer: Optional[str] = None
    source: str = "MANUAL"  # "MANUAL" or "AI"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Settings:
        name = "questions"


class Exam(Document):
    """Exam (Assessment) document model."""
    title: str = Field(..., index=True)
    subject: str = ""
    description: Optional[str] = None
    type: str = "MCQ"  # "MCQ" or "DESCRIPTIVE"
    created_by: PydanticObjectId
    is_active: bool = True
    is_adaptive: bool = True
    duration_minutes: int = 60
    total_questions: int = 10
    total_marks: float = 100.0
    passing_score: float = 40.0
    scheduled_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Settings:
        name = "exams"


class Answer(Document):
    """Answer document model."""
    submission_id: PydanticObjectId
    question_id: PydanticObjectId
    student_answer: Optional[str] = None
    image_path: Optional[str] = None
    extracted_text: Optional[str] = None
    is_correct: bool = False
    score: float = 0.0
    original_ai_score: float = 0.0
    similarity_score: Optional[float] = None
    plagiarism_detected: bool = False
    feedback: Optional[str] = None
    teacher_remarks: Optional[str] = None
    answered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Settings:
        name = "answers"


class Submission(Document):
    """Submission document model."""
    user_id: PydanticObjectId
    exam_id: PydanticObjectId
    status: str = "in_progress"
    current_ability: float = 0.5
    total_score: float = 0.0
    max_score: float = 0.0
    percentage: float = 0.0
    is_finalized: bool = False
    teacher_remarks: Optional[str] = None
    violations: List[Dict] = []
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    submitted_at: Optional[datetime] = None
    
    class Settings:
        name = "submissions"


class QuestionBank(Document):
    """Question Bank - Reusable questions for teachers."""
    question_text: str
    question_type: str = "mcq"  # "mcq" or "descriptive"
    subject: str = ""
    topic: Optional[str] = None
    difficulty: str = "Medium"  # "Easy", "Medium", "Hard"
    points: float = 1.0
    options: Optional[Dict[str, str]] = None
    correct_answer: Optional[str] = None
    model_answer: Optional[str] = None
    created_by: PydanticObjectId
    usage_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Settings:
        name = "question_bank"
