"""POST /api/v1/decode — stateless plain-language decoder. No DB writes."""
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.ai.client import ai_call

router = APIRouter(prefix="/decode", tags=["decode"])


class DecodeIn(BaseModel):
    text: str = Field(..., min_length=10, max_length=20000)


@router.post("")
def decode_document(body: DecodeIn) -> dict:
    """
    Run a single document through the decoder pipeline. No persistence.
    The endpoint is intentionally stateless so citizens can paste arbitrary
    documents without anything being stored on the server.
    """
    return ai_call("decode", text=body.text)
