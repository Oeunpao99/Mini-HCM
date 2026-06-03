# alembic/env.py
import sys
from pathlib import Path
# Import your Base
from app.db.base import Base

# Add the parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from alembic import context
from sqlalchemy import engine_from_config, pool
from logging.config import fileConfig
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()



# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Get database URL from environment variable
database_url = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:password@localhost:5432/attendance_db")
config.set_main_option("sqlalchemy.url", database_url)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()