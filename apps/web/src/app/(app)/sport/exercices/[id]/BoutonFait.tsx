"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { cocher } from "../../actions";

type Props = { ligneId: string; fait: boolean; desactive: boolean; suivant: string };

/** Depuis la fiche : marquer l'exercice fait et enchaîner sur le suivant. */
export function BoutonFait({ ligneId, fait, desactive, suivant }: Props) {
  const router = useRouter();
  const [, start] = useTransition();
  const [local, setLocal] = useState(fait);

  if (desactive) return null;
  return (
    <div className="mt-3 flex gap-2">
      <button type="button" disabled={local}
        onClick={() => start(async () => { setLocal(true); await cocher(ligneId, true); router.push(suivant); })}
        className={`tap flex flex-1 items-center justify-center gap-2 rounded-full font-semibold ${local ? "bg-success/20 text-success" : "bg-accent text-white"}`}>
        <Icon name={local ? "check_circle" : "check"} size={20} filled={local} /> {local ? "Fait" : "Fait → suivant"}
      </button>
      {local && (
        <button type="button" onClick={() => router.push(suivant)} className="tap flex items-center gap-1 rounded-full bg-surface-3 px-4 text-sm font-medium">
          Suivant <Icon name="chevron_right" size={18} />
        </button>
      )}
    </div>
  );
}
