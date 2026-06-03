from app.core.seed import seed_default_data
from app.core.schema import ensure_runtime_schema
from app.db.base import *  # noqa: F401,F403
from app.db.session import Base, SessionLocal, engine


def seed():
    Base.metadata.create_all(bind=engine)
    ensure_runtime_schema(engine)
    db = SessionLocal()
    try:
        seed_default_data(db)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Seed data inserted (if missing).")
