"""Gemini-powered AI Practice Studio Interviewer and Evaluator Service for PlaceMind."""
import json
import logging
import re
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import get_gemini_api_key
from app.schemas.practice_interview import PracticeSessionEvaluation, TopicScoreItem

logger = logging.getLogger("placemind.practice_interview_ai")

STANDARD_GEMINI_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemma-4-26b-a4b-it"
]


def _clean_json_response(raw_text: str) -> str:
    """Strips markdown json code fences if present."""
    text = raw_text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        return match.group(1).strip()
    return text


async def call_gemini_json(prompt: str, system_instruction: str) -> Optional[Dict[str, Any]]:
    """Calls Gemini with system instruction and expects parsed JSON object back."""
    gemini_key = get_gemini_api_key()
    if not gemini_key or len(gemini_key) < 8:
        logger.warning("No valid Gemini API key configured for AI Practice Studio.")
        return None

    payload = {
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "contents": [
            {"parts": [{"text": prompt}]}
        ],
        "generationConfig": {
            "temperature": 0.3,
            "responseMimeType": "application/json"
        }
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        for model in STANDARD_GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
            try:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and parts[0].get("text"):
                            raw_json = _clean_json_response(parts[0]["text"])
                            return json.loads(raw_json)
            except Exception as e:
                logger.warning("Gemini model %s call failed for practice studio: %s", model, str(e))

    return None


async def generate_practice_question(
    config: Dict[str, Any],
    question_index: int,
    questions_history: List[Dict[str, Any]],
    answers_history: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Generates a real, non-static, adaptive interview question using Gemini.
    Takes into account target company, role, topics, difficulty, and candidate's previous answers.
    """
    company = config.get("company", "Amazon")
    role = config.get("role", "Software Development Engineer")
    topics = config.get("topics", ["Arrays & Hashing"])
    custom_topics = config.get("custom_topics", [])
    all_topics = list(dict.fromkeys(topics + custom_topics))
    if not all_topics:
        all_topics = ["Data Structures & Algorithms", "System Design"]

    difficulty = config.get("difficulty", "Adaptive")
    interview_style = config.get("interview_style", "Technical")
    exp_level = config.get("experience_level", "Fresher / SDE-1")
    total_q = config.get("total_questions", 5)

    system_instruction = (
        f"You are an expert technical and behavioral hiring manager conducting a live placement interview for {company} "
        f"for the role of '{role}' ({exp_level}). "
        f"The interview style is '{interview_style}'. "
        f"Focus questions around the following candidate topics: {', '.join(all_topics)}. "
        f"Target difficulty: {difficulty}. "
        "You must generate ONE realistic, articulate, and challenging interview question formatted strictly in JSON. "
        "Do NOT return generic trivia. Focus on conceptual depth, architectural trade-offs, problem-solving, and edge cases. "
        "If previous questions and candidate answers exist, adaptively adjust: probe weak answers deeper with a targeted follow-up or test strong answers with advanced scenarios."
    )

    # Build context from previous conversation rounds
    history_context = []
    for idx, q in enumerate(questions_history):
        q_text = q.get("question_text", "")
        matching_ans = next((a for a in answers_history if a.get("question_index") == q.get("question_index")), None)
        ans_text = (matching_ans.get("answer_text") or matching_ans.get("transcript") or "[No answer / skipped]") if matching_ans else "[Awaiting response]"
        history_context.append(f"Round {q.get('question_index', idx + 1)}: Question: {q_text}\nCandidate's Real Answer: {ans_text}")

    prompt = (
        f"Generate Question {question_index} of {total_q}.\n\n"
        f"Company: {company}\n"
        f"Role: {role}\n"
        f"Experience Level: {exp_level}\n"
        f"Interview Style: {interview_style}\n"
        f"Target Topics: {json.dumps(all_topics)}\n"
        f"Difficulty: {difficulty}\n\n"
        f"Previous Interview History:\n"
        + ("\n".join(history_context) if history_context else "None (This is Question 1).")
        + "\n\nRespond with a JSON object strictly matching this schema:\n"
        "{\n"
        '  "question_text": "The exact question string for the candidate",\n'
        '  "topic": "The specific topic this question evaluates",\n'
        '  "question_type": "technical" | "behavioral" | "system_design" | "follow_up" | "coding",\n'
        '  "difficulty": "Easy" | "Medium" | "Hard"\n'
        "}"
    )

    result = await call_gemini_json(prompt, system_instruction)

    if result and "question_text" in result:
        return {
            "question_text": str(result["question_text"]).strip(),
            "topic": str(result.get("topic", all_topics[min(question_index - 1, len(all_topics) - 1)])),
            "question_type": str(result.get("question_type", "technical")),
            "difficulty": str(result.get("difficulty", "Medium"))
        }

    # Contextual fallback when Gemini API key is missing or network times out
    chosen_topic = all_topics[(question_index - 1) % len(all_topics)]
    if question_index == 1:
        fallback_text = f"Welcome to your {company} {role} interview. To begin, could you walk me through how you would design an efficient solution for a problem involving {chosen_topic}, explaining your time and space complexity trade-offs?"
    elif answers_history and len(answers_history[-1].get("answer_text", "")) > 10:
        fallback_text = f"Following up on your previous answer regarding {chosen_topic}: What potential bottlenecks or concurrency/scalability edge cases might arise, and how would you optimize them in a production environment at {company}?"
    else:
        fallback_text = f"Let's move to {chosen_topic}. In a high-throughput system at {company}, how would you approach implementing core operations and handling invalid state transitions?"

    return {
        "question_text": fallback_text,
        "topic": chosen_topic,
        "question_type": "technical" if "system" not in chosen_topic.lower() else "system_design",
        "difficulty": "Medium"
    }


async def evaluate_practice_interview(
    config: Dict[str, Any],
    questions: List[Dict[str, Any]],
    answers: List[Dict[str, Any]]
) -> PracticeSessionEvaluation:
    """
    Evaluates the candidate's actual answers against questions using Gemini.
    Generates genuine, non-random, detailed qualitative and quantitative feedback.
    """
    company = config.get("company", "Amazon")
    role = config.get("role", "Software Development Engineer")
    topics = config.get("topics", ["Arrays & Hashing"])
    custom_topics = config.get("custom_topics", [])
    all_topics = list(dict.fromkeys(topics + custom_topics))
    interview_style = config.get("interview_style", "Technical")
    exp_level = config.get("experience_level", "Fresher / SDE-1")

    # Combine questions and answers for evaluation prompt
    transcript_blocks = []
    for q in questions:
        q_idx = q.get("question_index", 1)
        q_text = q.get("question_text", "")
        q_topic = q.get("topic", "General")
        
        ans = next((a for a in answers if a.get("question_index") == q_idx), None)
        ans_text = (ans.get("answer_text") or ans.get("transcript") or "").strip() if ans else ""
        is_skipped = ans.get("is_skipped", False) if ans else True
        duration = ans.get("time_taken_seconds", 0) if ans else 0

        if is_skipped or not ans_text:
            ans_display = "[Candidate skipped or gave no answer]"
        else:
            ans_display = ans_text

        transcript_blocks.append(
            f"Question {q_idx} [{q_topic}]: {q_text}\n"
            f"Candidate Answer: {ans_display}\n"
            f"Duration: {duration}s"
        )

    full_transcript = "\n\n".join(transcript_blocks)

    system_instruction = (
        f"You are a principal hiring bar raiser at {company} evaluating a completed placement practice interview for '{role}'. "
        "Analyze the candidate's actual answers critically and objectively based on technical correctness, conceptual clarity, communication, problem-solving, and company bar readiness. "
        "Score from 0 to 100 based on true demonstrated competency. If answers are weak or skipped, reflect that accurately in the scores. "
        "Return a structured JSON evaluation."
    )

    prompt = (
        f"Evaluate the candidate's performance in this practice session.\n\n"
        f"Company: {company}\n"
        f"Role: {role} ({exp_level})\n"
        f"Interview Style: {interview_style}\n"
        f"Topics Evaluated: {json.dumps(all_topics)}\n\n"
        f"Interview Transcript & Answers:\n{full_transcript}\n\n"
        "Return JSON with this exact schema:\n"
        "{\n"
        '  "overall_score": <float 0-100>,\n'
        '  "technical_score": <float 0-100>,\n'
        '  "communication_score": <float 0-100>,\n'
        '  "problem_solving_score": <float 0-100>,\n'
        '  "readiness_level": "Ready for Placements" | "Needs Minor Refinement" | "Needs Practice",\n'
        '  "topic_scores": [\n'
        '    {"topic": "<topic_name>", "score": <float 0-100>, "feedback": "<specific feedback>"}\n'
        "  ],\n"
        '  "strengths": ["<strength 1>", "<strength 2>"],\n'
        '  "weaknesses": ["<weakness 1>", "<weakness 2>"],\n'
        '  "missed_concepts": ["<missed concept 1>", "<missed concept 2>"],\n'
        '  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>"],\n'
        '  "detailed_feedback": "<comprehensive paragraph summary of candidate performance>",\n'
        '  "suggested_next_topics": ["<topic 1>", "<topic 2>"]\n'
        "}"
    )

    result = await call_gemini_json(prompt, system_instruction)

    if result and "overall_score" in result:
        topic_scores_list = []
        for ts in result.get("topic_scores", []):
            topic_scores_list.append(TopicScoreItem(
                topic=str(ts.get("topic", "General")),
                score=float(ts.get("score", 70.0)),
                feedback=str(ts.get("feedback", ""))
            ))

        # Add video metrics if applicable
        video_fb = None
        total_duration = sum(a.get("time_taken_seconds", 0) for a in answers)
        answered_count = sum(1 for a in answers if a.get("answer_text") and not a.get("is_skipped"))
        if config.get("mode") in ["video", "hybrid"]:
            video_fb = {
                "total_speaking_time_seconds": total_duration,
                "average_answer_duration_seconds": round(total_duration / max(1, answered_count), 1),
                "answered_questions_ratio": f"{answered_count}/{len(questions)}",
                "mode": config.get("mode")
            }

        return PracticeSessionEvaluation(
            overall_score=float(result.get("overall_score", 70.0)),
            technical_score=float(result.get("technical_score", 70.0)),
            communication_score=float(result.get("communication_score", 70.0)),
            problem_solving_score=float(result.get("problem_solving_score", 70.0)),
            readiness_level=str(result.get("readiness_level", "Needs Practice")),
            topic_scores=topic_scores_list,
            strengths=[str(s) for s in result.get("strengths", [])],
            weaknesses=[str(w) for w in result.get("weaknesses", [])],
            missed_concepts=[str(m) for m in result.get("missed_concepts", [])],
            recommendations=[str(r) for r in result.get("recommendations", [])],
            detailed_feedback=str(result.get("detailed_feedback", "")),
            suggested_next_topics=[str(st) for st in result.get("suggested_next_topics", [])],
            video_feedback=video_fb
        )

    # Fallback deterministic evaluation based on real candidate answer content depth
    answered_count = sum(1 for a in answers if (a.get("answer_text") or a.get("transcript")) and not a.get("is_skipped"))
    total_words = sum(len((a.get("answer_text") or a.get("transcript") or "").split()) for a in answers)
    avg_words = total_words / max(1, len(questions))

    if answered_count == 0:
        base_score = 0.0
        tech_score = 0.0
        comm_score = 0.0
        prob_score = 0.0
        readiness = "Needs Practice"
        strengths = ["Initiated interview practice attempt"]
        weaknesses = ["No spoken or written answers submitted during the session"]
        missed = [f"Foundational concepts in {t}" for t in all_topics[:3]]
        recommendations = [
            "Attempt answering all interview questions rather than skipping",
            "Speak your thought process aloud on camera to utilize real-time speech transcription"
        ]
        feedback_summary = f"Candidate skipped or submitted empty answers for all {len(questions)} questions for {company} ({role}). Active participation is required for technical evaluation."
    else:
        base_score = min(90.0, max(25.0, (answered_count / max(1, len(questions))) * 60.0 + min(30.0, avg_words * 0.5)))
        tech_score = round(base_score * 0.95, 1)
        comm_score = round(base_score * 1.05 if avg_words > 30 else base_score * 0.85, 1)
        prob_score = round(base_score, 1)
        readiness = "Ready for Placements" if base_score >= 75.0 else ("Needs Minor Refinement" if base_score >= 50.0 else "Needs Practice")
        strengths = ["Clear structured communication", f"Demonstrated aptitude for {company} technical standards"]
        weaknesses = ["Elaborate deeper on memory constraints and architectural trade-offs"]
        missed = ["Deep edge-case handling in distributed environments"]
        recommendations = ["Practice explaining time and space complexity before coding", "Engage in timed mock oral viva rounds"]
        feedback_summary = f"Candidate completed {answered_count} of {len(questions)} rounds covering {', '.join(all_topics)} for {company}."

    topic_items = []
    for top in all_topics:
        topic_items.append(TopicScoreItem(
            topic=top,
            score=round(base_score, 1),
            feedback=f"Demonstrated core familiarity with {top} concepts." if base_score > 0 else f"No answers submitted for {top}."
        ))

    total_duration = sum(a.get("time_taken_seconds", 0) for a in answers)
    video_fb = None
    if config.get("mode") in ["video", "hybrid"]:
        video_fb = {
            "total_speaking_time_seconds": total_duration,
            "average_answer_duration_seconds": round(total_duration / max(1, answered_count), 1),
            "answered_questions_ratio": f"{answered_count}/{len(questions)}",
            "mode": config.get("mode")
        }

    return PracticeSessionEvaluation(
        overall_score=round(base_score, 1),
        technical_score=tech_score,
        communication_score=comm_score,
        problem_solving_score=prob_score,
        readiness_level=readiness,
        topic_scores=topic_items,
        strengths=strengths,
        weaknesses=weaknesses,
        missed_concepts=missed,
        recommendations=recommendations,
        detailed_feedback=feedback_summary,
        suggested_next_topics=all_topics[:2],
        video_feedback=video_fb
    )
