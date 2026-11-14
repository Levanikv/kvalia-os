"use client";
import { useEffect, useState } from "react";

export { formatChrono } from "../../lib";

/** L'heure courante (ms), rafraîchie chaque seconde tant que `actif` : fait avancer chrono et repos. */
export function useMaintenant(actif: boolean, pasMs = 1000): number {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    if (!actif) return;
    const id = setInterval(() => setT(Date.now()), pasMs);
    return () => clearInterval(id);
  }, [actif, pasMs]);
  return t;
}
