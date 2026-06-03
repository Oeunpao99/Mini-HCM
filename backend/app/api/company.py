from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import MANAGEMENT_HR_ROLE, get_current_user, get_db, require_roles
from app.models.company_location import CompanyLocation
from app.schemas.company import CompanyLocationUpdateIn

router = APIRouter(prefix="/api/company", tags=["company"])


@router.get("/location")
def get_company_location(db: Session = Depends(get_db), _=Depends(get_current_user)):
    location = db.query(CompanyLocation).filter(CompanyLocation.id == 1).first()
    if not location:
        raise HTTPException(status_code=404, detail="Company location not configured")

    return {
        "latitude": float(location.latitude),
        "longitude": float(location.longitude),
        "radius_meters": location.radius_meters,
    }


@router.put("/location")
def update_company_location(
    payload: CompanyLocationUpdateIn,
    db: Session = Depends(get_db),
    _=Depends(require_roles(MANAGEMENT_HR_ROLE)),
):
    location = db.query(CompanyLocation).filter(CompanyLocation.id == 1).first()
    if not location:
        location = CompanyLocation(id=1)
        db.add(location)

    location.latitude = payload.latitude
    location.longitude = payload.longitude
    location.radius_meters = payload.radius_meters
    db.commit()

    return {
        "message": "Company location updated",
        "latitude": float(location.latitude),
        "longitude": float(location.longitude),
        "radius_meters": location.radius_meters,
    }
