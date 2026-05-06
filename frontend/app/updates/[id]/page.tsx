import Link from "next/link";
import { notFound } from "next/navigation";
import { api, formatDocType, timeAgo } from "@/lib/api";
import { ConfidenceBadge, SourceLabel } from "@/components/Trust";
import { DisputeFlag } from "./DisputeFlag";
import { LanguageToggle } from "./LanguageToggle";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
  searchParams?: { lang?: string };
}

export default async function UpdateDetailPage({ params, searchParams }: PageProps) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  let doc;
  try {
    doc = await api.update(id);
  } catch {
    notFound();
  }

  const lang = searchParams?.lang === "hi" ? "hi" : "en";
  const summary =
    doc.summaries.find((s) => s.language === lang) ??
    doc.summaries.find((s) => s.language === "en") ??
    doc.summaries[0];

  return (
    <article>
      {/* Header strip */}
      <div className="ruled pt-3 mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 ident">
        <Link href="/" className="hover:text-ashoka">← Today</Link>
        <span className="text-paper-line">/</span>
        <span className="uppercase">{formatDocType(doc.document_type)}</span>
        <span className="text-paper-line">/</span>
        <span>#{doc.id}</span>
        <span className="ml-auto">fetched {timeAgo(doc.fetched_at)}</span>
      </div>

      {/* Title and trust strip */}
      <header className="mb-8 max-w-4xl">
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <SourceLabel label={doc.source_trust_label} />
          <ConfidenceBadge score={doc.confidence_score} />
          {doc.source_name && (
            <span className="text-xs text-ink-muted">
              via <span className="font-medium text-ink-soft">{doc.source_name}</span>
            </span>
          )}
        </div>

        <h1 className="font-display font-semibold text-4xl md:text-5xl leading-[1.05] tracking-tightish">
          {doc.title}
        </h1>

        <p className="mt-4 text-sm text-ink-muted">
          {doc.published_at ? (
            <>Published {new Date(doc.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · </>
          ) : null}
          <a href={doc.source_url} target="_blank" rel="noopener noreferrer" className="text-ashoka hover:underline">
            View original source ↗
          </a>
        </p>
      </header>

      {doc.dispute_flag && (
        <div className="mb-8 border-l-4 border-saffron bg-saffron-soft px-5 py-4 rounded-sm max-w-4xl">
          <p className="text-sm font-semibold text-saffron uppercase tracking-wideish">
            Marked for review
          </p>
          <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">
            A factual dispute has been flagged on this document. It is under review.
            The original output remains visible — Nagarik does not silently overwrite content.
          </p>
          {doc.dispute_note && (
            <details className="mt-3">
              <summary className="text-xs uppercase tracking-wideish text-ink-muted cursor-pointer hover:text-ink">
                Show dispute note
              </summary>
              <p className="mt-2 text-xs text-ink-soft whitespace-pre-line font-mono">{doc.dispute_note}</p>
            </details>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-x-12 gap-y-10">
        {/* Main column: summary + extracted text preview */}
        <section className="md:col-span-2 space-y-10">
          {summary && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="label-caps">Plain-language summary</p>
                <LanguageToggle
                  hasHindi={doc.summaries.some((s) => s.language === "hi" && !!s.one_line)}
                />
              </div>

              {summary.one_line && (
                <p className="dropcap font-display text-2xl leading-relaxed text-ink mb-6 max-w-column">
                  {summary.one_line}
                </p>
              )}

              {summary.three_bullets_json && summary.three_bullets_json.length > 0 && (
                <ul className="space-y-3 my-6 max-w-column border-l-2 border-ashoka/40 pl-5">
                  {summary.three_bullets_json.map((b, i) => (
                    <li key={i} className="text-ink-soft leading-relaxed">{b}</li>
                  ))}
                </ul>
              )}

              <div className="grid sm:grid-cols-2 gap-6 mt-8 max-w-column">
                {summary.why_it_matters && (
                  <div>
                    <p className="label-caps mb-2">Why it matters</p>
                    <p className="text-sm text-ink-soft leading-relaxed">{summary.why_it_matters}</p>
                  </div>
                )}
                {summary.who_is_affected && (
                  <div>
                    <p className="label-caps mb-2">Who is affected</p>
                    <p className="text-sm text-ink-soft leading-relaxed">{summary.who_is_affected}</p>
                  </div>
                )}
              </div>

              <p className="mt-6 text-[11px] font-mono text-ink-muted">
                Generated by <span className="text-ink-soft">{summary.model_used}</span> ·
                confidence {(summary.confidence_score * 100).toFixed(0)}% · {timeAgo(summary.generated_at)}
              </p>
            </div>
          )}

          {doc.extracted_text_preview && (
            <details className="border-t border-paper-line pt-6">
              <summary className="cursor-pointer label-caps hover:text-ink">
                Extracted source text (preview)
              </summary>
              <pre className="mt-4 whitespace-pre-wrap font-body text-sm text-ink-muted leading-relaxed max-w-column">
{doc.extracted_text_preview}
              </pre>
            </details>
          )}
        </section>

        {/* Sidebar: structured facts + source info */}
        <aside className="md:col-span-1 md:border-l md:border-paper-line md:pl-8 space-y-8">
          <div>
            <p className="label-caps mb-3">Extracted facts</p>
            {doc.facts.length === 0 ? (
              <p className="text-sm text-ink-muted">None extracted.</p>
            ) : (
              <dl className="space-y-3">
                {doc.facts.map((f) => (
                  <div key={f.key}>
                    <dt className="text-[11px] uppercase tracking-wideish text-ink-muted">
                      {f.key.replace(/_/g, " ")}
                    </dt>
                    <dd className="text-sm text-ink leading-snug mt-0.5">{f.value || "—"}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="border-t border-paper-line pt-6">
            <p className="label-caps mb-3">Source</p>
            <p className="text-sm font-medium text-ink">{doc.source_name}</p>
            <p className="text-xs text-ink-muted mt-1">
              <a href={doc.source_url} target="_blank" rel="noopener noreferrer" className="text-ashoka hover:underline break-all">
                {doc.source_url}
              </a>
            </p>
            <p className="text-[11px] text-ink-muted mt-3">
              Trust label is set by source classification, not editorial decision. Confidence
              reflects extraction quality.
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-16 pt-6 border-t border-paper-line">
        <DisputeFlag documentId={doc.id} />
      </div>
    </article>
  );
}
