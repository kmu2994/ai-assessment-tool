"""
AI Question Generation Agent — Dual Provider (Google Gemini + NVIDIA NIM).
Gemini supports automatic model fallback when a model is rate-limited.
"""
import os
import re
import json
import logging
import time
from openai import OpenAI
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_MAX_INPUT_CHARS = 4000

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
    sanitized = _INJECTION_PATTERN.sub('[REMOVED]', text)
    return sanitized[:_MAX_INPUT_CHARS]


class AIGeneratorAgent:
    """Dual-provider AI question generator with Gemini model fallback."""

    def __init__(self):
        # ── Gemini setup ──────────────────────────────────────────────────────
        self.gemini_key = os.getenv("GEMINI_API_KEY", "")
        # Support a comma-separated fallback chain of models
        models_str = os.getenv("GEMINI_MODELS", "") or os.getenv("GEMINI_MODEL", "gemini-2.0-flash-lite")
        self.gemini_models = [m.strip() for m in models_str.split(",") if m.strip()]
        if not self.gemini_models:
            self.gemini_models = ["gemini-2.0-flash-lite"]
        self.gemini_client = None

        if self.gemini_key:
            try:
                from google import genai
                self.gemini_client = genai.Client(api_key=self.gemini_key)
                logger.info(f"Gemini initialized — fallback chain: {self.gemini_models}")
            except ImportError:
                logger.error("google-genai package not installed. Run: pip install google-genai")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini: {e}")
        else:
            logger.warning("GEMINI_API_KEY not set.")

        # ── NVIDIA NIM setup ──────────────────────────────────────────────────
        self.nvidia_key = os.getenv("NVIDIA_API_KEY", "")
        self.nvidia_model = os.getenv("NVIDIA_LLM_MODEL", "meta/llama-3.1-70b-instruct")
        self.nvidia_client = None

        if self.nvidia_key:
            try:
                self.nvidia_client = OpenAI(
                    base_url="https://integrate.api.nvidia.com/v1",
                    api_key=self.nvidia_key,
                )
                logger.info(f"NVIDIA NIM ({self.nvidia_model}) initialized.")
            except Exception as e:
                logger.error(f"Failed to initialize NVIDIA: {e}")
        else:
            logger.warning("NVIDIA_API_KEY not set.")

    def available_providers(self) -> List[str]:
        providers = []
        if self.gemini_client:
            providers.append("gemini")
        if self.nvidia_client:
            providers.append("nvidia")
        return providers

    async def generate_questions(
        self,
        text: str,
        question_type: str = "MCQ",
        count: int = 5,
        difficulty: str = "Medium",
        total_marks: Optional[float] = None,
        mcq_count: Optional[int] = None,
        desc_count: Optional[int] = None,
        provider: str = "gemini",
    ) -> List[Dict[str, Any]]:
        safe_text = _sanitize_input(text)
        points_per_q = (total_marks / count) if total_marks and count > 0 else None
        prompt = self._build_prompt(
            safe_text, question_type, count, difficulty, points_per_q,
            mcq_count=mcq_count, desc_count=desc_count,
        )

        if provider == "nvidia":
            return await self._generate_nvidia(prompt, question_type, difficulty, points_per_q)
        else:
            return await self._generate_gemini(prompt, question_type, difficulty, points_per_q)

    # ── Gemini: tries each model in the fallback chain ─────────────────────────
    async def _generate_gemini(self, prompt, question_type, difficulty, points_per_q):
        if not self.gemini_client:
            raise RuntimeError("Gemini is not configured. Check GEMINI_API_KEY.")

        from google.genai import types

        last_error = None
        for model_name in self.gemini_models:
            try:
                logger.info(f"Trying Gemini model: {model_name}")
                response = self.gemini_client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.4,
                        max_output_tokens=8192,
                        response_mime_type="application/json",
                        system_instruction=(
                            "You are an expert examiner and question paper setter. "
                            "Respond ONLY with a valid JSON array of question objects. "
                            "No markdown, no explanation — just the JSON array."
                        ),
                    ),
                )
                raw_text = response.text
                result = self._parse_response(raw_text, question_type, difficulty, points_per_q)
                if result:
                    logger.info(f"Successfully generated {len(result)} questions with {model_name}")
                    return result
                else:
                    logger.warning(f"{model_name} returned unparseable response, trying next model...")
                    continue

            except Exception as e:
                error_str = str(e)
                last_error = e
                if "429" in error_str or "quota" in error_str.lower() or "RESOURCE_EXHAUSTED" in error_str:
                    logger.warning(f"{model_name} rate-limited, trying next model...")
                    continue
                else:
                    logger.error(f"{model_name} error: {error_str[:300]}")
                    # Non-quota error — still try next model
                    continue

        # All models exhausted
        error_msg = f"All Gemini models exhausted ({', '.join(self.gemini_models)}). "
        if self.nvidia_client:
            error_msg += "Please switch to NVIDIA NIM provider."
        else:
            error_msg += "Please wait a few minutes and try again."
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    # ── NVIDIA generation ──────────────────────────────────────────────────────
    async def _generate_nvidia(self, prompt, question_type, difficulty, points_per_q):
        if not self.nvidia_client:
            raise RuntimeError("NVIDIA NIM is not configured. Check NVIDIA_API_KEY.")
        try:
            response = self.nvidia_client.chat.completions.create(
                model=self.nvidia_model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert examiner. Respond ONLY with valid JSON. "
                            "No markdown, no explanation — just the JSON array."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.4,
                max_tokens=4096,
            )
            raw_text = response.choices[0].message.content
            result = self._parse_response(raw_text, question_type, difficulty, points_per_q)
            if not result:
                raise RuntimeError("NVIDIA returned empty or unparseable response")
            return result
        except Exception as e:
            logger.error(f"NVIDIA error: {e}")
            raise RuntimeError(f"NVIDIA generation failed: {str(e)[:200]}")

    # ── Response parser ────────────────────────────────────────────────────────
    def _parse_response(self, response_text, question_type, difficulty, points_per_q=None):
        try:
            clean_text = response_text.strip()
            if "```json" in clean_text:
                clean_text = clean_text.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_text:
                clean_text = clean_text.split("```")[1].split("```")[0].strip()

            questions = json.loads(clean_text)

            if isinstance(questions, dict) and "questions" in questions:
                questions = questions["questions"]
            if not isinstance(questions, list):
                logger.error(f"AI response is not a list: {type(questions)}")
                return []

            for q in questions:
                if "question" in q and "question_text" not in q:
                    q["question_text"] = q["question"]
                if "answer" in q and "correct_answer" not in q and question_type.upper() == "MCQ":
                    q["correct_answer"] = q["answer"]
                if "answer" in q and "model_answer" not in q and question_type.upper() == "DESCRIPTIVE":
                    q["model_answer"] = q["answer"]
                if "explanation" in q and "feedback" not in q:
                    q["feedback"] = q["explanation"]

                # Map letter answers (e.g. "C") to the actual option value (e.g. "CPU")
                opts = q.get("options")
                ans = q.get("correct_answer", "")
                if opts and isinstance(opts, dict) and ans in opts:
                    q["correct_answer"] = opts[ans]

                q["source"] = "AI"
                if question_type.upper() != "BOTH":
                    q["question_type"] = question_type.lower()
                elif "question_type" not in q:
                    q["question_type"] = "mcq"

                if "difficulty" not in q or q["difficulty"] is None:
                    q["difficulty"] = self._map_difficulty(difficulty)
                if "points" not in q or q["points"] is None:
                    q["points"] = (
                        points_per_q if points_per_q is not None
                        else (5.0 if question_type.lower() == "descriptive" else 1.0)
                    )

            logger.info(f"Parsed {len(questions)} questions from AI.")
            return questions
        except Exception as e:
            logger.error(f"Parse error: {e}\nResponse: {response_text[:500]}")
            return []

    # ── Prompt builder ─────────────────────────────────────────────────────────
    def _build_prompt(self, text, question_type, count, difficulty,
                      points_per_q=None, mcq_count=None, desc_count=None):
        points_str = f"Target Points per Question: {points_per_q}" if points_per_q else ""
        if question_type.upper() == "BOTH":
            mc = mcq_count if mcq_count is not None else count // 2
            dc = desc_count if desc_count is not None else count - mc
            return f"""Generate a MIXED set of {mc + dc} questions from the text below:
- {mc} MCQ questions
- {dc} Descriptive questions
Difficulty: {difficulty}
{points_str}

Respond ONLY with a JSON array. MCQ format:
{{"question_text":"...","question_type":"mcq","options":{{"A":"...","B":"...","C":"...","D":"..."}},"correct_answer":"the option value","difficulty":0.5,"points":1.0}}

Descriptive format:
{{"question_text":"...","question_type":"descriptive","model_answer":"detailed answer","difficulty":0.6,"points":5.0}}

Difficulty: Easy=0.3, Medium=0.6, Hard=0.9

TEXT:
{text}"""
        elif question_type.upper() == "MCQ":
            return f"""Generate {count} MCQs from the text below.
Difficulty: {difficulty}
{points_str}

Respond ONLY with a JSON array:
[{{"question_text":"...","options":{{"A":"...","B":"...","C":"...","D":"..."}},"correct_answer":"the option value","difficulty":0.3,"points":1.0}}]

Difficulty: Easy=0.3, Medium=0.6, Hard=0.9

TEXT:
{text}"""
        else:
            return f"""Generate {count} Descriptive questions from the text below.
Difficulty: {difficulty}
{points_str}

Respond ONLY with a JSON array:
[{{"question_text":"...","model_answer":"detailed reference answer","difficulty":0.6,"points":5.0}}]

Difficulty: Easy=0.3, Medium=0.6, Hard=0.9

TEXT:
{text}"""

    def _map_difficulty(self, difficulty: str) -> float:
        return {"Easy": 0.2, "Medium": 0.5, "Hard": 0.8, "Mixed": 0.5}.get(difficulty, 0.5)


ai_generator = AIGeneratorAgent()
