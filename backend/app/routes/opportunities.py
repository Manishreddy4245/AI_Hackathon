import math
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from app.core.deps import get_optional_current_user
from app.schemas.resume import (
    PlacementRecommendationSchema,
    UnifiedOpportunitiesResponseSchema,
    CompanyOpportunityGroupSchema
)
from app.services.opportunity_aggregator import (
    get_ranked_opportunities_for_student,
    get_opportunity_skill_gap_analysis,
    group_opportunities_by_company
)

router = APIRouter(prefix="/api/opportunities", tags=["Opportunities"])

@router.get("", response_model=UnifiedOpportunitiesResponseSchema)
async def list_opportunities(
    source_type: str = Query("all", description="all, college, or external"),
    eligibility_filter: str = Query("all", description="all, eligible, ineligible, or high_match"),
    search: str = Query("", description="Search term for company, role, or skills"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=200, description="Items per page"),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Campus Placement Drives Discovery endpoint:
    Fetches all available internal campus placement drives from MongoDB,
    evaluates every drive against the authenticated student's real profile,
    and returns rich counts, company-grouped representations, and paginated results.
    """
    student_id = current_user.get("id") if current_user else None

    # Fetch complete evaluated opportunity pool
    all_evaluated_ops = await get_ranked_opportunities_for_student(
        student_id=student_id,
        source_filter=source_type,
        eligibility_filter=eligibility_filter,
        search_query=search
    )

    # Compute accurate aggregate counts over the full opportunity set
    total_opportunities = len(all_evaluated_ops)
    eligible_count = sum(1 for o in all_evaluated_ops if o.get("eligible"))
    ineligible_count = sum(1 for o in all_evaluated_ops if not o.get("eligible"))

    # Group by company
    company_groups_raw = group_opportunities_by_company(all_evaluated_ops)
    total_companies = len(company_groups_raw)

    # Pagination calculation
    total_pages = max(1, math.ceil(total_opportunities / page_size)) if total_opportunities > 0 else 1
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_ops = all_evaluated_ops[start_idx:end_idx]

    return UnifiedOpportunitiesResponseSchema(
        total_opportunities=total_opportunities,
        eligible_count=eligible_count,
        ineligible_count=ineligible_count,
        total_companies=total_companies,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        opportunities=[PlacementRecommendationSchema(**opp) for opp in paginated_ops],
        company_groups=[
            CompanyOpportunityGroupSchema(
                company=g["company"],
                company_logo=g["company_logo"],
                source=g["source"],
                source_type=g["source_type"],
                source_label=g["source_label"],
                total_jobs=g["total_jobs"],
                eligible_jobs=g["eligible_jobs"],
                ineligible_jobs=g["ineligible_jobs"],
                best_match_score=g["best_match_score"],
                location=g["location"],
                opportunities=[PlacementRecommendationSchema(**o) for o in g["opportunities"]]
            )
            for g in company_groups_raw
        ]
    )

@router.get("/{opportunity_id}/skill-gap")
async def get_opportunity_skill_gap(
    opportunity_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Detailed company-specific skill gap, requirements breakdown, and actionable learning roadmap
    for the authenticated student against the specified opportunity.
    """
    student_id = current_user.get("id") if current_user else None
    res = await get_opportunity_skill_gap_analysis(
        opportunity_id=opportunity_id,
        student_id=student_id
    )
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res
