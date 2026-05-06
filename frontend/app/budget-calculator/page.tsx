"use client";

import { useState } from "react";
import { api, type BudgetImpactResult } from "@/lib/api";
import { ConfidenceBadge } from "@/components/Trust";

const PROFILES = [
  "Farmer",
  "Salaried Employee",
  "Student",
  "Small Business",
  "Senior Citizen",
];

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry",
  "Chandigarh", "Andaman and Nicobar Islands",
  "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep",
];

// Legacy "signal" → label/style maps (still used when older response shape comes back)
const SIGNAL_STYLES: Record<NonNullable<BudgetImpactResult["signal"]>, string> = {
  positive: "bg-green-soft text-green border border-green/30",
  neutral: "bg-paper-deep text-ink-muted border border-paper-line",
  negative: "bg-saffron-soft text-saffron border border-saffron/30",
};

const SIGNAL_LABEL: Record<NonNullable<BudgetImpactResult["signal"]>, string> = {
  positive: "Likely positive",
  neutral: "Mixed / Neutral",
  negative: "Likely negative",
};

// New RAG "overall_signal" → badge text + classes (uses existing Tailwind tokens only)
function OverallSignalBadge({
  signal,
}: {
  signal: NonNullable<BudgetImpactResult["overall_signal"]>;
}) {
  const map = {
    benefit: {
      text: "✓ Net benefit for your profile",
      cls: "border text-green border-green/30 bg-green-soft",
    },
    neutral: {
      text: "→ Broadly neutral for your profile",
      cls: "border text-ink-muted border-paper-line bg-paper-deep",
    },
    burden: {
      text: "↑ Net burden for your profile",
      cls: "border text-saffron border-saffron/30 bg-saffron-soft",
    },
  } as const;
  const item = map[signal];
  return (
    <span
      className={`inline-block rounded-sm px-2 py-0.5 text-xs uppercase tracking-wideish ${item.cls}`}
    >
      {item.text}
    </span>
  );
}

export default function BudgetCalculatorPage() {
  const [profile, setProfile] = useState(PROFILES[1]);
  const [income, setIncome] = useState<string>("600000");
  const [state, setState] = useState(STATES.find((s) => s === "Delhi") ?? STATES[0]);
  const [question, setQuestion] = useState<string>("");
  const [result, setResult] = useState<BudgetImpactResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(income);
    if (!Number.isFinite(n) || n < 0) {
      setError("Please enter a valid annual income.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.budgetCalculator({
        profile,
        income: n,
        state,
        question: question.trim() || undefined,
      });
      setResult(r);
    } catch (e) {
      // Special-case the "no document loaded" 503 from the backend.
      const status = (e as Error & { status?: number }).status;
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      if (status === 503 || msg === "BUDGET_DOC_MISSING") {
        setError(
          "The budget document hasn't been loaded yet. The administrator needs to place the Union Budget PDF in data/budget/ and restart the backend."
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  // Pick the headline summary from whichever response shape we got back.
  const headline = result?.summary ?? result?.one_line ?? null;
  const keyPoints = Array.isArray(result?.key_points) ? result!.key_points! : [];
  const confidence =
    typeof result?.confidence_score === "number"
      ? result!.confidence_score!
      : typeof result?.confidence === "number"
      ? result!.confidence!
      : null;

  return (
    <div>
      <header className="ruled pt-3 mb-10">
        <p className="ident">Budget Impact Calculator</p>
        <h1 className="font-display font-semibold text-4xl md:text-5xl mt-2 tracking-tightish">
          What does the Union Budget mean for you?
        </h1>
        <p className="mt-4 text-ink-soft max-w-column leading-relaxed">
          Pick your profile, enter your income, and see how the Union Budget
          affects you. The analysis is grounded directly in the official
          Budget Speech text — no fabricated figures.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="profile" className="label-caps block mb-1.5">Your profile</label>
            <select
              id="profile"
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              className="w-full bg-paper-deep border border-paper-line text-sm py-2.5 px-3 outline-none focus:border-ashoka rounded-sm"
            >
              {PROFILES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="income" className="label-caps block mb-1.5">Annual income (Rs)</label>
            <input
              id="income"
              type="number"
              min={0}
              step={10000}
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className="w-full bg-paper-deep border border-paper-line text-sm py-2.5 px-3 outline-none focus:border-ashoka rounded-sm font-mono"
            />
            <p className="text-[11px] text-ink-muted mt-1">
              Used only to estimate tax effects. Not stored.
            </p>
          </div>

          <div>
            <label htmlFor="state" className="label-caps block mb-1.5">State</label>
            <select
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full bg-paper-deep border border-paper-line text-sm py-2.5 px-3 outline-none focus:border-ashoka rounded-sm"
            >
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="question" className="label-caps block mb-1.5">
              Specific question (optional)
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              maxLength={512}
              placeholder="e.g. How does the new income tax rebate affect me?"
              className="w-full bg-paper-deep border border-paper-line text-sm py-2 px-3 outline-none focus:border-ashoka rounded-sm leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-ink text-paper px-6 py-3 text-sm uppercase tracking-wideish font-medium hover:bg-ashoka transition-colors disabled:opacity-50"
          >
            {loading ? "Calculating impact…" : "Calculate impact →"}
          </button>

          {error && (
            <div className="border-l-4 border-saffron bg-saffron-soft px-4 py-3 rounded-sm">
              <p className="text-sm text-saffron font-medium">{error}</p>
            </div>
          )}

          <p className="text-[11px] text-ink-muted leading-relaxed border-t border-paper-line pt-4">
            This is informational only. Consult a financial advisor for personal advice.
          </p>
        </form>

        <section className="md:border-l md:border-paper-line md:pl-8">
          {!result && !loading && (
            <p className="text-ink-muted text-sm leading-relaxed">
              Pick a profile and submit. You&apos;ll get a personalised analysis
              of the Union Budget grounded in the official Budget Speech text.
            </p>
          )}

          {loading && (
            <div className="flex items-center gap-3 text-ink-soft">
              <span className="inline-block w-4 h-4 border-2 border-ashoka border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Calculating impact…</span>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 flex-wrap">
                {result.overall_signal ? (
                  <OverallSignalBadge signal={result.overall_signal} />
                ) : result.signal ? (
                  <span className={`px-3 py-1.5 rounded-sm text-xs uppercase tracking-wideish font-medium ${SIGNAL_STYLES[result.signal]}`}>
                    {SIGNAL_LABEL[result.signal]}
                  </span>
                ) : null}
                {confidence !== null && <ConfidenceBadge score={confidence} />}
                {result.budget_year && (
                  <span className="text-[11px] uppercase tracking-wideish text-ink-muted">
                    Union Budget {result.budget_year}
                  </span>
                )}
              </div>

              {headline && (
                <h2 className="font-display font-semibold text-2xl leading-tight tracking-tightish">
                  {headline}
                </h2>
              )}

              {keyPoints.length > 0 && (
                <div>
                  <p className="label-caps mb-2">Key provisions for you:</p>
                  <ul className="space-y-1">
                    {keyPoints.map((kp, i) => (
                      <li key={i} className="text-sm text-ink-soft flex gap-2">
                        <span className="text-ink-muted">·</span>
                        <span>{kp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Legacy fields — only render when the older response shape comes back */}
              {result.tax_change && (
                <div>
                  <p className="label-caps mb-2">Estimated tax change</p>
                  <p className="text-ink-soft leading-relaxed">{result.tax_change}</p>
                </div>
              )}

              {Array.isArray(result.subsidies) && result.subsidies.length > 0 && (
                <div>
                  <p className="label-caps mb-2">Subsidies you may gain or lose</p>
                  <ul className="space-y-1">
                    {result.subsidies.map((s, i) => (
                      <li key={i} className="text-sm text-ink-soft flex gap-2">
                        <span className="text-ink-muted">·</span><span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(result.sectors) && result.sectors.length > 0 && (
                <div>
                  <p className="label-caps mb-2">Sector allocations relevant to you</p>
                  <ul className="space-y-1">
                    {result.sectors.map((s, i) => (
                      <li key={i} className="text-sm text-ink-soft flex gap-2">
                        <span className="text-ink-muted">·</span><span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.caveat && (
                <p className="border-t border-paper-line pt-4 text-[11px] text-ink-muted leading-relaxed">
                  {result.caveat}
                </p>
              )}

              <p className="text-[11px] text-ink-muted mt-4 leading-relaxed">
                This analysis is based solely on the budget document text. It is informational —
                not financial advice. Verify with a qualified advisor before acting on any provision.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
