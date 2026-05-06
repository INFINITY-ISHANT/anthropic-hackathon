"use client";

import { useState } from "react";
import { api, type ClaimCheckResult } from "@/lib/api";
import { ConfidenceBadge } from "@/components/Trust";

const TIER_STYLE: Record<ClaimCheckResult["tier"], { bg: string; label: string }> = {
  verified:    { bg: "bg-green text-white",                                   label: "Verified ✓" },
  misleading:  { bg: "bg-amber text-white",                                   label: "Misleading ⚠" },
  false:       { bg: "bg-saffron text-white",                                 label: "False ✗" },
  unverifiable:{ bg: "bg-paper-deep text-ink border border-paper-line",       label: "Unverifiable —" },
  opinion:     { bg: "bg-ashoka-soft text-ashoka-deep border border-ashoka/30", label: "Opinion (not fact-checkable)" },
};

export default function ClaimCheckerPage() {
  const [claim, setClaim] = useState("");
  const [result, setResult] = useState<ClaimCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCheck() {
    if (claim.trim().length < 5) {
      setError("Please write a claim of at least a few words.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.claimCheck(claim);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <header className="ruled pt-3 mb-10">
        <p className="ident">Claim Checker</p>
        <h1 className="font-display font-semibold text-4xl md:text-5xl mt-2 tracking-tightish">
          Check a political claim.
        </h1>
        <p className="mt-4 text-ink-soft max-w-column leading-relaxed">
          Paste a political claim, speech excerpt, or forwarded message. Get a factual
          assessment based on public records — with the reasoning shown in full so you
          can audit the verdict.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
        <section>
          <p className="label-caps mb-3">Claim</p>
          <textarea
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            rows={6}
            maxLength={2000}
            className="w-full bg-paper-deep border border-paper-line text-sm py-3 px-4 outline-none focus:border-ashoka rounded-sm leading-relaxed"
            placeholder="e.g. 'The government built 2 crore houses under PM Awas Yojana by 2023.'"
          />
          <p className="text-[11px] text-ink-muted mt-1">
            {claim.length}/2000 characters
          </p>

          <div className="mt-6">
            <button
              onClick={onCheck}
              disabled={loading || claim.trim().length < 5}
              className="bg-ink text-paper px-6 py-3 text-sm uppercase tracking-wideish font-medium hover:bg-ashoka transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Checking against public records…" : "Check →"}
            </button>
          </div>

          {error && (
            <div className="mt-4 border-l-4 border-saffron bg-saffron-soft px-4 py-3 rounded-sm">
              <p className="text-sm text-saffron font-medium">{error}</p>
            </div>
          )}
        </section>

        <section className="md:border-l md:border-paper-line md:pl-8">
          {!result && !loading && (
            <div className="text-ink-muted text-sm leading-relaxed">
              <p className="label-caps mb-3">Assessment</p>
              <p>
                The checker classifies claims into five tiers: <em>Verified</em>, <em>Misleading</em>,
                <em> False</em>, <em>Unverifiable</em>, or <em>Opinion</em>. The reasoning
                shown is the product — never hidden behind a one-word verdict.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-3 text-ink-soft">
              <span className="inline-block w-4 h-4 border-2 border-ashoka border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Checking against public records…</span>
            </div>
          )}

          {result && <ClaimResultView result={result} />}
        </section>
      </div>
    </div>
  );
}

function ClaimResultView({ result }: { result: ClaimCheckResult }) {
  const tier = TIER_STYLE[result.tier];

  return (
    <div className="space-y-6">
      {/* Big tier badge — first thing the eye lands on */}
      <div>
        <span className={`inline-block font-display font-semibold text-2xl px-5 py-2.5 rounded-sm tracking-tightish ${tier.bg}`}>
          {tier.label}
        </span>
      </div>

      {/* Restated claim */}
      {result.claim_as_understood && (
        <p className="italic text-ink-soft leading-relaxed max-w-column">
          As understood: {result.claim_as_understood}
        </p>
      )}

      {/* Opinion-tier short circuit */}
      {result.tier === "opinion" && (
        <div className="border-l-4 border-ashoka bg-ashoka-soft px-4 py-3 rounded-sm">
          <p className="text-sm text-ashoka-deep">
            This is a value judgment or policy preference. Nagarik does not fact-check opinions.
          </p>
        </div>
      )}

      {/* Reasoning — MANDATORY full display, never truncated */}
      {result.reasoning && (
        <div>
          <p className="label-caps mb-2">Assessment</p>
          <p className="text-ink leading-relaxed max-w-column whitespace-pre-line">
            {result.reasoning}
          </p>
        </div>
      )}

      {result.what_would_verify_this && (
        <div>
          <p className="label-caps mb-2">What would settle this</p>
          <p className="text-ink-soft leading-relaxed max-w-column">
            {result.what_would_verify_this}
          </p>
        </div>
      )}

      {result.suggested_sources.length > 0 && (
        <div>
          <p className="label-caps mb-2">Where to verify</p>
          <ul className="space-y-1">
            {result.suggested_sources.map((s, i) => (
              <li key={i} className="text-sm text-ink-soft flex gap-2">
                <span className="text-ink-muted">·</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <ConfidenceBadge score={result.confidence} />
      </div>

      {/* Fixed disclaimer — appears on every result */}
      <p className="border-t border-paper-line pt-4 text-[11px] text-ink-muted leading-relaxed">
        This assessment is AI-generated from public records knowledge.
        Nagarik does not make final determinations. Always verify with the sources listed above.
        Model: <span className="font-mono">{result._model}</span>.
      </p>
    </div>
  );
}
