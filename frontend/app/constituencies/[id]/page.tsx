import Link from "next/link";
import { notFound } from "next/navigation";
import { api, type ConstituencyFeedbackResponse, type FeedbackClusterItem } from "@/lib/api";
import { UpdateCard } from "@/components/UpdateCard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

function SentimentDot({ avg }: { avg: number }) {
  let color = "#9ca3af"; // grey
  let label = "Mixed";
  if (avg > 0.3) {
    color = "#16a34a"; // green
    label = "Positive";
  } else if (avg < -0.3) {
    color = "#dc2626"; // red
    label = "Negative";
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wideish text-ink-muted">
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
      {label}
    </span>
  );
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function ClusterCard({ cluster }: { cluster: FeedbackClusterItem }) {
  return (
    <article className="border border-paper-line rounded-sm p-5 bg-paper-deep/40">
      <header className="flex items-start justify-between gap-4 flex-wrap mb-3">
        <h3 className="font-display text-lg font-semibold tracking-tightish">
          {cluster.topic_name ?? "Uncategorised"}
        </h3>
        <div className="flex items-center gap-3">
          <SentimentDot avg={cluster.avg_sentiment} />
          <span className="font-mono text-xs text-ink-muted bg-paper border border-paper-line px-2 py-0.5 rounded-sm">
            {cluster.count} {cluster.count === 1 ? "submission" : "submissions"}
          </span>
        </div>
      </header>

      <p className="text-ink-soft leading-relaxed">{cluster.summary}</p>

      {cluster.submissions.length > 1 && (
        <details className="mt-4 border-t border-paper-line pt-3">
          <summary className="cursor-pointer text-xs uppercase tracking-wideish text-ashoka hover:text-ashoka-deep">
            Show all {cluster.submissions.length} submissions
          </summary>
          <ul className="mt-3 space-y-3">
            {cluster.submissions.map((s) => (
              <li key={s.id} className="text-sm border-l-2 border-paper-line pl-3">
                <p className="text-ink-soft leading-relaxed">{s.text}</p>
                <p className="text-[11px] text-ink-muted mt-1 font-mono">
                  {fmtDate(s.submitted_at)}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

export default async function ConstituencyDetailPage({ params }: PageProps) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  let c;
  try {
    c = await api.constituency(id);
  } catch {
    notFound();
  }

  // Live feedback feed for this constituency. Fail-soft so the rest of the page
  // still renders if the feedback service has a hiccup.
  const feedback: ConstituencyFeedbackResponse = await api
    .constituencyFeedback(id)
    .catch(() => ({ raw_feedback: [], clusters: [], total: 0 }));

  // Split clusters into categorised vs uncategorised for rendering.
  const categorisedClusters = feedback.clusters.filter((cl) => cl.topic_id !== null);
  const uncategorisedClusters = feedback.clusters.filter((cl) => cl.topic_id === null);

  return (
    <div>
      {/* Editorial header */}
      <header className="ruled pt-3 mb-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="ident">
            <Link href="/constituencies" className="hover:text-ashoka">← All constituencies</Link>
          </p>
          <p className="ident">
            {c.type === "lok_sabha" ? "Lok Sabha" : "Vidhan Sabha"}
            {c.number ? ` · PC ${c.number}` : ""}
          </p>
        </div>
        <h1 className="font-display font-semibold text-5xl md:text-6xl mt-3 tracking-tightish">
          {c.name}
        </h1>
        <p className="mt-3 text-ink-soft">
          {[c.district?.name, c.state?.name].filter(Boolean).join(" · ")}
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-x-12 gap-y-12">
        {/* Main column */}
        <div className="md:col-span-2 space-y-14">
          {/* Recent updates */}
          <section>
            <div className="flex items-end justify-between mb-6 border-b border-paper-line pb-3">
              <h2 className="font-display text-2xl font-semibold">Recent updates</h2>
              <span className="text-xs text-ink-muted">{c.recent_updates.length} mapped here</span>
            </div>

            {c.recent_updates.length === 0 ? (
              <p className="text-ink-muted py-12">
                No updates have been automatically mapped to this constituency yet.
              </p>
            ) : (
              <div className="space-y-8">
                {c.recent_updates.map((u) => (
                  <UpdateCard key={u.id} item={u} />
                ))}
              </div>
            )}
          </section>

          {/* Citizen feedback (live) */}
          <section>
            <div className="flex items-end justify-between mb-6 border-b border-paper-line pb-3 flex-wrap gap-2">
              <h2 className="font-display text-2xl font-semibold">Citizen feedback</h2>
              <span className="text-xs text-ink-muted">
                {feedback.total} {feedback.total === 1 ? "submission" : "submissions"}
              </span>
            </div>

            {feedback.total === 0 ? (
              <div className="py-10 text-center">
                <p className="text-ink-muted mb-4">
                  No citizen feedback for this constituency yet.{" "}
                  <Link
                    href={`/feedback?constituency_id=${c.id}`}
                    className="text-ashoka hover:text-ashoka-deep underline underline-offset-4"
                  >
                    Be the first →
                  </Link>
                </p>
              </div>
            ) : (
              <>
                {categorisedClusters.length > 0 && (
                  <div className="space-y-5">
                    {categorisedClusters.map((cl) => (
                      <ClusterCard
                        key={`topic-${cl.topic_id ?? "none"}`}
                        cluster={cl}
                      />
                    ))}
                  </div>
                )}

                {uncategorisedClusters.length > 0 &&
                  uncategorisedClusters[0].submissions.length > 0 && (
                    <div className="mt-8 border-t border-paper-line pt-6">
                      <p className="label-caps mb-3">Uncategorised feedback</p>
                      <ul className="space-y-3">
                        {uncategorisedClusters[0].submissions.map((s) => (
                          <li
                            key={s.id}
                            className="text-sm border-l-2 border-paper-line pl-3"
                          >
                            <p className="text-ink-soft leading-relaxed">{s.text}</p>
                            <p className="text-[11px] text-ink-muted mt-1 font-mono">
                              {fmtDate(s.submitted_at)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </>
            )}

            <div className="mt-8 pt-6 border-t border-paper-line">
              <Link
                href={`/feedback?constituency_id=${c.id}`}
                className="inline-block text-sm text-ashoka hover:text-ashoka-deep underline underline-offset-4"
              >
                Add your feedback for {c.name} →
              </Link>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="md:col-span-1 md:border-l md:border-paper-line md:pl-8 space-y-10">
          {/* Candidates */}
          <div>
            <p className="label-caps mb-4">Candidates</p>
            {c.candidates.length === 0 ? (
              <p className="text-sm text-ink-muted">None on record.</p>
            ) : (
              <ul className="space-y-4">
                {c.candidates.map((cand) => (
                  <li key={cand.id} className="border-b border-paper-line/70 pb-3 last:border-0">
                    <Link href={`/candidates/${cand.politician.id}`} className="group block">
                      <p className="font-display text-lg font-semibold group-hover:text-ashoka transition-colors">
                        {cand.politician.name}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {cand.politician.party} · contesting {cand.election_year}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Top issues */}
          <div className="border-t border-paper-line pt-6">
            <p className="label-caps mb-4">Top issues</p>
            {c.top_topics.length === 0 ? (
              <p className="text-sm text-ink-muted">
                No clustered citizen feedback yet for this constituency.
              </p>
            ) : (
              <ul className="space-y-2">
                {c.top_topics.map((t) => (
                  <li key={t.id} className="flex items-center justify-between text-sm">
                    <span>{t.name}</span>
                    <span className="font-mono text-xs text-ink-muted">{t.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-paper-line pt-6">
            <Link
              href={`/feedback?constituency_id=${c.id}`}
              className="inline-block text-sm text-ashoka hover:text-ashoka-deep underline underline-offset-4"
            >
              Submit feedback for this constituency →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
