"""POST /api/v1/rights — stateless. No DB writes."""
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.ai.client import ai_call

router = APIRouter(prefix="/rights", tags=["rights"])


class RightsIn(BaseModel):
    situation: str = Field(..., min_length=10, max_length=1000)


@router.post("")
def navigate(body: RightsIn) -> dict:
    return ai_call("rights_navigator", situation=body.situation)
