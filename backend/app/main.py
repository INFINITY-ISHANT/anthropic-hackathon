"""
FastAPI entrypoint. Wires routers, starts the scheduler, ensures the DB exists,
and runs the seed loader on first boot so the demo has data immediately.
"""

import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import func, select

from app.api import (
    admin,
    budget_calculator,
    candidates,
    claim_check,
    constituencies,
    decode,
    feedback,
    rights,
    rti,
    scheme_check,
    search,
    updates,
)
from app.api.feedback import limiter
from app.config import get_settings
from app.db import SessionLocal
from app.ingestion.pipeline import run_all
from app.models import Document
from app.scheduler import shutdown_scheduler, start_scheduler
from app.seed import seed_all

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logging.basicConfig(
        level=settings.log_level,
        format="%(asctime)s %(levelname)-7s %(name)s :: %(message)s",
    )
    logger.info("Nagarik backend starting (env=%s)…", settings.env)

    # Idempotent: creates tables + seeds reference data on every boot.
    seed_all()

    # First-boot bootstrap: if the DB is empty, kick off ingestion in a daemon
    # thread so the homepage isn't an empty page until midnight IST.
    try:
        with SessionLocal() as db:
            doc_count = db.execute(select(func.count()).select_from(Document)).scalar_one()
        if doc_count == 0:
            logger.info("Empty DB on boot — triggering initial ingestion in background")
            threading.Thread(target=run_all, name="initial-ingest", daemon=True).start()
        else:
            logger.info("DB already has %d documents — skipping initial ingestion", doc_count)
    except Exception:
        logger.exception("Initial-ingestion bootstrap check failed (non-fatal)")

    start_scheduler()
    try:
        yield
    finally:
        logger.info("Nagarik backend shutting down…")
        shutdown_scheduler()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Nagarik API",
        version="0.1.0",
        description="Nonpartisan civic intelligence platform — backend.",
        lifespan=lifespan,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api_prefix = "/api/v1"
    app.include_router(updates.router, prefix=api_prefix)
    app.include_router(constituencies.router, prefix=api_prefix)
    app.include_router(candidates.router, prefix=api_prefix)
    app.include_router(feedback.router, prefix=api_prefix)
    app.include_router(search.router, prefix=api_prefix)
    app.include_router(admin.router, prefix=api_prefix)
    app.include_router(decode.router, prefix=api_prefix)
    app.include_router(claim_check.router, prefix=api_prefix)
    app.include_router(budget_calculator.router, prefix=api_prefix)
    app.include_router(scheme_check.router, prefix=api_prefix)
    app.include_router(rights.router, prefix=api_prefix)
    app.include_router(rti.router, prefix=api_prefix)

    @app.get("/", tags=["meta"])
    def root() -> dict:
        return {
            "name": "Nagarik",
            "version": "0.1.0",
            "docs": "/docs",
            "api": api_prefix,
        }

    @app.get("/healthz", tags=["meta"])
    def healthz() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
