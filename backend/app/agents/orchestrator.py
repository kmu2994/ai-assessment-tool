"""
Exam Orchestrator Agent
Central controller for exam flow, delegating to specialized agents.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
import traceback

from .semantic_grader import grading_agent
from .adaptive_engine import adaptive_agent
from .ocr_processor import ocr_agent
from .analytics import analytics_agent

logger = logging.getLogger(__name__)


class ExamOrchestrator:
    """
    The main orchestrator that coordinates all agents during an exam.
    Manages exam lifecycle: start → questions → answers → grading → results.
    """

    def __init__(self):
        self.grader = grading_agent
        self.adaptive = adaptive_agent
        self.ocr = ocr_agent
        self.analytics = analytics_agent

    async def start_exam_session(
        self,
        student_id: str,   # FIX: was int — MongoDB IDs are strings
        exam_id: str,       # FIX: was int
        questions: List[Dict],
        is_adaptive: bool = True,
    ) -> Dict[str, Any]:
        """
        Initialize a new exam session.

        Returns:
            Session info with first question.
        """
        initial_ability = 0.5

        if is_adaptive:
            first_question = self.adaptive.get_next_question(
                available_questions=questions,
                current_ability=initial_ability,
                answered_question_ids=[],
            )
        else:
            # Sequential mode: sort by string ID (lexicographic) for stable ordering
            sorted_qs = sorted(questions, key=lambda x: str(x.get("id", "")))
            first_question = sorted_qs[0] if sorted_qs else None

        return {
            "session_started": True,
            "current_ability": initial_ability,
            "first_question": first_question,
            "total_questions": len(questions),
        }

    async def process_answer(
        self,
        question: Dict,
        student_answer: str,
        image_bytes: Optional[bytes] = None,
    ) -> Dict[str, Any]:
        """
        Process a student's answer (text or handwritten).

        Args:
            question: The question being answered.
            student_answer: Text answer (empty if handwritten).
            image_bytes: Handwritten image bytes (optional).

        Returns:
            Grading result dict.
        """
        try:
            question_type = question.get("question_type", "mcq")
            extracted_text = None

            # Handle handwritten submission via OCR
            if image_bytes:
                logger.info("Processing handwritten answer via OCR...")
                ocr_text = self.ocr.extract_text_from_bytes(image_bytes, "handwritten.jpg")

                if ocr_text and ocr_text.strip():
                    extracted_text = ocr_text
                    student_answer = extracted_text
                    logger.info(f"OCR extracted {len(extracted_text)} characters.")
                else:
                    return {
                        "success": False,
                        "error": "Failed to process handwritten image or no text found.",
                        "needs_manual_review": True,
                        "is_correct": False,
                        "score": 0.0,
                        "feedback": "Could not read handwriting. Please retype or try a clearer image.",
                    }

            # Grade based on question type
            if question_type == "mcq":
                result = self._grade_mcq(question, student_answer)
            else:
                result = self._grade_descriptive(question, student_answer)

            if extracted_text:
                result["extracted_text"] = extracted_text

            return result

        except Exception as e:
            logger.error(f"Error in orchestrator.process_answer: {e}")
            logger.error(traceback.format_exc())
            raise

    def _grade_mcq(self, question: Dict, student_answer: str) -> Dict[str, Any]:
        """Grade an MCQ answer by comparing full option values (case-insensitive)."""
        correct_answer = (question.get("correct_answer") or "").strip()
        student_answer_clean = (student_answer or "").strip()

        # Case-insensitive comparison
        is_correct = student_answer_clean.upper() == correct_answer.upper()
        points = float(question.get("points") or 1.0)

        return {
            "success": True,
            "is_correct": is_correct,
            "score": points if is_correct else 0.0,
            "correct_answer": correct_answer,
            "feedback": "Correct! ✓" if is_correct else f"Incorrect. The correct answer was: {correct_answer}.",
        }

    def _grade_descriptive(self, question: Dict, student_answer: str) -> Dict[str, Any]:
        """Grade a descriptive answer using semantic similarity (SBERT)."""
        model_answer = question.get("model_answer") or ""
        points = float(question.get("points") or 1.0)

        result = self.grader.grade_answer(
            student_answer=student_answer or "",
            model_answer=model_answer,
            max_points=points,
        )

        result["success"] = True
        result["is_correct"] = result.get("percentage", 0) >= 50

        return result

    async def get_next_question(
        self,
        questions: List[Dict],
        current_ability: float,
        answered_ids: List[str],   # FIX: was List[int]
        last_answer_correct: bool,
        last_difficulty: float = 0.5,
    ) -> Dict[str, Any]:
        """
        Get the next adaptive question based on updated ability estimate.

        Returns:
            Dict with next_question, current_ability, and exam_complete flag.
        """
        try:
            new_ability = self.adaptive.update_ability(
                current_ability=current_ability,
                question_difficulty=last_difficulty,
                is_correct=last_answer_correct,
            )

            next_question = self.adaptive.get_next_question(
                available_questions=questions,
                current_ability=new_ability,
                answered_question_ids=answered_ids,
            )

            if next_question is None:
                return {
                    "exam_complete": True,
                    "current_ability": new_ability,
                    "next_question": None,
                }

            return {
                "exam_complete": False,
                "current_ability": new_ability,
                "next_question": next_question,
            }

        except Exception as e:
            logger.error(f"Error in orchestrator.get_next_question: {e}")
            logger.error(traceback.format_exc())
            raise

    async def finish_exam(
        self,
        submission_id: str,    # FIX: was int
        answers: List[Dict],
    ) -> Dict[str, Any]:
        """
        Finalize an exam and generate results.

        Returns:
            Final result dict with scores, grade, and analytics.
        """
        total_score = sum(a.get("score", 0) for a in answers)
        max_score = sum(a.get("max_points", 1) for a in answers)
        percentage = (total_score / max_score * 100) if max_score > 0 else 0

        correct_count = sum(1 for a in answers if a.get("is_correct"))

        # Single-submission analytics (trend will be neutral — expected)
        performance = self.analytics.calculate_student_performance([
            {"percentage": percentage}
        ])

        return {
            "submission_id": submission_id,
            "total_score": round(total_score, 2),
            "max_score": round(max_score, 2),
            "percentage": round(percentage, 2),
            "questions_answered": len(answers),
            "correct_answers": correct_count,
            "grade": self._calculate_grade(percentage),
            "analytics": performance,
        }

    def _calculate_grade(self, percentage: float) -> str:
        """Convert percentage to letter grade."""
        if percentage >= 90:
            return "A+"
        elif percentage >= 80:
            return "A"
        elif percentage >= 70:
            return "B"
        elif percentage >= 60:
            return "C"
        elif percentage >= 50:
            return "D"
        else:
            return "F"


# Singleton instance
orchestrator = ExamOrchestrator()
