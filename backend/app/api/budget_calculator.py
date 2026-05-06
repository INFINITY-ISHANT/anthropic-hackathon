"""
POST /api/v1/budget-calculator
RAG-based budget impact calculator. Reads the Union Budget document from
data/budget/ and answers citizen impact questions grounded in the actual text.

No hallucination: Claude is instructed to cite only provisions present in
the document excerpt. If the document is absent, returns HTTP 503 so the
frontend can show a helpful setup message.
"""

import logging
from pathlib import Path
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.ai.client import ai_call_with_context

router = APIRouter(prefix="/budget-calculator", tags=["budget-calculator"])
logger = logging.getLogger(__name__)

# Resolve data/budget/ relative to the project root.
# This file is at backend/app/api/budget_calculator.py:
#   parents[0] = backend/app/api
#   parents[1] = backend/app
#   parents[2] = backend
#   parents[3] = <project root>
BUDGET_DIR = Path(__file__).resolve().parents[3] / "data" / "budget"

# Max characters passed as context.
# Keep this modest to avoid Anthropic TPM rate-limit errors on smaller org quotas.
# 12k chars is usually ~3k tokens and remains sufficient for practical impact summaries.
CONTEXT_CHAR_LIMIT = 60_000


def _load_budget_text() -> str:
    """
    Load budget document text from data/budget/.
    Supports .txt (preferred, fast) and .pdf (extracted via pypdf).
    Raises HTTP 503 if no file is found so the frontend can instruct the user.
    """
    BUDGET_DIR.mkdir(parents=True, exist_ok=True)

    txt_files = sorted(BUDGET_DIR.glob("*.txt"))
    if txt_files:
        path = txt_files[0]
        logger.info("Budget: loading text file %s", path.name)
        return path.read_text(encoding="utf-8")

    pdf_files = sorted(BUDGET_DIR.glob("*.pdf"))
    if pdf_files:
        path = pdf_files[0]
        logger.info("Budget: loading PDF %s", path.name)
        try:
            import pypdf  # type: ignore
        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="pypdf is not installed. Add 'pypdf>=4.0.0' to requirements.txt and reinstall.",
            )
        reader = pypdf.PdfReader(str(path))
        extracted = "\n".join(page.extract_text() or "" for page in reader.pages)
        if not extracted.strip():
            raise HTTPException(
                status_code=500,
                detail=f"PDF '{path.name}' yielded no extractable text. Try converting to .txt first.",
            )
        return extracted

    raise HTTPException(
        status_code=503,
        detail=(
            "No budget document found in data/budget/. "
            "Download the Union Budget PDF from https://www.indiabudget.gov.in "
            "and place it in data/budget/ then restart the backend."
        ),
    )


# ---- Request / Response schemas ----

class BudgetIn(BaseModel):
    profile: str = Field(
        ..., min_length=2, max_length=64,
        description="Citizen profile e.g. 'farmer', 'salaried employee', 'student', 'senior citizen'",
    )
    income: float = Field(
        ..., ge=0, le=1_000_000_000,
        description="Annual income in INR (0 = no income / not applicable)",
    )
    state: str = Field(..., min_length=2, max_length=64)
    question: str = Field(
        default="",
        max_length=512,
        description="Optional specific question about the budget impact",
    )


# ---- Endpoint ----

@router.post("", summary="Calculate personal budget impact from Union Budget document")
def calculate(body: BudgetIn) -> dict:
    """
    Loads the Union Budget document, takes the first CONTEXT_CHAR_LIMIT characters
    as the RAG context, and asks Claude to explain the budget's impact on the
    citizen profile provided. All numbers cited must come from the document.
    """
    budget_text = _load_budget_text()
    context_snippet = budget_text[:CONTEXT_CHAR_LIMIT]

    # Try to detect a fiscal year or explicit budget label in the document
    # so the assistant prompt can refer to the correct year instead of
    # hardcoding one and triggering corrective notes in the model output.
    question_line = f"\n- Specific question: {body.question}" if body.question.strip() else ""

    year_match = re.search(r"Budget\b.*?(20\d{2}(?:[-–—]?20\d{2})?)", context_snippet, re.IGNORECASE)
    if year_match:
        budget_label = f"Union Budget {year_match.group(1)}"
    else:
        budget_label = "Union Budget"

    prompt = f"""You are a nonpartisan civic assistant helping an Indian citizen understand how the {budget_label} affects them personally.

IMPORTANT RULES:
1. Use ONLY the budget document text below. Do not add any figures or provisions not present in it.
2. If the document does not cover the citizen's situation, say so explicitly.
3. Be concrete — mention actual rupee amounts, percentages, and scheme names from the document.
4. Keep the summary under 200 words. Key points should each be one concise sentence.

BUDGET DOCUMENT (excerpt — first {CONTEXT_CHAR_LIMIT:,} characters):
---
{context_snippet}
---

CITIZEN PROFILE:
- Category: {body.profile}
- Annual Income: ₹{body.income:,.0f}{question_line}
- State of Residence: {body.state}

Explain how this budget affects this specific citizen. Focus on:
- Direct tax changes (income tax slabs, deductions, rebates) relevant to their income level
- Subsidies, schemes, or allocations relevant to their profile category
- Any sector-specific provisions (agriculture, education, health, MSME, etc.) that apply
- One-line overall signal: does this budget benefit, neutralise, or burden this citizen?

Respond in JSON with exactly these keys:
{{
  "summary": "<overall impact in 2-3 sentences>",
  "key_points": ["<point 1>", "<point 2>", "<point 3>"],
  "overall_signal": "benefit" | "neutral" | "burden",
  "confidence_score": <float 0.0-1.0 reflecting how well the document covers this profile>
}}"""

    result = ai_call_with_context(prompt=prompt, task="budget_impact")

    # Ensure required keys are present even if the AI returned a partial response.
    result.setdefault("summary", "Could not generate analysis from the budget document.")
    result.setdefault("key_points", [])
    result.setdefault("overall_signal", "neutral")
    result.setdefault("confidence_score", 0.0)

    return result
