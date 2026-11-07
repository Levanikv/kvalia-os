"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string };

/** Segmented control de sous-onglets (Courses / Tâches / Habitudes, Sport / Nutrition…). */
export function Segmented({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return (
    <div role="tablist" className="flex rounded-full bg-surface-2 p-1">
      {items.map((it) => {
        const actif = pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            role="tab"
            aria-selected={actif}
            className={`tap flex flex-1 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              actif ? "bg-surface text-text shadow-sm" : "text-text-2"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
