"""Migrate local SQLite data to production PostgreSQL.

Run this on the production server where Docker containers are running.

Steps:
  1. Copy attendance_dev.db to the server (e.g., scp to ~/Mini-HCM/backend/)
  2. SSH into the server
  3. cd Mini-HCM/backend
  4. Set the DATABASE_URL for the production DB:
     export DATABASE_URL=postgresql+psycopg2://attendance_user:YOUR_PASSWORD@db:5432/hcm_ai_db
  5. Run: python migrate_to_prod.py
"""

import os
import sys

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(__file__) or ".")

from app.db.base import Base, __all__ as model_names

LOCAL_URL = "sqlite:///./attendance_dev.db"


def main():
    prod_url = os.environ.get("DATABASE_URL")
    if not prod_url:
        print("ERROR: Set DATABASE_URL env var, e.g.:")
        print('  export DATABASE_URL=postgresql+psycopg2://attendance_user:password@db:5432/hcm_ai_db')
        sys.exit(1)

    if not os.path.exists("./attendance_dev.db"):
        print("ERROR: attendance_dev.db not found in current directory.")
        print("Copy it first: scp attendance_dev.db user@server:~/Mini-HCM/backend/")
        sys.exit(1)

    local_engine = create_engine(LOCAL_URL)
    prod_engine = create_engine(prod_url)

    Base.metadata.create_all(bind=prod_engine)

    LocalSession = sessionmaker(bind=local_engine)
    ProdSession = sessionmaker(bind=prod_engine)

    local_db = LocalSession()
    prod_db = ProdSession()

    tables = [Base.metadata.tables[name.lower()] for name in model_names
              if name != "Base" and name.lower() in Base.metadata.tables]

    seen = set()
    for table in tables:
        if table.name in seen:
            continue
        seen.add(table.name)
        tname = table.name
        rows = local_db.execute(table.select()).fetchall()
        if not rows:
            print(f"  {tname}: 0 rows")
            continue
        inserted = 0
        for row in rows:
            try:
                prod_db.execute(table.insert().values(row._mapping))
                inserted += 1
            except Exception as e:
                if "duplicate key" in str(e).lower():
                    pass  # skip existing rows
                else:
                    print(f"  {tname}: error on id={row._mapping.get('id', '?')}: {e}")
        prod_db.commit()
        print(f"  {tname}: {inserted}/{len(rows)} rows copied")

    local_db.close()
    prod_db.close()
    print("Done.")


if __name__ == "__main__":
    main()
