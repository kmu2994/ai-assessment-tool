"""
AI Question Generation Agent using Gemini.
"""
import os
import re
import json
import logging
import warnings
# Suppress deprecation warning for google.generativeai (still functional)
warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")
import google.generativeai as genai
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Maximum characters of user text to send to the AI model
_MAX_INPUT_CHARS = 4000

# Pattern to strip common prompt-injection attempts
_INJECTION_PATTERN = re.compile(
    r'(ignore\s+(all\s+)?(previous|prior|above)\s+instructions?|'
    r'disregard\s+.{0,50}instructions?|'
    r'you\s+are\s+now\s+a|'
    r'act\s+as\s+.{0,30}|'
    r'jailbreak|'
    r'do\s+anything\s+now)',
    re.IGNORECASE,
)


def _sanitize_input(text: str) -> str:
    """
    Strip prompt-injection patterns and limit length.
    Replaces suspicious phrases with '[REMOVED]' so context is preserved.
    """
    sanitized = _INJECTION_PATTERN.sub('[REMOVED]', text)
    return sanitized[:_MAX_INPUT_CHARS]


class AIGeneratorAgent:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not set — AI question generation will be disabled.")

        genai.configure(api_key=self.api_key)
        self.model_name = 'gemini-2.0-flash'
        try:
            self.model = genai.GenerativeModel(self.model_name)
            logger.info(f"AIGeneratorAgent ({self.model_name}) initialized.")
        except Exception as e:
            logger.error(f"Failed to initialize {self.model_name}, falling back to gemini-flash-latest: {e}")
            self.model_name = 'gemini-flash-latest'
            self.model = genai.GenerativeModel(self.model_name)

    async def generate_questions(
        self,
        text: str,
        question_type: str = "MCQ",
        count: int = 5,
        difficulty: str = "Medium",
        total_marks: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """Generates questions based on provided text using Gemini."""
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured.")

        # ── Sanitize user input ───────────────────────────────────────────────
        safe_text = _sanitize_input(text)

        points_per_q = (total_marks / count) if total_marks and count > 0 else None
        prompt = self._build_prompt(safe_text, question_type, count, difficulty, points_per_q)

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json",
                ),
            )
            return self._parse_response(response.text, question_type, difficulty, points_per_q)

        except Exception as e:
            logger.error(f"Error with {self.model_name}: {e}")
            if self.model_name != 'gemini-flash-latest':
                logger.info("Retrying with gemini-flash-latest...")
                try:
                    fallback_model = genai.GenerativeModel('gemini-flash-latest')
                    response = fallback_model.generate_content(prompt)
                    return self._parse_response(response.text, question_type, difficulty, points_per_q)
                except Exception as fe:
                    logger.error(f"Fallback to gemini-flash-latest failed: {fe}")

            return []

    def _parse_response(
        self,
        response_text: str,
        question_type: str,
        difficulty: str,
        points_per_q: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """Parses the AI response and adds metadata."""
        try:
            # Clean up response if it has markdown code blocks
            clean_text = response_text.strip()
            if "```json" in clean_text:
                clean_text = clean_text.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_text:
                clean_text = clean_text.split("```")[1].split("```")[0].strip()

            questions = json.loads(clean_text)

            # Ensure it's a list
            if isinstance(questions, dict) and "questions" in questions:
                questions = questions["questions"]

            if not isinstance(questions, list):
                logger.error(f"AI response is not a list: {type(questions)}")
                return []

            # Add metadata and normalize fields
            for q in questions:
                # Aliasing for common AI variations
                if "question" in q and "question_text" not in q:
                    q["question_text"] = q["question"]
                if "answer" in q and "correct_answer" not in q and question_type.upper() == "MCQ":
                    q["correct_answer"] = q["answer"]
                if "answer" in q and "model_answer" not in q and question_type.upper() == "DESCRIPTIVE":
                    q["model_answer"] = q["answer"]
                if "explanation" in q and "feedback" not in q:
                    q["feedback"] = q["explanation"]

                q["source"] = "AI"
                q["question_type"] = question_type.lower()

                # Use difficulty from AI if provided, else use global target
                if "difficulty" not in q or q["difficulty"] is None:
                    q["difficulty"] = self._map_difficulty(difficulty)

                # Ensure points is set
                if "points" not in q or q["points"] is None:
                    q["points"] = (
                        points_per_q if points_per_q is not None
                        else (5.0 if question_type.lower() == "descriptive" else 1.0)
                    )

            logger.info(f"Successfully parsed {len(questions)} questions from AI.")
            return questions

        except Exception as e:
            logger.error(f"Failed to parse AI response: {e}\nResponse was: {response_text[:500]}")
            return []

    def _build_prompt(
        self,
        text: str,
        question_type: str,
        count: int,
        difficulty: str,
        points_per_q: Optional[float] = None,
    ) -> str:
        points_str = f"Target Points per Question: {points_per_q}" if points_per_q else ""
        if question_type.upper() == "MCQ":
            return f"""
            You are an expert examiner. Generate {count} Multiple Choice Questions (MCQs) from the provided text.
            Target Difficulty: {difficulty} (If "Mixed", provide a variety of Easy, Medium, and Hard questions).
            {points_str}

            IMPORTANT: Respond ONLY with a valid JSON array. Do not include any explanation or markdown.

            Output format — a JSON array of objects:
            [
              {{
                "question_text": "text of the question",
                "options": {{"A": "option 1", "B": "option 2", "C": "option 3", "D": "option 4"}},
                "correct_answer": "Option Value (not the letter)",
                "difficulty": 0.3,
                "points": 1.0
              }}
            ]

            Difficulty values: Easy=0.3, Medium=0.6, Hard=0.9

            TEXT:
            {text}
            """
        else:
            return f"""
            You are an expert examiner. Generate {count} Descriptive (Long Answer) questions from the provided text.
            Target Difficulty: {difficulty} (If "Mixed", provide a variety of Easy, Medium, and Hard questions).
            {points_str}

            IMPORTANT: Respond ONLY with a valid JSON array. Do not include any explanation or markdown.

            Output format — a JSON array of objects:
            [
              {{
                "question_text": "text of the question",
                "model_answer": "a detailed reference/model answer covering key points",
                "difficulty": 0.6,
                "points": 5.0
              }}
            ]

            Difficulty values: Easy=0.3, Medium=0.6, Hard=0.9

            TEXT:
            {text}
            """

    def _map_difficulty(self, difficulty: str) -> float:
        mapping = {
            "Easy": 0.2,
            "Medium": 0.5,
            "Hard": 0.8,
            "Mixed": 0.5,
        }
        return mapping.get(difficulty, 0.5)


# Singleton instance
ai_generator = AIGeneratorAgent()
