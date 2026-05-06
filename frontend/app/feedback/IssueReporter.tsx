"use client";

import { useEffect, useState } from "react";
import { api, type ConstituencyOut, type FeedbackIssueRow } from "@/lib/api";

const CATEGORIES = [
  { slug: "transport", name: "Roads / Transport" },
  { slug: "water-sanitation", name: "Water" },
  { slug: "energy", name: "Electricity" },
  { slug: "education", name: "Schools" },
  { slug: "health", name: "Hospitals" },
  { slug: "water-sanitation", name: "Sanitation", _alias: true },
  { slug: "public-safety", name: "Public Safety" },
  { slug: "housing", name: "Housing" },
];

interface IssueReporterProps {
  constituencies: ConstituencyOut[];
  preselectedConstituencyId?: number;
}

export function IssueReporter({
  constituencies,
  preselectedConstituencyId,
}: IssueReporterProps) {
  const [category, setCategory] = useState<string>(CATEGORIES[0].slug);
  const [description, setDescription] = useState("");
  const [ward, setWard] = useState("");
  const [constituencyId, setConstituencyId] = useState<string>(
    preselectedConstituencyId ? String(preselectedConstituencyId) : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Issue counts: re-fetched on submit for live updates.
  const [issues, setIssues] = useState<FeedbackIssueRow[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);

  async function loadIssues() {
    setLoadingIssues(true);
    try {
      const data = await api.feedbackIssues(
        constituencyId ? Number(constituencyId) : undefined
      );
      setIssues(data.items ?? []);
    } catch {
      setIssues([]);
    } finally {
      setLoadingIssues(false);
    }
  }

  useEffect(() => {
    loadIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [constituencyId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 4) {
      setError("Please describe the issue.");
      return;
    }
    setError(null);
    setSubmitting(true);
    setDone(false);
    try {
      // The text we store includes the optional ward so the issue cluster has context.
      const text = ward.trim()
        ? `[Ward: ${ward.trim()}] ${description.trim()}`
        : description.trim();

      // Map category slug → topic_id by walking the existing topics endpoint isn't available,
      // so we send slug as a tag in the message. The backend stores feedback rows;
      // the /feedback/issues endpoint groups by topic_id, which is set if you pre-seed
      // topics with these slugs (already done in topics.json).
      // We also send constituency_id and language. Topic resolution is best-effort.
      await api.submitFeedback({
        text: `${category}: ${text}`,
        language: "en",
        constituency_id: constituencyId ? Number(constituencyId) : undefined,
      });
      setDone(true);
      setDescription("");
      setWard("");
      // Refresh aggregated view
      loadIssues();
      setTimeout(() => setDone(false), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit.");
    } finally {
      setSubmitting(false);
    }
  }

  // Aggregate counts by topic_name for the local view.
  const counts = issues.reduce<Record<string, number>>((acc, row) => {
    acc[row.topic_name] = (acc[row.topic_name] ?? 0) + row.count;
    return acc;
  }, {});
  const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-10">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <p className="label-caps mb-2">Issue category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c, i) => (
              <button
                key={`${c.slug}-${i}`}
                type="button"
                onClick={() => setCategory(c.slug)}
                className={`px-3 py-1.5 text-xs uppercase tracking-wideish font-medium rounded-sm border transition-colors ${
                  category === c.slug
                    ? "bg-ink text-paper border-ink"
                    : "bg-paper border-paper-line text-ink-soft hover:border-ashoka hover:text-ashoka"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="description" className="label-caps block mb-1.5">Describe the issue</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={1000}
            className="w-full bg-paper-deep border border-paper-line text-sm py-2 px-3 outline-none focus:border-ashoka rounded-sm leading-relaxed"
            placeholder="e.g. Streetlight on Block C, Sector 5 has been broken for 3 weeks."
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="ward" className="label-caps block mb-1.5">Ward / locality (optional)</label>
            <input
              id="ward"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              maxLength={120}
              className="w-full bg-paper-deep border border-paper-line text-sm py-2 px-3 outline-none focus:border-ashoka rounded-sm"
              placeholder="e.g. Ward 23"
            />
          </div>
          <div>
            <label htmlFor="con" className="label-caps block mb-1.5">Constituency</label>
            <select
              id="con"
              value={constituencyId}
              onChange={(e) => setConstituencyId(e.target.value)}
              className="w-full bg-paper-deep border border-paper-line text-sm py-2 px-3 outline-none focus:border-ashoka rounded-sm"
            >
              <option value="">— Select —</option>
              {constituencies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-saffron">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-ink text-paper px-5 py-2.5 text-sm uppercase tracking-wideish font-medium hover:bg-ashoka transition-colors disabled:opacity-50"
        >
          {submitting ? "Reporting…" : "Report issue"}
        </button>

        {done && (
          <div className="border-l-4 border-green bg-green-soft px-4 py-3 rounded-sm">
            <p className="text-sm text-green font-medium">
              Reported. Your issue is published instantly and visible to others right away.
            </p>
          </div>
        )}
      </form>

      <div className="border-t border-paper-line pt-8">
        <p className="label-caps mb-3">
          Top issues {constituencyId ? "in this constituency" : "across the platform"}
        </p>
        {loadingIssues ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : sortedCounts.length === 0 ? (
          <p className="text-sm text-ink-muted italic">
            No reports yet. Be the first to report a local issue.
          </p>
        ) : (
          <ul className="space-y-2">
            {sortedCounts.slice(0, 8).map(([name, count]) => (
              <li key={name} className="flex items-center justify-between border-b border-paper-line/70 pb-2">
                <span className="text-sm">{name}</span>
                <span className="font-mono text-xs text-ink-muted">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
