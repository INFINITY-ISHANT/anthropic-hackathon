import Link from "next/link";

export const dynamic = "force-static";

const SOURCES = [
  { name: "Press Information Bureau", url: "https://pib.gov.in" },
  { name: "PRS Legislative Research", url: "https://prsindia.org" },
  { name: "Election Commission of India", url: "https://eci.gov.in" },
  { name: "Lok Sabha", url: "https://sansad.in" },
  { name: "Comptroller and Auditor General", url: "https://cag.gov.in" },
  { name: "India Budget", url: "https://www.indiabudget.gov.in" },
  { name: "MyNeta (affidavit data)", url: "https://myneta.info" },
];

export default function MethodologyPage() {
  return (
    <div>
      <header className="ruled pt-3 mb-10">
        <p className="ident">Methodology</p>
        <h1 className="font-display font-semibold text-4xl md:text-5xl mt-2 tracking-tightish">
          How Nagarik works — and how it can be wrong.
        </h1>
        <p className="mt-4 text-ink-soft max-w-column leading-relaxed">
          Every editorial choice on this platform is documented here. If you can read this
          page, you can audit the system. If something is missing, that is itself a bug —
          tell us via <Link href="/feedback" className="text-ashoka hover:underline">Citizen Voice</Link>.
        </p>
      </header>

      <article className="prose-sized space-y-12 max-w-column">
        <section>
          <h2 className="font-display text-2xl font-semibold tracking-tightish">What Nagarik does</h2>
          <p className="mt-4 text-ink-soft leading-relaxed">
            Nagarik ingests official Indian government sources, processes them through an AI
            pipeline, and presents plain-language summaries to citizens. Every output links
            to its original source. Where extraction is uncertain, confidence is shown openly.
            Nagarik informs — it does not decide.
          </p>
        </section>

        <section className="border-t border-paper-line pt-10">
          <h2 className="font-display text-2xl font-semibold tracking-tightish">What Nagarik will not do</h2>
          <ul className="mt-4 space-y-2 text-ink-soft leading-relaxed">
            <li className="flex gap-3"><span className="text-saffron mt-1 shrink-0">✗</span><span>Recommend who to vote for.</span></li>
            <li className="flex gap-3"><span className="text-saffron mt-1 shrink-0">✗</span><span>Editorialize on whether a policy is good or bad.</span></li>
            <li className="flex gap-3"><span className="text-saffron mt-1 shrink-0">✗</span><span>Fabricate data that is not present in the source document.</span></li>
            <li className="flex gap-3"><span className="text-saffron mt-1 shrink-0">✗</span><span>Produce a clean verdict without showing the reasoning behind it.</span></li>
            <li className="flex gap-3"><span className="text-saffron mt-1 shrink-0">✗</span><span>Silently replace a corrected output — corrections are shown alongside originals.</span></li>
          </ul>
        </section>

        <section className="border-t border-paper-line pt-10">
          <h2 className="font-display text-2xl font-semibold tracking-tightish">How documents are processed</h2>
          <ol className="mt-4 space-y-3 text-ink-soft leading-relaxed list-decimal pl-5">
            <li><strong>Fetch.</strong> Each official source has its own adapter; per-source failures don&apos;t cascade.</li>
            <li><strong>Parse.</strong> HTML or PDF is converted to plain text. If extraction fails, the document is held at the parsed-failed status, not silently dropped.</li>
            <li><strong>Classify.</strong> A narrow JSON-output prompt assigns a document type. Below-threshold confidence stays as <em>unknown</em>.</li>
            <li><strong>Extract.</strong> Structured facts (who/what/where/when/numbers/deadlines) — &ldquo;return null if unknown&rdquo; is enforced in the prompt.</li>
            <li><strong>Summarize</strong> in English and Hindi as separate calls, each constrained to facts in the source text.</li>
            <li><strong>Map</strong> the document to its constituency, district, state, and topic tags — only when explicitly named.</li>
            <li><strong>Publish.</strong> Audit-logged. Raw payload is preserved so future re-runs with better prompts can re-summarize without re-fetching.</li>
          </ol>
        </section>

        <section className="border-t border-paper-line pt-10">
          <h2 className="font-display text-2xl font-semibold tracking-tightish">How manifesto promises are classified</h2>
          <dl className="mt-4 space-y-4 text-ink-soft leading-relaxed">
            <div>
              <dt className="font-semibold text-ink"><span className="inline-block w-2 h-2 rounded-full bg-green mr-2 align-middle" />Achieved</dt>
              <dd className="mt-1">Verified by official government record or CAG audit.</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink"><span className="inline-block w-2 h-2 rounded-full bg-ashoka mr-2 align-middle" />In Progress</dt>
              <dd className="mt-1">Scheme or project announced and publicly funded but target not yet met.</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink"><span className="inline-block w-2 h-2 rounded-full bg-paper-line border border-ink/30 mr-2 align-middle" />Promised</dt>
              <dd className="mt-1">Stated in pre-election manifesto, no significant implementation recorded.</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink"><span className="inline-block w-2 h-2 rounded-full bg-saffron mr-2 align-middle" />Broken</dt>
              <dd className="mt-1">Explicitly contradicted by official record or time-expired without action.</dd>
            </div>
          </dl>
          <p className="mt-5 text-sm text-ink-muted italic">
            No status is assigned without a source citation.
          </p>
        </section>

        <section className="border-t border-paper-line pt-10">
          <h2 className="font-display text-2xl font-semibold tracking-tightish">How claim checking works</h2>
          <p className="mt-4 text-ink-soft leading-relaxed">
            Every claim is sorted into one of five tiers, with the reasoning shown in full —
            never as a one-word verdict.
          </p>
          <dl className="mt-4 space-y-3 text-ink-soft leading-relaxed">
            <div><dt className="font-semibold text-green">Verified</dt><dd>Confirmed by official public records.</dd></div>
            <div><dt className="font-semibold text-amber">Misleading</dt><dd>Factually based but missing critical context that changes meaning.</dd></div>
            <div><dt className="font-semibold text-saffron">False</dt><dd>Directly contradicted by official public data.</dd></div>
            <div><dt className="font-semibold text-ink-soft">Unverifiable</dt><dd>Cannot be confirmed or denied from available public sources.</dd></div>
            <div><dt className="font-semibold text-ashoka">Opinion</dt><dd>A value judgment or policy preference — not fact-checkable.</dd></div>
          </dl>
        </section>

        <section className="border-t border-paper-line pt-10">
          <h2 className="font-display text-2xl font-semibold tracking-tightish">What confidence scores mean</h2>
          <dl className="mt-4 space-y-3 text-ink-soft leading-relaxed">
            <div><dt className="font-semibold text-green">High (≥ 0.7)</dt><dd>Extraction is clear, source text is unambiguous.</dd></div>
            <div><dt className="font-semibold text-amber">Moderate (0.4 – 0.69)</dt><dd>Some fields inferred; the source may be partially unclear.</dd></div>
            <div><dt className="font-semibold text-saffron">Low (&lt; 0.4)</dt><dd>Text extraction was limited, rule-based fallback was used — treat as tentative.</dd></div>
          </dl>
        </section>

        <section className="border-t border-paper-line pt-10">
          <h2 className="font-display text-2xl font-semibold tracking-tightish">Sources used</h2>
          <ul className="mt-4 space-y-2 text-ink-soft leading-relaxed">
            {SOURCES.map((s) => (
              <li key={s.url} className="flex gap-3">
                <span className="text-ink-muted">·</span>
                <span>
                  {s.name} —{" "}
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-ashoka hover:underline">
                    {s.url.replace(/^https?:\/\//, "")}
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-paper-line pt-10">
          <h2 className="font-display text-2xl font-semibold tracking-tightish">How to report an error</h2>
          <p className="mt-4 text-ink-soft leading-relaxed">
            If a summary mischaracterises the source, a fact is wrong, or a status is
            assigned to the wrong promise — tell us via{" "}
            <Link href="/feedback" className="text-ashoka hover:underline">Citizen Voice</Link>.
            Submissions are public the moment you send them; we don&apos;t hold a moderation
            queue. Egregious errors are corrected by appending a correction; the original
            output is preserved so the change is auditable.
          </p>
        </section>
      </article>
    </div>
  );
}
