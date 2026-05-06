import Link from "next/link";
import { api } from "@/lib/api";
import { UpdateCard } from "@/components/UpdateCard";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: { lang?: string };
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

async function fetchAllTodayUpdates(from: string) {
  const pageSize = 100;
  let page = 1;
  const allItems: Awaited<ReturnType<typeof api.updates>>["items"] = [];
  let total = 0;

  while (true) {
    const result = await api.updates({ from, page, page_size: pageSize });
    total = result.total;
    allItems.push(...result.items);
    if (result.items.length < pageSize || allItems.length >= result.total) {
      break;
    }
    page += 1;
  }

  return { items: allItems, total };
}

export default async function TodayUpdatesPage({ searchParams }: PageProps) {
  const lang: "en" | "hi" = searchParams?.lang === "hi" ? "hi" : "en";
  const todayStart = getIstTodayStart();

  const { items, total } = await fetchAllTodayUpdates(todayStart).catch(() => ({ items: [], total: 0 }));

  return (
    <div className="space-y-8">
      <section className="flex items-end justify-between gap-6 border-b border-ink/90 pb-6">
        <div>
          <p className="label-caps mb-3">All updates till now</p>
          <h1 className="font-display font-semibold text-4xl md:text-5xl leading-[1.05] tracking-tightish max-w-3xl">
            Everything published today
          </h1>
          <p className="mt-4 text-ink-soft leading-relaxed max-w-column">
            A complete view of today’s published updates in IST order.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wideish text-ink-muted">Updates today</p>
          <p className="font-display font-semibold text-4xl">{total}</p>
        </div>
      </section>

      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="text-xs uppercase tracking-wideish text-ashoka hover:text-ashoka-deep">
          ← Back to home
        </Link>
        <p className="text-xs text-ink-muted">
          Showing {items.length} of {total} updates
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-ink-muted py-12 text-center">No updates have been published today yet.</p>
      ) : (
        <div className="space-y-8">
          {items.map((item) => (
            <UpdateCard key={item.id} item={item} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}