"""POST /api/v1/rti/draft — stateless. No DB writes."""
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.ai.client import ai_call

router = APIRouter(prefix="/rti", tags=["rti"])


class RTIIn(BaseModel):
    information_sought: str = Field(..., min_length=10, max_length=2000)
    government_body: str = Field(..., min_length=2, max_length=300)
    state: str = Field(..., min_length=2, max_length=100)


@router.post("/draft")
def draft(body: RTIIn) -> dict:
    return ai_call(
        "rti_draft",
        information_sought=body.information_sought,
        government_body=body.government_body,
        state=body.state,
    )
