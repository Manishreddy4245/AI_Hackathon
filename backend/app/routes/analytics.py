from fastapi import APIRouter, HTTPException
from app.db.mongodb import db_manager

router = APIRouter(prefix="/api/analytics", tags=["Skill Analytics"])

@router.get("/summary")
async def get_analytics_summary():
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    return {
        "avgPlacementReadiness": 78,
        "studentsReady": 184,
        "studentsNeedingImprovement": 96,
        "topSkillGap": "SQL",
        "highDemandSkill": "Python",
        "readinessMetrics": [
            {"category": "Ready", "studentCount": 184, "percentage": 43, "fillColor": "#10b981"},
            {"category": "Almost Ready", "studentCount": 148, "percentage": 35, "fillColor": "#3b82f6"},
            {"category": "Needs Improvement", "studentCount": 96, "percentage": 22, "fillColor": "#f59e0b"},
        ],
        "readinessDistribution": [
            {"range": "90–100", "count": 68, "fill": "#10b981"},
            {"range": "80–89", "count": 116, "fill": "#3b82f6"},
            {"range": "70–79", "count": 148, "fill": "#0284c7"},
            {"range": "60–69", "count": 64, "fill": "#f59e0b"},
            {"range": "Below 60", "count": 32, "fill": "#f43f5e"},
        ],
        "skillDemands": [
            {"skill": "Python", "demandPercent": 78, "proficientPercent": 82, "needingImprovementPercent": 18},
            {"skill": "SQL", "demandPercent": 72, "proficientPercent": 51, "needingImprovementPercent": 49},
            {"skill": "Java", "demandPercent": 64, "proficientPercent": 65, "needingImprovementPercent": 35},
            {"skill": "React", "demandPercent": 58, "proficientPercent": 70, "needingImprovementPercent": 30},
            {"skill": "Machine Learning", "demandPercent": 51, "proficientPercent": 45, "needingImprovementPercent": 55},
        ]
    }
