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
        # Drop old Enum CHECK constraint on status column so "paid" is accepted
        _drop_enum_check(engine, "requests", "status")

    if "ot_requests" in tables:
        _add_missing_columns(
            engine,
            "ot_requests",
            {
                "ot_type": "VARCHAR(30)",
                "total_hours": "DECIMAL(5, 2)",
                "project_task": "TEXT",
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
                "admin_remarks": "TEXT",
            },
        )
        _drop_enum_check(engine, "ot_requests", "status")

    if "employee_profiles" in tables:
        _add_missing_columns(
            engine,
            "employee_profiles",
            {
                "name": "VARCHAR(120)",
                "name_khmer": "VARCHAR(120)",
                "gender": "VARCHAR(10)",
                "date_of_birth": "DATE",
                "place_of_birth": "VARCHAR(100)",
                "marital_status": "VARCHAR(30)",
                "nationality": "VARCHAR(60)",
                "personal_email": "VARCHAR(120)",
                "permanent_address": "VARCHAR(255)",
                "national_id": "VARCHAR(50)",
                "id_issue_date": "DATE",
                "id_expiry_date": "DATE",
                "passport_no": "VARCHAR(50)",
                "passport_expiry_date": "DATE",
                "emergency_contact_name": "VARCHAR(100)",
                "emergency_contact_relation": "VARCHAR(50)",
                "emergency_contact_phone": "VARCHAR(50)",
                "spouse_name": "VARCHAR(100)",
                "children_count": "INTEGER DEFAULT 0",
                "bank_name": "VARCHAR(100)",
                "bank_account_name": "VARCHAR(100)",
                "profile_photo": "TEXT",
                "sub_department": "VARCHAR(100)",
                "department": "VARCHAR(100)",
                "job_grade": "VARCHAR(50)",
                "job_level": "VARCHAR(50)",
                "confirmation_date": "DATE",
                "probation_end_date": "DATE",
                "join_date": "DATE",
                "resignation_date": "DATE",
                "employment_status": "VARCHAR(30) DEFAULT 'Active'",
                "work_email": "VARCHAR(120)",
                "extension_no": "VARCHAR(30)",
                "workstation": "VARCHAR(60)",
                "payroll_group": "VARCHAR(50)",
                "cost_center": "VARCHAR(50)",
                "employee_category": "VARCHAR(30)",
                "supervisor_id": "INTEGER",
                "department_head_id": "INTEGER",
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

    if "performance_reviews" in tables:
        _add_missing_columns(
            engine,
            "performance_reviews",
            {
                "reviewer_id": "INTEGER",
                "start_date": "DATE",
                "end_date": "DATE",
                "kpi_score": "DECIMAL(5, 2)",
                "kpi_weight": "DECIMAL(5, 2)",
                "competency_score": "DECIMAL(5, 2)",
                "behavior_score": "DECIMAL(5, 2)",
                "attendance_score": "DECIMAL(5, 2)",
                "total_score": "DECIMAL(5, 2)",
                "performance_rating": "VARCHAR(40)",
                "self_assessment": "TEXT",
                "manager_comments": "TEXT",
                "strengths": "TEXT",
                "improvement_areas": "TEXT",
                "development_action_plan": "TEXT",
                "promotion_recommendation": "VARCHAR(10)",
                "salary_increment_recommendation": "VARCHAR(10)",
                "pip_required": "VARCHAR(10)",
                "review_status": "VARCHAR(30) DEFAULT 'Draft'",
                "final_decision": "VARCHAR(30)",
                "remarks": "TEXT",
                "updated_at": "TIMESTAMP",
            },
        )
        _normalize_performance_review_periods(engine)

    if "training_records" in tables:
        _add_missing_columns(
            engine,
            "training_records",
            {
                "plan_id": "INTEGER",
                "training_type": "VARCHAR(50)",
                "category": "VARCHAR(50)",
                "provider": "VARCHAR(200)",
                "end_date": "DATE",
                "training_date": "DATE",
                "duration": "DECIMAL(6, 1)",
                "training_method": "VARCHAR(50)",
                "attendance_status": "VARCHAR(30)",
                "completion_status": "VARCHAR(30) DEFAULT 'In Progress'",
                "assessment_result": "VARCHAR(30) DEFAULT 'Not Applicable'",
                "score": "DECIMAL(5, 2)",
                "skills_gained": "TEXT",
                "certification": "VARCHAR(10)",
                "related_kpi_id": "INTEGER",
                "related_job_role": "VARCHAR(100)",
                "certificate_file": "TEXT",
                "feedback_file": "TEXT",
                "verified_by": "INTEGER",
                "status": "VARCHAR(30) DEFAULT 'Draft'",
                "remarks": "TEXT",
                "created_at": "TIMESTAMP",
                "updated_at": "TIMESTAMP",
            },
        )
        _sync_training_record_legacy_dates(engine)
        _normalize_training_record_statuses(engine)


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


def _normalize_performance_review_periods(engine) -> None:
    dialect = engine.dialect.name
    with engine.begin() as conn:
        if dialect == "postgresql":
            conn.execute(
                text(
                    """
                    UPDATE performance_reviews
                    SET review_period = (
                        CASE
                            WHEN review_period::text ~ '^[0-9]{4}-Q[12]$' THEN 'Semester 1'
                            WHEN review_period::text ~ '^[0-9]{4}-Q[34]$' THEN 'Semester 2'
                            ELSE 'Annual'
                        END
                    )::review_period_type
                    WHERE review_period::text NOT IN ('Probation', 'Semester 1', 'Semester 2', 'Annual')
                    """
                )
            )
        else:
            conn.execute(
                text(
                    """
                    UPDATE performance_reviews
                    SET review_period = CASE
                        WHEN review_period LIKE '%-Q1' OR review_period LIKE '%-Q2' THEN 'Semester 1'
                        WHEN review_period LIKE '%-Q3' OR review_period LIKE '%-Q4' THEN 'Semester 2'
                        ELSE 'Annual'
                    END
                    WHERE review_period NOT IN ('Probation', 'Semester 1', 'Semester 2', 'Annual')
                    """
                )
            )


def _normalize_training_record_statuses(engine) -> None:
    status_expr = "status::text" if engine.dialect.name == "postgresql" else "status"
    with engine.begin() as conn:
        conn.execute(
            text(
                f"""
                UPDATE training_records
                SET status = CASE
                    WHEN lower({status_expr}) IN ('approved', 'completed', 'complete') THEN 'Approved'
                    WHEN lower({status_expr}) IN ('rejected', 'cancelled', 'canceled') THEN 'Rejected'
                    ELSE 'Draft'
                END
                WHERE status IS NULL
                   OR {status_expr} NOT IN ('Draft', 'Approved', 'Rejected')
                """
            )
        )


def _sync_training_record_legacy_dates(engine) -> None:
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("training_records")}
    if "start_date" not in columns:
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE training_records
                SET training_date = COALESCE(training_date, start_date),
                    start_date = COALESCE(start_date, training_date, CURRENT_DATE)
                """
            )
        )
        if engine.dialect.name == "postgresql":
            conn.execute(text("ALTER TABLE training_records ALTER COLUMN start_date DROP NOT NULL"))


def _drop_enum_check(engine, table_name: str, column: str) -> None:
    """Drop CHECK constraint on an enum column for SQLite so new values are accepted."""
    import re

    if engine.dialect.name != "sqlite":
        return
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT sql FROM sqlite_master WHERE type='table' AND name=:t"),
            {"t": table_name},
        ).fetchone()
        if not row or not row[0]:
            return
        raw = row[0]
        cleaned = re.sub(
            rf",?\s*CHECK\s*\(\s*{re.escape(column)}\s+IN\s*\([^)]+\)\s*\)",
            "",
            raw,
            flags=re.IGNORECASE,
        )
        if cleaned == raw:
            return
        conn.execute(text("PRAGMA writable_schema = ON"))
        conn.execute(
            text("UPDATE sqlite_master SET sql = :sql WHERE type='table' AND name=:t"),
            {"sql": cleaned, "t": table_name},
        )
        conn.execute(text("PRAGMA writable_schema = OFF"))
