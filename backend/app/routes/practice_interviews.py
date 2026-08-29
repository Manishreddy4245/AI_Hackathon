from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from fastapi import APIRouter, HTTPException, status, Depends
from app.db.mongodb import db_manager
from app.core.deps import get_current_user, get_optional_current_user
from app.schemas.practice_interview import (
    PracticeSessionCreateRequest,
    PracticeQuestionResponse,
    PracticeAnswerSubmitRequest,
    PracticeSessionEvaluation,
    PracticeSessionDetailResponse,
    PracticeSessionSummary,
    PracticeQuestionItem,
    PracticeAnswerItem
)
from app.services.practice_interview_ai_engine import (
    generate_practice_question,
    evaluate_practice_interview
)
from app.services.audit_service import record_audit_event

router = APIRouter(prefix="/api/interviews/practice", tags=["AI Interview Practice Studio"])


@router.post("/start", response_model=PracticeSessionDetailResponse)
async def start_practice_session(
    req: PracticeSessionCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Creates a new AI Interview Practice session in MongoDB and dynamically generates Question 1 using Gemini.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    student_id = current_user.get("id")
    student_email = (current_user.get("email") or "").lower()
    student_name = current_user.get("name") or "Candidate"

    company = (req.company or "").strip()
    if not company:
        raise HTTPException(status_code=400, detail="Target company is required.")

    role = (req.role or "").strip()
    if not role:
        raise HTTPException(status_code=400, detail="Target role is required.")

    all_topics = [t.strip() for t in (req.topics + req.custom_topics) if t and t.strip()]
    if not all_topics:
        raise HTTPException(status_code=400, detail="At least one technical topic is required.")

    session_id = f"practice-{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now().isoformat()

    config_dict = req.model_dump()
    config_dict["company"] = company
    config_dict["role"] = role

    # Generate real first question using Gemini
    q1_data = await generate_practice_question(
        config=config_dict,
        question_index=1,
        questions_history=[],
        answers_history=[]
    )

    q1_item = {
        "question_index": 1,
        "question_text": q1_data["question_text"],
        "topic": q1_data["topic"],
        "question_type": q1_data.get("question_type", "technical"),
        "difficulty": q1_data.get("difficulty", "Medium")
    }

    session_doc = {
        "id": session_id,
        "session_id": session_id,
        "student_id": student_id,
        "student_email": student_email,
        "student_name": student_name,
        "config": config_dict,
        "status": "IN_PROGRESS",
        "started_at": now_iso,
        "completed_at": None,
        "current_question_index": 1,
        "total_questions": req.total_questions,
        "questions": [q1_item],
        "answers": [],
        "evaluation": None,
        "created_at": now_iso,
        "updated_at": now_iso
    }

    await db.practice_interviews.insert_one(session_doc)

    await record_audit_event(
        db=db,
        user=current_user,
        action="PRACTICE_SESSION_STARTED",
        entity="PracticeInterview",
        entity_id=session_id,
        detail=f"AI Practice Interview session started for {company} ({role}) by {student_name}."
    )

    return PracticeSessionDetailResponse(
        session_id=session_id,
        student_id=student_id,
        student_name=student_name,
        config=config_dict,
        status="IN_PROGRESS",
        started_at=now_iso,
        current_question_index=1,
        total_questions=req.total_questions,
        questions=[PracticeQuestionItem(**q1_item)],
        answers=[],
        current_question=PracticeQuestionItem(**q1_item),
        evaluation=None
    )


@router.post("/answer", response_model=PracticeSessionDetailResponse)
async def submit_practice_answer(
    req: PracticeAnswerSubmitRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Submits candidate's real answer/transcript for current question.
    If more questions remain, invokes Gemini to generate the next adaptive question.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    student_id = current_user.get("id")
    student_email = (current_user.get("email") or "").lower()

    session_doc = await db.practice_interviews.find_one({"session_id": req.session_id}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=404, detail="Practice session not found")

    # Authorize student
    if session_doc.get("student_id") != student_id and session_doc.get("student_email") != student_email:
        raise HTTPException(status_code=403, detail="You are not authorized to access this practice session")

    now_iso = datetime.now().isoformat()
    q_index = req.question_index

    # Record answer
    answer_item = {
        "question_index": q_index,
        "answer_text": req.answer_text,
        "transcript": req.transcript,
        "is_skipped": req.is_skipped,
        "time_taken_seconds": req.time_taken_seconds or 0,
        "audio_video_metadata": req.audio_video_metadata or {},
        "submitted_at": now_iso
    }

    # Filter out any previous answer for this question_index and append
    updated_answers = [a for a in session_doc.get("answers", []) if a.get("question_index") != q_index]
    updated_answers.append(answer_item)

    questions = session_doc.get("questions", [])
    total_q = session_doc.get("total_questions", 5)
    config = session_doc.get("config", {})

    next_q_index = q_index + 1
    next_question = None

    if next_q_index <= total_q:
        # Check if question already exists in array (e.g. from resume)
        existing_q = next((q for q in questions if q.get("question_index") == next_q_index), None)
        if not existing_q:
            # Generate next question dynamically using Gemini with conversation context
            next_q_data = await generate_practice_question(
                config=config,
                question_index=next_q_index,
                questions_history=questions,
                answers_history=updated_answers
            )
            existing_q = {
                "question_index": next_q_index,
                "question_text": next_q_data["question_text"],
                "topic": next_q_data["topic"],
                "question_type": next_q_data.get("question_type", "technical"),
                "difficulty": next_q_data.get("difficulty", "Medium")
            }
            questions.append(existing_q)

        next_question = existing_q
        update_fields = {
            "answers": updated_answers,
            "questions": questions,
            "current_question_index": next_q_index,
            "updated_at": now_iso
        }
        await db.practice_interviews.update_one(
            {"session_id": req.session_id},
            {"$set": update_fields}
        )

        return PracticeSessionDetailResponse(
            session_id=req.session_id,
            student_id=session_doc["student_id"],
            student_name=session_doc.get("student_name"),
            config=config,
            status="IN_PROGRESS",
            started_at=session_doc["started_at"],
            current_question_index=next_q_index,
            total_questions=total_q,
            questions=[PracticeQuestionItem(**q) for q in questions],
            answers=[PracticeAnswerItem(**a) for a in updated_answers],
            current_question=PracticeQuestionItem(**next_question),
            evaluation=None
        )

    # If all questions answered, auto-evaluate session
    eval_result = await evaluate_practice_interview(
        config=config,
        questions=questions,
        answers=updated_answers
    )

    update_fields = {
        "answers": updated_answers,
        "questions": questions,
        "status": "COMPLETED",
        "completed_at": now_iso,
        "evaluation": eval_result.model_dump(),
        "updated_at": now_iso
    }
    await db.practice_interviews.update_one(
        {"session_id": req.session_id},
        {"$set": update_fields}
    )

    await record_audit_event(
        db=db,
        user=current_user,
        action="PRACTICE_SESSION_COMPLETED",
        entity="PracticeInterview",
        entity_id=req.session_id,
        detail=f"AI Practice Interview completed for {config.get('company')} ({config.get('role')}) with overall score {eval_result.overall_score}%."
    )

    return PracticeSessionDetailResponse(
        session_id=req.session_id,
        student_id=session_doc["student_id"],
        student_name=session_doc.get("student_name"),
        config=config,
        status="COMPLETED",
        started_at=session_doc["started_at"],
        completed_at=now_iso,
        current_question_index=total_q,
        total_questions=total_q,
        questions=[PracticeQuestionItem(**q) for q in questions],
        answers=[PracticeAnswerItem(**a) for a in updated_answers],
        current_question=None,
        evaluation=eval_result
    )


@router.post("/finish", response_model=PracticeSessionDetailResponse)
async def finish_practice_session(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Manually finishes practice interview, triggers Gemini evaluation on actual responses,
    and transitions session status to COMPLETED.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    student_id = current_user.get("id")
    student_email = (current_user.get("email") or "").lower()

    session_doc = await db.practice_interviews.find_one({"session_id": session_id}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=404, detail="Practice session not found")

    if session_doc.get("student_id") != student_id and session_doc.get("student_email") != student_email:
        raise HTTPException(status_code=403, detail="You are not authorized to access this practice session")

    now_iso = datetime.now().isoformat()
    config = session_doc.get("config", {})
    questions = session_doc.get("questions", [])
    answers = session_doc.get("answers", [])

    eval_result = await evaluate_practice_interview(
        config=config,
        questions=questions,
        answers=answers
    )

    await db.practice_interviews.update_one(
        {"session_id": session_id},
        {"$set": {
            "status": "COMPLETED",
            "completed_at": now_iso,
            "evaluation": eval_result.model_dump(),
            "updated_at": now_iso
        }}
    )

    await record_audit_event(
        db=db,
        user=current_user,
        action="PRACTICE_SESSION_COMPLETED",
        entity="PracticeInterview",
        entity_id=session_id,
        detail=f"AI Practice Interview completed for {config.get('company')} ({config.get('role')}) with overall score {eval_result.overall_score}%."
    )

    return PracticeSessionDetailResponse(
        session_id=session_id,
        student_id=session_doc["student_id"],
        student_name=session_doc.get("student_name"),
        config=config,
        status="COMPLETED",
        started_at=session_doc["started_at"],
        completed_at=now_iso,
        current_question_index=len(questions),
        total_questions=session_doc.get("total_questions", len(questions)),
        questions=[PracticeQuestionItem(**q) for q in questions],
        answers=[PracticeAnswerItem(**a) for a in answers],
        current_question=None,
        evaluation=eval_result
    )


@router.get("/session/{session_id}", response_model=PracticeSessionDetailResponse)
async def get_practice_session(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retrieves full details of a practice session including questions, answers, and evaluation.
    Enforces student ownership.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    student_id = current_user.get("id")
    student_email = (current_user.get("email") or "").lower()

    session_doc = await db.practice_interviews.find_one({"session_id": session_id}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=404, detail="Practice session not found")

    if session_doc.get("student_id") != student_id and session_doc.get("student_email") != student_email:
        raise HTTPException(status_code=403, detail="You are not authorized to access this practice session")

    curr_idx = session_doc.get("current_question_index", 1)
    questions = session_doc.get("questions", [])
    current_q = next((q for q in questions if q.get("question_index") == curr_idx), None)

    eval_data = session_doc.get("evaluation")
    evaluation_obj = PracticeSessionEvaluation(**eval_data) if eval_data else None

    return PracticeSessionDetailResponse(
        session_id=session_id,
        student_id=session_doc["student_id"],
        student_name=session_doc.get("student_name"),
        config=session_doc.get("config", {}),
        status=session_doc.get("status", "IN_PROGRESS"),
        started_at=session_doc.get("started_at", ""),
        completed_at=session_doc.get("completed_at"),
        current_question_index=curr_idx,
        total_questions=session_doc.get("total_questions", 5),
        questions=[PracticeQuestionItem(**q) for q in questions],
        answers=[PracticeAnswerItem(**a) for a in session_doc.get("answers", [])],
        current_question=PracticeQuestionItem(**current_q) if current_q else None,
        evaluation=evaluation_obj
    )


@router.get("/history", response_model=List[PracticeSessionSummary])
async def get_practice_history(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retrieves all real practice studio sessions for the authenticated student.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    student_id = current_user.get("id")
    student_email = (current_user.get("email") or "").lower()

    query = {"$or": [{"student_id": student_id}, {"student_email": student_email}]}
    docs = await db.practice_interviews.find(query, {"_id": 0}).sort("started_at", -1).to_list(length=100)

    summaries = []
    for d in docs:
        cfg = d.get("config", {})
        ev = d.get("evaluation")
        summaries.append(PracticeSessionSummary(
            session_id=d.get("session_id", ""),
            student_id=d.get("student_id", ""),
            company=cfg.get("company", "Amazon"),
            role=cfg.get("role", "Software Engineer"),
            mode=cfg.get("mode", "video"),
            topics=cfg.get("topics", []) + cfg.get("custom_topics", []),
            status=d.get("status", "IN_PROGRESS"),
            started_at=d.get("started_at", ""),
            completed_at=d.get("completed_at"),
            questions_count=len(d.get("questions", [])),
            answers_count=len(d.get("answers", [])),
            overall_score=ev.get("overall_score") if ev else None
        ))

    return summaries


@router.post("/abandon/{session_id}")
async def abandon_practice_session(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Marks an in-progress practice session as ABANDONED."""
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    student_id = current_user.get("id")
    student_email = (current_user.get("email") or "").lower()

    session_doc = await db.practice_interviews.find_one({"session_id": session_id}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=404, detail="Practice session not found")

    if session_doc.get("student_id") != student_id and session_doc.get("student_email") != student_email:
        raise HTTPException(status_code=403, detail="Unauthorized")

    await db.practice_interviews.update_one(
        {"session_id": session_id},
        {"$set": {"status": "ABANDONED", "updated_at": datetime.now().isoformat()}}
    )

    return {"status": "ok", "message": "Practice session marked as abandoned"}


@router.delete("/{session_id}")
@router.delete("/session/{session_id}")
async def delete_practice_session(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Permanently deletes a practice interview session, including all questions,
    candidate answers, speech transcripts, evaluations, scores, feedback,
    and associated session metadata. Enforces strict student ownership (IDOR protection).
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    student_id = current_user.get("id")
    student_email = (current_user.get("email") or "").lower()

    session_doc = await db.practice_interviews.find_one({"session_id": session_id})
    if not session_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice interview session not found."
        )

    # Strict student ownership enforcement (IDOR protection)
    doc_student_id = session_doc.get("student_id")
    doc_student_email = (session_doc.get("student_email") or "").lower()

    if doc_student_id != student_id and doc_student_email != student_email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this practice interview session."
        )

    delete_result = await db.practice_interviews.delete_one({"session_id": session_id})
    if delete_result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete practice interview session."
        )

    return {
        "status": "success",
        "message": "Practice interview history deleted successfully.",
        "session_id": session_id
    }

