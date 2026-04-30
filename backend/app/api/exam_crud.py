"""
Exam CRUD API Routes — Create, Read, Delete, Toggle status.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List, Optional
from beanie import PydanticObjectId
from beanie.operators import In
import logging
import traceback

from app.db.models import User, Exam, Question, Submission, Answer
from app.agents.ocr_processor import ocr_agent
from app.agents.ai_generator import ai_generator
from app.core.config import settings
from .auth import get_current_user, require_role
from .schemas import (
    ExamCreate, ExamResponse, QuestionCreate, QuestionResponse,
    ExtractTextResponse, AIQuestionRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Exams"])


@router.post("/create", response_model=ExamResponse)
async def create_exam(
    exam_data: ExamCreate,
    user: User = Depends(require_role(["teacher", "admin"])),
):
    """Create a new assessment (Teacher/Admin only)."""
    exam = Exam(
        title=exam_data.title,
        subject=exam_data.subject,
        description=exam_data.description,
        type=exam_data.type,
        created_by=user.id,
        is_adaptive=exam_data.is_adaptive,
        duration_minutes=exam_data.duration_minutes,
        total_marks=exam_data.total_marks,
        passing_score=exam_data.passing_score,
        total_questions=exam_data.total_questions or len(exam_data.questions),
    )
    await exam.insert()
    logger.info(f"Exam '{exam.title}' created (id={exam.id}) by {user.username}.")

    for q in exam_data.questions:
        logger.debug(
            f"Inserting question: type={q.question_type}, "
            f"text='{q.question_text[:40]}...'"
        )
        question = Question(
            exam_id=exam.id,
            question_text=q.question_text,
            question_type=q.question_type,
            difficulty=q.difficulty,
            points=q.points,
            options=q.options,
            correct_answer=q.correct_answer,
            model_answer=q.model_answer,
            source=q.source,
        )
        await question.insert()

    return ExamResponse(
        id=str(exam.id),
        title=exam.title,
        subject=exam.subject,
        description=exam.description,
        type=exam.type,
        is_adaptive=exam.is_adaptive,
        duration_minutes=exam.duration_minutes,
        total_questions=exam.total_questions,
        total_marks=exam.total_marks,
        passing_score=exam.passing_score,
    )


@router.post("/extract-text", response_model=ExtractTextResponse)
async def extract_text_from_file(
    file: UploadFile = File(...),
    user: User = Depends(require_role(["teacher", "admin"])),
):
    """Extract text from uploaded PDF/Word/Image."""
    content = await file.read()
    try:
        text = ocr_agent.extract_text_from_bytes(content, file.filename)
        return ExtractTextResponse(text=text, filename=file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/generate-questions", response_model=List[QuestionResponse])
async def generate_ai_questions(
    request: AIQuestionRequest,
    user: User = Depends(require_role(["teacher", "admin"])),
):
    """Generate questions using Gemini AI."""
    try:
        data = await ai_generator.generate_questions(
            text=request.text,
            question_type=request.type,
            count=request.count,
            difficulty=request.difficulty,
            total_marks=request.total_marks,
        )
        return [QuestionResponse(**q) for q in data]
    except Exception as e:
        logger.error(f"Generate questions failure: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


@router.get("/available", response_model=List[ExamResponse])
async def list_available_exams(user: User = Depends(get_current_user)):
    """List all active exams available for students."""
    exams = await Exam.find(Exam.is_active == True).to_list()

    # Bulk-fetch which exams the student has already submitted
    submissions = await Submission.find(
        Submission.user_id == user.id,
        In(Submission.status, ["graded", "submitted", "reviewing"]),
    ).to_list()
    submitted_exam_ids = {str(s.exam_id) for s in submissions}

    return [
        ExamResponse(
            id=str(e.id),
            title=e.title,
            subject=e.subject,
            description=e.description,
            type=e.type,
            is_adaptive=e.is_adaptive,
            duration_minutes=e.duration_minutes,
            total_questions=e.total_questions,
            total_marks=e.total_marks,
            passing_score=e.passing_score,
            has_submitted=str(e.id) in submitted_exam_ids,
        )
        for e in exams
    ]


@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam(exam_id: str, user: User = Depends(get_current_user)):
    """Get exam details."""
    exam = await Exam.get(PydanticObjectId(exam_id))
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Check if student already submitted
    submission = await Submission.find_one(
        Submission.user_id == user.id,
        Submission.exam_id == exam.id,
        In(Submission.status, ["graded", "submitted", "reviewing"]),
    )

    return ExamResponse(
        id=str(exam.id),
        title=exam.title,
        subject=exam.subject,
        description=exam.description,
        type=exam.type,
        is_adaptive=exam.is_adaptive,
        duration_minutes=exam.duration_minutes,
        total_questions=exam.total_questions,
        total_marks=exam.total_marks,
        passing_score=exam.passing_score,
        has_submitted=submission is not None,
    )


@router.delete("/{exam_id}")
async def delete_exam(
    exam_id: str,
    user: User = Depends(require_role(["teacher", "admin"])),
):
    """Delete an exam and ALL associated data (Teacher/Admin only)."""
    exam = await Exam.get(PydanticObjectId(exam_id))
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if user.role.value != "admin" and exam.created_by != user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own exams.")

    # ── Cascading delete ──────────────────────────────────────────────────
    # 1. Find all questions for this exam
    await Question.find(Question.exam_id == exam.id).delete()

    # 2. Find all submissions for this exam, then delete their answers
    submissions = await Submission.find(Submission.exam_id == exam.id).to_list()
    submission_ids = [s.id for s in submissions]
    if submission_ids:
        await Answer.find(In(Answer.submission_id, submission_ids)).delete()
    await Submission.find(Submission.exam_id == exam.id).delete()

    # 3. Delete the exam itself
    await exam.delete()

    logger.info(
        f"Exam '{exam.title}' (id={exam_id}) deleted by {user.username}. "
        f"Removed {len(submissions)} submissions."
    )
    return {"message": "Exam and all associated data deleted successfully."}


@router.post("/{exam_id}/toggle-status")
async def toggle_exam_status(
    exam_id: str,
    user: User = Depends(require_role(["teacher", "admin"])),
):
    """Toggle exam active status (Teacher/Admin only)."""
    exam = await Exam.get(PydanticObjectId(exam_id))
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if user.role.value != "admin" and exam.created_by != user.id:
        raise HTTPException(status_code=403, detail="Permission denied")

    exam.is_active = not exam.is_active
    await exam.save()
    return {"id": str(exam.id), "is_active": exam.is_active}
