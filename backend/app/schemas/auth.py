from pydantic import BaseModel


class LoginRequest(BaseModel):
    emp_code: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    role: str
    name: str
    department: str | None = None
