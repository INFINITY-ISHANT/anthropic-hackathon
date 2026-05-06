"""
Deterministic, dependency-free fallbacks for every AI step.

Why this exists: the demo MUST run without an API key. Quality is intentionally
modest — we extract what's findable with regex/heuristics and label everything
with low confidence so the UI can flag it as `tentative`.
"""
from __future__ import annotations

import re
from typing import Any


_DOC_TYPE_KEYWORDS = {
    "press_release": ["press release", "press information", "pib delhi", "ministry of"],
    "budget": ["budget", "fiscal year", "appropriation", "expenditure outlay"],
    "bill": ["the bill", "act, 20", "amendment bill", "passed by"],
    "affidavit": ["affidavit", "form 26", "criminal cases", "assets and liabilities"],
    "policy": ["policy", "guidelines", "framework", "scheme"],
    "constituency_update": ["constituency", "voter", "polling station"],
    "local_update": ["municipal", "district magistrate", "ward"],
}

_NUMBER_RE = re.compile(r"(?:Rs\.?|₹|INR)\s?[\d,]+(?:\.\d+)?(?:\s?(?:crore|lakh|million|billion))?", re.I)
_DATE_RE = re.compile(
    r"\b(?:\d{1,2}(?:st|nd|rd|th)?\s+)?(?:January|February|March|April|May|June|July|August|"
    r"September|October|November|December)\s+\d{2,4}\b",
    re.I,
)
_DEADLINE_RE = re.compile(
    r"(?:by|before|deadline|last date|on or before)\s+[^.,;\n]{4,80}", re.I
)


class RuleBasedFallback:
    """Mirrors the JSON shapes produced by the LLM prompts. Low-confidence by design."""

    @staticmethod
    def classify(title: str, excerpt: str) -> dict[str, Any]:
        text = (title + " " + excerpt).lower()
        for dtype, keywords in _DOC_TYPE_KEYWORDS.items():
            if any(k in text for k in keywords):
                return {"document_type": dtype, "confidence": 0.4}
        return {"document_type": "unknown", "confidence": 0.2}

    @staticmethod
    def extract(title: str, text: str) -> dict[str, Any]:
        sentences = _split_sentences(text)
        first = sentences[0] if sentences else ""
        return {
            "who": _first_match(text, [r"Ministry of [A-Z][\w &]+", r"Government of [A-Z][\w]+"]),
            "what": (first[:120] if first else None),
            "where": _first_match(text, [r"in\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})"]),
            "when": (_DATE_RE.search(text).group(0) if _DATE_RE.search(text) else None),
            "affected_group": None,
            "key_numbers": _NUMBER_RE.findall(text)[:5],
            "deadlines": [m.group(0) for m in _DEADLINE_RE.finditer(text)][:3],
            "actions_required": [],
            "named_entities": _extract_entities(text)[:8],
            "confidence": 0.35,
        }

    @staticmethod
    def summarize(title: str, text: str, language: str = "en") -> dict[str, Any]:
        sentences = _split_sentences(text)
        if not sentences:
            return {
                "one_line": title or "Document with no extractable text.",
                "three_bullets": ["No text could be extracted.", "See original source.", "Confidence is low."],
                "why_it_matters": "Original source contains the authoritative version.",
                "who_is_affected": "Unknown — see source.",
                "confidence": 0.1,
            }
        one_line = sentences[0][:240]
        bullets = [s[:200] for s in sentences[:3]]
        while len(bullets) < 3:
            bullets.append("See original source for further details.")
        return {
            "one_line": one_line,
            "three_bullets": bullets,
            "why_it_matters": (sentences[1] if len(sentences) > 1 else one_line)[:240],
            "who_is_affected": "See original source for affected groups.",
            "confidence": 0.3,
        }

    @staticmethod
    def map_topic(title: str, excerpt: str, topic_list: list[str]) -> dict[str, Any]:
        text = (title + " " + excerpt).lower()
        topics = [t for t in topic_list if t.lower() in text][:3]
        # No reliable geography heuristic without a gazetteer — leave nulls.
        return {
            "topics": topics,
            "state": None,
            "district": None,
            "constituency": None,
            "confidence": 0.3 if topics else 0.15,
        }

    @staticmethod
    def decode(text: str) -> dict[str, Any]:
        sentences = _split_sentences(text)
        numbers = _NUMBER_RE.findall(text)[:5]
        return {
            "one_line": sentences[0][:200] if sentences else "Document with no extractable text.",
            "plain_summary": " ".join(sentences[:3]) if sentences else "No text could be extracted.",
            "what_it_means_for_citizens": "See the original source document for full details.",
            "action_required": None,
            "who_is_affected": "See original source for affected groups.",
            "key_facts": numbers,
            "document_type": "unknown",
            "confidence": 0.15,
        }

    @staticmethod
    def claim_check(claim: str) -> dict[str, Any]:
        return {
            "claim_as_understood": claim[:300],
            "tier": "unverifiable",
            "reasoning": (
                "Automated rule-based checking is not available. This claim requires manual "
                "verification against official records. Please consult the suggested sources."
            ),
            "what_would_verify_this": "Official government records, parliamentary documents, or ECI data.",
            "suggested_sources": [
                "ECI (eci.gov.in)",
                "PRS India (prsindia.org)",
                "Lok Sabha records (sansad.in)",
                "CAG reports (cag.gov.in)",
            ],
            "confidence": 0.0,
        }

    @staticmethod
    def candidate_brief(politician_data: str) -> dict[str, Any]:
        return {
            "voter_summary": (
                "Candidate data is available — see manifesto and affidavit sections below. "
                "Record details require verification from official ECI sources. "
                "Review the promises listed to assess their track record."
            ),
            "notable_facts": [
                "See manifesto section for listed promises.",
                "See affidavit section for declared assets and criminal cases.",
            ],
            "promise_completion_rate": None,
            "data_completeness": "minimal",
            "confidence": 0.1,
        }

    @staticmethod
    def budget_impact(profile: str, income: str, state: str) -> dict[str, Any]:
        return {
            "one_line": (
                "Without an LLM key configured, this calculator cannot produce a personalised "
                "budget impact. Read the Union Budget speech directly for authoritative numbers."
            ),
            "tax_change": "unknown — set ANTHROPIC_API_KEY for personalised estimates",
            "subsidies": [],
            "sectors": [],
            "signal": "neutral",
            "caveat": "This is AI-generated from public budget documents. Verify with a qualified financial advisor before any financial decision.",
            "budget_year": "unknown",
            "confidence": 0.0,
        }

    @staticmethod
    def policy_diff(old_text: str, new_text: str) -> dict[str, Any]:
        # Crude line-level diff, no semantic understanding — clearly low-confidence.
        old_set = {line.strip() for line in old_text.splitlines() if line.strip()}
        new_set = {line.strip() for line in new_text.splitlines() if line.strip()}
        added = sorted(new_set - old_set)[:8]
        removed = sorted(old_set - new_set)[:8]
        return {
            "added": added,
            "removed": removed,
            "modified": [],
            "rights_impact": "neutral",
            "plain_summary": (
                "Line-level diff only — no semantic comparison. Set ANTHROPIC_API_KEY for "
                "rights-impact analysis."
            ),
            "confidence": 0.2,
        }

    @staticmethod
    def scheme_check(scheme_name: str, announced_target: str, announced_date: str) -> dict[str, Any]:
        return {
            "scheme_name": scheme_name,
            "announced_target": announced_target,
            "verified_progress": "unverified — requires AI-assisted lookup against CAG and Lok Sabha records",
            "gap": "unknown",
            "data_vintage": "n/a",
            "sources": ["CAG reports (cag.gov.in)", "Lok Sabha unstarred questions (sansad.in)"],
            "confidence": 0.0,
        }

    @staticmethod
    def rights_navigator(situation: str) -> dict[str, Any]:
        return {
            "rights_applicable": [
                "Article 21 — right to life and personal liberty (broadest constitutional protection)"
            ],
            "next_steps": [
                "Document the situation in writing with dates and any evidence available.",
                "File a written grievance with the relevant authority via the National Grievance "
                "portal (pgportal.gov.in).",
                "If a public body is the respondent, file an RTI request to obtain official records.",
            ],
            "grievance_authority": (
                "National Grievance portal (pgportal.gov.in); for state-specific issues, the "
                "State Grievance Cell."
            ),
            "relevant_laws": [
                "RTI Act 2005, Section 6 — to request information from public authorities",
            ],
            "plain_summary": (
                "Without an LLM key, only generic guidance is available. Document your situation, "
                "use the grievance portal, and request records via RTI."
            ),
            "disclaimer": (
                "This is general legal information, not personal legal advice. Consult a lawyer "
                "for action specific to your situation."
            ),
            "confidence": 0.2,
        }

    @staticmethod
    def rti_draft(information_sought: str, government_body: str, state: str) -> dict[str, Any]:
        application = (
            "To,\n"
            "The Public Information Officer\n"
            f"{government_body}\n"
            f"{state}\n\n"
            "Subject: Application under the Right to Information Act, 2005\n\n"
            "Sir/Madam,\n\n"
            "Under Section 6 of the Right to Information Act, 2005, I request the following "
            "information regarding matters under your jurisdiction:\n\n"
            f"{information_sought}\n\n"
            "I request that this information be provided in soft copy form to my email address "
            "wherever reasonably possible.\n\n"
            "I am enclosing/transferring the prescribed fee of Rs 10 by Indian Postal Order / "
            "Demand Draft / online payment as applicable.\n\n"
            "I declare that I am a citizen of India.\n\n"
            "Yours faithfully,\n"
            "[Your Name]\n"
            "[Your Address]\n"
            "[Your Email]\n"
            "[Your Phone]\n"
            f"Date: ____________\nPlace: {state}\n"
        )
        return {
            "drafted_application": application,
            "addressee": f"The Public Information Officer, {government_body}, {state}",
            "where_to_file": (
                "File physically by post or in person at the office, or online via the central "
                "RTI portal (rtionline.gov.in) for central government bodies. Many states have "
                "their own online portals."
            ),
            "fee": (
                "Rs 10 for central government bodies (Indian Postal Order, Demand Draft, or "
                "online payment). State fees vary; some BPL applicants are exempt."
            ),
            "expected_timeline": (
                "Public Information Officer must respond within 30 days. If denied or unsatisfactory, "
                "first appeal to the First Appellate Authority within 30 days; second appeal to the "
                "Central Information Commission (or State Information Commission) within 90 days."
            ),
            "tips": [
                "Ask for specific documents or records, not interpretations or opinions.",
                "Cite dates, file numbers, or scheme names where possible.",
                "Keep a copy of your application and the receipt of the fee.",
            ],
            "confidence": 0.6,
        }

    @staticmethod
    def cluster_feedback(messages: list[str]) -> dict[str, Any]:
        if not messages:
            return {
                "summary": "No feedback received.",
                "recurring_complaints": [],
                "suggested_actions": [],
                "confidence": 0.1,
            }
        # Naive: pick the most common 4-word phrase as the recurring theme.
        phrases: dict[str, int] = {}
        for m in messages:
            words = re.findall(r"\w+", m.lower())
            for i in range(len(words) - 3):
                p = " ".join(words[i : i + 4])
                phrases[p] = phrases.get(p, 0) + 1
        recurring = [p for p, c in sorted(phrases.items(), key=lambda x: -x[1])[:3] if c > 1]
        return {
            "summary": f"{len(messages)} citizens submitted feedback. Common themes are listed below.",
            "recurring_complaints": recurring,
            "suggested_actions": [],
            "confidence": 0.25,
        }


# ---- helpers ----
def _split_sentences(text: str) -> list[str]:
    text = re.sub(r"\s+", " ", (text or "").strip())
    if not text:
        return []
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z])", text)
    return [p.strip() for p in parts if p.strip()]


def _first_match(text: str, patterns: list[str]) -> str | None:
    for p in patterns:
        m = re.search(p, text)
        if m:
            return m.group(0)
    return None


def _extract_entities(text: str) -> list[str]:
    # Title-cased multi-word phrases — crude proper-noun heuristic.
    candidates = re.findall(r"\b(?:[A-Z][a-z]+\s){1,3}[A-Z][a-z]+\b", text)
    seen: set[str] = set()
    out: list[str] = []
    for c in candidates:
        c = c.strip()
        if c not in seen and len(c) > 4:
            seen.add(c)
            out.append(c)
    return out
