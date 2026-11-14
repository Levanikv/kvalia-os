"use client";
import { chronoSecondes } from "@kvalia/core";
import { formatChrono } from "./lib";
import { useMaintenant } from "./seance/[id]/temps";

type Props = { debut_le: string | null; pause_le: string | null; pause_cumul_s: number | null };

/** Tag « En cours · 31:16 » du ticket séance : le chrono avance en direct (figé en pause). */
export function ChronoTag({ debut_le, pause_le, pause_cumul_s }: Props) {
  const maintenant = useMaintenant(!pause_le);
  return (
    <span className="kv-tag kv-tag-danger">
      {pause_le ? "En pause" : "En cours"} ·{" "}
      <span suppressHydrationWarning>{formatChrono(chronoSecondes({ debut_le, pause_le, pause_cumul_s }, new Date(maintenant)))}</span>
    </span>
  );
}
