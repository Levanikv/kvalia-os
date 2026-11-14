"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Toast } from "@/components/Toast";

/** Toast « Séance enregistrée » en arrivant sur la Home depuis la fin de séance (`?enregistree=1`), puis on nettoie l'URL. */
export function ToastUrl() {
  const params = useSearchParams();
  const router = useRouter();
  const chemin = usePathname();
  const [vu, setVu] = useState(false);
  const fermer = useCallback(() => {
    setVu(true);
    const p = new URLSearchParams(params.toString());
    p.delete("enregistree");
    router.replace(p.size ? `${chemin}?${p}` : chemin, { scroll: false });
  }, [params, router, chemin]);
  return <Toast message={!vu && params.get("enregistree") ? "Séance enregistrée" : null} onFermer={fermer} />;
}
