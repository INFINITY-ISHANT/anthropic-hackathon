"""POST /api/v1/scheme-check — stateless. No DB writes."""
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.ai.client import ai_call

router = APIRouter(prefix="/scheme-check", tags=["scheme-check"])


class SchemeIn(BaseModel):
    scheme_name: str = Field(..., min_length=2, max_length=200)
    announced_target: str = Field(..., min_length=4, max_length=500)
    announced_date: str = Field(..., min_length=2, max_length=64)


@router.post("")
def check_scheme(body: SchemeIn) -> dict:
    return ai_call(
        "scheme_check",
        scheme_name=body.scheme_name,
        announced_target=body.announced_target,
        announced_date=body.announced_date,
    )
