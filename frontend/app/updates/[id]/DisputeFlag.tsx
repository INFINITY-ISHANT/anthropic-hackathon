"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export function DisputeFlag({ documentId }: { documentId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (note.trim().length < 4) {
      setError("Please describe what you think is wrong.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.flagDispute(documentId, note.trim());
      setDone(true);
      // Refresh the page so the banner appears.
      setTimeout(() => router.refresh(), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="border-l-4 border-green bg-green-soft px-4 py-3 rounded-sm max-w-column">
        <p className="text-sm text-green font-medium">
          Thanks. This document has been marked for review.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-ink-muted hover:text-saffron underline underline-offset-4 decoration-ink-muted/40 hover:decoration-saffron"
      >
        Flag a factual error in this summary
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border border-paper-line bg-paper-deep p-4 rounded-sm space-y-3 max-w-column">
      <p className="label-caps">Flag a factual error</p>
      <p className="text-xs text-ink-muted leading-relaxed">
        Describe what&apos;s wrong — wrong number, mischaracterised quote, missing context.
        The original output stays visible; corrections are appended openly.
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        maxLength={2000}
        className="w-full bg-paper border border-paper-line text-sm py-2 px-3 outline-none focus:border-ashoka rounded-sm leading-relaxed"
        placeholder="e.g. The figure of Rs 240 crore appears wrong — the original PIB note says Rs 24 crore."
      />
      {error && <p className="text-xs text-saffron">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-ink text-paper px-4 py-2 text-xs uppercase tracking-wideish font-medium hover:bg-saffron transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit dispute"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-ink-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
