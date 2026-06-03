from pydantic import BaseModel


class LoginRequest(BaseModel):
    emp_code: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str
