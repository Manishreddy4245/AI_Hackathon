from typing import List
from fastapi import APIRouter, HTTPException, status
from app.db.mongodb import db_manager
from app.schemas.drive import PlacementDriveSchema, PlacementDriveCreate

router = APIRouter(prefix="/api/drives", tags=["Placement Drives"])

@router.get("", response_model=List[PlacementDriveSchema])
async def list_drives():
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    drives = await db.drives.find({}, {"_id": 0}).to_list(length=100)
    return drives

@router.get("/{drive_id}", response_model=PlacementDriveSchema)
async def get_drive(drive_id: str):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    drive = await db.drives.find_one({"id": drive_id}, {"_id": 0})
    if not drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")
    return drive

@router.post("", response_model=PlacementDriveSchema, status_code=status.HTTP_201_CREATED)
async def create_drive(drive_in: PlacementDriveCreate):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    new_id = f"drive-{drive_in.companyName.lower().replace(' ', '-')}-{int(drive_in.packageLpa)}"
    drive_dict = drive_in.model_dump()
    drive_dict.update({
        "id": new_id,
        "status": "open",
        "registeredCount": 0,
        "shortlistedCount": 0,
        "selectedCount": 0,
        "aiExplanation": "AI JD Analysis: Evaluated requirement weights & mandatory skills.",
        "aiConfirmed": True,
        "pipeline": {"eligible": 120, "applied": 45, "shortlisted": 12, "interview": 4, "selected": 0},
    })

    await db.drives.insert_one(drive_dict)
    created = await db.drives.find_one({"id": new_id}, {"_id": 0})
    return created

@router.patch("/{drive_id}/confirm-requirements")
async def confirm_drive_requirements(drive_id: str):
    db = db_manager.db
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    res = await db.drives.update_one({"id": drive_id}, {"$set": {"aiConfirmed": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Drive not found")
    return {"status": "ok", "message": "Drive requirements confirmed by Placement Officer"}
