"""
Per-step prompts. Each is narrow, deterministic, and JSON-output where possible.

Hard rules baked in:
  - Use ONLY facts present in the supplied text.
  - If unknown, return null — never guess.
  - Neutral, citizen-friendly tone.
  - Confidence is self-reported per step.
"""
from __future__ import annotations

CLASSIFY_PROMPT = """\
You are classifying a single Indian government / civic document.

Given the title and a text excerpt, choose ONE document_type from this exact list:
  - press_release
  - policy
  - budget
  - bill
  - affidavit
  - constituency_update
  - local_update
  - feedback
  - unknown

Respond with ONLY a JSON object, no prose, no markdown fences:
{{"document_type": "<one of the above>", "confidence": <0.0..1.0>}}

If you cannot tell, return "unknown" with low confidence.

TITLE: {title}

EXCERPT (first 1500 chars):
{excerpt}
"""

EXTRACT_PROMPT = """\
You are extracting structured facts from an Indian government / civic document.

Use ONLY information that is literally present in the text below.
If a field is not stated, set it to null. Do not infer or guess.

Respond with ONLY a JSON object in this exact shape:
{{
  "who": <string or null>,             // primary actor (ministry, official, body)
  "what": <string or null>,            // main action or announcement, in <=20 words
  "where": <string or null>,           // place, constituency, district, state — most specific available
  "when": <string or null>,            // date or timeframe as written in the text
  "affected_group": <string or null>,  // who is impacted (e.g. "farmers", "residents of Delhi")
  "key_numbers": [<strings>],          // amounts, percentages, counts as written; [] if none
  "deadlines": [<strings>],            // any explicit deadlines; [] if none
  "actions_required": [<strings>],     // anything citizens must do; [] if none
  "named_entities": [<strings>],       // people, orgs, places, schemes — deduplicated
  "confidence": <0.0..1.0>
}}

TITLE: {title}

TEXT:
{text}
"""

SUMMARIZE_PROMPT_EN = """\
You are writing a citizen-friendly summary of an Indian government / civic document.

Rules:
  - Use ONLY facts present in the text below.
  - Neutral and nonpartisan. No political spin, no opinion.
  - Plain language a non-expert can understand. No jargon.
  - If something isn't in the text, omit it. Do not invent.

Respond with ONLY a JSON object in this exact shape:
{{
  "one_line": <string>,               // <= 25 words, a single sentence
  "three_bullets": [<string>, <string>, <string>],   // each <= 25 words
  "why_it_matters": <string>,         // 1-2 sentences, plain impact, no rhetoric
  "who_is_affected": <string>,        // 1 sentence, concrete group(s)
  "confidence": <0.0..1.0>
}}

TITLE: {title}

TEXT:
{text}
"""

SUMMARIZE_PROMPT_HI = """\
आप एक भारतीय सरकारी / नागरिक दस्तावेज़ का सरल हिंदी सारांश लिख रहे हैं।

नियम:
  - केवल दिए गए पाठ में मौजूद तथ्यों का उपयोग करें।
  - तटस्थ और गैर-राजनीतिक भाषा। कोई राय नहीं।
  - सरल भाषा, बिना तकनीकी शब्दों के।
  - यदि कोई जानकारी पाठ में नहीं है, तो उसे शामिल न करें।

केवल JSON उत्तर दें, इस आकार में:
{{
  "one_line": <string>,
  "three_bullets": [<string>, <string>, <string>],
  "why_it_matters": <string>,
  "who_is_affected": <string>,
  "confidence": <0.0..1.0>
}}

शीर्षक: {title}

पाठ:
{text}
"""

MAP_TOPIC_PROMPT = """\
Given a document title and excerpt, choose up to 3 topic tags from this list:
{topic_list}

Also infer a likely Indian state, district, or constituency mentioned in the text — only if EXPLICITLY named.

Respond with ONLY a JSON object:
{{
  "topics": [<string>, ...],          // 0-3 items from the supplied list
  "state": <string or null>,          // state name as written, or null
  "district": <string or null>,
  "constituency": <string or null>,
  "confidence": <0.0..1.0>
}}

TITLE: {title}

EXCERPT:
{excerpt}
"""

CLUSTER_FEEDBACK_PROMPT = """\
You are summarising a cluster of citizen feedback messages on a single topic and constituency.

Rules:
  - Neutral tone. No political framing.
  - Use only what the messages actually say. No invention.
  - Identify recurring complaints if any.

Respond with ONLY a JSON object:
{{
  "summary": <string>,                  // 2-3 sentences
  "recurring_complaints": [<string>, ...],
  "suggested_actions": [<string>, ...], // only if citizens themselves suggest them
  "confidence": <0.0..1.0>
}}

FEEDBACK MESSAGES:
{messages}
"""


DECODE_DOCUMENT_PROMPT = """\
You are decoding an Indian government document for a citizen with no legal background.

Rules:
  - Use ONLY facts present in the text below. Never invent or assume.
  - Neutral, nonpartisan tone. No political opinion.
  - Plain language — a person with a Class 8 education must understand this.
  - If a field has no answer in the text, set it to null.

Respond with ONLY a JSON object, no prose, no markdown fences:
{{
  "one_line": <string, <=25 words, what this document is about>,
  "plain_summary": <string, 3-4 plain-language sentences explaining the document>,
  "what_it_means_for_citizens": <string, concrete real-world impact in <=3 sentences>,
  "action_required": <string or null, what citizens must do — null if nothing>,
  "who_is_affected": <string, specific group(s) — e.g. "farmers in Maharashtra", "all salaried employees">,
  "key_facts": [<strings — important numbers, dates, scheme names, amounts from the doc>],
  "document_type": <one of: press_release | policy | budget | bill | affidavit | unknown>,
  "confidence": <0.0..1.0>
}}

DOCUMENT TEXT:
{text}
"""


CLAIM_CHECK_PROMPT = """\
You are a nonpartisan fact-checker for Indian civic and political claims.

Classify the claim into exactly one tier:
  "verified"      — confirmed by official public records (name the record)
  "misleading"    — factually based but missing critical context that changes meaning
  "false"         — directly contradicted by official public data (name the contradiction)
  "unverifiable"  — cannot be confirmed or denied from available public sources
  "opinion"       — a value judgment, policy preference, or subjective claim — not fact-checkable

Rules:
  - NEVER fabricate evidence or data. If you cannot verify from known public records, use "unverifiable".
  - Show step-by-step reasoning BEFORE the tier. The reasoning IS the product — never omit it.
  - Neutral tone. No political framing. Assess the same claim the same way regardless of who made it.
  - Every non-opinion tier must cite what type of official source would confirm or refute it.

Respond with ONLY a JSON object, no prose, no markdown fences:
{{
  "claim_as_understood": <string, restate the claim neutrally in 1 sentence>,
  "tier": <"verified" | "misleading" | "false" | "unverifiable" | "opinion">,
  "reasoning": <string, 3-5 sentences of step-by-step assessment — mandatory>,
  "what_would_verify_this": <string, what type of source/data would settle this — null only for "opinion">,
  "suggested_sources": [<strings — specific source names e.g. "ECI affidavit (myneta.info)", "CAG report", "Lok Sabha Debates (sansad.in)", "India Budget documents (indiabudget.gov.in)">],
  "confidence": <0.0..1.0>
}}

CLAIM TO CHECK:
{claim}
"""


CANDIDATE_BRIEF_PROMPT = """\
You are writing a neutral, factual voter brief about an Indian politician.

Rules:
  - Use ONLY the data provided below. Never invent, assume, or embellish.
  - Strictly nonpartisan. No praise, no criticism. Only verifiable facts.
  - Plain language readable by a first-time voter.
  - The voter_summary must be exactly 3 sentences: (1) who they are, (2) their record, (3) their promises.
  - If data is missing, say so explicitly rather than filling gaps.

Respond with ONLY a JSON object, no prose, no markdown fences:
{{
  "voter_summary": <string, exactly 3 sentences as specified>,
  "notable_facts": [<strings, 3-5 factual bullet points directly from the data>],
  "promise_completion_rate": <integer 0-100 or null if no manifesto data>,
  "data_completeness": <"full" | "partial" | "minimal">,
  "confidence": <0.0..1.0>
}}

POLITICIAN DATA:
{politician_data}
"""


BUDGET_IMPACT_PROMPT = """\
You are a nonpartisan civic AI explaining the Indian Union Budget to a citizen.

Profile: {profile}
Annual income: Rs {income}
State: {state}

Rules:
  - Use only the most recent Union Budget you know about. Cite the budget year.
  - Plain language. No political framing — both proponents and critics describe
    the same allocations the same way.
  - If a profile/income/state combination doesn't have a clear effect, say so.
  - Never claim a number you don't actually know — use approximate ranges.
  - Always include the caveat verbatim.

Respond with ONLY a JSON object, no prose, no markdown fences:
{{
  "one_line": <string, one neutral sentence summarising overall budget exposure>,
  "tax_change": <string, qualitative or numeric — e.g. "approximately Rs 5,000 lower" or "no change">,
  "subsidies": [<strings, schemes the citizen may gain or lose access to>],
  "sectors": [<strings, key budget allocations relevant to this profile>],
  "signal": <"positive" | "neutral" | "negative">,
  "caveat": "This is AI-generated from public budget documents. Verify with a qualified financial advisor before any financial decision.",
  "budget_year": <string, e.g. "2024-25">,
  "confidence": <0.0..1.0>
}}
"""


POLICY_DIFF_PROMPT = """\
You are identifying changes between two versions of an Indian government policy.

Rules:
  - Use ONLY what is present in the two texts. Do not infer changes that aren't there.
  - Stay neutral on whether the changes are good or bad.
  - rights_impact assesses whether citizen rights are EXPANDED, RESTRICTED, or NEUTRAL — based only on what the text says.
  - If you can't tell, set rights_impact to "neutral" and lower confidence.

Respond with ONLY a JSON object, no prose, no markdown fences:
{{
  "added": [<strings, provisions in the new text that aren't in the old>],
  "removed": [<strings, provisions in the old text that aren't in the new>],
  "modified": [<strings, provisions present in both but materially changed>],
  "rights_impact": <"expands" | "restricts" | "neutral">,
  "plain_summary": <string, 2-3 sentence neutral summary of the difference>,
  "confidence": <0.0..1.0>
}}

OLD POLICY TEXT:
{old_text}

NEW POLICY TEXT:
{new_text}
"""


SCHEME_CHECK_PROMPT = """\
You are verifying the announced target of an Indian government scheme against
the actual delivered progress, using your knowledge of CAG reports, parliamentary
answers, and official government data.

Rules:
  - State numbers explicitly and cite which type of source they come from (CAG report, Lok Sabha unstarred question, scheme dashboard, etc).
  - If the data you know is older than 6 months, say so via data_vintage.
  - Do NOT characterise the gap as success or failure. Just surface the numbers.
  - If you cannot find verified progress numbers, say so — "unverified" is an honest answer.

Respond with ONLY a JSON object, no prose, no markdown fences:
{{
  "scheme_name": <string, restated>,
  "announced_target": <string, what was promised — restated in plain language>,
  "verified_progress": <string, what is actually delivered, with numbers if known, "unverified" otherwise>,
  "gap": <string, factual difference — neutral language only>,
  "data_vintage": <string, when the latest verified data is from>,
  "sources": [<strings, source types e.g. "CAG audit report 2023", "Lok Sabha unstarred question 1234", "MoH&FW dashboard">],
  "confidence": <0.0..1.0>
}}

SCHEME NAME: {scheme_name}
ANNOUNCED TARGET: {announced_target}
ANNOUNCED DATE: {announced_date}
"""


RIGHTS_NAVIGATOR_PROMPT = """\
You are an Indian rights navigator. A citizen describes a situation. Identify
what legal and constitutional rights apply and the concrete next steps available.

Rules:
  - Cite specific articles of the Constitution and named acts where they apply.
  - Suggest the actual office or body the citizen approaches — by name where possible.
  - Plain language. Avoid legalese unless explaining a specific term.
  - Always include the disclaimer verbatim.
  - If the situation is outside the scope of Indian civic law (e.g. private dispute), say so honestly.

Respond with ONLY a JSON object, no prose, no markdown fences:
{{
  "rights_applicable": [<strings, e.g. "Article 21 — right to life and personal liberty">],
  "next_steps": [<ordered list of concrete actions>],
  "grievance_authority": <string, which office/body to approach>,
  "relevant_laws": [<strings, e.g. "RTI Act 2005, Section 6">],
  "plain_summary": <string, 2-3 sentence overview>,
  "disclaimer": "This is general legal information, not personal legal advice. Consult a lawyer for action specific to your situation.",
  "confidence": <0.0..1.0>
}}

SITUATION:
{situation}
"""


RTI_DRAFT_PROMPT = """\
You are drafting a Right to Information (RTI) application under the RTI Act 2005.

Rules:
  - Use the standard RTI format. Address it to "The Public Information Officer".
  - Cite Section 6 of the RTI Act 2005.
  - Be specific about the information sought — vague requests get rejected.
  - Include a request for the information in soft copy form via email where reasonable.
  - The applicant's name and address are placeholders — leave them as "[Your Name]" and "[Your Address]".
  - Mention the Rs 10 fee (for central government bodies) and acceptable payment methods.
  - 30 days response timeline; first appeal authority within 30 days; CIC second appeal within 90 days.

Respond with ONLY a JSON object, no prose, no markdown fences:
{{
  "drafted_application": <string, the full RTI text formatted as an actual application — multi-paragraph, ready to copy>,
  "addressee": <string, the title and body the application is addressed to>,
  "where_to_file": <string, physical and online filing options>,
  "fee": <string, expected fee and payment methods>,
  "expected_timeline": <string, response, first appeal, second appeal timelines>,
  "tips": [<strings, practical tips for getting a useful response>],
  "confidence": <0.0..1.0>
}}

INFORMATION SOUGHT:
{information_sought}

GOVERNMENT BODY:
{government_body}

STATE:
{state}
"""
