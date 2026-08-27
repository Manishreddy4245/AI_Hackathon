"""CAT-Style Adaptive Difficulty System & SM-2 Spaced Repetition Engine for PlaceMind."""
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from app.db.mongodb import db_manager
from app.schemas.assessment import (
    AdaptiveEvaluationRequest,
    AdaptiveEvaluationResponse,
    TopicMasteryItem,
    SpacedRepetitionItem,
    SpacedRevisionResponse,
)

logger = logging.getLogger("placemind.adaptive_engine")

INTERVALS = [1, 3, 7, 14, 30]

# Canonical DSA Topics list
CANONICAL_DSA_TOPICS = [
    "Arrays & Hashing",
    "Strings",
    "Two Pointers & Sliding Window",
    "Stack & Queue",
    "Binary Search",
    "Linked Lists",
    "Binary Trees & BST",
    "Graphs",
    "Dynamic Programming",
    "SQL & Databases",
    "Quantitative Aptitude",
    "Logical Reasoning",
]

def calculate_attempt_score(
    passed_test_cases: int,
    total_test_cases: int,
    hints_used: int,
    time_taken_seconds: int
) -> Dict[str, float]:
    """Calculate accuracy, hint penalty (15% per hint), time penalty, and overall attempt score (0-100)."""
    tot = max(total_test_cases, 1)
    accuracy = (passed_test_cases / tot) * 100.0

    # 15% weightage deduction per hint (max 3 hints = 45%)
    hint_penalty = min(hints_used, 3) * 15.0

    # Time penalty: baseline 2 mins (120s), 0.05 pts per excess second (max 15%)
    excess_sec = max(0, time_taken_seconds - 120)
    time_penalty = min(15.0, round(excess_sec * 0.05, 1))

    attempt_score = max(0.0, round(accuracy - hint_penalty - time_penalty, 1))
    return {
        "accuracy": round(accuracy, 1),
        "hint_penalty": hint_penalty,
        "time_penalty": time_penalty,
        "attempt_score": attempt_score,
    }

async def evaluate_adaptive_submission(
    student_id: str,
    req: AdaptiveEvaluationRequest
) -> AdaptiveEvaluationResponse:
    """Evaluate submission, update difficulty state machine, SM-2 repetition queue, and topic mastery."""
    db = db_manager.db
    now = datetime.utcnow()
    now_iso = now.isoformat()

    # 1. Compute Scores
    metrics = calculate_attempt_score(
        req.passed_test_cases,
        req.total_test_cases,
        req.hints_used,
        req.time_taken_seconds
    )
    attempt_score = metrics["attempt_score"]
    accuracy = metrics["accuracy"]
    hint_penalty = metrics["hint_penalty"]

    # 2. Difficulty State Machine
    state_doc = await db.user_adaptive_states.find_one({"student_id": student_id})
    if not state_doc:
        state_doc = {
            "student_id": student_id,
            "current_difficulty": req.difficulty.upper(),
            "history": [],
            "updated_at": now_iso,
        }

    curr_diff = state_doc.get("current_difficulty", req.difficulty.upper())
    if curr_diff not in ["EASY", "MEDIUM", "HARD"]:
        curr_diff = "MEDIUM"

    history = state_doc.get("history", [])
    history.append({"score": attempt_score, "difficulty": curr_diff, "timestamp": now_iso})
    history = history[-10:]  # Keep last 10

    # Evaluate last 2 attempts in current difficulty
    recent_current_diff_scores = [h["score"] for h in history if h.get("difficulty") == curr_diff][-2:]

    transition = "MAINTAINED"
    new_diff = curr_diff

    if len(recent_current_diff_scores) >= 2:
        s1, s2 = recent_current_diff_scores[-2], recent_current_diff_scores[-1]
        if s1 >= 80.0 and s2 >= 80.0:
            if curr_diff == "EASY":
                new_diff = "MEDIUM"
                transition = "UPGRADED"
            elif curr_diff == "MEDIUM":
                new_diff = "HARD"
                transition = "UPGRADED"
        elif s1 < 40.0 and s2 < 40.0:
            if curr_diff == "HARD":
                new_diff = "MEDIUM"
                transition = "DOWNGRADED"
            elif curr_diff == "MEDIUM":
                new_diff = "EASY"
                transition = "DOWNGRADED"

    transition_messages = {
        "UPGRADED": f"🚀 Adaptive Engine: Level Up ({curr_diff.title()} → {new_diff.title()})",
        "DOWNGRADED": f"⚠️ Targeting Weak Areas ({curr_diff.title()} → {new_diff.title()})",
        "MAINTAINED": f"⚡ Maintaining Current Level ({new_diff.title()})",
    }
    trans_msg = transition_messages[transition]

    # Save state
    await db.user_adaptive_states.update_one(
        {"student_id": student_id},
        {
            "$set": {
                "student_id": student_id,
                "current_difficulty": new_diff,
                "history": history,
                "updated_at": now_iso,
            }
        },
        upsert=True
    )

    # 3. Topic Mastery Index
    topic_doc = await db.user_topic_mastery.find_one({"student_id": student_id, "topic": req.topic})
    curr_mastery = topic_doc.get("mastery_percentage", 65.0) if topic_doc else 65.0
    attempts = (topic_doc.get("total_attempts", 0) if topic_doc else 0) + 1
    clean_subs = topic_doc.get("clean_submissions", 0) if topic_doc else 0

    if attempt_score >= 90.0 and req.hints_used == 0:
        new_mastery = min(100.0, curr_mastery + 8.0)
        clean_subs += 1
    elif attempt_score < 50.0 or req.hints_used >= 2:
        new_mastery = max(10.0, curr_mastery - 12.0)
    else:
        new_mastery = min(100.0, max(10.0, curr_mastery + (attempt_score - 60.0) * 0.1))

    new_mastery = round(new_mastery, 1)
    status = "Strong" if new_mastery >= 80.0 else ("Moderate" if new_mastery >= 50.0 else "Needs Practice")

    topic_item = TopicMasteryItem(
        topic=req.topic,
        mastery_percentage=new_mastery,
        status=status,
        total_attempts=attempts,
        clean_submissions=clean_subs
    )

    await db.user_topic_mastery.update_one(
        {"student_id": student_id, "topic": req.topic},
        {"$set": topic_item.dict()},
        upsert=True
    )

    # 4. SM-2 Spaced Repetition Queue (Queue if score < 100% or hints > 0)
    spaced_queued = False
    next_rev_date = None

    if attempt_score < 100.0 or req.hints_used > 0:
        rep_doc = await db.spaced_repetition_queues.find_one({"student_id": student_id, "question_id": req.question_id})
        rep_count = (rep_doc.get("repetition_count", 0) + 1) if rep_doc and attempt_score >= 60.0 else 0
        ease_factor = rep_doc.get("ease_factor", 2.5) if rep_doc else 2.5

        # Quality 0-5
        quality = min(5, max(0, int(attempt_score / 20.0)))
        ease_factor = max(1.3, round(ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)), 2))

        interval_idx = min(rep_count, len(INTERVALS) - 1)
        interval_days = INTERVALS[interval_idx]
        due_date = now + timedelta(days=interval_days)
        next_rev_date = due_date.isoformat()
        spaced_queued = True

        rep_item = SpacedRepetitionItem(
            question_id=req.question_id,
            topic_tag=req.topic,
            repetition_count=rep_count,
            interval_days=interval_days,
            ease_factor=ease_factor,
            next_review_date=next_rev_date,
            last_score=attempt_score
        )

        rep_data = rep_item.dict()
        rep_data["student_id"] = student_id
        await db.spaced_repetition_queues.update_one(
            {"student_id": student_id, "question_id": req.question_id},
            {"$set": rep_data},
            upsert=True
        )

    # 5. Recommend Next Topic
    weak_topics = await db.user_topic_mastery.find(
        {"student_id": student_id, "mastery_percentage": {"$lt": 70.0}},
        {"_id": 0}
    ).sort("mastery_percentage", 1).to_list(length=5)

    rec_topic = weak_topics[0]["topic"] if weak_topics else "Dynamic Programming"

    return AdaptiveEvaluationResponse(
        attempt_score=attempt_score,
        accuracy=accuracy,
        hint_penalty=hint_penalty,
        current_difficulty=new_diff,
        difficulty_transition=transition,
        transition_message=trans_msg,
        topic_mastery=topic_item,
        spaced_repetition_queued=spaced_queued,
        next_review_date=next_rev_date,
        recommended_next_topic=rec_topic,
    )

async def get_spaced_revision_summary(student_id: str) -> SpacedRevisionResponse:
    """Retrieve due spaced repetition items and full topic mastery index for candidate."""
    db = db_manager.db
    now_iso = datetime.utcnow().isoformat()

    # Fetch due items (next_review_date <= now_iso or all items if none due)
    raw_due = await db.spaced_repetition_queues.find(
        {"student_id": student_id},
        {"_id": 0}
    ).sort("next_review_date", 1).to_list(length=20)

    due_items = []
    for d in raw_due:
        due_items.append(SpacedRepetitionItem(
            question_id=d.get("question_id", "q-001"),
            topic_tag=d.get("topic_tag", "DSA"),
            repetition_count=d.get("repetition_count", 0),
            interval_days=d.get("interval_days", 1),
            ease_factor=d.get("ease_factor", 2.5),
            next_review_date=d.get("next_review_date", now_iso),
            last_score=d.get("last_score", 0.0)
        ))

    # Fetch topic mastery
    raw_mastery = await db.user_topic_mastery.find(
        {"student_id": student_id},
        {"_id": 0}
    ).to_list(length=50)

    mastery_map = {m["topic"]: m for m in raw_mastery}

    mastery_list = []
    for top in CANONICAL_DSA_TOPICS:
        if top in mastery_map:
            m = mastery_map[top]
            pct = m.get("mastery_percentage", 65.0)
            status = "Strong" if pct >= 80.0 else ("Moderate" if pct >= 50.0 else "Needs Practice")
            mastery_list.append(TopicMasteryItem(
                topic=top,
                mastery_percentage=pct,
                status=status,
                total_attempts=m.get("total_attempts", 0),
                clean_submissions=m.get("clean_submissions", 0)
            ))
        else:
            # Default baseline
            mastery_list.append(TopicMasteryItem(
                topic=top,
                mastery_percentage=65.0,
                status="Moderate",
                total_attempts=0,
                clean_submissions=0
            ))

    # Fetch active difficulty
    state_doc = await db.user_adaptive_states.find_one({"student_id": student_id})
    active_diff = state_doc.get("current_difficulty", "MEDIUM") if state_doc else "MEDIUM"

    # Find recommended next topic (lowest mastery)
    sorted_mastery = sorted(mastery_list, key=lambda x: x.mastery_percentage)
    rec_topic = sorted_mastery[0].topic if sorted_mastery else "Binary Search"

    return SpacedRevisionResponse(
        due_reviews=due_items,
        topic_mastery_index=mastery_list,
        active_difficulty=active_diff,
        recommended_next_topic=rec_topic
    )
