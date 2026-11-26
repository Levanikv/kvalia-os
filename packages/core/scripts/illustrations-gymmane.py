#!/usr/bin/env python3
"""
Illustrations d'exercices au trait (2–3 poses par exercice), reprises de GymMane — https://github.com/InlitX/GymMane,
dossier `assets/art/`, licence CC BY-SA 4.0 (origine : Workout Guide de Bryl Lim, Everkinetic, Open Exercise Art ;
voir docs/credits-illustrations.md).

    git clone --depth 1 --filter=blob:none --sparse https://github.com/InlitX/GymMane /tmp/gymmane
    git -C /tmp/gymmane sparse-checkout set assets/art lib/catalog
    python3 packages/core/scripts/illustrations-gymmane.py /tmp/gymmane

Le script fait deux choses, rejouables :
  1. la correspondance « nom exact de notre exercice → illustration » (packages/core/src/illustrations.ts) ;
  2. les fichiers `apps/web/public/illustrations/<slug>.json` ({"poses": ["M…", "M…"]}), allégés : coordonnées
     arrondies à PRECISION décimale(s), tracés réécrits en commandes relatives compactes. Seules les illustrations
     associées à au moins un de nos exercices sont embarquées.

La justesse prime sur la couverture : une illustration doit montrer le même mouvement avec un matériel équivalent.
Sources de la correspondance, par ordre de priorité :
  - MANUEL : choix relus à la main (nom normalisé → illustration) ;
  - le catalogue GymMane (`lib/catalog/exercise_catalog.dart`) : même identifiant d'exercice que notre animation,
    puis même nom ; sa table de fusions (`merged_exercises.dart`) quand le matériel est le même ;
  - REFUS : associations de GymMane écartées (matériel ou mouvement différent). En cas de doute, pas d'illustration.
"""
import json, re, sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[3]
SEED = RACINE / "supabase" / "seed" / "exercices_ref.source.json"
SORTIE_ASSETS = RACINE / "apps" / "web" / "public" / "illustrations"
SORTIE_TS = RACINE / "packages" / "core" / "src" / "illustrations.ts"
PRECISION = 0  # décimales gardées dans le viewBox 512×512
TOLERANCE = 0.5  # écart maximal (unités du viewBox) pour remplacer une courbe par un segment

# ───────────────────────────── Correspondance ─────────────────────────────

# Matériel de notre référentiel → famille de matériel du catalogue GymMane.
FAMILLE = {
    "body weight": "Bodyweight", "dumbbell": "Dumbbell", "cable": "Cable", "barbell": "Barbell", "ez barbell": "Barbell",
    "leverage machine": "Machine", "sled machine": "Machine", "smith machine": "Machine", "band": "Band",
    "kettlebell": "Kettlebell", "weighted": "Weighted", "stability ball": "Other", "rope": "Other",
}

# Choix relus à la main : illustration → noms de nos exercices (normalisés par `cle()`).
MANUEL: dict[str, list[str]] = {
    # Pectoraux
    "dumbbell-bench-press": ["dumbbell neutral grip bench press", "dumbbell lying hammer press"],
    "single-arm-dumbbell-bench-press": ["dumbbell lying one arm press"],
    "incline-dumbbell-press": ["dumbbell incline alternate press"],
    "incline-dumbbell-hammer-press": ["dumbbell incline hammer press", "dumbbell incline palm-in press", "dumbbell palms in incline bench press"],
    "incline-dumbbell-fly": ["dumbbell incline fly", "dumbbell incline twisted flyes"],
    "machine-chest-press": ["lever chest press"],
    "decline-chest-press-machine": ["lever decline chest press"],
    "incline-chest-press-machine": ["lever incline chest press"],
    "pec-deck": ["lever seated fly"],
    "cable-fly": ["cable middle fly", "cable standing fly", "cable standing up straight crossovers"],
    "flat-bench-cable-fly": ["cable lying fly"],
    "smith-incline-bench-press": ["smith incline bench press"],
    "smith-machine-bench-press": ["smith wide grip bench press"],
    "close-grip-bench-press": ["barbell lying close-grip press", "ez-bar close-grip bench press"],
    "reverse-grip-bench-press": ["barbell wide reverse grip bench press"],
    "push-up": ["push-up"],
    "wide-push-up": ["wide hand push up"],
    "knee-push-up": ["kneeling push-up"],
    "diamond-push-up": ["diamond push-up"],
    "incline-push-up": ["incline push-up (on box)"],
    "wall-push-up": ["push-up (wall)"],
    "push-up-shoulder-tap": ["shoulder tap push-up"],
    "scapular-push-up": ["scapula push-up"],
    "explosive-push-up": ["plyo push up"],
    "chest-dip": ["wide-grip chest dip on high parallel bars"],
    "bench-dip": ["triceps dip (bench leg)", "triceps dip (between benches)", "three bench dip"],
    "assisted-dip": ["lever seated dip"],  # le dessin montre la machine à dips assis
    "dumbbell-pullover": ["dumbbell straight arm pullover"],
    # Dos
    "lat-pulldown": ["cable pulldown (pro lat bar)", "cable lat pulldown full range of motion"],
    "reverse-grip-lat-pulldown": ["cable underhand pulldown"],
    "close-grip-lat-pulldown": ["cable lateral pulldown with v-bar", "twin handle parallel grip lat pulldown"],
    "straight-arm-pulldown": ["cable straight arm pulldown", "cable straight arm pulldown (with rope)"],
    "pull-up": ["pull-up", "wide grip pull-up"],
    "neutral-grip-pull-up": ["pull up (neutral grip)", "chin-ups (narrow parallel grip)"],
    "chin-up": ["chin-up", "reverse grip pull-up", "close grip chin-up"],
    "l-sit-pull-up": ["l-pull-up"],
    "assisted-chin-up": ["lever assisted chin-up"],
    "seated-row": ["cable low seated row", "cable straight back seated row", "cable seated wide-grip row"],
    "barbell-row": ["barbell reverse grip bent over row"],
    "t-bar-row": ["lever t-bar reverse grip row", "lever bent-over row with v-bar"],
    "machine-row": ["lever narrow grip seated row"],
    "one-arm-dumbbell-row": ["dumbbell one arm bent-over row", "kettlebell one arm row"],
    "dumbbell-bent-over-row": ["dumbbell reverse grip row"],
    "inverted-row": ["inverted row", "inverted row bent knees"],
    "back-extension": ["hyperextension"],
    "reverse-hyperextension": ["lever reverse hyperextension"],
    "rack-pull": ["barbell rack pull"],
    "dumbbell-romanian-deadlift": ["dumbbell romanian deadlift", "dumbbell stiff leg deadlift", "dumbbell straight leg deadlift"],
    "single-leg-romanian-deadlift": ["dumbbell single leg deadlift"],
    "good-morning": ["barbell stiff leg good morning"],
    "upright-row": ["barbell upright row", "barbell wide-grip upright row"],
    "dumbbell-upright-row": ["dumbbell upright row"],
    "cable-upright-row": ["cable upright row"],
    "smith-upright-row": ["smith upright row"],
    # Épaules
    "overhead-press": ["barbell standing close grip military press"],
    "standing-dumbbell-press": ["dumbbell standing palms in press", "dumbbell standing alternate overhead press"],
    "seated-dumbbell-press": ["dumbbell seated shoulder press", "dumbbell seated shoulder press (parallel grip)", "dumbbell seated alternate press"],
    "single-arm-dumbbell-shoulder-press": ["dumbbell one arm shoulder press", "dumbbell standing one arm palm in press"],
    "machine-shoulder-press": ["lever shoulder press", "lever military press"],
    "cable-lateral-raise": ["cable one arm lateral raise"],
    "machine-lateral-raise": ["lever lateral raise"],
    "front-raise": ["dumbbell standing alternate raise"],
    "cable-rear-delt-fly": ["cable standing cross-over high reverse fly"],
    "cable-rear-delt-row": ["cable rear delt row (with rope)", "cable standing rear delt row (with rope)"],
    "rear-delt-fly": ["dumbbell rear fly", "dumbbell rear delt raise"],
    "reverse-pec-deck": ["lever seated reverse fly (parallel grip)"],
    # Biceps
    "ez-bar-curl": ["ez barbell curl", "ez-bar biceps curl (with arm blaster)"],
    "wide-grip-barbell-curl": ["barbell standing wide grip biceps curl", "barbell standing wide-grip curl"],
    "reverse-curl": ["barbell standing reverse grip curl", "ez barbell reverse grip curl"],
    "dumbbell-reverse-curl": ["dumbbell standing reverse curl", "dumbbell revers grip biceps curl", "dumbbell biceps curl reverse"],
    "preacher-curl": ["ez barbell close grip preacher curl"],
    "dumbbell-preacher-curl": ["dumbbell preacher curl", "dumbbell seated preacher curl"],
    "dumbbell-hammer-preacher-curl": ["dumbbell peacher hammer curl"],
    "cable-preacher-curl": ["cable preacher curl"],
    "machine-biceps-curl": ["lever bicep curl", "lever preacher curl"],
    "bicep-curl": ["dumbbell standing biceps curl", "dumbbell alternate biceps curl", "dumbbell biceps curl (with arm blaster)", "dumbbell alternate biceps curl (with arm blaster)"],
    "seated-dumbbell-curl": ["dumbbell seated bicep curl", "dumbbell seated curl"],
    "incline-dumbbell-curl": ["dumbbell incline curl", "dumbbell incline biceps curl"],
    "incline-hammer-curl": ["dumbbell incline hammer curl"],
    "hammer-curl": ["dumbbell hammer curl", "dumbbell hammer curls (with arm blaster)"],
    "cross-body-hammer-curl": ["dumbbell cross body hammer curl"],
    "zottman-curl": ["dumbbell zottman curl"],
    "spider-curl": ["ez barbell spider curl"],
    "single-arm-cable-curl": ["cable one arm curl"],
    # Triceps
    "v-bar-pushdown": ["cable triceps pushdown (v-bar)", "cable triceps pushdown (v-bar) (with arm blaster)"],
    "rope-tricep-pushdown": ["cable pushdown (with rope attachment)"],
    "reverse-grip-triceps-pushdown": ["cable reverse-grip pushdown", "cable reverse grip triceps pushdown (sz-bar) (with arm blaster)"],
    "single-arm-cable-pushdown": ["cable one arm tricep pushdown"],
    "overhead-tricep-extension": ["cable rope high pulley overhead tricep extension"],
    "cable-incline-triceps-extension": ["cable rope incline tricep extension"],
    "cable-lying-triceps-extension": ["cable lying triceps extension"],
    "skull-crusher": ["barbell lying triceps extension skull crusher", "barbell lying close-grip triceps extension"],
    "barbell-behind-head-triceps-extension": ["ez bar lying close grip triceps extension behind head"],
    "barbell-incline-triceps-extension": ["ez barbell incline triceps extension"],
    "barbell-seated-overhead-triceps-extension": ["ez barbell seated triceps extension", "barbell seated close grip behind neck triceps extension"],
    "jm-press": ["ez barbell jm bench press"],
    "dumbbell-overhead-tricep-extension": ["dumbbell seated triceps extension", "dumbbells seated triceps extension"],
    "single-arm-dumbbell-tricep-extension": ["dumbbell standing one arm extension"],
    "tricep-kickback": ["dumbbell kickback", "dumbbell standing kickback", "dumbbell one arm kickback"],
    # Jambes
    "squat": ["barbell full squat (side pov)", "barbell high bar squat", "barbell low bar squat"],
    "dumbbell-squat": ["dumbbell squat"],
    "zercher-squat": ["barbell zercher squat"],
    "hack-squat": ["sled hack squat", "sled closer hack squat"],
    "smith-machine-squat": ["smith squat", "smith low bar squat"],
    "leg-press": ["sled 45° leg press", "sled 45° leg press (back pov)", "sled 45° leg press (side pov)", "sled 45° leg wide press"],
    "leg-extension": ["lever leg extension"],
    "seated-leg-curl": ["lever seated leg curl"],
    "leg-curl": ["lever lying leg curl"],
    "forward-lunge": ["walking lunge", "forward lunge"],
    "reverse-lunge": ["dumbbell rear lunge"],
    "barbell-lunge": ["barbell lunge"],
    "barbell-reverse-lunge": ["barbell rear lunge"],
    "curtsy-lunge": ["curtsey squat"],
    "pistol-squat": ["single leg squat (pistol) male"],
    "step-up": ["dumbbell step-up"],
    "barbell-step-up": ["barbell step-up"],
    "jump-squat": ["jump squat"],
    "glute-bridge": ["low glute bridge on floor"],
    "single-leg-glute-bridge": ["single leg bridge with outstretched leg"],
    "hip-abduction-machine": ["lever seated hip abduction"],
    "hip-adduction-machine": ["lever seated hip adduction"],
    "banded-seated-hip-abduction": ["resistance band seated hip abduction"],
    "nordic-hamstring-curl": ["inverse leg curl (bench support)", "self assisted inverse leg curl (on floor)"],
    # Mollets
    "seated-calf-raise": ["lever seated calf raise"],
    "leg-press-calf-raise": ["sled 45° calf press", "sled calf press on leg press"],
    "calf-raise": ["standing calf raise (on a staircase)"],
    # Abdos
    "bicycle-crunch": ["air bike"],
    "cross-body-crunch": ["cross body crunch"],
    "decline-sit-up": ["decline sit-up"],
    "hanging-leg-raise": ["hanging straight leg raise", "hanging leg hip raise"],
    "bench-leg-raise": ["lying leg raise flat bench"],
    "flutter-kick": ["flutter kicks"],
    "weighted-russian-twist": ["weighted russian twist (legs up)"],
    # Cardio, étirements, divers
    "cycling": ["stationary bike walk", "stationary bike run"],
    "elliptical": ["walk elliptical cross trainer"],
    "treadmill-incline-walk": ["walking on incline treadmill"],
    "stair-climber": ["walking on stepmill"],
    "running": ["run (equipment)"],
    "skierg": ["ski ergometer"],
    "battle-ropes": ["battling ropes"],
    "landmine-rotation": ["landmine 180"],
    "farmer-carry": ["farmers walk"],
    "skater-hop": ["skater hops"],
    "worlds-greatest-stretch": ["world greatest stretch"],
    "wall-calf-stretch": ["calf stretch with hands against wall"],
    "band-reverse-fly": ["band reverse fly"],
    "banded-squat": ["band squat"],
    "banded-pallof-press": ["band horizontal pallof press"],
}

# Associations du catalogue GymMane écartées (noms normalisés) : autre matériel ou autre mouvement que le dessin.
REFUS = {
    "air bike",  # chez nous : le crunch bicyclette au sol (repris dans MANUEL), pas le vélo à air
    "barbell clean and press", "barbell side split squat", "barbell sitted alternate leg raise", "box jump down with one leg stabilization",
    "cable judo flip", "cable kickback", "cable reverse crunch", "dumbbell step-up lunge", "quads", "side lying hip adduction",
    "single leg platform slide", "smith leg press", "snatch pull", "standing single leg curl", "weighted drop push up",
    "weighted hyperextension (on stability ball)", "kettlebell front squat", "dumbbell close grip press", "dumbbell close-grip press",
    "scapula dips", "archer pull up", "bench pull-ups", "squat to overhead reach", "bench hip extension",
    "dumbbell alternating bicep curl with leg raised on exercise ball",
    # Fusions de GymMane trop larges
    "3/4 sit-up", "arms overhead full sit-up", "alternate lateral pulldown", "arm slingers hanging straight legs", "arms apart circular toe touch",
    "back lever", "backward jump", "barbell alternate biceps curl", "barbell decline bent arm pullover", "barbell decline pullover",
    "barbell floor calf raise", "barbell glute bridge two legs on bench", "barbell incline close grip bench press", "barbell incline row",
    "barbell incline shoulder raise", "barbell lying preacher curl", "barbell press sit-up", "barbell pullover to press", "barbell rear delt raise",
    "barbell reverse preacher curl", "barbell rollerout from bench", "barbell seated bradford rocky press", "barbell split squat",
    "barbell squat (on knees)", "barbell standing ab rollerout", "barbell standing back wrist curl", "bench dip on floor", "biceps narrow pull-ups",
    "bodyweight incline side plank", "bodyweight squatting row", "bodyweight standing close-grip one arm row", "bodyweight standing one arm row",
    "body-up", "clock push-up", "cable alternate triceps extension", "cable cross-over lateral pulldown", "cable decline fly",
    "cable decline seated wide-grip row", "cable floor seated wide-grip row", "cable high row (kneeling)", "cable kneeling rear delt row (with rope)",
    "cable rear delt row (stirrups)", "cable seated crunch", "cable seated twist", "cable standing crunch", "chest dip on straight bar",
    "dumbbell alternate side press", "dumbbell around pullover", "dumbbell bicep curl lunge with bowling motion", "dumbbell cuban press",
    "dumbbell decline one arm hammer press", "dumbbell decline shrug", "dumbbell decline twist fly", "dumbbell forward lunge triceps extension",
    "dumbbell incline hammer press on exercise ball", "dumbbell incline one arm lateral raise", "dumbbell incline raise",
    "dumbbell incline shoulder raise", "dumbbell incline shrug", "dumbbell lying rear delt row", "dumbbell reverse grip incline bench one arm row",
    "dumbbell step-up split squat", "dumbbell supported squat", "modified push up to lower arms", "power clean", "smith chair squat",
    "smith decline bench press", "smith decline reverse-grip press", "smith front squat (clean grip)", "smith seated one leg calf raise",
    "smith one leg floor calf raise", "squat jerk", "squat to overhead reach with twist", "suspended split squat", "weighted one hand pull up",
    "weighted overhead crunch (on stability ball)", "weighted seated twist (on stability ball)", "weighted squat", "weighted three bench dips",
    "smith back shrug", "smith incline shoulder raises", "smith behind neck press", "smith standing behind head military press",
    "barbell seated behind head military press", "barbell front raise", "barbell pullover",
    # Dessin relu : autre matériel ou autre posture que l'exercice
    "dumbbell incline row", "dumbbell reverse grip incline bench two arm row",  # le dessin montre un tirage T-bar buste appuyé
    "split squats",  # dessiné avec haltères
    "lever standing chest press",  # dessiné assis
    "basic toe touch",  # silhouette illisible
    "assisted chest dip (kneeling)", "assisted triceps dip (kneeling)",  # dessin = machine à dips assis
}


def cle(nom: str) -> str:
    """Nom normalisé : minuscules, sans « V. 2 », « (Male) », « (Female) » ni espaces en trop."""
    n = nom.lower().replace("’", "'")
    n = re.sub(r"\s*\((male|female)\)", "", n)
    n = re.sub(r"\s+v\. ?\d+\b", "", n)
    return re.sub(r"\s+", " ", n).strip()


def lire_catalogue(gymmane: Path):
    """→ ({id: (nom, famille, art)}, {id fusionné: id canonique})."""
    source = (gymmane / "lib/catalog/exercise_catalog.dart").read_text(encoding="utf-8")
    catalogue = {}
    for bloc in source.split("Exercise(")[1:]:
        def champ(k):
            m = re.search(k + r":\s*'((?:[^'\\]|\\.)*)'", bloc)
            return m.group(1).replace("\\'", "'") if m else None
        if champ("id") and champ("name") and champ("art"):
            catalogue[champ("id")] = (champ("name"), champ("equipment"), champ("art"))
    fusions = dict(re.findall(r"'([^']+)':\s*'([^']+)'", (gymmane / "lib/catalog/merged_exercises.dart").read_text(encoding="utf-8")))
    return catalogue, fusions


def correspondance(gymmane: Path) -> dict[str, str]:
    catalogue, fusions = lire_catalogue(gymmane)
    dispo = {f.stem for f in (gymmane / "assets/art").glob("*.txt")}
    par_nom = {cle(nom): (famille, art) for nom, famille, art in catalogue.values()}
    familles_art: dict[str, set[str]] = {}
    for _, famille, art in catalogue.values():
        familles_art.setdefault(art, set()).add(famille)
    manuel = {nom: art for art, noms in MANUEL.items() for nom in noms}
    for nom, art in manuel.items():
        assert art in dispo, f"MANUEL : illustration inconnue {art} ({nom})"

    resultat: dict[str, str] = {}
    exercices = json.loads(SEED.read_text(encoding="utf-8"))
    vus = set()
    for e in exercices:
        nom, k = e["nom"], cle(e["nom"])
        vus.add(k)
        famille = FAMILLE.get(e["equipement"], "Other")
        m = re.search(r"/\d+-([A-Za-z0-9]+)\.(?:gif|jpg)", e.get("gif_url") or e.get("image_url") or "")
        ident = m.group(1) if m else None
        art = None
        if k in manuel:
            art = manuel[k]
        elif k in REFUS:
            art = None
        elif ident in catalogue:
            art = catalogue[ident][2]  # GymMane illustre exactement cet exercice
        elif k in par_nom and par_nom[k][0] == famille:
            art = par_nom[k][1]
        elif ident in fusions and fusions[ident] in catalogue:
            _, _, a = catalogue[fusions[ident]]
            if famille in familles_art.get(a, set()):  # fusion acceptée seulement à matériel égal
                art = a
        if art and art in dispo:
            # Un même nom peut exister deux fois chez nous : la première association gagne, sans contradiction.
            resultat.setdefault(nom, art)
    inconnus = sorted(set(manuel) - vus)
    assert not inconnus, f"MANUEL : noms absents du référentiel : {inconnus}"
    return dict(sorted(resultat.items()))


# ───────────────────────────── Allègement des tracés ─────────────────────────────

NB_ARGS = {"m": 2, "l": 2, "h": 1, "v": 1, "c": 6, "s": 4, "q": 4, "t": 2, "a": 7, "z": 0}
NOMBRE = re.compile(r"[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?")


def lire_trace(d: str):
    """Découpe un attribut `d` en [(commande, [arguments])], répétitions implicites et drapeaux d'arc collés compris."""
    i, n, segments, cmd = 0, len(d), [], None
    def blancs():
        nonlocal i
        while i < n and d[i] in " ,\t\r\n":
            i += 1
    def nombre():
        nonlocal i
        blancs()
        m = NOMBRE.match(d, i)
        if not m:
            raise ValueError(f"nombre attendu en {i} : {d[i:i + 20]!r}")
        i = m.end()
        return float(m.group())
    def drapeau():
        nonlocal i
        blancs()
        if d[i] not in "01":
            raise ValueError(f"drapeau d'arc attendu en {i}")
        i += 1
        return int(d[i - 1])
    while True:
        blancs()
        if i >= n:
            return segments
        if d[i].isalpha():
            cmd = d[i]
            i += 1
            if cmd.lower() == "z":
                segments.append((cmd, []))
                continue
        elif cmd is None:
            raise ValueError("le tracé ne commence pas par une commande")
        elif cmd.lower() == "z":
            raise ValueError("arguments après z")
        k = cmd.lower()
        args = [nombre(), nombre(), nombre(), drapeau(), drapeau(), nombre(), nombre()] if k == "a" else [nombre() for _ in range(NB_ARGS[k])]
        segments.append((cmd, args))
        if k == "m":  # les paires suivantes d'un « m » sont des « l » implicites
            cmd = "L" if cmd == "M" else "l"


def fmt(x: float) -> str:
    s = f"{x:.{PRECISION}f}"
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    if s in ("-0", ""):
        s = "0"
    if s.startswith("0.") and len(s) > 2:
        s = s[1:]
    elif s.startswith("-0."):
        s = "-" + s[2:]
    return s


def coller(lettre: str, valeurs: list[str]) -> str:
    """Colle les nombres au plus court tout en restant un `d` valide (« 5-3 », « .8.5 », mais « 5 .3 » et « 5 3 »)."""
    out, prec = lettre, None
    for v in valeurs:
        if prec is not None and not (v[0] == "-" or (v[0] == "." and "." in prec)):
            out += " "
        out += v
        prec = v
    return out


def ecart_a_la_corde(p0, pts) -> float:
    """Plus grand écart des points de contrôle à la corde p0 → dernier point (0 si tout est aligné sur la corde)."""
    (x0, y0), (x1, y1) = p0, pts[-1]
    dx, dy = x1 - x0, y1 - y0
    l2 = dx * dx + dy * dy
    pire = 0.0
    for px, py in pts[:-1]:
        t = 0.0 if l2 == 0 else max(0.0, min(1.0, ((px - x0) * dx + (py - y0) * dy) / l2))
        pire = max(pire, ((px - x0 - t * dx) ** 2 + (py - y0 - t * dy) ** 2) ** 0.5)
    return pire


def alleger(d: str, echelle: float = 1.0, tx: float = 0.0, ty: float = 0.0) -> str:
    """
    Même tracé, plus court : positions absolues arrondies puis réécrites en écarts relatifs (pas de dérive), courbes
    quasi droites (écart à la corde ≤ TOLERANCE) remplacées par des segments, segments nuls retirés.
    `echelle`, `tx`, `ty` : remise au cadre 512×512 des rares dessins qui en débordent (voir `cadrage`).
    """
    f = 10**PRECISION
    arr = lambda v: round(v * f) / f
    x = y = x0 = y0 = 0.0  # point courant et début du sous-tracé, exacts
    rx = ry = rx0 = ry0 = 0.0  # les mêmes, arrondis
    ctrl = None  # dernier point de contrôle exact (pour « s » et « t »), ou None
    rctrl = None  # dernier point de contrôle arrondi émis par un « c »/« s »
    morceaux, derniere = [], None

    def emettre(lettre: str, valeurs: list[float]):
        nonlocal derniere
        textes = [fmt(v) for v in valeurs]
        # La lettre est omise quand la commande se répète (sauf après « m », dont la suite implicite est « l »).
        if lettre == derniere and lettre not in "mMz":
            sep = "" if textes[0][0] == "-" else " "
            morceaux.append(sep + coller("", textes))
        else:
            morceaux.append(coller(lettre, textes))
        derniere = lettre

    def droite(rfin):
        dx, dy = arr(rfin[0] - rx), arr(rfin[1] - ry)
        if dx == 0 and dy == 0:
            return  # segment nul une fois arrondi : sans effet sur le remplissage
        if dy == 0:
            emettre("h", [dx])
        elif dx == 0:
            emettre("v", [dy])
        else:
            emettre("l", [dx, dy])

    for cmd, a in lire_trace(d):
        k, rel = cmd.lower(), cmd.islower()
        if k == "z":
            morceaux.append("z")
            derniere = "z"
            x, y, rx, ry, ctrl, rctrl = x0, y0, rx0, ry0, None, None
            continue
        if k == "h":
            pts = [(a[0] + (x if rel else 0), y)]
        elif k == "v":
            pts = [(x, a[0] + (y if rel else 0))]
        elif k == "a":
            pts = [(a[5] + (x if rel else 0), a[6] + (y if rel else 0))]
        else:
            pts = [(a[j] + (x if rel else 0), a[j + 1] + (y if rel else 0)) for j in range(0, len(a), 2)]
        fin = pts[-1]
        rfin = (arr(fin[0] * echelle + tx), arr(fin[1] * echelle + ty))
        nctrl = nrctrl = None
        if k == "m":
            if not morceaux:
                morceaux.append(coller("M", [fmt(rfin[0]), fmt(rfin[1])]))
                derniere = "M"
            else:
                emettre("m", [rfin[0] - rx, rfin[1] - ry])
            x0, y0, rx0, ry0 = fin[0], fin[1], rfin[0], rfin[1]
        elif k in "lhv":
            droite(rfin)
        elif k == "a":
            if rfin != (rx, ry):
                emettre("a", [arr(a[0] * echelle), arr(a[1] * echelle), a[2], a[3], a[4], rfin[0] - rx, rfin[1] - ry])
        elif k in "cs":
            lisse = k == "s"
            if lisse:  # premier point de contrôle = reflet du précédent (ou le point courant)
                reflet = (2 * x - ctrl[0], 2 * y - ctrl[1]) if ctrl and ctrl[2] == "c" else (x, y)
                pts = [reflet] + pts
            nctrl = (pts[1][0], pts[1][1], "c")
            if ecart_a_la_corde((x, y), pts) * echelle <= TOLERANCE:
                droite(rfin)
            else:
                rp = [(arr(px * echelle + tx), arr(py * echelle + ty)) for px, py in pts]
                # « s » reste possible si le reflet du dernier contrôle émis retombe (à l'arrondi près) sur le nôtre.
                if lisse and rctrl and abs(2 * rx - rctrl[0] - rp[0][0]) <= 1 / f and abs(2 * ry - rctrl[1] - rp[0][1]) <= 1 / f:
                    emettre("s", [v for px, py in rp[1:] for v in (arr(px - rx), arr(py - ry))])
                else:
                    emettre("c", [v for px, py in rp for v in (arr(px - rx), arr(py - ry))])
                nrctrl = rp[1]
        else:  # q, t
            if k == "t":
                reflet = (2 * x - ctrl[0], 2 * y - ctrl[1]) if ctrl and ctrl[2] == "q" else (x, y)
                pts = [reflet] + pts
            nctrl = (pts[0][0], pts[0][1], "q")
            if ecart_a_la_corde((x, y), pts) * echelle <= TOLERANCE:
                droite(rfin)
            else:
                emettre("q", [v for px, py in pts for v in (arr(arr(px * echelle + tx) - rx), arr(arr(py * echelle + ty) - ry))])
        x, y, rx, ry, ctrl, rctrl = fin[0], fin[1], rfin[0], rfin[1], nctrl, nrctrl
    return "".join(morceaux)


def cadrage(traces: list[str]) -> tuple[float, float, float]:
    """
    (echelle, tx, ty) pour que toutes les poses d'un dessin tiennent dans le viewBox 0 0 512 512. Presque tous y sont
    déjà (→ 1, 0, 0) ; quelques-uns débordent (dessinés plus grand, ou décalés) : même transformation pour chaque pose.
    """
    xs, ys = [], []
    for d in traces:
        x = y = x0 = y0 = 0.0
        for cmd, a in lire_trace(d):
            k, rel = cmd.lower(), cmd.islower()
            if k == "z":
                x, y = x0, y0
                continue
            if k == "h":
                pts = [(a[0] + (x if rel else 0), y)]
            elif k == "v":
                pts = [(x, a[0] + (y if rel else 0))]
            elif k == "a":
                pts = [(a[5] + (x if rel else 0), a[6] + (y if rel else 0))]
            else:
                pts = [(a[j] + (x if rel else 0), a[j + 1] + (y if rel else 0)) for j in range(0, len(a), 2)]
            xs += [p[0] for p in pts]
            ys += [p[1] for p in pts]
            x, y = pts[-1]
            if k == "m":
                x0, y0 = x, y
    g, h, d_, b = min(xs), min(ys), max(xs), max(ys)
    if g >= 0 and h >= 0 and d_ <= 512 and b <= 512:
        return 1.0, 0.0, 0.0
    if d_ - g <= 512 and b - h <= 512:  # il tient : simple glissement, le plus petit possible
        return 1.0, (-g if g < 0 else min(0.0, 512 - d_)), (-h if h < 0 else min(0.0, 512 - b))
    marge = 8
    echelle = (512 - 2 * marge) / max(d_ - g, b - h)
    return echelle, 256 - echelle * (g + d_) / 2, 256 - echelle * (h + b) / 2


# ───────────────────────────── Sorties ─────────────────────────────

def ecrire_ts(table: dict[str, str]) -> None:
    lignes = [
        "// Généré par packages/core/scripts/illustrations-gymmane.py — ne pas modifier à la main (relancer le script).",
        "// Illustrations : Workout Guide (Bryl Lim) / Everkinetic / Open Exercise Art, via GymMane — CC BY-SA 4.0.",
        "// Détail et modifications : docs/credits-illustrations.md.",
        "",
        "/** Crédit court à afficher sous une illustration (obligation de la licence CC BY-SA 4.0). */",
        'export const CREDIT_ILLUSTRATION = "Illustration : Workout Guide / Everkinetic — CC BY-SA 4.0";',
        "",
        "/** Nom exact d'un exercice du référentiel → illustration (`/illustrations/<slug>.json` dans l'app web). */",
        "export const ILLUSTRATIONS: Record<string, string> = Object.fromEntries([",
    ]
    lignes += [f"  [{json.dumps(nom, ensure_ascii=False)}, {json.dumps(art)}]," for nom, art in table.items()]
    lignes += [
        "]);",
        "",
        "/** Illustration au trait d'un exercice (slug), ou `null` : l'app garde alors l'animation du référentiel. */",
        "export function illustrationPour(nom: string): string | null {",
        "  return Object.hasOwn(ILLUSTRATIONS, nom) ? ILLUSTRATIONS[nom] : null;",
        "}",
        "",
    ]
    SORTIE_TS.write_text("\n".join(lignes), encoding="utf-8")


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    gymmane = Path(sys.argv[1]).resolve()
    table = correspondance(gymmane)
    ecrire_ts(table)

    SORTIE_ASSETS.mkdir(parents=True, exist_ok=True)
    for ancien in SORTIE_ASSETS.glob("*.json"):
        ancien.unlink()
    brut = total = 0
    for art in sorted(set(table.values())):
        texte = (gymmane / "assets/art" / f"{art}.txt").read_text(encoding="utf-8")
        traces = [ligne for ligne in texte.splitlines() if ligne.strip()]
        cadre = cadrage(traces)
        poses = [alleger(d, *cadre) for d in traces]
        sortie = json.dumps({"poses": poses}, indent=2) + "\n"  # mise en forme de Biome (`pnpm format` n'y touche pas)
        (SORTIE_ASSETS / f"{art}.json").write_text(sortie, encoding="utf-8")
        brut += len(texte)
        total += len(sortie)

    exercices = json.loads(SEED.read_text(encoding="utf-8"))
    couverts = sum(1 for e in exercices if e["nom"] in table)
    print(f"{couverts} exercices illustrés sur {len(exercices)} ({len(table)} noms distincts), {len(set(table.values()))} illustrations")
    print(f"poids : {brut / 1e6:.1f} Mo bruts → {total / 1e6:.1f} Mo allégés ({SORTIE_ASSETS.relative_to(RACINE)})")


if __name__ == "__main__":
    main()
