"""
Single entry point for AI calls. If ANTHROPIC_API_KEY is set we call Claude with
JSON-mode prompts; otherwise we fall back to deterministic rules so the demo still
runs end-to-end.

The function name is intentionally generic — `ai_call(step, **kwargs)` — so the
pipeline doesn't care which backend ran.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from app.ai import prompts
from app.ai.rule_based import RuleBasedFallback
from app.config import get_settings

logger = logging.getLogger(__name__)


def _parse_json_loose(text: str) -> dict[str, Any]:
    """
    Parse JSON from model text, tolerating markdown fences and extra prose.
    Raises ValueError on failure.
    """
    s = (text or "").strip()
    if s.startswith("```"):
        s = s.strip("`")
        if s.lower().startswith("json"):
            s = s[4:]
        s = s.strip()

    # Fast path: pure JSON.
    try:
        obj = json.loads(s)
        if isinstance(obj, dict):
            return obj
    except Exception:
        pass

    # Fallback: extract largest JSON object-looking slice.
    start = s.find("{")
    end = s.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            obj = json.loads(s[start : end + 1])
            if isinstance(obj, dict):
                return obj
        except Exception:
            pass

    raise ValueError("Model response was not valid JSON")


# Lazy import: anthropic package is optional at runtime.
def _get_anthropic_client():
    try:
        import anthropic  # type: ignore
    except ImportError:
        return None
    settings = get_settings()
    if not settings.anthropic_api_key:
        return None
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def _llm_json(prompt: str, max_tokens: int = 1024) -> dict[str, Any] | None:
    """Call the LLM expecting a JSON object back. Returns None on any failure."""
    client = _get_anthropic_client()
    if client is None:
        return None
    settings = get_settings()
    try:
        msg = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(b.text for b in msg.content if hasattr(b, "text"))  # type: ignore[attr-defined]
        return _parse_json_loose(text)
    except Exception as e:
        logger.warning("LLM JSON call failed: %s", e)
        return None


def _model_for_task(task: str) -> str:
    settings = get_settings()
    if task == "budget_impact" and settings.anthropic_model_budget:
        return settings.anthropic_model_budget
    return settings.anthropic_model


def _model_id(task: str = "general") -> str:
    settings = get_settings()
    return _model_for_task(task) if settings.anthropic_api_key else "rule-based-fallback"


def ai_call_with_context(prompt: str, task: str = "general") -> dict:
    """
    Call the AI with a fully pre-built prompt that already embeds RAG context.
    Unlike ai_call(), this function takes the complete prompt string directly —
    the caller is responsible for assembling context + instructions.

    Returns a dict with at minimum:
      {"summary": str, "key_points": list[str], "confidence_score": float}

    Falls back gracefully if ANTHROPIC_API_KEY is absent.
    """
    settings = get_settings()
    client = _get_anthropic_client()

    if client is None:
        # Rule-based fallback: extract first substantive line as summary.
        first_para = next(
            (line.strip() for line in prompt.splitlines() if len(line.strip()) > 40),
            "No AI key configured — add ANTHROPIC_API_KEY to .env to enable analysis.",
        )
        return {
            "summary": first_para[:300],
            "key_points": ["Set ANTHROPIC_API_KEY in backend/.env to enable full analysis."],
            "confidence_score": 0.0,
            "_model": "rule-based-fallback",
        }

    try:
        model = _model_for_task(task)
        msg = client.messages.create(
            model=model,
            max_tokens=1024,
            system=(
                "You are a nonpartisan civic assistant. "
                "Answer only from the provided document. "
                "Never hallucinate numbers or provisions not in the text. "
                "Respond in JSON with keys: summary (str), key_points (list of str, max 5), "
                "confidence_score (float 0-1, how well the document covers this citizen's situation)."
            ),
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(b.text for b in msg.content if hasattr(b, "text")).strip()  # type: ignore[attr-defined]
        try:
            result = _parse_json_loose(text)
        except Exception:
            logger.warning("Model returned non-JSON (truncated): %s", text[:2000])
            raise
        result["_model"] = _model_id(task)
        return result
    except Exception as e:
        logger.warning("ai_call_with_context failed (task=%s): %s", task, e)
        return {
            "summary": "Analysis unavailable — the AI call failed. Check logs for details.",
            "key_points": [
                "The model response could not be parsed or the provider call failed.",
                "Verify ANTHROPIC_API_KEY and model settings in backend/.env (ANTHROPIC_MODEL / ANTHROPIC_MODEL_BUDGET), then restart backend.",
            ],
            "confidence_score": 0.0,
            "_model": "error-fallback",
        }


def ai_call(step: str, **kwargs: Any) -> dict[str, Any]:
    """
    Dispatch to the right prompt + parser per pipeline step.
    Falls back to rule_based on any failure. Always returns a dict.
    """
    if step == "classify":
        title = kwargs.get("title", "")
        excerpt = (kwargs.get("excerpt", "") or "")[:1500]
        result = _llm_json(prompts.CLASSIFY_PROMPT.format(title=title, excerpt=excerpt))
        if result is None or "document_type" not in result:
            result = RuleBasedFallback.classify(title, excerpt)
        result["_model"] = _model_id()
        return result

    if step == "extract":
        title = kwargs.get("title", "")
        text = (kwargs.get("text", "") or "")[:8000]
        result = _llm_json(prompts.EXTRACT_PROMPT.format(title=title, text=text), max_tokens=1500)
        if result is None or "what" not in result:
            result = RuleBasedFallback.extract(title, text)
        result["_model"] = _model_id()
        return result

    if step == "summarize":
        title = kwargs.get("title", "")
        text = (kwargs.get("text", "") or "")[:8000]
        language = kwargs.get("language", "en")
        prompt = (prompts.SUMMARIZE_PROMPT_HI if language == "hi" else prompts.SUMMARIZE_PROMPT_EN).format(
            title=title, text=text
        )
        result = _llm_json(prompt, max_tokens=1500)
        if result is None or "one_line" not in result:
            result = RuleBasedFallback.summarize(title, text, language)
        result["_model"] = _model_id()
        return result

    if step == "map_topic":
        title = kwargs.get("title", "")
        excerpt = (kwargs.get("excerpt", "") or "")[:1500]
        topic_list = kwargs.get("topic_list", [])
        prompt = prompts.MAP_TOPIC_PROMPT.format(
            title=title, excerpt=excerpt, topic_list=", ".join(topic_list)
        )
        result = _llm_json(prompt)
        if result is None or "topics" not in result:
            result = RuleBasedFallback.map_topic(title, excerpt, topic_list)
        result["_model"] = _model_id()
        return result

    if step == "cluster_feedback":
        messages = kwargs.get("messages", [])
        joined = "\n---\n".join(messages[:50])
        prompt = prompts.CLUSTER_FEEDBACK_PROMPT.format(messages=joined)
        result = _llm_json(prompt)
        if result is None or "summary" not in result:
            result = RuleBasedFallback.cluster_feedback(messages)
        result["_model"] = _model_id()
        return result

    if step == "decode":
        text = (kwargs.get("text", "") or "")[:15000]
        result = _llm_json(prompts.DECODE_DOCUMENT_PROMPT.format(text=text), max_tokens=2000)
        if result is None or "plain_summary" not in result:
            result = RuleBasedFallback.decode(text=text)
        result["_model"] = _model_id()
        return result

    if step == "claim_check":
        claim = (kwargs.get("claim", "") or "")[:2000]
        result = _llm_json(prompts.CLAIM_CHECK_PROMPT.format(claim=claim), max_tokens=1500)
        if result is None or "tier" not in result:
            result = RuleBasedFallback.claim_check(claim=claim)
        result["_model"] = _model_id()
        return result

    if step == "candidate_brief":
        politician_data = (kwargs.get("politician_data", "") or "")[:8000]
        result = _llm_json(
            prompts.CANDIDATE_BRIEF_PROMPT.format(politician_data=politician_data),
            max_tokens=1500,
        )
        if result is None or "voter_summary" not in result:
            result = RuleBasedFallback.candidate_brief(politician_data=politician_data)
        result["_model"] = _model_id()
        return result

    if step == "budget_impact":
        profile = str(kwargs.get("profile", ""))
        income = str(kwargs.get("income", ""))
        state = str(kwargs.get("state", ""))
        result = _llm_json(
            prompts.BUDGET_IMPACT_PROMPT.format(profile=profile, income=income, state=state),
            max_tokens=1500,
        )
        if result is None or "one_line" not in result:
            result = RuleBasedFallback.budget_impact(profile=profile, income=income, state=state)
        result["_model"] = _model_id()
        return result

    if step == "policy_diff":
        old_text = (kwargs.get("old_text", "") or "")[:6000]
        new_text = (kwargs.get("new_text", "") or "")[:6000]
        result = _llm_json(
            prompts.POLICY_DIFF_PROMPT.format(old_text=old_text, new_text=new_text),
            max_tokens=1800,
        )
        if result is None or "rights_impact" not in result:
            result = RuleBasedFallback.policy_diff(old_text=old_text, new_text=new_text)
        result["_model"] = _model_id()
        return result

    if step == "scheme_check":
        scheme_name = str(kwargs.get("scheme_name", ""))[:300]
        announced_target = str(kwargs.get("announced_target", ""))[:500]
        announced_date = str(kwargs.get("announced_date", ""))[:200]
        result = _llm_json(
            prompts.SCHEME_CHECK_PROMPT.format(
                scheme_name=scheme_name,
                announced_target=announced_target,
                announced_date=announced_date,
            ),
            max_tokens=1500,
        )
        if result is None or "verified_progress" not in result:
            result = RuleBasedFallback.scheme_check(
                scheme_name=scheme_name,
                announced_target=announced_target,
                announced_date=announced_date,
            )
        result["_model"] = _model_id()
        return result

    if step == "rights_navigator":
        situation = (kwargs.get("situation", "") or "")[:3000]
        result = _llm_json(
            prompts.RIGHTS_NAVIGATOR_PROMPT.format(situation=situation),
            max_tokens=1800,
        )
        if result is None or "rights_applicable" not in result:
            result = RuleBasedFallback.rights_navigator(situation=situation)
        result["_model"] = _model_id()
        return result

    if step == "rti_draft":
        info = (kwargs.get("information_sought", "") or "")[:2000]
        body = str(kwargs.get("government_body", ""))[:300]
        state = str(kwargs.get("state", ""))[:100]
        result = _llm_json(
            prompts.RTI_DRAFT_PROMPT.format(
                information_sought=info,
                government_body=body,
                state=state,
            ),
            max_tokens=2000,
        )
        if result is None or "drafted_application" not in result:
            result = RuleBasedFallback.rti_draft(
                information_sought=info,
                government_body=body,
                state=state,
            )
        result["_model"] = _model_id()
        return result

    raise ValueError(f"Unknown AI step: {step}")
