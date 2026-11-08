"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

function Formulaire() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function connecter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    setEnCours(false);
    if (error) {
      setErreur(error.message === "Invalid login credentials" ? "Email ou mot de passe incorrect." : error.message);
      return;
    }
    router.replace(params.get("suite") || "/");
    router.refresh();
  }

  return (
    <form onSubmit={connecter} className="flex w-full max-w-sm flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-fg-secondary">Email</span>
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="tap rounded-md border border-line-default bg-surface-canvas px-3 text-base outline-none focus:border-action-primary"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-fg-secondary">Mot de passe</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          className="tap rounded-md border border-line-default bg-surface-canvas px-3 text-base outline-none focus:border-action-primary"
        />
      </label>
      {erreur && <p className="text-sm text-feedback-danger-text">{erreur}</p>}
      <button
        type="submit"
        disabled={enCours}
        className="tap mt-2 rounded-md bg-action-primary font-medium text-fg-on-brand transition-opacity disabled:opacity-60"
      >
        {enCours ? "Connexion…" : "Se connecter"}
      </button>
      <p className="mt-2 text-center text-xs text-fg-tertiary">Passkeys et lien magique arrivent en phase 0.7.</p>
    </form>
  );
}

export default function Connexion() {
  return (
    <main data-module="home" className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 pt-safe pb-safe">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-action-primary text-fg-on-brand">
          <Icon name="grid_view" size={32} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">KVALIA OS</h1>
        <p className="text-sm text-fg-secondary">Ton système de vie quotidienne.</p>
      </div>
      <Suspense>
        <Formulaire />
      </Suspense>
    </main>
  );
}
