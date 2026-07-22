from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "AI HCM System"
    database_url: str = "postgresql+psycopg2://postgres:password@localhost:5432/hcm_ai_db"
    secret_key: str = "change-this-secret"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    backend_cors_origins: str = "*"
    media_dir: str = "media"
    profile_photo_max_bytes: int = 5 * 1024 * 1024
    profile_photo_max_pixels: int = 12_000_000

    checkin_start_time: str = "06:00"
    checkin_end_time: str = "23:00"
    checkout_min_time: str = "16:00"
    standard_checkin_time: str = "08:00"
    standard_checkout_time: str = "17:30"
    auto_checkout_time: str = "23:59"

    ai_provider: str = "mock"
    azure_openai_api_key: str = ""
    azure_openai_endpoint: str = ""
    azure_openai_deployment: str = "gpt-4o"
    azure_openai_api_version: str = "2024-08-01-preview"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    ai_history_message_limit: int = 12
    ai_max_tool_calls: int = 3


settings = Settings()
