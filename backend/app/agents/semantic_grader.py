import logging
import re
import numpy as np
from typing import Dict, Any, List
from sentence_transformers import SentenceTransformer, util

logger = logging.getLogger(__name__)

class SemanticGradingAgent:
    """
    Agent responsible for grading descriptive answers using Sentence-BERT.
    Uses 'all-MiniLM-L6-v2' for efficient and accurate semantic similarity.
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, '_initialized'):
            try:
                logger.info("Initializing Sentence-BERT model (all-MiniLM-L6-v2)...")
                # This model is lightweight and optimized for CPU speed
                self.model = SentenceTransformer('all-MiniLM-L6-v2')
                self._initialized = True
                logger.info("SemanticGradingAgent initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize BERT model: {e}")
                self._initialized = False
    
    def _get_keywords(self, text: str) -> set:
        """Helper to extract non-stopword keywords from text."""
        if not text:
            return set()
        stop_words = {'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'with', 'of'}
        words = set(re.findall(r'\w+', text.lower()))
        return words - stop_words

    def grade_answer(self, student_answer: str, model_answer: str, max_points: float = 1.0) -> Dict[str, Any]:
        """
        Grade a descriptive answer using BERT semantic similarity.
        """
        if not self._initialized:
            return {
                "score": 0.0,
                "error": "Model not initialized",
                "feedback": "Internal error: AI model failed to load.",
                "grade": "Error"
            }

        if not student_answer or not student_answer.strip():
            return {
                "score": 0.0,
                "similarity": 0.0,
                "percentage": 0,
                "feedback": "No answer provided.",
                "grade": "F"
            }
        
        if not model_answer or not model_answer.strip():
            return {
                "score": 0.0,
                "similarity": 0.0,
                "percentage": 0,
                "feedback": "No reference answer available for comparison.",
                "grade": "N/A"
            }
        
        try:
            # 1. BERT Semantic Similarity
            # Generate embeddings
            student_embedding = self.model.encode(student_answer, convert_to_tensor=True)
            model_embedding = self.model.encode(model_answer, convert_to_tensor=True)
            
            # Calculate Cosine Similarity
            cosine_score = util.cos_sim(student_embedding, model_embedding).item()
            
            # Normalize score (BERT similarity can be high even for poor answers if themes match)
            # We map 0.3-0.9 range to 0-100 percentage for better distinction
            similarity = max(0, min(1, cosine_score))
            
            # 2. Keyword check for detailed feedback
            student_keywords = self._get_keywords(student_answer)
            model_keywords = self._get_keywords(model_answer)
            matched_keywords = list(student_keywords.intersection(model_keywords))
            
            # 3. Grading logic based on Semantic Similarity
            # Note: BERT is more lenient than keyword matching, so thresholds are adjusted
            if similarity >= 0.85:
                percentage = 100
                grade = "A+"
                feedback = f"Excellent! Your answer captures the core concept perfectly. Key terms like {', '.join(matched_keywords[:2])} were well integrated."
            elif similarity >= 0.70:
                percentage = 85
                grade = "A"
                feedback = "Very good. You have a strong grasp of the concept and used appropriate terminology."
            elif similarity >= 0.55:
                percentage = 70
                grade = "B"
                feedback = "Correct and concise. You've addressed the main points well."
            elif similarity >= 0.40:
                percentage = 40
                grade = "C"
                feedback = "Fair attempt. You mentioned relevant topics, but need more clarity and detail."
            elif similarity >= 0.25:
                percentage = 20
                grade = "D"
                feedback = "Weak response. Only some parts of your answer correlate with the expected concepts."
            else:
                percentage = 0
                grade = "F"
                feedback = "Irrelevant or incorrect. Your answer does not match the semantic context of the question."
            
            # Calculate final score
            score = (percentage / 100) * max_points
            
            logger.info(f"Graded: Sim={similarity:.4f}, Score={score}/{max_points}, Grade={grade}")
            
            return {
                "score": round(score, 2),
                "similarity": round(similarity, 4),
                "percentage": percentage,
                "feedback": feedback,
                "grade": grade,
                "matched_count": len(matched_keywords),
                "model_used": "Sentence-BERT (all-MiniLM-L6-v2)"
            }
            
        except Exception as e:
            logger.error(f"BERT Grading error: {e}")
            return {
                "score": 0.0,
                "similarity": 0.0,
                "percentage": 0,
                "feedback": f"AI processing error: {str(e)}",
                "grade": "Error"
            }
    
    def batch_grade(self, answers: list) -> list:
        """Grade multiple answers efficiently."""
        if not answers:
            return []
            
        results = []
        for answer in answers:
            results.append(self.grade_answer(
                student_answer=answer.get('student_answer', ''),
                model_answer=answer.get('model_answer', ''),
                max_points=answer.get('max_points', 1.0)
            ))
        return results

# Singleton instance
grading_agent = SemanticGradingAgent()
