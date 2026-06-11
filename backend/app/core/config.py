from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Location Attendance System"
    database_url: str = "postgresql+psycopg2://postgres:password@localhost:5432/attendance_db"
    secret_key: str = "change-this-secret"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    backend_cors_origins: str = "*"

    checkin_start_time: str = "06:00"
    checkin_end_time: str = "23:00"
    checkout_min_time: str = "16:00"
    standard_checkin_time: str = "08:00"
    standard_checkout_time: str = "17:30"
    auto_checkout_time: str = "23:59"


settings = Settings()
