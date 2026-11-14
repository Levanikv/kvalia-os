"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { ParametresSport } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { LigneChoix, TuileChoix } from "@/components/kv/Choix";
import { Ground } from "@/components/kv/Ground";
import { WheelPicker } from "@/components/kv/WheelPicker";
import { passerOnboarding, sauverOnboarding, terminerOnboarding } from "../actions";

type Profil = NonNullable<ParametresSport["profil"]>;
type Objectif = NonNullable<Profil["objectifs"]>[number];
type Materiel = NonNullable<Profil["materiel_maison"]>[number];
type Douleur = NonNullable<Profil["douleurs"]>[number];

const OBJECTIFS: Array<{ id: Objectif; t: string; d: string }> = [
  { id: "force", t: "Force", d: "Soulever plus lourd" },
  { id: "masse", t: "Prise de muscle", d: "Volume, silhouette" },
  { id: "seche", t: "Sèche", d: "Moins de gras" },
  { id: "explosivite", t: "Explosivité", d: "Vitesse, puissance" },
  { id: "endurance", t: "Endurance", d: "Tenir l’effort" },
  { id: "sante", t: "Santé & posture", d: "Dos, épaules" },
];
const ACTIVITES = [
  { id: "assis", t: "Plutôt assis", d: "Bureau, moins de 5 000 pas" },
  { id: "actif", t: "Plutôt actif", d: "Debout, marche · 5 à 10 000 pas" },
  { id: "tres_actif", t: "Très actif", d: "Métier physique · plus de 10 000 pas" },
] as const;
const NIVEAUX = [
  { id: "beginner", t: "Débutant", d: "Moins de 6 mois de salle" },
  { id: "intermediate", t: "Intermédiaire", d: "1 à 3 ans, technique acquise" },
  { id: "advanced", t: "Avancé", d: "3 ans et plus, charges suivies" },
] as const;
const MATERIEL: Array<{ id: Materiel; t: string }> = [
  { id: "halteres", t: "Haltères" },
  { id: "barre", t: "Barre & disques" },
  { id: "kettlebell", t: "Kettlebell" },
  { id: "elastiques", t: "Élastiques" },
  { id: "traction", t: "Barre de traction" },
  { id: "banc", t: "Banc" },
];
const DOULEURS: Array<{ id: Douleur; t: string }> = [
  { id: "epaule", t: "Épaule" },
  { id: "poignet", t: "Poignet" },
  { id: "genou", t: "Genou" },
  { id: "dos", t: "Dos" },
  { id: "nuque", t: "Nuque" },
];
const EVENEMENTS = ["Test de force", "Été", "Événement", "Aucun"];
const DUREES: Array<[number, string]> = [
  [45, "Express"],
  [60, "Standard"],
  [75, "Complet"],
  [90, "Long"],
];
const NUTRITION = [
  { id: "ia", t: "L’IA me propose mes repas", d: "Recettes calées sur tes séances" },
  { id: "saisie", t: "Je saisis ce que je mange", d: "L’IA fait les comptes" },
  { id: "plus_tard", t: "Plus tard", d: "Les cibles restent actives" },
] as const;
/** Lundi d'abord à l'écran ; stockage en 0 = dimanche (comme le générateur). */
const LETTRES = ["L", "M", "M", "J", "V", "S", "D"];
const NOMS_JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const versJs = (i: number) => (i + 1) % 7;

const Q: Record<number, { sur: string; titre: string; sous: string }> = {
  1: { sur: "Toi", titre: "Commençons par toi.", sous: "Pour calibrer les charges, les calories et la récupération." },
  2: { sur: "Mensurations", titre: "Ta taille, ton poids.", sous: "Fais tourner les roues. Tu pourras les ajuster à chaque pesée." },
  3: { sur: "Quotidien", titre: "Hors salle, tu bouges comment ?", sous: "Ta dépense de tous les jours, en dehors des séances." },
  4: { sur: "Objectifs", titre: "En salle, tu cherches quoi ?", sous: "Plusieurs choix possibles. L’IA hiérarchise." },
  5: { sur: "Poids cible", titre: "Tu vises quel poids ?", sous: "Un rythme tenable, sans sacrifier la force." },
  6: { sur: "Disponibilités", titre: "Combien de séances par semaine ?", sous: "Le nombre, puis les jours qui t’arrangent." },
  7: { sur: "Durée", titre: "Combien de temps par séance ?", sous: "Échauffement compris." },
  8: { sur: "Lieu", titre: "Tu t’entraînes où ?", sous: "L’IA choisit les exercices selon l’endroit." },
  9: { sur: "Matériel", titre: "Ton matériel à la maison.", sous: "Tout ce que tu as sous la main." },
  10: { sur: "Échéance", titre: "Un rendez-vous à préparer ?", sous: "L’IA découpe le plan en phases jusqu’à la date." },
  11: { sur: "Niveau", titre: "Ton niveau en salle ?", sous: "Pour le choix des exercices et les charges de départ." },
  12: { sur: "Limites", titre: "Des douleurs ou blessures ?", sous: "Plusieurs choix possibles." },
  13: { sur: "Nutrition · optionnel", titre: "Et côté assiette ?", sous: "Tes calories suivent déjà tes séances." },
};
const ETAPES_GENERATION = [
  "Profil et dépense de base",
  "Objectifs et priorités",
  "Placement des séances et du matériel",
  "Charges de départ et progression",
  "Phases jusqu’à l’échéance",
];

type Etat = {
  sexe: "homme" | "femme";
  age: number;
  taille: number;
  poids: number;
  activite: "assis" | "actif" | "tres_actif";
  objectifs: Objectif[];
  cible: number | null;
  seances: number;
  jours: boolean[];
  duree: number;
  lieu: "salle" | "maison" | "les_deux";
  salle: "complete" | "basique";
  materiel: Materiel[];
  evenement: string | null;
  semaines: number;
  niveau: "beginner" | "intermediate" | "advanced";
  douleurs: Douleur[];
  nutrition: "ia" | "saisie" | "plus_tard" | null;
};

function depuisProfil(p: Profil): Etat {
  const jours = [false, false, false, false, false, false, false];
  for (const j of p.jours ?? [1, 3, 5, 6]) jours[(j + 6) % 7] = true;
  return {
    sexe: p.sexe ?? "homme",
    age: p.age ?? 30,
    taille: p.taille_cm ?? 175,
    poids: p.poids_kg ?? 75,
    activite: p.activite ?? "actif",
    objectifs: p.objectifs ?? [],
    cible: p.poids_cible_kg ?? null,
    seances: p.seances_semaine ?? 4,
    jours,
    duree: p.duree_min ?? 60,
    lieu: p.lieu ?? "salle",
    salle: p.salle ?? "complete",
    materiel: p.materiel_maison ?? [],
    evenement: p.evenement ?? null,
    semaines: p.echeance_semaines ?? 12,
    niveau: p.niveau ?? "intermediate",
    douleurs: p.douleurs ?? [],
    nutrition: p.nutrition ?? null,
  };
}

function versProfil(a: Etat): Profil {
  return {
    sexe: a.sexe,
    age: a.age,
    taille_cm: a.taille,
    poids_kg: a.poids,
    activite: a.activite,
    objectifs: a.objectifs,
    poids_cible_kg: a.cible ?? undefined,
    seances_semaine: a.seances,
    jours: a.jours.flatMap((on, i) => (on ? [versJs(i)] : [])),
    duree_min: a.duree,
    lieu: a.lieu,
    salle: a.salle,
    materiel_maison: a.materiel,
    evenement: a.evenement && a.evenement !== "Aucun" ? a.evenement : null,
    echeance_semaines: a.semaines,
    niveau: a.niveau,
    douleurs: a.douleurs,
    nutrition: a.nutrition ?? undefined,
  };
}

const virgule = (v: number) => String(v).replace(".", ",");
const pad = (n: number) => String(n).padStart(2, "0");
const toggle = <T,>(liste: T[], x: T) => (liste.includes(x) ? liste.filter((y) => y !== x) : [...liste, x]);

type Resultat = Awaited<ReturnType<typeof terminerOnboarding>>;

export function Onboarding({ profil, etape: etapeInitiale }: { profil: Profil; etape: number }) {
  const router = useRouter();
  const [a, setA] = useState<Etat>(() => depuisProfil(profil));
  const [ecran, setEcran] = useState<"accueil" | "question" | "generation" | "pret">(etapeInitiale > 0 ? "question" : "accueil");
  const [etape, setEtape] = useState(Math.max(1, etapeInitiale));
  const [gen, setGen] = useState(0);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [, demarrer] = useTransition();
  const maj = <K extends keyof Etat>(k: K, v: Etat[K]) => setA((x) => ({ ...x, [k]: v }));

  // Étapes conditionnelles : poids cible si sèche / prise de muscle (ou aucun choix), matériel si la maison est concernée.
  const etapes = useMemo(() => {
    const l = [1, 2, 3, 4];
    if (!a.objectifs.length || a.objectifs.includes("seche") || a.objectifs.includes("masse")) l.push(5);
    l.push(6, 7, 8);
    if (a.lieu !== "salle") l.push(9);
    l.push(10, 11, 12, 13);
    return l;
  }, [a.objectifs, a.lieu]);
  const idx = Math.max(0, etapes.indexOf(etape));
  const derniere = idx === etapes.length - 1;

  // Poids cible par défaut : −3,5 kg en sèche, +3 kg en prise de muscle.
  const perte = a.objectifs.includes("seche");
  const prise = a.objectifs.includes("masse") && !perte;
  const cibleDefaut = Math.round((perte ? a.poids - 3.5 : prise ? a.poids + 3 : a.poids) * 2) / 2;
  const cible = a.cible ?? cibleDefaut;
  const ecart = Math.round((cible - a.poids) * 10) / 10;
  const rythmeKg = ecart < 0 ? 0.5 : 0.25;
  const semainesBesoin = Math.max(1, Math.ceil(Math.abs(ecart) / rythmeKg));
  const placesJours = a.jours.filter(Boolean).length;
  const diff = a.seances - placesJours;
  const bloque = (etape === 4 && a.objectifs.length === 0) || (etape === 6 && diff !== 0) || (etape === 13 && !a.nutrition);

  // Animation de génération : on avance les 5 lignes pendant que le serveur génère.
  useEffect(() => {
    if (ecran !== "generation") return;
    const t = setInterval(() => setGen((g) => Math.min(ETAPES_GENERATION.length, g + 1)), 850);
    return () => clearInterval(t);
  }, [ecran]);

  const profilCourant = () => versProfil({ ...a, cible });
  function suivant() {
    if (bloque) return;
    if (derniere) {
      setEcran("generation");
      setGen(0);
      setErreur(null);
      terminerOnboarding(profilCourant(), etape)
        .then(setResultat)
        .catch(() => {
          setErreur("La génération n’a pas abouti. Réessaie, tes réponses sont gardées.");
          setEcran("question");
        });
      return;
    }
    const prochaine = etapes[idx + 1];
    setEtape(prochaine);
    // Sauvegarde en arrière-plan : une erreur réseau ne bloque pas le parcours (les réponses partent à l'étape suivante).
    demarrer(async () => {
      try {
        await sauverOnboarding(profilCourant(), prochaine);
      } catch {
        /* hors ligne : la prochaine sauvegarde rattrapera */
      }
    });
  }
  function precedent() {
    if (idx <= 0) setEcran("accueil");
    else setEtape(etapes[idx - 1]);
  }
  function plusTard() {
    demarrer(async () => {
      await passerOnboarding(profilCourant(), ecran === "question" ? etape : 1);
      router.push("/sport");
    });
  }

  // Le plan s'affiche quand le serveur a répondu ET que l'animation est allée au bout.
  const vue = ecran === "generation" && resultat && gen >= ETAPES_GENERATION.length ? "pret" : ecran;
  const pct = Math.round(((idx + 1) / etapes.length) * 100);
  const q = Q[etape];

  return (
    <div data-module="sport" data-theme="dark" className="min-h-dvh bg-surface-page text-fg-primary">
      <Ground className="min-h-dvh">
        <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-[var(--page-gutter-wide)] pt-safe">
          {vue === "accueil" && (
            <>
              <div className="flex h-[var(--header-h)] items-center justify-between">
                <span className="kv-overline">Kvalia / Sport</span>
                <button type="button" onClick={plusTard} className="tap type-label-md text-fg-primary">
                  Plus tard
                </button>
              </div>
              <div className="relative flex flex-1 flex-col justify-end pb-[var(--stack-xl)]">
                <p
                  aria-hidden
                  className="pointer-events-none absolute -left-1 top-[var(--stack-2xl)] select-none text-[88px] font-black leading-[0.86] tracking-[-0.065em] text-fg-primary opacity-[var(--opacity-faint)]"
                >
                  FORCE
                  <br />
                  SÉRIES
                </p>
                <h1 className="text-[56px] font-black leading-[0.9] tracking-[-0.065em]">
                  Force.
                  <br />
                  Volume<span className="text-fg-action">.</span>
                  <br />
                  <span className="text-fg-secondary">Un plan.</span>
                </h1>
                <p className="mt-[var(--stack-lg)] type-body-lg text-fg-secondary">
                  L’IA construit ta semaine de muscu : les bonnes charges, le bon volume, au bon moment.
                </p>
                <div className="mt-[var(--stack-xl)] flex justify-between border-t border-line-default pt-[var(--stack-md)] kv-mono">
                  <span>{etapes.length} questions</span>
                  <span>≈ 2 min</span>
                  <span>Modifiable</span>
                </div>
              </div>
              <div className="pb-[calc(max(env(safe-area-inset-bottom),var(--stack-md))+var(--stack-sm))]">
                <button type="button" onClick={() => setEcran("question")} className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block kv-btn-has-end">
                  <span className="kv-btn-label">Commencer</span>
                  <span className="kv-btn-end">
                    <Icon name="arrow_forward" size={22} />
                  </span>
                </button>
              </div>
            </>
          )}

          {vue === "question" && q && (
            <>
              <div className="flex h-[var(--header-h)] items-center justify-between">
                <button type="button" onClick={precedent} aria-label="Question précédente" className="kv-iconbtn kv-iconbtn-ghost">
                  <Icon name="chevron_left" size={26} />
                </button>
                <span className="kv-mono text-fg-secondary" aria-live="polite">
                  {pad(idx + 1)} / {pad(etapes.length)}
                </span>
                <button type="button" onClick={plusTard} className="tap type-label-md text-fg-primary">
                  Passer
                </button>
              </div>
              <div className="h-0.5 w-full overflow-hidden rounded-[var(--radius-xs)] bg-divider-default" aria-hidden>
                <div className="h-full bg-action-primary transition-[width] duration-[var(--duration-slow)]" style={{ width: `${pct}%` }} />
              </div>

              <div key={etape} className="assistant-etape flex flex-1 flex-col gap-[var(--stack-xl)] pt-[var(--stack-xl)]">
                <div className="flex flex-col gap-[var(--stack-sm)]">
                  <span className="kv-overline">{q.sur}</span>
                  <h1 className="type-display-md">{q.titre}</h1>
                  <p className="type-body-md text-fg-secondary">{q.sous}</p>
                </div>
                {erreur && (
                  <p className="rounded-[var(--radius-input)] bg-feedback-danger-subtle p-[var(--inset-sm)] type-body-sm text-feedback-danger-text">{erreur}</p>
                )}

                {etape === 1 && (
                  <>
                    <div className="flex flex-col gap-[var(--stack-sm)]">
                      <span className="kv-wheel-label">Sexe · pour la dépense de base</span>
                      <div className="grid grid-cols-2 gap-[var(--stack-sm)]">
                        {(["homme", "femme"] as const).map((s) => (
                          <TuileChoix
                            key={s}
                            titre={s === "homme" ? "Homme" : "Femme"}
                            actif={a.sexe === s}
                            onClick={() => maj("sexe", s)}
                            className="min-h-[var(--control-lg)] justify-center"
                          />
                        ))}
                      </div>
                    </div>
                    <WheelPicker label="Âge" unite="ans" valeur={a.age} onChange={(v) => maj("age", v)} min={14} max={90} />
                  </>
                )}

                {etape === 2 && (
                  <>
                    <div className="grid grid-cols-2 gap-[var(--inline-lg)]">
                      <WheelPicker label="Taille" unite="cm" valeur={a.taille} onChange={(v) => maj("taille", v)} min={140} max={220} />
                      <WheelPicker label="Poids" unite="kg" valeur={a.poids} onChange={(v) => maj("poids", v)} min={40} max={180} pas={0.5} />
                    </div>
                    <p className="kv-mono">= cale aussi tes calories et tes protéines</p>
                  </>
                )}

                {etape === 3 && (
                  <div role="radiogroup" aria-label="Activité quotidienne">
                    {ACTIVITES.map((o) => (
                      <LigneChoix key={o.id} titre={o.t} description={o.d} actif={a.activite === o.id} onClick={() => maj("activite", o.id)} />
                    ))}
                  </div>
                )}

                {etape === 4 && (
                  <>
                    <div className="grid grid-cols-2 gap-[var(--stack-sm)]">
                      {OBJECTIFS.map((o) => (
                        <TuileChoix
                          key={o.id}
                          indicateur
                          titre={o.t}
                          description={o.d}
                          actif={a.objectifs.includes(o.id)}
                          onClick={() => maj("objectifs", toggle(a.objectifs, o.id))}
                        />
                      ))}
                    </div>
                    <p className="kv-mono">
                      {a.objectifs.length
                        ? `${pad(a.objectifs.length)} sélectionné${a.objectifs.length > 1 ? "s" : ""} · l’IA hiérarchise`
                        : "Au moins un choix"}
                    </p>
                  </>
                )}

                {etape === 5 && (
                  <>
                    <WheelPicker
                      label={perte ? "Poids cible" : "Poids visé"}
                      unite="kg"
                      valeur={cible}
                      onChange={(v) => maj("cible", v)}
                      min={40}
                      max={180}
                      pas={0.5}
                    />
                    <p className="kv-mono">
                      {ecart === 0
                        ? `Maintien · aujourd’hui ${virgule(a.poids)} kg`
                        : `Aujourd’hui ${virgule(a.poids)} kg · ${ecart > 0 ? "+" : "−"}${virgule(Math.abs(ecart))} kg · ≈ ${semainesBesoin} sem. à ${virgule(rythmeKg)} kg/sem.`}
                    </p>
                  </>
                )}

                {etape === 6 && (
                  <>
                    <WheelPicker label="Séances par semaine" unite="/ sem." valeur={a.seances} onChange={(v) => maj("seances", v)} min={1} max={6} />
                    <div className="flex flex-col gap-[var(--stack-sm)]">
                      <div className="flex items-baseline justify-between">
                        <span className="type-label-lg">Quels jours ?</span>
                        <span className={`kv-mono ${diff === 0 ? "" : "text-fg-action"}`}>
                          {diff === 0 ? `${placesJours} / ${a.seances} placés` : diff > 0 ? `Encore ${diff} à placer` : `${-diff} en trop`}
                        </span>
                      </div>
                      <div className="grid grid-cols-7 gap-[var(--inline-xs)]">
                        {LETTRES.map((l, i) => (
                          <button
                            key={NOMS_JOURS[i]}
                            type="button"
                            aria-pressed={a.jours[i]}
                            aria-label={`${NOMS_JOURS[i]} : ${a.jours[i] ? "séance" : "repos"}`}
                            onClick={() =>
                              maj(
                                "jours",
                                a.jours.map((x, j) => (j === i ? !x : x)),
                              )
                            }
                            className={`flex h-[var(--control-item-lg)] items-center justify-center rounded-[var(--radius-lg)] type-label-lg ${a.jours[i] ? "bg-action-primary text-fg-on-brand" : "border border-line-default text-fg-secondary"}`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {etape === 7 && (
                  <div className="grid grid-cols-2 gap-[var(--stack-sm)]">
                    {DUREES.map(([m, l]) => (
                      <TuileChoix
                        key={m}
                        titre={<span className="type-numeric-lg">{m}</span>}
                        description={`min · ${l.toLowerCase()}`}
                        actif={a.duree === m}
                        onClick={() => maj("duree", m)}
                      />
                    ))}
                  </div>
                )}

                {etape === 8 && (
                  <>
                    <div className="grid grid-cols-3 gap-[var(--stack-sm)]">
                      {(
                        [
                          ["salle", "Salle"],
                          ["maison", "Maison"],
                          ["les_deux", "Les deux"],
                        ] as const
                      ).map(([id, t]) => (
                        <TuileChoix
                          key={id}
                          titre={t}
                          actif={a.lieu === id}
                          onClick={() => maj("lieu", id)}
                          className="min-h-[var(--control-xl)] justify-center"
                        />
                      ))}
                    </div>
                    {a.lieu !== "maison" && (
                      <div className="flex flex-col gap-[var(--stack-sm)]">
                        <span className="kv-wheel-label">Type de salle</span>
                        <div className="grid grid-cols-2 gap-[var(--stack-sm)]">
                          <TuileChoix
                            titre="Salle complète"
                            description="Machines, racks, poulies"
                            actif={a.salle === "complete"}
                            onClick={() => maj("salle", "complete")}
                          />
                          <TuileChoix
                            titre="Salle basique"
                            description="Haltères, quelques machines"
                            actif={a.salle === "basique"}
                            onClick={() => maj("salle", "basique")}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {etape === 9 && (
                  <>
                    <div className="grid grid-cols-2 gap-[var(--stack-sm)]">
                      {MATERIEL.map((m) => (
                        <TuileChoix
                          key={m.id}
                          indicateur
                          titre={m.t}
                          actif={a.materiel.includes(m.id)}
                          onClick={() => maj("materiel", toggle(a.materiel, m.id))}
                          className="min-h-[var(--control-xl)]"
                        />
                      ))}
                    </div>
                    <p className="kv-mono">
                      {pad(a.materiel.length)} / {pad(MATERIEL.length)} · touche pour ajouter
                    </p>
                  </>
                )}

                {etape === 10 && (
                  <>
                    <div className="grid grid-cols-2 gap-[var(--stack-sm)]">
                      {EVENEMENTS.map((e) => (
                        <TuileChoix
                          key={e}
                          titre={e}
                          actif={(a.evenement ?? "Aucun") === e}
                          onClick={() => maj("evenement", e)}
                          className="min-h-[var(--control-lg)] justify-center"
                        />
                      ))}
                    </div>
                    <WheelPicker label="Dans" unite="sem." valeur={a.semaines} onChange={(v) => maj("semaines", v)} min={4} max={40} petit />
                    <p className="kv-mono">
                      {a.semaines > 24
                        ? "Le programme couvre 24 semaines, l’agent prolonge ensuite."
                        : `${a.semaines} semaines · ${Math.ceil(a.semaines / 4)} blocs de 4`}
                    </p>
                  </>
                )}

                {etape === 11 && (
                  <div role="radiogroup" aria-label="Niveau">
                    {NIVEAUX.map((o) => (
                      <LigneChoix key={o.id} titre={o.t} description={o.d} actif={a.niveau === o.id} onClick={() => maj("niveau", o.id)} />
                    ))}
                  </div>
                )}

                {etape === 12 && (
                  <div className="grid grid-cols-2 gap-[var(--stack-sm)]">
                    <TuileChoix
                      titre="Aucune"
                      actif={a.douleurs.length === 0}
                      onClick={() => maj("douleurs", [])}
                      className="min-h-[var(--control-lg)] justify-center"
                    />
                    {DOULEURS.map((d) => (
                      <TuileChoix
                        key={d.id}
                        titre={d.t}
                        actif={a.douleurs.includes(d.id)}
                        onClick={() => maj("douleurs", toggle(a.douleurs, d.id))}
                        className="min-h-[var(--control-lg)] justify-center"
                      />
                    ))}
                  </div>
                )}

                {etape === 13 && (
                  <div role="radiogroup" aria-label="Nutrition">
                    {NUTRITION.map((o) => (
                      <LigneChoix key={o.id} titre={o.t} description={o.d} actif={a.nutrition === o.id} onClick={() => maj("nutrition", o.id)} />
                    ))}
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 pb-[calc(max(env(safe-area-inset-bottom),var(--stack-md))+var(--stack-sm))] pt-[var(--stack-lg)]">
                <button type="button" onClick={suivant} disabled={bloque} className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block">
                  <span className="kv-btn-label">{derniere ? "Générer mon plan" : "Continuer"}</span>
                </button>
              </div>
            </>
          )}

          {vue === "generation" && (
            <div className="flex flex-1 flex-col justify-center gap-[var(--stack-xl)] py-[var(--stack-2xl)]" aria-live="polite">
              <span className="kv-overline">Génération</span>
              <h1 className="type-display-lg">
                L’IA construit
                <br />
                ton plan.
              </h1>
              <div className="h-1 overflow-hidden rounded-[var(--radius-xs)] bg-divider-default" aria-hidden>
                <div
                  className="h-full bg-action-primary transition-[width] duration-[var(--duration-slow)]"
                  style={{ width: `${(gen / ETAPES_GENERATION.length) * 100}%` }}
                />
              </div>
              <ol>
                {ETAPES_GENERATION.map((t, i) => (
                  <li
                    key={t}
                    className={`flex items-center gap-[var(--inline-lg)] border-b border-line-default py-[var(--control-inset-md)] ${i < gen ? "text-fg-secondary" : i === gen ? "text-fg-primary" : "text-fg-disabled"}`}
                  >
                    <span className="kv-mono">{pad(i + 1)}</span>
                    <span className="flex-1 type-label-lg">{t}</span>
                    {i < gen && <Icon name="check" size={18} className="text-icon-action" />}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {vue === "pret" && resultat && (
            <div className="flex flex-1 flex-col gap-[var(--stack-xl)] pt-[var(--page-content-top-xs)]">
              <span className="kv-overline">Ton plan est prêt</span>
              <h1 className="text-[56px] font-black leading-[0.9] tracking-[-0.065em]">
                {a.seances} séance{a.seances > 1 ? "s" : ""}
                <br />
                <span className="text-fg-action">par sem.</span>
              </h1>
              <p className="type-body-md text-fg-secondary">
                {a.taille} cm · {virgule(a.poids)} → {virgule(cible)} kg · {a.duree} min par séance
              </p>
              <div className="grid grid-cols-7 gap-[var(--inline-xs)]" aria-label="Semaine type">
                {LETTRES.map((l, i) => (
                  <div key={NOMS_JOURS[i]} className="flex flex-col items-center gap-[var(--stack-xs)]">
                    <span
                      className={`block h-10 w-full rounded-[var(--radius-md)] ${a.jours[i] ? "bg-action-primary" : "border border-dashed border-line-strong"}`}
                    />
                    <span className="kv-mono">{l}</span>
                  </div>
                ))}
              </div>
              <dl className="flex flex-col">
                {[
                  [
                    "Objectifs",
                    OBJECTIFS.filter((o) => a.objectifs.includes(o.id))
                      .map((o) => o.t)
                      .join(" · ") || "—",
                  ],
                  [
                    "Calories",
                    resultat.cibles
                      ? `${resultat.cibles.kcal_seance.toLocaleString("fr-FR")} séance · ${resultat.cibles.kcal_repos.toLocaleString("fr-FR")} repos · ${resultat.cibles.proteines_g} g prot.`
                      : "—",
                  ],
                  ["Nutrition", NUTRITION.find((n) => n.id === a.nutrition)?.t ?? "Plus tard"],
                  [
                    "Lieux",
                    [
                      a.lieu !== "maison" ? (a.salle === "complete" ? "Salle complète" : "Salle basique") : null,
                      a.lieu !== "salle" ? `maison (${a.materiel.length})` : null,
                    ]
                      .filter(Boolean)
                      .join(" + "),
                  ],
                  [
                    "Programme",
                    `${resultat.semaines} semaines · dès le ${new Date(resultat.debut + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`,
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-[var(--inline-lg)] border-b border-line-default py-[var(--control-inset-md)]">
                    <dt className="kv-overline">{k}</dt>
                    <dd className="text-right type-label-md">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-auto flex flex-col items-center gap-[var(--stack-md)] pb-[calc(max(env(safe-area-inset-bottom),var(--stack-md))+var(--stack-sm))]">
                <Link href="/sport/programme" className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block kv-btn-has-end">
                  <span className="kv-btn-label">Voir mon programme</span>
                  <span className="kv-btn-end">
                    <Icon name="arrow_forward" size={22} />
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setEtape(1);
                    setEcran("question");
                  }}
                  className="tap type-label-md text-fg-secondary"
                >
                  Revoir mes réponses
                </button>
              </div>
            </div>
          )}
        </div>
      </Ground>
    </div>
  );
}
