"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { cocher } from "../../actions";

type Props = { ligneId: string; fait: boolean; desactive: boolean; suivant: string };

/** Depuis la fiche (barre d'action fixe en bas) : marquer l'exercice fait et enchaîner sur le suivant. */
export function BoutonFait({ ligneId, fait, desactive, suivant }: Props) {
  const router = useRouter();
  const [, start] = useTransition();
  const [local, setLocal] = useState(fait);

  if (desactive) return null;
  return (
    <div className="flex gap-[var(--inline-md)]">
      <button
        type="button"
        disabled={local}
        onClick={() =>
          start(async () => {
            setLocal(true);
            await cocher(ligneId, true);
            router.push(suivant);
          })
        }
        className={`kv-btn kv-btn-xl flex-1 shadow-raised ${local ? "kv-btn-secondary text-feedback-success-text" : "kv-btn-primary"}`}
      >
        <Icon name={local ? "check_circle" : "check"} size={22} filled={local} />
        <span className="kv-btn-label">{local ? "Fait" : "Fait → suivant"}</span>
      </button>
      {local && (
        <button type="button" onClick={() => router.push(suivant)} className="kv-btn kv-btn-primary kv-btn-xl shadow-raised">
          <span className="kv-btn-label">Suivant</span> <Icon name="chevron_right" size={22} />
        </button>
      )}
    </div>
  );
}
