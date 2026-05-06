// Typed thin wrapper around the Nagarik backend.
// Server components fetch via these helpers; types mirror app/schemas/__init__.py.

// Dual-base routing: server components hit the backend directly via API_BASE_INTERNAL,
// browser calls go through the Next.js rewrite (so they're same-origin and CORS-free).
const BASE =
  typeof window === "undefined"
    ? process.env.API_BASE_INTERNAL ?? "http://localhost:8000"
    : "";

// ---- Types ----
export type TrustLabel = "official" | "third_party" | "tentative";

export interface UpdateOut {
  id: number;
  title: string | null;
  document_type: string;
  source_id: number;
  source_name: string | null;
  source_trust_label: TrustLabel | null;
  source_url: string;
  published_at: string | null;
  fetched_at: string;
  confidence_score: number;
  constituency_id: number | null;
  summary_one_line_en: string | null;
  summary_one_line_hi: string | null;
  tags_json: string[] | null;
  dispute_flag?: boolean;
  dispute_note?: string | null;
}

export interface FactOut {
  key: string;
  value: string | null;
  confidence: number;
}

export interface SummaryOut {
  language: string;
  one_line: string | null;
  three_bullets_json: string[] | null;
  why_it_matters: string | null;
  who_is_affected: string | null;
  source_citation: string | null;
  model_used: string;
  generated_at: string;
  confidence_score: number;
}

export interface UpdateDetail extends UpdateOut {
  canonical_url: string | null;
  extracted_text_preview: string | null;
  facts: FactOut[];
  summaries: SummaryOut[];
}

export interface UpdateList {
  items: UpdateOut[];
  total: number;
  page: number;
  page_size: number;
}

export interface ConstituencyOut {
  id: number;
  name: string;
  type: string;
  number: number | null;
  state_id: number;
  district_id: number | null;
}

export interface PoliticianOut {
  id: number;
  name: string;
  party: string | null;
  photo_url: string | null;
  bio: string | null;
  official_links_json: Record<string, unknown> | null;
}

export interface CandidacyOut {
  id: number;
  politician: PoliticianOut;
  constituency_id: number;
  election_year: number;
  status: string;
  affidavit_document_id: number | null;
}

export interface ConstituencyDetail extends ConstituencyOut {
  state: { id: number; name: string; code: string } | null;
  district: { id: number; name: string; state_id: number } | null;
  recent_updates: UpdateOut[];
  candidates: CandidacyOut[];
  top_topics: { id: number; name: string; slug: string; count: number }[];
}

export interface ManifestoItemOut {
  id: number;
  politician_id: number | null;
  party: string | null;
  title: string;
  description: string | null;
  category: string | null;
  target_year: number | null;
  status: string;
  confidence: number;
}

export interface ManifestoProgressOut {
  id: number;
  manifesto_item_id: number;
  document_id: number | null;
  note: string | null;
  status: string;
  recorded_at: string;
}

export interface CandidateDetail {
  politician: PoliticianOut;
  candidacies: CandidacyOut[];
  affidavit: UpdateOut | null;
  manifesto: ManifestoItemOut[];
  progress: ManifestoProgressOut[];
}

export interface FeedbackClusterOut {
  id: number;
  topic_id: number | null;
  constituency_id: number | null;
  summary: string;
  count: number;
  avg_sentiment: number;
  last_updated: string;
}

// ---- Constituency Feedback (live, with AI clusters) ----
export interface RawFeedbackItem {
  id: number;
  text: string;
  language: string;
  sentiment: number;
  topic_id: number | null;
  topic_name: string | null;
  submitted_at: string;
}

export interface FeedbackClusterItem {
  topic_id: number | null;
  topic_name: string | null;
  count: number;
  summary: string;
  avg_sentiment: number;
  submissions: { id: number; text: string; submitted_at: string }[];
}

export interface ConstituencyFeedbackResponse {
  raw_feedback: RawFeedbackItem[];
  clusters: FeedbackClusterItem[];
  total: number;
}

export interface SourceOut {
  id: number;
  name: string;
  slug: string;
  source_type: string;
  trust_label: TrustLabel;
  base_url: string | null;
  active: boolean;
  last_fetched_at: string | null;
  last_status: string | null;
}

export interface DecodeResult {
  one_line: string | null;
  plain_summary: string | null;
  what_it_means_for_citizens: string | null;
  action_required: string | null;
  who_is_affected: string | null;
  key_facts: string[];
  document_type: string;
  confidence: number;
  _model: string;
}

export interface ClaimCheckResult {
  claim_as_understood: string | null;
  tier: "verified" | "misleading" | "false" | "unverifiable" | "opinion";
  reasoning: string | null;
  what_would_verify_this: string | null;
  suggested_sources: string[];
  confidence: number;
  _model: string;
}

export interface CandidateBrief {
  voter_summary: string | null;
  notable_facts: string[];
  promise_completion_rate: number | null;
  data_completeness: "full" | "partial" | "minimal";
  confidence: number;
  _model: string;
}

export interface ManifestoSummary {
  politician_id: number;
  politician_name: string;
  politician_party: string | null;
  total: number;
  achieved: number;
  in_progress: number;
  promised: number;
  broken: number;
  unknown: number;
  completion_rate: number;
  items: ManifestoItemOut[];
}

export interface IngestionRunOut {
  id: number;
  source_id: number;
  started_at: string;
  finished_at: string | null;
  status: string;
  fetched_count: number;
  new_count: number;
  error_count: number;
  log_text?: string | null;
}

export interface IngestionStatusOut {
  runs: IngestionRunOut[];
  sources: SourceOut[];
}

// ---- Budget Calculator ----
// New RAG-based shape: summary, key_points, overall_signal, confidence_score.
// Legacy fields kept optional for backward-compatible rendering.
export interface BudgetImpactResult {
  summary?: string | null;
  key_points?: string[];
  overall_signal?: "benefit" | "neutral" | "burden";
  confidence_score?: number;
  // Legacy fields (older response shape — may still appear in fallbacks)
  one_line?: string | null;
  tax_change?: string | null;
  subsidies?: string[];
  sectors?: string[];
  signal?: "positive" | "neutral" | "negative";
  caveat?: string;
  budget_year?: string | null;
  confidence?: number;
  _model?: string;
}

// ---- Policy Diff ----
export interface PolicyDiffResult {
  added: string[];
  removed: string[];
  modified: string[];
  rights_impact: "expands" | "restricts" | "neutral";
  plain_summary: string | null;
  confidence: number;
  _model: string;
}

// ---- Scheme Check ----
export interface SchemeCheckResult {
  scheme_name: string;
  announced_target: string;
  verified_progress: string;
  gap: string | null;
  data_vintage: string | null;
  sources: string[];
  confidence: number;
  _model: string;
}

// ---- Rights Navigator ----
export interface RightsResult {
  rights_applicable: string[];
  next_steps: string[];
  grievance_authority: string | null;
  relevant_laws: string[];
  plain_summary: string | null;
  disclaimer: string;
  confidence: number;
  _model: string;
}

// ---- RTI Drafter ----
export interface RTIDraftResult {
  drafted_application: string;
  addressee: string | null;
  where_to_file: string | null;
  fee: string | null;
  expected_timeline: string | null;
  tips: string[];
  confidence: number;
  _model: string;
}

// ---- Feedback / Issues ----
export interface FeedbackIssueRow {
  topic_id: number;
  topic_name: string;
  topic_slug: string;
  constituency_id: number | null;
  constituency_name: string | null;
  count: number;
}

// ---- Fetcher ----
async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    // Force fresh data — civic info should reflect the latest pipeline run.
    cache: "no-store",
    ...init,
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

// ---- API ----
export const api = {
  updates: (params: Record<string, string | number> = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    );
    return get<UpdateList>(`/api/v1/updates?${q.toString()}`);
  },
  update: (id: number) => get<UpdateDetail>(`/api/v1/updates/${id}`),
  constituencies: () => get<ConstituencyOut[]>(`/api/v1/constituencies`),
  constituency: (id: number) => get<ConstituencyDetail>(`/api/v1/constituencies/${id}`),
  candidate: (id: number) => get<CandidateDetail>(`/api/v1/candidates/${id}`),
  candidateBrief: (id: number) => get<CandidateBrief>(`/api/v1/candidates/${id}/brief`),
  manifestos: (params: Record<string, string | number> = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    );
    return get<ManifestoItemOut[]>(`/api/v1/manifestos?${q.toString()}`);
  },
  manifestoSummary: (politicianId: number) =>
    get<ManifestoSummary>(`/api/v1/manifestos/summary?politician_id=${politicianId}`),
  decode: (text: string) =>
    fetch(`${BASE}/api/v1/decode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).then((r) => {
      if (!r.ok) throw new Error(`POST /decode failed: ${r.status}`);
      return r.json() as Promise<DecodeResult>;
    }),
  claimCheck: (claim: string) =>
    fetch(`${BASE}/api/v1/claim-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim }),
    }).then((r) => {
      if (!r.ok) throw new Error(`POST /claim-check failed: ${r.status}`);
      return r.json() as Promise<ClaimCheckResult>;
    }),
  budgetCalculator: (body: { profile: string; income: number; state: string; question?: string }) =>
    fetch(`${BASE}/api/v1/budget-calculator`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (r) => {
      if (r.status === 503) {
        // Document missing — caller can show the setup-required message.
        const err = new Error("BUDGET_DOC_MISSING");
        (err as Error & { status?: number }).status = 503;
        throw err;
      }
      if (!r.ok) throw new Error(`POST /budget-calculator failed: ${r.status}`);
      return r.json() as Promise<BudgetImpactResult>;
    }),
  policyDiff: (body: { old_text: string; new_text: string }) =>
    fetch(`${BASE}/api/v1/policy-diff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => {
      if (!r.ok) throw new Error(`POST /policy-diff failed: ${r.status}`);
      return r.json() as Promise<PolicyDiffResult>;
    }),
  schemeCheck: (body: { scheme_name: string; announced_target: string; announced_date: string }) =>
    fetch(`${BASE}/api/v1/scheme-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => {
      if (!r.ok) throw new Error(`POST /scheme-check failed: ${r.status}`);
      return r.json() as Promise<SchemeCheckResult>;
    }),
  rights: (situation: string) =>
    fetch(`${BASE}/api/v1/rights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation }),
    }).then((r) => {
      if (!r.ok) throw new Error(`POST /rights failed: ${r.status}`);
      return r.json() as Promise<RightsResult>;
    }),
  rtiDraft: (body: { information_sought: string; government_body: string; state: string }) =>
    fetch(`${BASE}/api/v1/rti/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => {
      if (!r.ok) throw new Error(`POST /rti/draft failed: ${r.status}`);
      return r.json() as Promise<RTIDraftResult>;
    }),
  flagDispute: (id: number, note: string) =>
    fetch(`${BASE}/api/v1/updates/${id}/dispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    }).then((r) => {
      if (!r.ok) throw new Error(`POST /updates/${id}/dispute failed: ${r.status}`);
      return r.json();
    }),
  feedbackIssues: (constituencyId?: number) => {
    const q = constituencyId ? `?constituency_id=${constituencyId}` : "";
    return get<{ items: FeedbackIssueRow[]; total_topics: number }>(`/api/v1/feedback/issues${q}`);
  },
  search: (q: string) => get<UpdateOut[]>(`/api/v1/search?q=${encodeURIComponent(q)}`),
  sources: () => get<SourceOut[]>(`/api/v1/sources`),
  feedbackClusters: (params: Record<string, string | number> = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    );
    return get<FeedbackClusterOut[]>(`/api/v1/feedback?${q.toString()}`);
  },
  constituencyFeedback: (cid: number) =>
    get<ConstituencyFeedbackResponse>(`/api/v1/feedback/by-constituency/${cid}`),
  submitFeedback: (body: {
    text: string;
    language?: string;
    constituency_id?: number;
    document_id?: number;
    topic_id?: number;
  }) =>
    fetch(`${BASE}/api/v1/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => {
      if (!r.ok) throw new Error(`POST /feedback failed: ${r.status}`);
      return r.json();
    }),
  ingestionStatus: (token: string) =>
    get<IngestionStatusOut>(`/api/v1/admin/ingestion-status`, {
      headers: { "X-Admin-Token": token },
    }),
};

// ---- Formatters ----
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function formatDocType(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
