"""GET /api/v1/updates  &  GET /api/v1/updates/{id}  &  POST /api/v1/updates/{id}/dispute"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api._serializers import to_update_detail, to_update_out
from app.db import get_db
from app.models import AuditLog, Document
from app.schemas import UpdateDetail, UpdateList

router = APIRouter(prefix="/updates", tags=["updates"])


@router.get("", response_model=UpdateList)
def list_updates(
    db: Session = Depends(get_db),
    constituency_id: int | None = None,
    source_id: int | None = None,
    document_type: str | None = None,
    q: str | None = None,
    from_: datetime | None = Query(None, alias="from"),
    to: datetime | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> UpdateList:
    stmt = select(Document).options(
        selectinload(Document.source),
        selectinload(Document.summaries),
    )

    filters = [Document.status == "published"]
    if constituency_id is not None:
        filters.append(Document.constituency_id == constituency_id)
    if source_id is not None:
        filters.append(Document.source_id == source_id)
    if document_type:
        filters.append(Document.document_type == document_type)
    if from_:
        filters.append(Document.fetched_at >= from_)
    if to:
        filters.append(Document.fetched_at <= to)
    if q:
        like = f"%{q}%"
        filters.append(or_(Document.title.ilike(like), Document.extracted_text.ilike(like)))

    stmt = stmt.where(*filters).order_by(desc(Document.fetched_at))

    total = db.execute(select(func.count()).select_from(Document).where(*filters)).scalar_one()
    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()

    return UpdateList(
        items=[to_update_out(d) for d in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{doc_id}", response_model=UpdateDetail)
def get_update(doc_id: int, db: Session = Depends(get_db)) -> UpdateDetail:
    doc = db.execute(
        select(Document)
        .where(Document.id == doc_id)
        .options(
            selectinload(Document.source),
            selectinload(Document.summaries),
            selectinload(Document.facts),
        )
    ).scalar_one_or_none()
    if doc is None:
        raise HTTPException(404, "Document not found")
    return to_update_detail(doc)


class DisputeIn(BaseModel):
    note: str = Field(..., min_length=4, max_length=2000)


@router.post("/{doc_id}/dispute", status_code=202)
def flag_dispute(doc_id: int, body: DisputeIn, db: Session = Depends(get_db)) -> dict:
    """
    Citizen-flagged correction. Sets dispute_flag=True, stores the note, and
    audit-logs the action. The document remains visible — Nagarik's commitment
    is to transparency, including over its own mistakes — but the UI will show
    a "marked for review" banner so readers know the content is contested.
    """
    doc = db.execute(select(Document).where(Document.id == doc_id)).scalar_one_or_none()
    if doc is None:
        raise HTTPException(404, "Document not found")

    doc.dispute_flag = True
    # Append rather than overwrite — multiple citizens can flag the same doc.
    appended = body.note.strip()
    if doc.dispute_note:
        doc.dispute_note = f"{doc.dispute_note}\n---\n{appended}"
    else:
        doc.dispute_note = appended

    db.add(
        AuditLog(
            actor="api",
            action="document.disputed",
            entity_type="document",
            entity_id=doc.id,
            payload_json={"note_excerpt": appended[:200]},
        )
    )
    db.commit()
    return {"status": "flagged", "document_id": doc.id, "dispute_flag": True}
