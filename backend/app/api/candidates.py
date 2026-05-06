"""GET /api/v1/candidates/{id}  &  GET /api/v1/candidates/{id}/brief"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from app.ai.client import ai_call
from app.api._serializers import to_update_out
from app.db import get_db
from app.models import Candidacy, Document, ManifestoItem, ManifestoProgressUpdate, Politician
from app.schemas import (
    CandidacyOut,
    CandidateDetail,
    ManifestoItemOut,
    ManifestoProgressOut,
    PoliticianOut,
)

router = APIRouter(prefix="/candidates", tags=["candidates"])


@router.get("/{politician_id}", response_model=CandidateDetail)
def get_candidate(politician_id: int, db: Session = Depends(get_db)) -> CandidateDetail:
    p = db.execute(
        select(Politician)
        .where(Politician.id == politician_id)
        .options(selectinload(Politician.candidacies))
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(404, "Politician not found")

    # Affidavit doc — pick the most recent candidacy that has one.
    affidavit_doc = None
    cand_with_aff = next(
        (c for c in sorted(p.candidacies, key=lambda x: x.election_year, reverse=True) if c.affidavit_document_id),
        None,
    )
    if cand_with_aff:
        affidavit_doc = db.execute(
            select(Document)
            .where(Document.id == cand_with_aff.affidavit_document_id)
            .options(selectinload(Document.source), selectinload(Document.summaries))
        ).scalar_one_or_none()

    manifesto = (
        db.execute(select(ManifestoItem).where(ManifestoItem.politician_id == politician_id))
        .scalars()
        .all()
    )
    progress = (
        db.execute(
            select(ManifestoProgressUpdate)
            .where(
                ManifestoProgressUpdate.manifesto_item_id.in_([m.id for m in manifesto]) if manifesto else False
            )
            .order_by(desc(ManifestoProgressUpdate.recorded_at))
        )
        .scalars()
        .all()
    )

    candidacies = [
        CandidacyOut(
            id=c.id,
            politician=PoliticianOut.model_validate(p, from_attributes=True),
            constituency_id=c.constituency_id,
            election_year=c.election_year,
            status=c.status,
            affidavit_document_id=c.affidavit_document_id,
        )
        for c in p.candidacies
    ]

    return CandidateDetail(
        politician=PoliticianOut.model_validate(p, from_attributes=True),
        candidacies=candidacies,
        affidavit=to_update_out(affidavit_doc) if affidavit_doc else None,
        manifesto=[ManifestoItemOut.model_validate(m, from_attributes=True) for m in manifesto],
        progress=[ManifestoProgressOut.model_validate(pr, from_attributes=True) for pr in progress],
    )


@router.get("/{politician_id}/brief")
def get_candidate_brief(politician_id: int, db: Session = Depends(get_db)) -> dict:
    """
    AI-generated nonpartisan voter brief: a 3-sentence summary plus 3-5 notable
    facts, all derived strictly from the structured data already in the DB.
    Reads only — does not write. Suitable to call alongside /candidates/{id}.
    """
    p = db.execute(
        select(Politician)
        .where(Politician.id == politician_id)
        .options(selectinload(Politician.candidacies))
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(404, "Politician not found")

    manifesto = db.execute(
        select(ManifestoItem).where(ManifestoItem.politician_id == politician_id)
    ).scalars().all()

    achieved = sum(1 for m in manifesto if m.status == "achieved")
    total = len(manifesto)

    # Build a compact, plain-text data block. The prompt forbids invention,
    # so the LLM can only paraphrase what we hand it here.
    promise_lines = ", ".join(f"{m.title} [{m.status}]" for m in manifesto[:10]) or "none on record"
    data_block = (
        f"Name: {p.name}\n"
        f"Party: {p.party or 'Independent'}\n"
        f"Bio: {p.bio or 'Not available'}\n"
        f"Elections contested: {len(p.candidacies)}\n"
        f"Manifesto promises: {total} total, {achieved} achieved\n"
        f"Promise statuses: {promise_lines}\n"
    )
    return ai_call("candidate_brief", politician_data=data_block)
