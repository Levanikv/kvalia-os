#!/usr/bin/env python3
"""
Construit le référentiel d'exercices (supabase/seed/exercices_ref.source.json) depuis le jeu « exercises-dataset »
(1 324 exercices, données MIT, animations et vignettes © Gym visual — https://gymvisual.com/, 180×180, ADR 0019).

    python3 packages/core/scripts/exercices-gym-visual.py chemin/vers/exercises.json

Source : https://github.com/hasaneyldrm/exercises-dataset (fichier data/exercises.json), figée au commit COMMIT.
Les médias ne sont pas copiés : les URLs pointent vers le CDN jsDelivr, sur ce même commit (immuable).
Chaque ligne a la forme d'une ligne de la table `exercices_ref`. Les consignes sont celles du jeu, en français.
"""
import json, re, sys
from pathlib import Path

COMMIT = "7455efae41b330c265e7cd4b78dfa848e7ce5ebd"
CDN = f"https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@{COMMIT}"
SORTIE = Path(__file__).resolve().parents[3] / "supabase" / "seed" / "exercices_ref.source.json"

# Matériel du jeu → matériel connu de l'app (MATERIEL_CONNU dans sport.ts).
MATERIEL = {
    "resistance band": "band", "olympic barbell": "barbell", "trap bar": "barbell", "assisted": "leverage machine",
    "elliptical machine": "leverage machine", "stationary bike": "leverage machine", "stepmill machine": "leverage machine",
    "skierg machine": "leverage machine", "upper body ergometer": "leverage machine", "medicine ball": "weighted",
    "hammer": "weighted", "tire": "weighted", "bosu ball": "stability ball", "roller": "body weight", "wheel roller": "body weight",
}
COMPOSE = re.compile(r"press|squat|\brow\b|deadlift|pull-?up|chin|pulldown|lunge|\bdips?\b|clean|snatch|thrust|push-?up|good morning|step-?up|burpee|muscle-?up|bridge|hyperextension|pull through|thruster|jerk|swing")
ISOLATION = re.compile(r"triceps? (press|extension)|leg extension|calf|shoulder raise|wrist|kickback|straight arm pulldown|fly")
UNILATERAL = re.compile(r"one[- ]arm|one[- ]leg|single|alternat|unilateral")
AVANCE = re.compile(r"muscle-?up|pistol|handstand|planche|snatch|clean|front lever|back lever|one arm (pull|chin|push)|impossible|skin the cat|l-pull|jerk|stalder")
LIBRE_LOURD = {"barbell", "ez barbell", "kettlebell"}
TRACTION = re.compile(r"pull-?up|chin-?up|\bdips?\b")


def titre(nom: str) -> str:
    nom = nom.replace("в°", "°").replace("_", " ").strip()
    nom = re.sub(r"(^|[\s\-(/])([a-z])", lambda m: m.group(1) + m.group(2).upper(), nom)
    return re.sub(r"\bEz\b", "EZ", nom)


def ligne(e: dict) -> dict:
    nom = e["name"].lower()
    equipement = MATERIEL.get(e["equipment"], e["equipment"])
    cardio = e["body_part"] == "cardio"
    compose = cardio or (bool(COMPOSE.search(nom)) and not ISOLATION.search(nom))
    etapes = e.get("instruction_steps", {}).get("fr") or e.get("instruction_steps", {}).get("en") or []
    texte = (e.get("instructions", {}).get("fr") or e.get("instructions", {}).get("en") or "").strip()
    phrases = re.split(r"(?<=[.!?])\s+", texte)
    return {
        "id": f"gv-{e['id']}",
        "source": "gym-visual",
        "nom": titre(e["name"]),
        "muscles": [m for m in dict.fromkeys([e.get("target"), e.get("muscle_group")]) if m],
        "muscles_secondaires": e.get("secondary_muscles") or [],
        "equipement": equipement,
        "partie_corps": e["body_part"],
        # Débutant par défaut ; intermédiaire pour les composés à la barre et les tractions / dips ; avancé pour la gymnastique.
        "difficulte": "advanced" if AVANCE.search(nom) else "intermediate" if (compose and equipement in LIBRE_LOURD) or TRACTION.search(nom) else "beginner",
        "compose": compose,
        "unilateral": bool(UNILATERAL.search(nom)),
        "met": 8.0 if cardio else (5.0 if compose else 3.8) if equipement == "body weight" else (6.0 if compose else 4.5),
        "description": " ".join(phrases[:2]) or None,
        "consignes": etapes,
        "image_url": f"{CDN}/{e['image']}",
        "gif_url": f"{CDN}/{e['gif_url']}",
    }


source = json.load(open(sys.argv[1], encoding="utf-8"))
lignes = sorted((ligne(e) for e in source), key=lambda x: x["nom"])
SORTIE.write_text(json.dumps(lignes, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"{len(lignes)} exercices → {SORTIE} ({SORTIE.stat().st_size // 1024} Ko)")
