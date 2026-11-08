"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { appPour, menuApps, module, moduleDepuisChemin } from "@kvalia/ui";
import { BottomSheet } from "./BottomSheet";
import { Icon } from "./Icon";

/** Menu « apps » (burger) : liste des applications, l'actuelle surlignée. S'ouvre en feuille depuis le bas. */
export function MenuApps() {
  const [ouvert, setOuvert] = useState(false);
  const pathname = usePathname();
  const courante = appPour(moduleDepuisChemin(pathname));

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-label="Applications"
        aria-haspopup="dialog"
        className="tap flex w-10 items-center justify-center rounded-full text-text"
      >
        <Icon name="menu" size={26} />
      </button>
      <BottomSheet ouvert={ouvert} onFermer={() => setOuvert(false)} titre="Applications">
        <ul className="grid grid-cols-2 gap-2 pb-2">
          {menuApps.map((key) => {
            const m = module(key);
            const actif = key === courante;
            return (
              <li key={key} data-module={key}>
                <Link
                  href={m.path}
                  onClick={() => setOuvert(false)}
                  className={`flex min-h-[92px] flex-col justify-between rounded-lg border p-3 active:opacity-80 ${actif ? "border-accent bg-accent-soft" : "border-border bg-surface-2"}`}
                >
                  <Icon name={m.icon} size={24} className="text-accent" filled={actif} />
                  <div>
                    <p className="text-sm font-semibold leading-tight">{m.label}</p>
                    <p className="mt-0.5 text-[11px] leading-tight text-text-2">{m.description}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        <Link
          href="/capture"
          onClick={() => setOuvert(false)}
          data-module="capture"
          className="tap mt-1 flex items-center justify-center gap-2 rounded-full bg-accent font-semibold text-white"
        >
          <Icon name="add" size={22} /> Capture — dire quelque chose à l’agent
        </Link>
      </BottomSheet>
    </>
  );
}
