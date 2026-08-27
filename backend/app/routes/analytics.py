from collections import Counter
from fastapi import APIRouter, HTTPException
from app.db.mongodb import db_manager

router = APIRouter(prefix="/api/analytics", tags=["Skill Analytics"])

@router.get("/summary")
async def get_analytics_summary():
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    students = await db.students.find({}, {"_id": 0}).to_list(length=1000)
    drives = await db.drives.find({}, {"_id": 0}).to_list(length=500)

    total_students = len(students)

    if total_students == 0:
        return {
            "avgPlacementReadiness": 0,
            "studentsReady": 0,
            "studentsNeedingImprovement": 0,
            "topSkillGap": "None",
            "highDemandSkill": "None",
            "readinessMetrics": [],
            "readinessDistribution": [],
            "skillDemands": []
        }

    # Dynamic readiness calculation
    ready_count = 0
    almost_ready_count = 0
    needs_imp_count = 0
    total_score = 0

    dist_90_100 = 0
    dist_80_89 = 0
    dist_70_79 = 0
    dist_60_69 = 0
    dist_below_60 = 0

    student_skills_flat = []

    for s in students:
        score = float(s.get("readinessScore", 0) or 0)
        total_score += score

        if score >= 80:
            ready_count += 1
        elif score >= 60:
            almost_ready_count += 1
        else:
            needs_imp_count += 1

        if score >= 90:
            dist_90_100 += 1
        elif score >= 80:
            dist_80_89 += 1
        elif score >= 70:
            dist_70_79 += 1
        elif score >= 60:
            dist_60_69 += 1
        else:
            dist_below_60 += 1

        skills = s.get("skills", [])
        if isinstance(skills, list):
            for sk in skills:
                if isinstance(sk, str) and sk.strip():
                    student_skills_flat.append(sk.strip())

    avg_readiness = round(total_score / total_students) if total_students > 0 else 0

    # Dynamic Skill Demands from Drives
    drive_required_skills = []
    for d in drives:
        req = d.get("requiredSkills", [])
        if isinstance(req, list):
            for sk in req:
                if isinstance(sk, str) and sk.strip():
                    drive_required_skills.append(sk.strip())

    demand_counter = Counter(drive_required_skills)
    student_skill_counter = Counter(student_skills_flat)

    top_skill_gap = "None"
    high_demand_skill = demand_counter.most_common(1)[0][0] if demand_counter else "None"

    total_drives_count = max(1, len(drives))
    skill_demands = []
    
    # Calculate top skill gaps
    max_gap = -1
    for skill, demand_count in demand_counter.most_common(10):
        demand_pct = round((demand_count / total_drives_count) * 100)
        proficient_count = student_skill_counter.get(skill, 0)
        proficient_pct = round((proficient_count / total_students) * 100) if total_students > 0 else 0
        needing_imp_pct = max(0, 100 - proficient_pct)

        gap = demand_pct - proficient_pct
        if gap > max_gap:
            max_gap = gap
            top_skill_gap = skill

        skill_demands.append({
            "skill": skill,
            "demandPercent": demand_pct,
            "proficientPercent": proficient_pct,
            "needingImprovementPercent": needing_imp_pct
        })

    ready_pct = round((ready_count / total_students) * 100) if total_students > 0 else 0
    almost_pct = round((almost_ready_count / total_students) * 100) if total_students > 0 else 0
    needs_imp_pct = round((needs_imp_count / total_students) * 100) if total_students > 0 else 0

    return {
        "avgPlacementReadiness": avg_readiness,
        "studentsReady": ready_count,
        "studentsNeedingImprovement": needs_imp_count,
        "topSkillGap": top_skill_gap,
        "highDemandSkill": high_demand_skill,
        "readinessMetrics": [
            {"category": "Ready", "studentCount": ready_count, "percentage": ready_pct, "fillColor": "#10b981"},
            {"category": "Almost Ready", "studentCount": almost_ready_count, "percentage": almost_pct, "fillColor": "#3b82f6"},
            {"category": "Needs Improvement", "studentCount": needs_imp_count, "percentage": needs_imp_pct, "fillColor": "#f59e0b"},
        ],
        "readinessDistribution": [
            {"range": "90–100", "count": dist_90_100, "fill": "#10b981"},
            {"range": "80–89", "count": dist_80_89, "fill": "#3b82f6"},
            {"range": "70–79", "count": dist_70_79, "fill": "#0284c7"},
            {"range": "60–69", "count": dist_60_69, "fill": "#f59e0b"},
            {"range": "Below 60", "count": dist_below_60, "fill": "#f43f5e"},
        ],
        "skillDemands": skill_demands
    }


