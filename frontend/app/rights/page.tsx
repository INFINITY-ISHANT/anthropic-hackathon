"use client";

import { useState } from "react";
import { api, type RightsResult } from "@/lib/api";
import { ConfidenceBadge } from "@/components/Trust";

export default function RightsNavigatorPage() {
  const [situation, setSituation] = useState("");
  const [result, setResult] = useState<RightsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (situation.trim().length < 10) {
      setError("Please describe the situation in at least a sentence or two.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.rights(situation);
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
        <p className="ident">Rights Navigator</p>
        <h1 className="font-display font-semibold text-4xl md:text-5xl mt-2 tracking-tightish">
          What rights apply to your situation?
        </h1>
        <p className="mt-4 text-ink-soft max-w-column leading-relaxed">
          Describe what&apos;s happening to you in your own words. The AI identifies which
          constitutional and legal rights apply, the concrete next steps, and the office
          or body to approach. This is general information, not legal advice.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="situation" className="label-caps block mb-1.5">
              Describe your situation
            </label>
            <textarea
              id="situation"
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              rows={10}
              maxLength={1000}
              className="w-full bg-paper-deep border border-paper-line text-sm py-3 px-4 outline-none focus:border-ashoka rounded-sm leading-relaxed"
              placeholder="e.g. My ration card application was rejected without any reason given. I am a senior citizen below the poverty line in Madhya Pradesh."
            />
            <p className="text-[11px] text-ink-muted mt-1">{situation.length}/1000</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-ink text-paper px-6 py-3 text-sm uppercase tracking-wideish font-medium hover:bg-ashoka transition-colors disabled:opacity-50"
          >
            {loading ? "Identifying rights…" : "Find my rights →"}
          </button>

          {error && <p className="text-sm text-saffron">{error}</p>}

          <p className="border-t border-paper-line pt-4 text-[11px] text-ink-muted leading-relaxed">
            This is general legal information, not personal legal advice. Consult a lawyer
            for action specific to your situation.
          </p>
        </form>

        <section className="md:border-l md:border-paper-line md:pl-8">
          {!result && !loading && (
            <p className="text-ink-muted text-sm leading-relaxed">
              Submitted situations are sent to the AI service for this single call only —
              they are not stored.
            </p>
          )}
          {loading && (
            <div className="flex items-center gap-3 text-ink-soft">
              <span className="inline-block w-4 h-4 border-2 border-ashoka border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Identifying rights…</span>
            </div>
          )}
          {result && (
            <div className="space-y-6">
              <div className="flex items-center gap-3"><ConfidenceBadge score={result.confidence} /></div>

              {result.plain_summary && (
                <p className="font-display text-xl leading-snug tracking-tightish max-w-column">
                  {result.plain_summary}
                </p>
              )}

              {result.rights_applicable.length > 0 && (
                <div>
                  <p className="label-caps mb-2">Rights that apply</p>
                  <ul className="space-y-1.5">
                    {result.rights_applicable.map((r, i) => (
                      <li key={i} className="text-sm text-ink-soft flex gap-2 leading-relaxed">
                        <span className="text-ashoka mt-0.5">§</span><span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.next_steps.length > 0 && (
                <div>
                  <p className="label-caps mb-2">Concrete next steps</p>
                  <ol className="space-y-2 list-decimal list-inside">
                    {result.next_steps.map((s, i) => (
                      <li key={i} className="text-sm text-ink-soft leading-relaxed">{s}</li>
                    ))}
                  </ol>
                </div>
              )}

              {result.grievance_authority && (
                <div>
                  <p className="label-caps mb-2">Where to go</p>
                  <p className="text-sm text-ink-soft leading-relaxed">{result.grievance_authority}</p>
                </div>
              )}

              {result.relevant_laws.length > 0 && (
                <div>
                  <p className="label-caps mb-2">Relevant laws</p>
                  <ul className="space-y-1">
                    {result.relevant_laws.map((l, i) => (
                      <li key={i} className="text-sm text-ink-soft flex gap-2">
                        <span className="text-ink-muted">·</span><span>{l}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="border-t border-paper-line pt-4 text-[11px] text-ink-muted leading-relaxed">
                {result.disclaimer}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
