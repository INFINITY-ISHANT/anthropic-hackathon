"""POST /api/v1/claim-check — stateless nonpartisan claim checker. No DB writes."""
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.ai.client import ai_call

router = APIRouter(prefix="/claim-check", tags=["claim-check"])


class ClaimIn(BaseModel):
    claim: str = Field(..., min_length=5, max_length=2000)


@router.post("")
def check_claim(body: ClaimIn) -> dict:
    """
    Five-tier classification with mandatory reasoning. The reasoning IS the
    product — never truncated, never hidden. Stateless: nothing persists.
    """
    return ai_call("claim_check", claim=body.claim)
