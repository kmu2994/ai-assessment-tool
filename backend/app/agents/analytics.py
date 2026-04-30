"""
Analytics Agent — Real data calculations.
"""
from typing import Dict, Any, List
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


class AnalyticsAgent:

    def calculate_student_performance(self, submissions: List[Dict]) -> Dict[str, Any]:
        """
        Calculate overall performance stats for a student.
        submissions: list of dicts sorted by submitted_at DESC (newest first).
        """
        if not submissions:
            return {
                "total_exams": 0,
                "average_score": 0,
                "best_score": 0,
                "worst_score": 0,
                "trend": "neutral",
                "scores_history": [],
            }

        # percentages[0] = newest, percentages[-1] = oldest (DESC sort)
        percentages = [s.get('percentage', 0) for s in submissions]
        avg_score = sum(percentages) / len(percentages)

        # ── Trend Calculation ────────────────────────────────────────────────
        # FIX: Submissions are sorted DESC (newest first).
        # To get chronological order for trend, reverse the list.
        chronological = list(reversed(percentages))  # [oldest … newest]

        if len(chronological) >= 4:
            mid = len(chronological) // 2
            older_avg = sum(chronological[:mid]) / mid
            newer_avg = sum(chronological[mid:]) / (len(chronological) - mid)
            if newer_avg > older_avg + 5:
                trend = "improving"
            elif newer_avg < older_avg - 5:
                trend = "declining"
            else:
                trend = "stable"
        elif len(chronological) == 1:
            trend = "neutral"
        else:
            # 2-3 submissions: compare newest vs oldest chronologically
            trend = "improving" if chronological[-1] > chronological[0] else (
                "declining" if chronological[-1] < chronological[0] else "stable"
            )

        return {
            "total_exams": len(submissions),
            "average_score": round(avg_score, 2),
            "best_score": round(max(percentages), 2),
            "worst_score": round(min(percentages), 2),
            "trend": trend,
            "scores_history": [round(p, 1) for p in percentages],
        }

    def analyze_exam_performance(self, exam_data: Dict, submissions: List[Dict]) -> Dict[str, Any]:
        """Real exam performance analytics from actual submission data."""
        total = len(submissions)
        if total == 0:
            return {
                "total_submissions": 0,
                "average_score": 0.0,
                "pass_rate": 0.0,
                "highest_score": 0.0,
                "lowest_score": 0.0,
                "difficulty_analysis": "no data",
            }

        passing_score = exam_data.get("passing_score", 40.0)
        percentages = [s.get("percentage", 0) for s in submissions]
        avg_score = sum(percentages) / total
        passed = sum(1 for p in percentages if p >= passing_score)
        pass_rate = (passed / total) * 100

        if avg_score >= 75:
            difficulty = "easy"
        elif avg_score >= 50:
            difficulty = "appropriate"
        else:
            difficulty = "challenging"

        # Score distribution buckets
        distribution = {"0-25": 0, "25-50": 0, "50-75": 0, "75-100": 0}
        for p in percentages:
            if p < 25:
                distribution["0-25"] += 1
            elif p < 50:
                distribution["25-50"] += 1
            elif p < 75:
                distribution["50-75"] += 1
            else:
                distribution["75-100"] += 1

        return {
            "total_submissions": total,
            "average_score": round(avg_score, 2),
            "pass_rate": round(pass_rate, 2),
            "highest_score": round(max(percentages), 2),
            "lowest_score": round(min(percentages), 2),
            "difficulty_analysis": difficulty,
            "score_distribution": distribution,
        }

    def analyze_question_difficulty(self, answers: List[Dict]) -> List[Dict]:
        """
        Analyse which questions were hardest based on correct-answer rates.

        answers: List of dicts with keys:
            - question_id (str)
            - question_text (str)
            - is_correct (bool)
            - difficulty (float)
        """
        if not answers:
            return []

        # Group by question
        question_stats: Dict[str, Dict] = defaultdict(lambda: {
            "question_text": "",
            "difficulty": 0.5,
            "total_attempts": 0,
            "correct_attempts": 0,
        })

        for a in answers:
            qid = str(a.get("question_id", ""))
            question_stats[qid]["question_text"] = a.get("question_text", "")
            question_stats[qid]["difficulty"] = a.get("difficulty", 0.5)
            question_stats[qid]["total_attempts"] += 1
            if a.get("is_correct"):
                question_stats[qid]["correct_attempts"] += 1

        result = []
        for qid, stats in question_stats.items():
            total = stats["total_attempts"]
            correct = stats["correct_attempts"]
            accuracy = (correct / total * 100) if total > 0 else 0
            result.append({
                "question_id": qid,
                "question_text": stats["question_text"][:100],
                "stated_difficulty": stats["difficulty"],
                "actual_accuracy": round(accuracy, 1),
                "total_attempts": total,
                # If accuracy < 30% and stated difficulty is easy, flag as miscategorised
                "difficulty_flag": (
                    "too_hard" if accuracy < 30 and stats["difficulty"] < 0.4 else
                    "too_easy" if accuracy > 85 and stats["difficulty"] > 0.6 else
                    "ok"
                ),
            })

        # Sort by accuracy ascending (hardest questions first)
        result.sort(key=lambda x: x["actual_accuracy"])
        return result

    def identify_weak_topics(self, student_answers: List[Dict]) -> List[Dict]:
        """
        Identify topic areas where the student struggles.

        student_answers: List of dicts with keys:
            - question_text (str)
            - is_correct (bool)
            - score (float)
            - max_points (float)
        """
        if not student_answers:
            return []

        # Simple keyword-based topic grouping
        # In a real system, questions would carry an explicit 'topic' field.
        topic_kw_map = {
            "Mathematics": ["math", "calculus", "algebra", "equation", "theorem", "formula", "integral", "derivative"],
            "Science": ["science", "physics", "chemistry", "biology", "atom", "molecule", "reaction", "force", "energy"],
            "History": ["history", "war", "century", "dynasty", "empire", "revolution", "treaty", "ancient"],
            "English": ["grammar", "noun", "verb", "adjective", "sentence", "paragraph", "poetry", "literature"],
            "General": [],  # fallback
        }

        topic_stats: Dict[str, Dict] = defaultdict(lambda: {
            "total": 0, "correct": 0, "total_score": 0.0, "max_score": 0.0
        })

        for ans in student_answers:
            text = (ans.get("question_text") or "").lower()
            matched_topic = "General"
            for topic, keywords in topic_kw_map.items():
                if topic == "General":
                    continue
                if any(kw in text for kw in keywords):
                    matched_topic = topic
                    break

            topic_stats[matched_topic]["total"] += 1
            topic_stats[matched_topic]["max_score"] += ans.get("max_points", 1.0)
            topic_stats[matched_topic]["total_score"] += ans.get("score", 0.0)
            if ans.get("is_correct"):
                topic_stats[matched_topic]["correct"] += 1

        result = []
        for topic, stats in topic_stats.items():
            total = stats["total"]
            if total == 0:
                continue
            accuracy = (stats["correct"] / total) * 100
            score_pct = (stats["total_score"] / stats["max_score"] * 100) if stats["max_score"] > 0 else 0
            result.append({
                "topic": topic,
                "questions_attempted": total,
                "accuracy": round(accuracy, 1),
                "score_percentage": round(score_pct, 1),
                "status": "weak" if accuracy < 50 else ("average" if accuracy < 75 else "strong"),
            })

        # Sort by accuracy ascending (weakest first)
        result.sort(key=lambda x: x["accuracy"])
        return result


# Singleton instance
analytics_agent = AnalyticsAgent()
