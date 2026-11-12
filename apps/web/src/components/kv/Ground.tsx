import type { ReactNode } from "react";

/** Fond de page du design system : surface-page + dégradé (coin chaud / coin froid) + grain de la mini-app. */
export function Ground({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`kv-ground ${className}`}>
      <div className="kv-ground-content">{children}</div>
    </div>
  );
}
