"""
Question Bank API Routes — Save, list, and delete reusable questions.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from beanie import PydanticObjectId
import logging

from app.db.models import User, QuestionBank
from .auth import require_role

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Question Bank"])


@router.post("/question-bank/save")
async def save_to_question_bank(
    question_data: dict,
    user: User = Depends(require_role(["teacher", "admin"])),
):
    """Save a question to the Question Bank."""
    qb = QuestionBank(
        question_text=question_data.get("question_text", ""),
        question_type=question_data.get("question_type", "mcq"),
        subject=question_data.get("subject", ""),
        topic=question_data.get("topic"),
        difficulty=question_data.get("difficulty", "Medium"),
        points=question_data.get("points", 1.0),
        options=question_data.get("options"),
        correct_answer=question_data.get("correct_answer"),
        model_answer=question_data.get("model_answer"),
        created_by=user.id,
    )
    await qb.insert()
    return {"id": str(qb.id), "message": "Question saved to bank"}


@router.get("/question-bank")
async def list_question_bank(
    subject: Optional[str] = None,
    difficulty: Optional[str] = None,
    question_type: Optional[str] = None,
    user: User = Depends(require_role(["teacher", "admin"])),
):
    """List questions from Question Bank with optional filters."""
    query: dict = {}
    if subject:
        query["subject"] = subject
    if difficulty:
        query["difficulty"] = difficulty
    if question_type:
        query["question_type"] = question_type

    questions = await QuestionBank.find(query).to_list() if query else await QuestionBank.find_all().to_list()

    return [
        {
            "id": str(q.id),
            "question_text": q.question_text,
            "question_type": q.question_type,
            "subject": q.subject,
            "topic": q.topic,
            "difficulty": q.difficulty,
            "points": q.points,
            "options": q.options,
            "correct_answer": q.correct_answer,
            "model_answer": q.model_answer,
            "usage_count": q.usage_count,
            "created_at": str(q.created_at),
        }
        for q in questions
    ]


@router.delete("/question-bank/{question_id}")
async def delete_from_question_bank(
    question_id: str,
    user: User = Depends(require_role(["teacher", "admin"])),
):
    """Delete a question from Question Bank."""
    question = await QuestionBank.get(PydanticObjectId(question_id))
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if question.created_by != user.id and user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")
    await question.delete()
    return {"message": "Question deleted from bank"}
