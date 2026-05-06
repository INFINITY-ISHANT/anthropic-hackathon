"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Inner component reads searchParams. Wrapped in Suspense at the export
 * boundary because Next 14 requires it when the surrounding page might
 * be statically generated.
 */
function Inner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("lang") === "hi" ? "hi" : "en";

  function setLang(lang: "en" | "hi") {
    const next = new URLSearchParams(params.toString());
    if (lang === "en") {
      next.delete("lang");
    } else {
      next.set("lang", "hi");
    }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className="flex items-center gap-0.5 border border-paper-line rounded-sm overflow-hidden text-[11px] uppercase tracking-wideish"
    >
      {(["en", "hi"] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => setLang(lang)}
          className={`px-2.5 py-1 font-medium transition-colors ${
            current === lang ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
          }`}
          aria-pressed={current === lang}
        >
          {lang === "en" ? "EN" : "हि"}
        </button>
      ))}
    </div>
  );
}

/**
 * Public component. Renders a static placeholder until the search params
 * become available on the client.
 */
export function LanguageSwitcher() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-0.5 border border-paper-line rounded-sm overflow-hidden text-[11px] uppercase tracking-wideish opacity-50">
          <span className="px-2.5 py-1 font-medium bg-ink text-paper">EN</span>
          <span className="px-2.5 py-1 font-medium text-ink-muted">हि</span>
        </div>
      }
    >
      <Inner />
    </Suspense>
  );
}
