import Link from "next/link";
import { api } from "@/lib/api";
import { UpdateCard } from "@/components/UpdateCard";
import { SearchBar } from "@/components/SearchBar";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: { q?: string; lang?: string };
}

function getIstTodayStart(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}T00:00:00+05:30`;
}

export default async function HomePage({ searchParams }: PageProps) {
  const q = searchParams?.q?.trim();
  const lang: "en" | "hi" = searchParams?.lang === "hi" ? "hi" : "en";
  const todayStart = getIstTodayStart();

  const [updates, allTodayUpdates, constituencies, sources] = await Promise.all([
    q
      ? api.search(q).then((items) => ({ items, total: items.length, page: 1, page_size: items.length })).catch(() => ({ items: [], total: 0, page: 1, page_size: 0 }))
      : api.updates({ page_size: 12 }).catch(() => ({ items: [], total: 0, page: 1, page_size: 0 })),
    q
      ? Promise.resolve({ items: [], total: 0, page: 1, page_size: 0 })
      : api.updates({ from: todayStart, page_size: 5 }).catch(() => ({ items: [], total: 0, page: 1, page_size: 0 })),
    api.constituencies().catch(() => []),
    api.sources().catch(() => []),
  ]);

  const featured = constituencies[0];
  const lede = updates.items[0];
  const rest = updates.items.slice(1);
  const activeSources = sources.filter((s) => s.active).length;

  return (
    <div>
      {/* Hero: editorial + searchbar */}
      <section className="grid md:grid-cols-3 gap-10 pb-12 border-b border-ink/90">
        <div className="md:col-span-2">
          <p className="label-caps mb-4">Today on Nagarik</p>
          <h2 className="font-display font-semibold text-4xl md:text-5xl leading-[1.05] tracking-tightish max-w-3xl">
            Government decisions, decoded —{" "}
            <span className="text-ashoka italic">in the language of the people they affect.</span>
          </h2>
          <p className="mt-5 text-ink-soft leading-relaxed max-w-column">
            Every summary on this page is generated from an official document. Every claim
            is a link back to the original. Where extraction is uncertain, we say so.
          </p>
          <div className="mt-7">
            <SearchBar initialValue={q ?? ""} />
          </div>
        </div>
        <aside className="md:col-span-1 md:border-l md:border-paper-line md:pl-8">
          <p className="label-caps mb-3">Pipeline status</p>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Updates today</dt>
              <dd className="font-display font-semibold text-2xl">{updates.total}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Active sources</dt>
              <dd className="font-display font-semibold text-2xl">{activeSources}/{sources.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Constituencies</dt>
              <dd className="font-display font-semibold text-2xl">{constituencies.length}</dd>
            </div>
          </dl>
          <p className="mt-5 text-[11px] text-ink-muted leading-relaxed">
            News ingestion runs continuously. Citizen Voice feedback is published instantly —
            no delay.
          </p>
        </aside>
      </section>

      {/* Section header */}
      <section className="pt-10">
        {q ? (
          <p className="label-caps mb-6">Search results for &ldquo;{q}&rdquo;</p>
        ) : (
          <div className="flex items-end justify-between mb-6">
            <h3 className="font-display text-2xl font-semibold">Recent updates</h3>
            <Link href="/feedback" className="text-xs uppercase tracking-wideish text-ashoka hover:text-ashoka-deep">
              Submit feedback →
            </Link>
          </div>
        )}

        {!lede && (
          <p className="text-ink-muted py-12 text-center">
            No updates found.{q && " Try a different query."}
          </p>
        )}

        {lede && (
          <div className="grid md:grid-cols-3 gap-x-10 gap-y-10">
            {/* Lede on the left, two columns wide */}
            <div className="md:col-span-2">
              <UpdateCard item={lede} variant="lede" lang={lang} />
              <div className="mt-10 space-y-8">
                {rest.slice(0, 4).map((u) => (
                  <UpdateCard key={u.id} item={u} lang={lang} />
                ))}
              </div>
            </div>

            {/* Sidebar: featured constituency + secondary updates */}
            <aside className="md:col-span-1 md:border-l md:border-paper-line md:pl-8 space-y-10">
              {featured && (
                <div>
                  <p className="label-caps mb-2">Featured constituency</p>
                  <Link href={`/constituencies/${featured.id}`} className="block group">
                    <h4 className="font-display font-semibold text-2xl group-hover:text-ashoka transition-colors">
                      {featured.name}
                    </h4>
                    <p className="text-xs text-ink-muted mt-1 uppercase tracking-wideish">
                      {featured.type === "lok_sabha" ? "Lok Sabha" : "Vidhan Sabha"}
                      {featured.number ? ` · PC ${featured.number}` : ""}
                    </p>
                  </Link>
                  <p className="mt-3 text-sm text-ink-soft leading-relaxed">
                    See recent government updates mapped to this constituency, candidate
                    information, and aggregated citizen feedback.
                  </p>
                </div>
              )}

              {rest.length > 4 && (
                <div className="border-t border-paper-line pt-6">
                  <p className="label-caps mb-4">Also today</p>
                  <ul className="space-y-4">
                    {rest.slice(4, 9).map((u) => (
                      <li key={u.id}>
                        <Link href={`/updates/${u.id}`} className="block group">
                          <p className="font-display text-base leading-snug group-hover:text-ashoka transition-colors">
                            {u.title}
                          </p>
                          <p className="text-[11px] text-ink-muted mt-1 uppercase tracking-wideish">
                            {u.source_name}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        )}

        {!q && allTodayUpdates.total > 0 && (
          <div className="mt-14 border-t border-paper-line pt-10">
            <div className="flex items-end justify-between mb-6 gap-4">
              <div>
                <p className="label-caps mb-2">All updates till now</p>
                <h3 className="font-display text-2xl font-semibold">
                  Everything published today
                </h3>
              </div>
              <Link href="/updates/today" className="text-xs uppercase tracking-wideish text-ashoka hover:text-ashoka-deep whitespace-nowrap">
                View full list →
              </Link>
            </div>

            <div className="space-y-6">
              {allTodayUpdates.items.map((item) => (
                <UpdateCard key={item.id} item={item} lang={lang} />
              ))}
            </div>

            <p className="mt-4 text-xs text-ink-muted">
              Showing {allTodayUpdates.items.length} of {allTodayUpdates.total} updates published today.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
