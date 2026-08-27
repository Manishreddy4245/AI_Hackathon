from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from app.db.mongodb import db_manager
from app.core.deps import get_current_user, require_placement_officer, require_role

router = APIRouter(prefix="/api/companies", tags=["Companies"])

class CompanyCreate(BaseModel):
    name: str
    logo: Optional[str] = "TN"
    industry: str
    website: Optional[str] = ""
    location: str
    tier: Optional[str] = "Tier 1"
    contactPerson: Optional[str] = ""
    contactEmail: Optional[str] = ""

class CompanySchema(CompanyCreate):
    id: str

@router.get("", response_model=List[CompanySchema])
async def list_companies(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    companies = await db.companies.find({}, {"_id": 0}).to_list(length=100)
    return companies

@router.get("/search", response_model=List[CompanySchema])
async def search_companies(query: str = "", current_user: Dict[str, Any] = Depends(get_current_user)):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    if not query.strip():
        companies = await db.companies.find({}, {"_id": 0}).limit(15).to_list(length=15)
        return companies

    pattern = f".*{query.strip()}.*"
    companies = await db.companies.find(
        {"name": {"$regex": pattern, "$options": "i"}},
        {"_id": 0}
    ).limit(15).to_list(length=15)
    return companies

@router.get("/{company_id}", response_model=CompanySchema)
async def get_company(company_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@router.post("", response_model=CompanySchema, status_code=status.HTTP_201_CREATED)
async def create_company(
    comp_in: CompanyCreate,
    current_user: Dict[str, Any] = Depends(require_role(["recruiter", "placement_officer", "admin"]))
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    import uuid
    new_id = f"comp-{uuid.uuid4().hex[:12]}"
    comp_dict = comp_in.model_dump()
    comp_dict["id"] = new_id

    await db.companies.insert_one(comp_dict)
    created = await db.companies.find_one({"id": new_id}, {"_id": 0})
    return created

@router.delete("/{company_id}")
async def delete_company(
    company_id: str,
    current_user: Dict[str, Any] = Depends(require_placement_officer)
):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    res = await db.companies.delete_one({"id": company_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Company not found")
    return {"status": "ok", "message": f"Company {company_id} deleted successfully"}
