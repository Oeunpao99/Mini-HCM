from sqlalchemy import inspect, text


def ensure_runtime_schema(engine) -> None:
    """Small startup schema bridge for local/dev DBs without Alembic versions."""
    dialect = engine.dialect.name

    with engine.begin() as conn:
        if dialect == "postgresql":
            conn.execute(text("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'staff'"))
            conn.execute(text("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'line_manager'"))
            conn.execute(text("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'department_head'"))
            conn.execute(text("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'management_hr'"))
            conn.execute(text("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'payroll_officer'"))
        elif dialect in {"mysql", "mariadb"}:
            conn.execute(
                text(
                    "ALTER TABLE users MODIFY role "
                    "ENUM('staff','line_manager','department_head','management_hr','payroll_officer','employee','manager','admin') "
                    "NOT NULL DEFAULT 'staff'"
                )
            )

    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "users" in tables:
        _add_missing_columns(
            engine,
            "users",
            {
                "department": "VARCHAR(100)",
                "manager_id": "INTEGER",
            },
        )

    if "attendance" in tables:
        _add_missing_columns(
            engine,
            "attendance",
            {
                "requires_manager_approval": _boolean_type(dialect, "FALSE"),
                "manager_approved": _boolean_type(dialect, None),
                "manager_approved_at": "TIMESTAMP",
                "manager_approved_by": "INTEGER",
                "needs_approval_reason": "VARCHAR(255)",
                "flexible_scan": _boolean_type(dialect, "FALSE"),
                "worked_hours": "DECIMAL(5, 2)",
                "swapped_out": _boolean_type(dialect, "FALSE"),
            },
        )

    if "requests" in tables:
        _add_missing_columns(
            engine,
            "requests",
            {
                "leave_type": "VARCHAR(50)",
                "backup_user_id": "INTEGER",
                "backup_status": "VARCHAR(20) DEFAULT 'skipped'",
                "backup_approved_at": "TIMESTAMP",
                "line_manager_status": "VARCHAR(20) DEFAULT 'pending'",
                "line_manager_approved_by": "INTEGER",
                "line_manager_approved_at": "TIMESTAMP",
                "department_head_status": "VARCHAR(20) DEFAULT 'pending'",
                "department_head_approved_by": "INTEGER",
                "department_head_approved_at": "TIMESTAMP",
                "hr_status": "VARCHAR(20) DEFAULT 'pending'",
                "hr_approved_by": "INTEGER",
                "hr_approved_at": "TIMESTAMP",
            },
        )

    if "employee_profiles" in tables:
        _add_missing_columns(
            engine,
            "employee_profiles",
            {
                "profile_photo": "TEXT",
                "sub_department": "VARCHAR(100)",
                "job_grade": "VARCHAR(50)",
            },
        )

    if "employee_movement_requests" in tables:
        _add_missing_columns(
            engine,
            "employee_movement_requests",
            {
                "current_sub_department": "VARCHAR(100)",
                "proposed_sub_department": "VARCHAR(100)",
                "current_job_grade": "VARCHAR(50)",
                "proposed_job_grade": "VARCHAR(50)",
            },
        )

    if "payroll_records" in tables:
        _add_missing_columns(
            engine,
            "payroll_records",
            {
                "salary_adjustment": "DECIMAL(12, 2) DEFAULT 0",
            },
        )


def _add_missing_columns(engine, table_name: str, columns: dict[str, str]) -> None:
    inspector = inspect(engine)
    existing = {column["name"] for column in inspector.get_columns(table_name)}
    dialect = engine.dialect.name

    with engine.begin() as conn:
        for name, definition in columns.items():
            if name in existing:
                continue
            default = ""
            if " DEFAULT " in definition:
                definition, default_value = definition.split(" DEFAULT ", 1)
                default = f" DEFAULT {default_value}"
            elif definition.endswith(" DEFAULT FALSE"):
                definition = definition.removesuffix(" DEFAULT FALSE")
                default = " DEFAULT FALSE"
            elif definition.endswith(" DEFAULT 0"):
                definition = definition.removesuffix(" DEFAULT 0")
                default = " DEFAULT 0"

            if dialect == "postgresql":
                conn.execute(
                    text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {name} {definition}{default}")
                )
            else:
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {name} {definition}{default}"))


def _boolean_type(dialect: str, default: str | None) -> str:
    type_name = "BOOLEAN" if dialect != "sqlite" else "INTEGER"
    if default is None:
        return type_name
    if dialect == "sqlite":
        return f"{type_name} DEFAULT 0"
    return f"{type_name} DEFAULT {default}"
