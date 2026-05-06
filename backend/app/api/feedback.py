"""GET /api/v1/feedback (clusters)  &  POST /api/v1/feedback (submit)  &  GET /api/v1/feedback/issues
&  GET /api/v1/feedback/by-constituency/{cid}
"""

import hashlib
import logging
import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.ai.client import ai_call_with_context
from app.db import SessionLocal, get_db
from app.models import CitizenFeedback, Constituency, FeedbackCluster, Topic
from app.schemas import FeedbackClusterOut, FeedbackIn, FeedbackOut

router = APIRouter(prefix="/feedback", tags=["feedback"])
logger = logging.getLogger(__name__)

# Per-IP rate limit on submission endpoint.
limiter = Limiter(key_func=get_remote_address)


@router.get("", response_model=list[FeedbackClusterOut])
def list_clusters(
    db: Session = Depends(get_db),
    constituency_id: Optional[int] = None,
    topic_id: Optional[int] = None,
) -> list[FeedbackClusterOut]:
    stmt = select(FeedbackCluster).order_by(desc(FeedbackCluster.count))
    if constituency_id is not None:
        stmt = stmt.where(FeedbackCluster.constituency_id == constituency_id)
    if topic_id is not None:
        stmt = stmt.where(FeedbackCluster.topic_id == topic_id)
    rows = db.execute(stmt).scalars().all()
    return [FeedbackClusterOut.model_validate(r, from_attributes=True) for r in rows]


# --------------------------------------------------------------------------------------
# Cluster regeneration helpers (used both inline by the new GET endpoint and as a
# BackgroundTask after every POST submission so the constituency page stays fresh).
# --------------------------------------------------------------------------------------

def _summarise_cluster(messages: list[str]) -> str:
    """Call the AI to produce a one-paragraph summary of citizen messages.
    Falls back to the most recent message text if the model is unavailable."""
    joined = "\n---\n".join(messages[:25])  # cap context to keep tokens reasonable
    prompt = (
        "You are summarising citizen feedback messages from a single Indian constituency, "
        "all on the same broad topic. Read the messages below and produce ONE concise "
        "paragraph (max 80 words) describing what citizens are collectively saying. "
        "Use a neutral, factual tone. Do NOT add details that aren't in the messages.\n\n"
        f"MESSAGES:\n---\n{joined}\n---\n\n"
        "Respond as JSON: {\"summary\": \"<one paragraph>\", \"confidence_score\": <0-1>}"
    )
    result = ai_call_with_context(prompt=prompt, task="constituency_cluster_summary")
    summary = (result.get("summary") or "").strip()
    if not summary:
        # Last-ditch fallback so the UI always has something to render.
        summary = messages[0][:300] if messages else ""
    return summary


def _upsert_cluster(
    db: Session,
    *,
    constituency_id: int,
    topic_id: int | None,
    summary: str,
    count: int,
    avg_sentiment: float,
    sample_ids: list[int],
) -> None:
    """Idempotent upsert by (constituency_id, topic_id)."""
    stmt = select(FeedbackCluster).where(
        FeedbackCluster.constituency_id == constituency_id,
        FeedbackCluster.topic_id == topic_id,
    )
    existing = db.execute(stmt).scalar_one_or_none()
    if existing is None:
        db.add(
            FeedbackCluster(
                constituency_id=constituency_id,
                topic_id=topic_id,
                summary=summary,
                count=count,
                avg_sentiment=avg_sentiment,
                last_updated=datetime.utcnow(),
                sample_feedback_ids_json=sample_ids,
            )
        )
    else:
        existing.summary = summary
        existing.count = count
        existing.avg_sentiment = avg_sentiment
        existing.last_updated = datetime.utcnow()
        existing.sample_feedback_ids_json = sample_ids
    db.commit()


def _regenerate_clusters_for_constituency(constituency_id: int) -> None:
    """Background task: rebuild every (topic_id) cluster for one constituency.
    Uses a fresh DB session because BackgroundTasks runs after the request-scoped
    session has already been closed."""
    try:
        with SessionLocal() as db:
            stmt = (
                select(CitizenFeedback)
                .where(
                    CitizenFeedback.constituency_id == constituency_id,
                    CitizenFeedback.status == "approved",
                )
                .order_by(desc(CitizenFeedback.submitted_at))
            )
            rows = db.execute(stmt).scalars().all()
            buckets: dict[int | None, list[CitizenFeedback]] = {}
            for r in rows:
                buckets.setdefault(r.topic_id, []).append(r)

            for topic_id, items in buckets.items():
                count = len(items)
                avg_sent = (
                    sum((i.sentiment or 0.0) for i in items) / count if count else 0.0
                )
                if count >= 2:
                    summary = _summarise_cluster([i.text for i in items])
                else:
                    summary = items[0].text[:600] if items else ""

                _upsert_cluster(
                    db,
                    constituency_id=constituency_id,
                    topic_id=topic_id,
                    summary=summary,
                    count=count,
                    avg_sentiment=float(avg_sent),
                    sample_ids=[i.id for i in items[:5]],
                )
    except Exception:
        logger.exception(
            "Background cluster regeneration failed for constituency_id=%s",
            constituency_id,
        )


# --------------------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------------------

_TOPIC_PREFIX_RE = re.compile(r"^\s*(?P<slug>[a-z0-9]+(?:-[a-z0-9]+)*)\s*:\s*(?P<rest>.+)$")


def _infer_topic_id_from_text(db: Session, text: str) -> tuple[int | None, str]:
    """
    Best-effort: if the user message starts with "<topic-slug>: ...", map slug → Topic.id.
    Returns (topic_id, cleaned_text).
    """
    m = _TOPIC_PREFIX_RE.match(text or "")
    if not m:
        return None, text
    slug = (m.group("slug") or "").strip().lower()
    rest = (m.group("rest") or "").strip()
    if not slug:
        return None, text
    topic_id = db.execute(select(Topic.id).where(Topic.slug == slug)).scalar_one_or_none()
    return (int(topic_id) if topic_id is not None else None), (rest or text)


@router.post("", response_model=FeedbackOut, status_code=201)
@limiter.limit("5/minute")
def submit_feedback(
    payload: FeedbackIn,
    request: Request,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
) -> FeedbackOut:
    # Validate foreign keys up-front so bad IDs return 4xx (not 500).
    if payload.constituency_id is not None:
        exists = db.execute(
            select(Constituency.id).where(Constituency.id == payload.constituency_id)
        ).scalar_one_or_none()
        if exists is None:
            raise HTTPException(status_code=400, detail="Invalid constituency_id")

    topic_id = payload.topic_id
    clean_text = payload.text.strip()

    # If caller didn't send topic_id, infer from "slug: message" prefix.
    if topic_id is None:
        inferred_topic_id, inferred_text = _infer_topic_id_from_text(db, clean_text)
        if inferred_topic_id is not None:
            topic_id = inferred_topic_id
            clean_text = inferred_text
    else:
        exists = db.execute(select(Topic.id).where(Topic.id == topic_id)).scalar_one_or_none()
        if exists is None:
            raise HTTPException(status_code=400, detail="Invalid topic_id")

    ip = get_remote_address(request) or "unknown"
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:32]

    fb = CitizenFeedback(
        text=clean_text,
        language=payload.language,
        constituency_id=payload.constituency_id,
        document_id=payload.document_id,
        topic_id=topic_id,
        ip_hash=ip_hash,
        status="approved",      # Instant publication — no moderation queue.
        sentiment=0.0,          # set later by clustering job
    )
    try:
        db.add(fb)
        db.commit()
        db.refresh(fb)
    except IntegrityError:
        db.rollback()
        # e.g. FK constraint failure, null constraint, etc.
        raise HTTPException(status_code=400, detail="Invalid feedback payload")

    # Fire-and-forget: refresh cluster summaries for the affected constituency
    # so /constituencies/{id} reflects this submission within seconds.
    if fb.constituency_id is not None:
        background.add_task(_regenerate_clusters_for_constituency, fb.constituency_id)

    return FeedbackOut.model_validate(fb, from_attributes=True)


@router.get("/issues")
def list_issues(
    db: Session = Depends(get_db),
    constituency_id: Optional[int] = None,
) -> dict:
    """
    Aggregated issue counts: how many citizens have flagged each topic, and
    optionally scoped to a single constituency. Returns rows sorted by count
    descending so the UI can render a "top issues" list without re-sorting.
    """
    stmt = (
        select(
            Topic.id.label("topic_id"),
            Topic.name.label("topic_name"),
            Topic.slug.label("topic_slug"),
            CitizenFeedback.constituency_id.label("constituency_id"),
            Constituency.name.label("constituency_name"),
            func.count(CitizenFeedback.id).label("count"),
        )
        .join(Topic, CitizenFeedback.topic_id == Topic.id)
        .join(Constituency, CitizenFeedback.constituency_id == Constituency.id, isouter=True)
        .where(CitizenFeedback.status == "approved")
        .group_by(
            Topic.id,
            Topic.name,
            Topic.slug,
            CitizenFeedback.constituency_id,
            Constituency.name,
        )
        .order_by(desc(func.count(CitizenFeedback.id)))
    )
    if constituency_id is not None:
        stmt = stmt.where(CitizenFeedback.constituency_id == constituency_id)

    rows = db.execute(stmt).all()
    return {
        "items": [
            {
                "topic_id": r.topic_id,
                "topic_name": r.topic_name,
                "topic_slug": r.topic_slug,
                "constituency_id": r.constituency_id,
                "constituency_name": r.constituency_name,
                "count": r.count,
            }
            for r in rows
        ],
        "total_topics": len({r.topic_id for r in rows}),
    }


@router.get("/by-constituency/{cid}")
def feedback_by_constituency(cid: int, db: Session = Depends(get_db)) -> dict:
    """
    Live feed of every approved citizen feedback for a constituency, plus
    AI-summarised clusters grouped by topic_id.

    Cluster summaries are cached in FeedbackCluster keyed by
    (constituency_id, topic_id) and refreshed whenever new submissions arrive.
    """
    # Validate constituency so callers get a clean 404 instead of an empty payload.
    if db.execute(select(Constituency).where(Constituency.id == cid)).scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Constituency not found")

    stmt = (
        select(
            CitizenFeedback.id,
            CitizenFeedback.text,
            CitizenFeedback.language,
            CitizenFeedback.sentiment,
            CitizenFeedback.topic_id,
            CitizenFeedback.submitted_at,
            Topic.name.label("topic_name"),
        )
        .join(Topic, CitizenFeedback.topic_id == Topic.id, isouter=True)
        .where(
            CitizenFeedback.constituency_id == cid,
            CitizenFeedback.status == "approved",
        )
        .order_by(desc(CitizenFeedback.submitted_at))
    )
    rows = db.execute(stmt).all()

    raw_feedback = [
        {
            "id": r.id,
            "text": r.text,
            "language": r.language,
            "sentiment": float(r.sentiment or 0.0),
            "topic_id": r.topic_id,
            "topic_name": r.topic_name,
            "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
        }
        for r in rows
    ]

    # Group rows by topic_id, then build/refresh a cluster card for each group.
    buckets: dict[int | None, list] = {}
    for r in rows:
        buckets.setdefault(r.topic_id, []).append(r)

    clusters: list[dict] = []
    for topic_id, items in buckets.items():
        count = len(items)
        avg_sent = sum(float(i.sentiment or 0.0) for i in items) / count if count else 0.0
        topic_name = items[0].topic_name if items else None

        if count >= 2:
            # Look up the cached summary first; only call the model on cache miss
            # or when new submissions changed the count.
            cached = db.execute(
                select(FeedbackCluster).where(
                    FeedbackCluster.constituency_id == cid,
                    FeedbackCluster.topic_id == topic_id,
                )
            ).scalar_one_or_none()

            if cached and cached.count == count and cached.summary:
                summary = cached.summary
            else:
                summary = _summarise_cluster([i.text for i in items])
                _upsert_cluster(
                    db,
                    constituency_id=cid,
                    topic_id=topic_id,
                    summary=summary,
                    count=count,
                    avg_sentiment=float(avg_sent),
                    sample_ids=[i.id for i in items[:5]],
                )
        else:
            # Single-item cluster: no AI call needed, the raw text IS the summary.
            summary = items[0].text if items else ""

        clusters.append(
            {
                "topic_id": topic_id,
                "topic_name": topic_name,
                "count": count,
                "summary": summary,
                "avg_sentiment": float(avg_sent),
                "submissions": [
                    {
                        "id": i.id,
                        "text": i.text,
                        "submitted_at": i.submitted_at.isoformat() if i.submitted_at else None,
                    }
                    for i in items
                ],
            }
        )

    # Sort clusters by count desc; push uncategorised (topic_id is None) to the bottom.
    clusters.sort(key=lambda c: (c["topic_id"] is None, -c["count"]))

    return {
        "raw_feedback": raw_feedback,
        "clusters": clusters,
        "total": len(raw_feedback),
    }
