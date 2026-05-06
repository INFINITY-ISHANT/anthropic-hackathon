import { api } from "@/lib/api";
import { IssueReporter } from "./IssueReporter";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: { constituency_id?: string };
}

export default async function FeedbackPage({ searchParams }: PageProps) {
  const constituencyId = searchParams?.constituency_id
    ? Number(searchParams.constituency_id)
    : undefined;

  const constituencies = await api.constituencies().catch(() => []);

  return (
    <div>
      <header className="ruled pt-3 mb-10">
        <p className="ident">Citizen Voice</p>
        <h1 className="font-display font-semibold text-5xl md:text-6xl mt-2 tracking-tightish">
          Report local civic issues.
        </h1>
        <p className="mt-4 text-ink-soft max-w-column leading-relaxed">
          Flag problems in your area so they can be grouped with similar reports
          and surfaced on your constituency page.
        </p>
      </header>

      <section>
        <h2 className="font-display text-2xl font-semibold mb-2 border-b border-paper-line pb-3">
          Report a local problem
        </h2>
        <p className="text-sm text-ink-soft leading-relaxed mb-6 mt-3 max-w-column">
          Roads, water, electricity, schools — flag what isn&apos;t working
          near you. Reports are categorised and grouped with similar ones
          from your area.
        </p>
        <IssueReporter
          constituencies={constituencies}
          preselectedConstituencyId={constituencyId}
        />
      </section>
    </div>
  );
}
