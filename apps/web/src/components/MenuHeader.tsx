"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { menuHeader, module } from "@kvalia/ui";
import { Icon } from "./Icon";

/** Menu du header (avatar) : Documents, Objectifs, Réglages. */
export function MenuHeader({ initiale }: { initiale: string }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener("pointerdown", fermer);
    return () => document.removeEventListener("pointerdown", fermer);
  }, [ouvert]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-label="Menu"
        className="tap flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent"
      >
        {initiale}
      </button>
      {ouvert && (
        <ul role="menu" className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-lg border border-border bg-surface shadow-xl shadow-black/15">
          {menuHeader.map((key) => {
            const m = module(key);
            return (
              <li key={key} role="none" data-module={key}>
                <Link
                  role="menuitem"
                  href={m.path}
                  onClick={() => setOuvert(false)}
                  className="tap flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-2"
                >
                  <Icon name={m.icon} className="text-accent" size={22} />
                  {m.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
