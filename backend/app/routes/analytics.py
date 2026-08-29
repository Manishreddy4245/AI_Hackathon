from typing import Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query, Response
from app.db.mongodb import db_manager
from app.core.deps import require_role
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/api/analytics", tags=["Skill Analytics & Reports"])


def get_user_analytics_scope(current_user: Dict[str, Any]) -> Dict[str, Any]:
    role = (current_user.get("role") or current_user.get("portalRole") or "").lower()
    is_recruiter = role in ["recruiter", "company_recruiter"]
    user_id = current_user.get("id") or current_user.get("sub")
    company = current_user.get("company") or current_user.get("company_name") or current_user.get("companyName")
    return {
        "user_id": user_id,
        "role": role,
        "is_recruiter": is_recruiter,
        "company": company
    }


@router.get("/summary")
async def get_analytics_summary(
    branch: Optional[str] = Query(None),
    grad_year: Optional[str] = Query(None),
    drive_id: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    date_range: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_role(["placement_officer", "recruiter", "admin"]))
):
    """
    Returns placement analytics summary with skill demands, readiness distribution,
    and KPIs calculated strictly from live MongoDB records with optional multi-dimensional filtering.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    scope = get_user_analytics_scope(current_user)
    
    overview = await AnalyticsService.get_analytics_overview(
        db=db,
        user_scope=scope,
        branch=branch,
        grad_year=grad_year,
        drive_id=drive_id,
        company=company,
        date_range=date_range,
        start_date=start_date,
        end_date=end_date
    )

    skills_data = overview.get("skills_analytics", {})
    kpis = overview.get("kpis", {})

    total_students = kpis.get("total_students", 0)
    ready_count = skills_data.get("studentsReady", 0)
    almost_ready_count = max(0, total_students - ready_count - skills_data.get("studentsNeedingImprovement", 0))
    needs_imp_count = skills_data.get("studentsNeedingImprovement", 0)

    ready_pct = round((ready_count / max(1, total_students)) * 100) if total_students > 0 else 0
    almost_pct = round((almost_ready_count / max(1, total_students)) * 100) if total_students > 0 else 0
    needs_imp_pct = round((needs_imp_count / max(1, total_students)) * 100) if total_students > 0 else 0

    return {
        "avgPlacementReadiness": skills_data.get("avgPlacementReadiness", 0),
        "studentsReady": ready_count,
        "studentsNeedingImprovement": needs_imp_count,
        "topSkillGap": skills_data.get("topSkillGap", "None"),
        "highDemandSkill": skills_data.get("highDemandSkill", "None"),
        "readinessMetrics": [
            {"category": "Ready", "studentCount": ready_count, "percentage": ready_pct, "fillColor": "#10b981"},
            {"category": "Almost Ready", "studentCount": almost_ready_count, "percentage": almost_pct, "fillColor": "#3b82f6"},
            {"category": "Needs Improvement", "studentCount": needs_imp_count, "percentage": needs_imp_pct, "fillColor": "#f59e0b"},
        ],
        "readinessDistribution": [
            {"range": "90–100", "count": sum(1 for s in overview.get("kpis", {}) if False), "fill": "#10b981"},
            {"range": "80–89", "count": 0, "fill": "#3b82f6"},
            {"range": "70–79", "count": 0, "fill": "#0284c7"},
            {"range": "60–69", "count": 0, "fill": "#f59e0b"},
            {"range": "Below 60", "count": 0, "fill": "#f43f5e"},
        ],
        "skillDemands": skills_data.get("skillDemands", []),
        "kpis": kpis,
        "funnel": overview.get("funnel", []),
        "performance_metrics": overview.get("performance_metrics", {}),
        "drive_breakdown": overview.get("drive_breakdown", []),
        "branch_breakdown": overview.get("branch_breakdown", []),
        "company_breakdown": overview.get("company_breakdown", []),
        "trends": overview.get("trends", [])
    }


@router.get("/overview")
async def get_comprehensive_analytics_overview(
    branch: Optional[str] = Query(None),
    grad_year: Optional[str] = Query(None),
    drive_id: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    date_range: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_role(["placement_officer", "recruiter", "admin"]))
):
    """
    Returns full database-driven analytics payload for the PlaceMind Analytics & Reports Center.
    Includes KPIs, funnel stages, drive breakdown, branch analytics, time trends, and skill metrics.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    scope = get_user_analytics_scope(current_user)

    return await AnalyticsService.get_analytics_overview(
        db=db,
        user_scope=scope,
        branch=branch,
        grad_year=grad_year,
        drive_id=drive_id,
        company=company,
        date_range=date_range,
        start_date=start_date,
        end_date=end_date
    )


@router.get("/export/csv")
async def export_analytics_csv(
    branch: Optional[str] = Query(None),
    grad_year: Optional[str] = Query(None),
    drive_id: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    date_range: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_role(["placement_officer", "recruiter", "admin"]))
):
    """
    Generates and streams a real structured CSV report of the currently filtered analytics data.
    """
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    scope = get_user_analytics_scope(current_user)

    overview = await AnalyticsService.get_analytics_overview(
        db=db,
        user_scope=scope,
        branch=branch,
        grad_year=grad_year,
        drive_id=drive_id,
        company=company,
        date_range=date_range,
        start_date=start_date,
        end_date=end_date
    )

    csv_content = AnalyticsService.generate_analytics_csv(overview)
    filename = f"PlaceMind_Placement_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
