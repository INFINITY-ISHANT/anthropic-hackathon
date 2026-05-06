"""
Press Information Bureau adapter.
Scrapes https://www.pib.gov.in/allRel.aspx?reg=3&lang=1 directly —
the RSS feed is unreliable and often returns nothing.

Flow:
  1. GET the listing page → parse ministry headings + article links.
  2. For each article link → GET the article page → extract text.
  3. Yield FetchedItems back to the pipeline.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime

import httpx
from bs4 import BeautifulSoup

from app.ingestion.adapters.base import BaseAdapter, FetchedItem

logger = logging.getLogger(__name__)

LISTING_URL = "https://www.pib.gov.in/allRel.aspx?reg=3&lang=1"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-IN,en;q=0.9",
}


def _make_absolute(href: str) -> str:
    if not href:
        return ""
    if href.startswith("http"):
        return href
    return "https://www.pib.gov.in" + (href if href.startswith("/") else f"/{href}")


def _scrape_listing(html: bytes) -> list[dict]:
    """Return list of {ministry, title, url} from the PIB listing page."""
    soup = BeautifulSoup(html, "html.parser")

    # Try the main content container first, fall back to body.
    main = (
        soup.find("div", id="pageContent")
        or soup.find("div", class_="contentArea")
        or soup.find("main")
        or soup.body
    )
    if not main:
        return []

    items: list[dict] = []
    for heading in main.find_all("h3"):
        ministry = heading.get_text(strip=True)
        if not ministry or ministry.lower() in {"search", "navigation", "main"}:
            continue

        # Walk siblings until we hit the <ul> for this ministry or another heading.
        node = heading.find_next()
        while node:
            if node.name in {"h2", "h3", "h4"}:
                break
            if node.name in {"ul", "ol"}:
                for li in node.find_all("li", recursive=False):
                    a = li.find("a")
                    if not a:
                        continue
                    title = a.get_text(strip=True)
                    url = _make_absolute(a.get("href", ""))
                    if title and len(title) > 10 and url:
                        items.append({"ministry": ministry, "title": title, "url": url})
                break
            node = node.find_next()

    return items


def _scrape_article(html: bytes) -> tuple[str, str | None]:
    """Return (body_text, date_string | None) from an article page."""
    soup = BeautifulSoup(html, "html.parser")

    # Try common article containers.
    body = None
    for tag, klass in [
        ("div", "articleContent"),
        ("div", "content"),
        ("article", None),
        ("div", "body-text"),
        ("div", "pressRelease"),
    ]:
        body = (
            soup.find(tag, class_=lambda x: x and klass.lower() in x.lower())
            if klass
            else soup.find(tag)
        )
        if body:
            break
    if not body:
        body = soup.body

    paragraphs = body.find_all("p") if body else []
    text = "\n\n".join(p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True))

    date_str: str | None = None
    for cls in ("article-date", "publish-date", "date", "posted"):
        el = soup.find(class_=lambda x: x and cls in x.lower())
        if el:
            date_str = el.get_text(strip=True)
            break

    return text, date_str


class PIBAdapter(BaseAdapter):
    key = "pib"

    def fetch(self, source) -> list[FetchedItem]:  # type: ignore[override]
        cfg = source.config_json or {}
        max_items = int(cfg.get("max_items", 20))
        listing_url = cfg.get("listing_url", LISTING_URL)

        items: list[FetchedItem] = []

        try:
            with httpx.Client(timeout=20, follow_redirects=True, headers=HEADERS) as client:
                # Step 1: fetch the listing page.
                try:
                    resp = client.get(listing_url)
                    resp.raise_for_status()
                except Exception as e:
                    logger.error("PIB listing fetch failed: %s", e)
                    return items

                article_stubs = _scrape_listing(resp.content)
                logger.info("PIB listing page: found %d article links", len(article_stubs))

                # Step 2: fetch each article (respect rate limit).
                for stub in article_stubs[:max_items]:
                    url = stub["url"]
                    try:
                        art_resp = client.get(url)
                        art_resp.raise_for_status()
                    except Exception as e:
                        logger.warning("PIB article fetch failed %s: %s", url, e)
                        continue

                    body_text, date_str = _scrape_article(art_resp.content)

                    published_at: datetime | None = None
                    if date_str:
                        for fmt in ("%d %B %Y", "%B %d, %Y", "%d-%m-%Y", "%Y-%m-%d"):
                            try:
                                published_at = datetime.strptime(date_str.strip(), fmt)
                                break
                            except ValueError:
                                continue

                    # Build a synthetic HTML blob so the pipeline parser can handle it
                    # via its existing html→text path.
                    ministry_tag = stub.get("ministry", "")
                    synthetic_html = (
                        f"<html><body>"
                        f"<h1>{stub['title']}</h1>"
                        f"<p class='ministry'>{ministry_tag}</p>"
                        f"{''.join(f'<p>{p}</p>' for p in body_text.split(chr(10)+chr(10)) if p.strip())}"
                        f"</body></html>"
                    ).encode("utf-8")

                    items.append(
                        FetchedItem(
                            source_url=url,
                            title=stub["title"],
                            raw_bytes=synthetic_html,
                            content_type="text/html",
                            published_at=published_at,
                        )
                    )

                    time.sleep(0.5)  # be respectful to PIB servers

        except Exception as e:
            logger.exception("PIB adapter crashed: %s", e)

        logger.info("PIB adapter returning %d items", len(items))
        return items
