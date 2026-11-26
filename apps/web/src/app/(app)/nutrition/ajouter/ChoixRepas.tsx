"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Repas } from "@kvalia/core";
import { ILLUSTRATIONS_REPAS } from "../donnees";

/** Quel repas : une rangée de puces qui défile, le repas choisi mis en avant et amené au centre. */
export function ChoixRepas({ repas, liens }: { repas: Repas; liens: Array<{ repas: Repas; href: string; label: string }> }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[aria-current]")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" });
  }, [repas]);
  return (
    <nav ref={ref} className="puces -mx-[var(--page-gutter)] flex gap-[var(--inline-sm)] overflow-x-auto px-[var(--page-gutter)]" aria-label="Repas">
      {liens.map((l) => (
        <Link
          key={l.repas}
          href={l.href}
          replace
          scroll={false}
          aria-current={l.repas === repas ? "true" : undefined}
          className={`kv-chip flex shrink-0 items-center gap-[var(--inline-xs)] ${l.repas === repas ? "is-on" : ""}`}
        >
          <span aria-hidden>{ILLUSTRATIONS_REPAS[l.repas]}</span>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
