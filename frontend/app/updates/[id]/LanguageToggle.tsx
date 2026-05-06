"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function LanguageToggle({ hasHindi }: { hasHindi: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("lang") ?? "en";

  if (!hasHindi) return null;

  const toggle = (lang: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lang", lang);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-1 border border-paper-line rounded-sm overflow-hidden text-[11px] uppercase tracking-wideish">
      {(["en", "hi"] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => toggle(lang)}
          className={`px-3 py-1.5 font-medium transition-colors ${
            current === lang
              ? "bg-ink text-paper"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          {lang === "en" ? "English" : "हिंदी"}
        </button>
      ))}
    </div>
  );
}
