from pydantic import BaseModel, Field


class CompanyLocationUpdateIn(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    radius_meters: int = Field(ge=10, le=5000)
