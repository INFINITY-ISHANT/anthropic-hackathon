import Link from "next/link";
import { type UpdateOut, formatDocType, timeAgo } from "@/lib/api";
import { ConfidenceBadge, SourceLabel } from "@/components/Trust";

interface Props {
  item: UpdateOut;
  variant?: "default" | "lede";
  lang?: "en" | "hi";
}

export function UpdateCard({ item, variant = "default", lang = "en" }: Props) {
  const isLede = variant === "lede";

  // When lang=hi, promote the Hindi line to primary; show English as the secondary.
  const primary = lang === "hi" ? item.summary_one_line_hi ?? item.summary_one_line_en : item.summary_one_line_en;
  const secondary = lang === "hi" ? item.summary_one_line_en : item.summary_one_line_hi;

  return (
    <article className={`group ${isLede ? "border-b border-paper-line pb-10" : "border-b border-paper-line/70 pb-6"}`}>
      <div className="flex items-center gap-3 flex-wrap mb-2">
        <span className="label-caps">{formatDocType(item.document_type)}</span>
        <span className="text-paper-line">·</span>
        <SourceLabel label={item.source_trust_label} />
        <span className="text-paper-line">·</span>
        <span className="text-[11px] text-ink-muted font-mono">
          fetched {timeAgo(item.fetched_at)}
        </span>
      </div>

      <Link href={`/updates/${item.id}`} className="block">
        <h2
          className={`font-display font-semibold tracking-tightish text-ink group-hover:text-ashoka transition-colors ${
            isLede ? "text-3xl md:text-4xl leading-[1.05]" : "text-xl leading-snug"
          }`}
        >
          {item.title ?? "(untitled)"}
        </h2>
      </Link>

      {primary && (
        <p className={`mt-3 text-ink-soft leading-relaxed ${isLede ? "text-lg max-w-column" : "text-[15px] max-w-column"}`}>
          {primary}
        </p>
      )}

      {secondary && secondary !== primary && (
        <p className="mt-2 text-sm text-ink-muted leading-relaxed flex items-start gap-2 max-w-column">
          <span className="text-[10px] uppercase tracking-wideish bg-ashoka-soft text-ashoka px-1.5 py-0.5 rounded-sm shrink-0 mt-0.5">
            {lang === "hi" ? "EN" : "हि"}
          </span>
          <span>{secondary}</span>
        </p>
      )}

      <div className="mt-4 flex items-center gap-4 flex-wrap">
        <ConfidenceBadge score={item.confidence_score} />
        {item.source_name && (
          <span className="text-xs text-ink-muted">
            via <span className="font-medium text-ink-soft">{item.source_name}</span>
          </span>
        )}
        {item.tags_json && item.tags_json.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {item.tags_json.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] uppercase tracking-wideish text-ashoka bg-ashoka-soft px-1.5 py-0.5 rounded-sm">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
