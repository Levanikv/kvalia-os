import { redirect } from "next/navigation";

/**
 * Créer / régénérer le programme = repasser l'onboarding muscu, pré-rempli avec tes réponses (v3).
 * L'ancien assistant en 6 étapes faisait doublon (et proposait encore la boxe, retirée des maquettes).
 */
export default function Page() {
  redirect("/sport/bienvenue?revoir=1");
}
