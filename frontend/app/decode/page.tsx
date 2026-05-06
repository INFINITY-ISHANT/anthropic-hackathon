"use client";

import { useRef, useState } from "react";
import { api, type DecodeResult, formatDocType } from "@/lib/api";
import { ConfidenceBadge } from "@/components/Trust";

export default function DecodePage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<DecodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setFileMessage(
        "Please paste the document text directly — PDF upload coming soon."
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? "");
      setText(content);
      setFileMessage(`Loaded ${file.name} (${content.length.toLocaleString()} chars).`);
    };
    reader.onerror = () => setFileMessage("Could not read the file.");
    reader.readAsText(file);
  }

  async function onDecode() {
    if (text.trim().length < 10) {
      setError("Please paste at least a sentence or two.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.decode(text);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <header className="ruled pt-3 mb-10">
        <p className="ident">Decoder</p>
        <h1 className="font-display font-semibold text-4xl md:text-5xl mt-2 tracking-tightish">
          Decode any government document.
        </h1>
        <p className="mt-4 text-ink-soft max-w-column leading-relaxed">
          Paste any press release, budget circular, policy notification, or scheme guideline.
          Get a plain-language breakdown in seconds — every interpretation is constrained
          to the text you provided. Nothing is stored on the server.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
        {/* Input column */}
        <section>
          <p className="label-caps mb-3">Document text</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            maxLength={20000}
            className="w-full bg-paper-deep border border-paper-line text-sm py-3 px-4 outline-none focus:border-ashoka rounded-sm leading-relaxed font-mono"
            placeholder="Paste a press release, budget paragraph, scheme circular, or any official document text here…"
          />
          <p className="text-[11px] text-ink-muted mt-1">
            {text.length.toLocaleString()}/20,000 characters
          </p>

          <div className="mt-4 flex items-center gap-4 flex-wrap">
            <label className="text-xs text-ink-soft cursor-pointer hover:text-ashoka inline-flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={onFileChange}
                className="hidden"
              />
              <span className="border border-paper-line rounded-sm px-3 py-1.5 hover:border-ashoka">
                Upload .txt file
              </span>
            </label>
            {fileMessage && (
              <span className="text-xs text-ink-muted">{fileMessage}</span>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={onDecode}
              disabled={loading || text.trim().length < 10}
              className="bg-ink text-paper px-6 py-3 text-sm uppercase tracking-wideish font-medium hover:bg-ashoka transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Reading the document…" : "Decode →"}
            </button>
          </div>

          {error && (
            <div className="mt-4 border-l-4 border-saffron bg-saffron-soft px-4 py-3 rounded-sm">
              <p className="text-sm text-saffron font-medium">Something went wrong. Please try again.</p>
              <p className="text-xs text-ink-muted mt-1 font-mono">{error}</p>
            </div>
          )}
        </section>

        {/* Output column */}
        <section className="md:border-l md:border-paper-line md:pl-8">
          {!result && !loading && (
            <div className="text-ink-muted text-sm leading-relaxed">
              <p className="label-caps mb-3">Plain-language output</p>
              <p>
                Paste a document and click <em>Decode</em>. The system will return a one-line
                summary, what it means for citizens, who is affected, any required action, and
                the key facts it found.
              </p>
              <p className="mt-3 text-[11px] uppercase tracking-wideish">
                The full text you paste is sent to the AI service for this single call. It is
                not stored.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-3 text-ink-soft">
              <span className="inline-block w-4 h-4 border-2 border-ashoka border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Reading the document…</span>
            </div>
          )}

          {result && (
            <DecodeResultView result={result} />
          )}
        </section>
      </div>
    </div>
  );
}

function DecodeResultView({ result }: { result: DecodeResult }) {
  return (
    <div className="space-y-6">
      {/* Document type badge */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[11px] uppercase tracking-wideish px-2 py-0.5 rounded-sm font-medium bg-ashoka-soft text-ashoka">
          {formatDocType(result.document_type)}
        </span>
        <ConfidenceBadge score={result.confidence} />
      </div>

      {/* One-liner */}
      {result.one_line && (
        <h2 className="font-display font-semibold text-3xl leading-tight tracking-tightish text-ink">
          {result.one_line}
        </h2>
      )}

      {/* Low-confidence banner */}
      {result.confidence < 0.6 && (
        <div className="border-l-4 border-amber bg-amber/10 px-4 py-3 rounded-sm">
          <p className="text-sm text-amber font-medium">
            Extraction confidence is low — verify with the original source.
          </p>
        </div>
      )}

      {result.plain_summary && (
        <div>
          <p className="label-caps mb-2">What this document says</p>
          <p className="text-ink-soft leading-relaxed max-w-column">{result.plain_summary}</p>
        </div>
      )}

      {result.what_it_means_for_citizens && (
        <div>
          <p className="label-caps mb-2">What this means for you</p>
          <p className="text-ink-soft leading-relaxed max-w-column">
            {result.what_it_means_for_citizens}
          </p>
        </div>
      )}

      <div>
        <p className="label-caps mb-2">What you need to do</p>
        <p className="text-ink-soft leading-relaxed max-w-column">
          {result.action_required ?? (
            <span className="text-ink-muted italic">No action required from citizens.</span>
          )}
        </p>
      </div>

      {result.who_is_affected && (
        <div>
          <p className="label-caps mb-2">Who is affected</p>
          <p className="text-ink-soft leading-relaxed max-w-column">{result.who_is_affected}</p>
        </div>
      )}

      {result.key_facts.length > 0 && (
        <div>
          <p className="label-caps mb-2">Key facts</p>
          <ul className="space-y-1">
            {result.key_facts.map((f, i) => (
              <li key={i} className="text-sm text-ink-soft flex gap-2">
                <span className="text-ink-muted">·</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="border-t border-paper-line pt-4 text-[11px] text-ink-muted leading-relaxed font-mono">
        Summary generated from the text you provided. Always verify with the original
        official source. Model: {result._model}.
      </p>
    </div>
  );
}
