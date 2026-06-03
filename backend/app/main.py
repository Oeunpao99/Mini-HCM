from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, attendance, auth, company, hris, requests, swaps
from app.core.config import settings
from app.core.schema import ensure_runtime_schema
from app.core.seed import seed_default_data
from app.db.base import *  # noqa: F401,F403
from app.db.session import Base, SessionLocal, engine

Base.metadata.create_all(bind=engine)
ensure_runtime_schema(engine)

db = SessionLocal()
try:
    seed_default_data(db)
finally:
    db.close()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(company.router)
app.include_router(attendance.router)
app.include_router(requests.router)
app.include_router(swaps.router)
app.include_router(admin.router)
app.include_router(hris.router)


@app.get("/")
def root():
    return {"message": "Attendance API is running"}
