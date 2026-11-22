"""
Génère packages/core/src/recettes-base.ts : les recettes de départ, avec leurs macros calculées depuis la table
CIQUAL (supabase/seed/aliments_ciqual.json). À relancer après toute modification de la liste ci-dessous :
    python3 packages/core/scripts/generer-recettes-base.py
Ingrédient = (id CIQUAL ou clé HORS_CIQUAL, grammes, libellé court facultatif).
"""
import json, os
RACINE = os.path.join(os.path.dirname(__file__), "..", "..", "..")
AL = {a["id"]: a for a in json.load(open(os.path.join(RACINE, "supabase/seed/aliments_ciqual.json"), encoding="utf-8"))}
# Produits absents de CIQUAL (valeurs moyennes d'étiquettes, pour 100 g).
HORS_CIQUAL = {
    "skyr": {"nom": "Skyr nature", "kcal": 60, "prot": 10, "gluc": 4, "lip": 0.2, "fibres": 0},
    "whey": {"nom": "Protéine en poudre (whey)", "kcal": 380, "prot": 78, "gluc": 7, "lip": 6, "fibres": 0},
}
N = {  # libellés courts des ingrédients
    "9311": "Flocons d’avoine", "19041": "Lait demi-écrémé", "13005": "Banane", "15202": "Beurre de cacahuète", "13015": "Framboises", "13028": "Myrtilles",
    "31008": "Miel", "22000": "Œufs", "7110": "Pain complet", "20047": "Tomate", "17270": "Huile d’olive", "13004": "Avocat", "19644": "Fromage blanc 0 %",
    "32128": "Muesli", "13086": "Pomme", "36018": "Filet de poulet poêlé", "9125": "Riz basmati cuit", "20304": "Brocoli vapeur", "26038": "Saumon vapeur",
    "4102": "Patate douce cuite", "20030": "Haricots verts", "6251": "Steak haché 5 % cuit", "9341": "Quinoa cuit", "20066": "Maïs doux", "9811": "Pâtes cuites",
    "26039": "Thon au naturel", "12120": "Parmesan", "36306": "Escalope de dinde poêlée", "9611": "Semoule cuite", "20021": "Courgette cuite",
    "20587": "Lentilles vertes cuites", "22010": "Œufs durs", "12066": "Feta", "20019": "Concombre", "26025": "Cabillaud vapeur", "4003": "Pommes de terre vapeur",
    "20336": "Épinards cuits", "7815": "Tortilla de blé", "20031": "Laitue", "20904": "Tofu nature", "9103": "Riz complet cuit", "20087": "Poivron rouge",
    "11104": "Sauce soja", "20503": "Haricots rouges cuits", "20239": "Oignon", "20507": "Pois chiches cuits", "20010": "Champignons", "12118": "Emmental râpé",
    "10007": "Crevettes cuites", "28910": "Jambon cuit", "26036": "Saumon cru", "20009": "Carotte", "18041": "Lait de coco", "15000": "Amandes",
    "7352": "Galettes de riz complet", "15005": "Cerneaux de noix", "31074": "Chocolat noir 70 %", "19860": "Yaourt à la grecque", "13014": "Fraises",
    "13187": "Compote sans sucres ajoutés", "13011": "Dattes",
}
PD, DJ, DN, CO, EN = "petit_dej", "dejeuner", "diner", "collation", "encas"
R = [
 # ---------- Petit-déjeuner ----------
 ("porridge-banane-cacahuete", "Porridge avoine, banane, beurre de cacahuète", [PD], ["avant_seance", "masse"], 8,
  [("9311", 60), ("19041", 250), ("13005", 100), ("15202", 15)],
  ["Chauffe les flocons dans le lait 3 à 4 min en remuant.", "Ajoute la banane en rondelles et le beurre de cacahuète."]),
 ("skyr-avoine-fruits-rouges", "Skyr, flocons d’avoine et fruits rouges", [PD, CO], ["riche_proteines", "seche", "rapide"], 3,
  [("skyr", 250), ("9311", 40), ("13015", 80), ("13028", 50), ("31008", 10)],
  ["Verse le skyr dans un bol.", "Ajoute les flocons, les fruits et un filet de miel."]),
 ("omelette-pain-complet", "Omelette 3 œufs, tomate et pain complet", [PD, DN], ["riche_proteines", "rapide"], 8,
  [("22000", 150), ("7110", 60), ("20047", 100), ("17270", 5)],
  ["Bats les œufs, cuis-les à feu moyen dans l’huile.", "Sers avec la tomate en quartiers et le pain."]),
 ("tartines-avocat-oeuf", "Tartines avocat et œufs", [PD, DJ], ["rapide"], 8,
  [("7110", 80), ("13004", 70), ("22000", 100)],
  ["Écrase l’avocat sur le pain grillé.", "Ajoute les œufs au plat ou mollets, poivre."]),
 ("pancakes-avoine-banane", "Pancakes avoine, banane et fromage blanc", [PD], ["riche_proteines", "avant_seance"], 12,
  [("9311", 50), ("22000", 100), ("13005", 100), ("19644", 100)],
  ["Mixe les flocons, les œufs et la moitié de la banane.", "Cuis 3 à 4 pancakes à la poêle.", "Sers avec le fromage blanc et le reste de banane."]),
 ("fromage-blanc-muesli-pomme", "Fromage blanc, muesli et pomme", [PD, CO], ["rapide", "riche_proteines"], 3,
  [("19644", 250), ("32128", 50), ("13086", 150)],
  ["Coupe la pomme en dés.", "Mélange avec le fromage blanc et le muesli."]),
 ("smoothie-proteine-banane", "Smoothie protéiné banane et avoine", [PD, EN], ["apres_seance", "masse", "rapide"], 3,
  [("19041", 300), ("13005", 120), ("9311", 30), ("whey", 30)],
  ["Mixe tout 30 secondes.", "Bois dans l’heure qui suit la séance."]),
 # ---------- Déjeuner / dîner ----------
 ("poulet-riz-brocoli", "Poulet, riz basmati et brocoli", [DJ, DN], ["apres_seance", "riche_proteines", "batch"], 20,
  [("36018", 150), ("9125", 200), ("20304", 150), ("17270", 10)],
  ["Cuis le riz et le brocoli à la vapeur.", "Poêle le poulet 5 min de chaque côté.", "Assaisonne d’huile d’olive, sel, poivre."]),
 ("saumon-patate-douce-haricots", "Saumon, patate douce et haricots verts", [DJ, DN], ["apres_seance", "riche_proteines"], 25,
  [("26038", 140), ("4102", 250), ("20030", 150), ("17270", 5)],
  ["Cuis la patate douce en cubes 15 min à la vapeur.", "Ajoute le saumon et les haricots les 8 dernières minutes."]),
 ("bowl-boeuf-quinoa-avocat", "Bowl bœuf haché, quinoa et avocat", [DJ, DN], ["masse", "riche_proteines"], 20,
  [("6251", 130), ("9341", 180), ("13004", 60), ("20047", 100), ("20066", 50)],
  ["Cuis le quinoa 12 min.", "Saisis le bœuf émietté à la poêle.", "Dresse avec l’avocat, la tomate et le maïs."]),
 ("pates-thon-tomate", "Pâtes au thon et à la tomate", [DJ, DN], ["avant_seance", "rapide"], 15,
  [("9811", 250), ("26039", 120), ("20047", 150), ("17270", 10), ("12120", 15)],
  ["Cuis les pâtes.", "Fais revenir la tomate en dés dans l’huile, ajoute le thon.", "Mélange et parsème de parmesan."]),
 ("dinde-semoule-courgettes", "Dinde, semoule et courgettes", [DJ, DN], ["riche_proteines"], 20,
  [("36306", 150), ("9611", 200), ("20021", 200), ("17270", 10)],
  ["Poêle la dinde en lanières.", "Fais sauter les courgettes, gonfle la semoule 5 min.", "Arrose d’huile d’olive."]),
 ("salade-lentilles-oeufs-feta", "Salade de lentilles, œufs et feta", [DJ, DN], ["vegetarien", "batch"], 12,
  [("20587", 220), ("22010", 100), ("12066", 40), ("20047", 100), ("20019", 100), ("17270", 10)],
  ["Mélange les lentilles froides, la tomate et le concombre en dés.", "Ajoute les œufs durs, la feta émiettée et l’huile."]),
 ("cabillaud-pommes-de-terre-epinards", "Cabillaud, pommes de terre et épinards", [DJ, DN], ["seche", "leger", "riche_proteines"], 25,
  [("26025", 180), ("4003", 250), ("20336", 150), ("17270", 10)],
  ["Cuis les pommes de terre 15 min à la vapeur.", "Ajoute le cabillaud 8 min, fais tomber les épinards à la poêle."]),
 ("wrap-poulet-crudites", "Wrap poulet et crudités", [DJ, EN], ["rapide", "riche_proteines"], 8,
  [("7815", 70), ("36018", 110), ("20031", 40), ("20047", 80), ("19644", 40)],
  ["Tartine la tortilla de fromage blanc.", "Garnis de poulet émincé, laitue et tomate, puis roule serré."]),
 ("tofu-riz-complet-legumes", "Tofu sauté, riz complet et légumes", [DJ, DN], ["vegetarien"], 20,
  [("20904", 150), ("9103", 200), ("20087", 100), ("20304", 100), ("11104", 15), ("17270", 10)],
  ["Dore le tofu en dés dans l’huile.", "Ajoute poivron et brocoli 5 min, déglace à la sauce soja.", "Sers sur le riz."]),
 ("chili-boeuf-haricots-rouges", "Chili express bœuf et haricots rouges", [DJ, DN], ["batch", "masse", "riche_proteines"], 25,
  [("6251", 120), ("20503", 150), ("20047", 200), ("9125", 150), ("20239", 50)],
  ["Fais revenir l’oignon puis le bœuf.", "Ajoute tomates et haricots, mijote 15 min.", "Sers avec le riz."]),
 ("salade-poulet-pois-chiches", "Salade poulet, pois chiches et avocat", [DJ, DN], ["riche_proteines", "rapide"], 10,
  [("36018", 130), ("20507", 120), ("13004", 60), ("20031", 60), ("20047", 100), ("17270", 10)],
  ["Émince le poulet.", "Mélange avec les pois chiches, la laitue, la tomate et l’avocat.", "Assaisonne d’huile d’olive et de citron."]),
 ("omelette-champignons-epinards", "Omelette champignons, épinards et emmental", [DN, DJ], ["leger", "rapide", "vegetarien"], 10,
  [("22000", 150), ("20010", 100), ("20336", 100), ("12118", 20), ("7110", 50)],
  ["Fais suer les champignons et les épinards.", "Verse les œufs battus, ajoute l’emmental, plie.", "Sers avec le pain."]),
 ("crevettes-riz-courgettes", "Crevettes, riz et courgettes", [DJ, DN], ["seche", "leger", "riche_proteines"], 15,
  [("10007", 150), ("9125", 180), ("20021", 200), ("17270", 10)],
  ["Fais sauter les courgettes dans l’huile.", "Ajoute les crevettes 2 min, sers avec le riz."]),
 ("steak-patate-douce-haricots", "Steak haché, patate douce et haricots verts", [DJ, DN], ["apres_seance", "riche_proteines"], 20,
  [("6251", 150), ("4102", 300), ("20030", 150), ("17270", 5)],
  ["Cuis la patate douce en cubes au four ou à la vapeur.", "Saisis le steak 3 min par face, réchauffe les haricots."]),
 ("pates-jambon-emmental", "Pâtes, jambon et emmental", [DJ, DN], ["avant_seance", "rapide"], 12,
  [("9811", 220), ("28910", 80), ("12118", 20), ("20047", 100)],
  ["Cuis les pâtes.", "Ajoute le jambon en dés, la tomate et l’emmental."]),
 ("poke-saumon-riz-avocat", "Poké saumon, riz et avocat", [DJ, DN], ["riche_proteines"], 15,
  [("26036", 110), ("9125", 200), ("13004", 60), ("20019", 80), ("20009", 50), ("11104", 10)],
  ["Coupe le saumon en dés, râpe la carotte.", "Dresse sur le riz avec l’avocat et le concombre, arrose de sauce soja."]),
 ("poulet-curry-coco-riz", "Poulet curry coco et riz", [DJ, DN], ["masse", "batch"], 25,
  [("36018", 150), ("18041", 60), ("9125", 200), ("20087", 80), ("20239", 40)],
  ["Fais revenir l’oignon et le poivron.", "Ajoute le poulet, le curry et le lait de coco, mijote 10 min.", "Sers avec le riz."]),
 # ---------- Collations et encas ----------
 ("skyr-miel", "Skyr nature et miel", [CO, EN], ["riche_proteines", "seche", "rapide", "leger"], 1,
  [("skyr", 200), ("31008", 10)], ["Verse le miel sur le skyr."]),
 ("fromage-blanc-amandes", "Fromage blanc et amandes", [CO, EN], ["riche_proteines", "rapide"], 1,
  [("19644", 200), ("15000", 20)], ["Parsème le fromage blanc d’amandes concassées."]),
 ("banane-beurre-cacahuete", "Banane et beurre de cacahuète", [EN, CO], ["avant_seance", "rapide"], 1,
  [("13005", 120), ("15202", 20)], ["Coupe la banane, tartine de beurre de cacahuète."]),
 ("shaker-whey-banane", "Shaker de whey et banane", [EN, CO], ["apres_seance", "riche_proteines", "rapide"], 1,
  [("whey", 30), ("13005", 120)], ["Mélange la whey dans 300 ml d’eau, mange la banane avec."]),
 ("galettes-riz-cacahuete", "Galettes de riz et beurre de cacahuète", [EN, CO], ["avant_seance", "rapide"], 1,
  [("7352", 20), ("15202", 15)], ["Tartine deux galettes de riz."]),
 ("oeufs-durs-pomme", "Œufs durs et pomme", [CO, EN], ["riche_proteines", "rapide"], 1,
  [("22010", 100), ("13086", 150)], ["Deux œufs durs et une pomme : à préparer d’avance."]),
 ("tartine-thon-tomate", "Tartine de thon et tomate", [EN, CO], ["riche_proteines", "seche", "rapide"], 3,
  [("7110", 50), ("26039", 60), ("20047", 50)], ["Émiette le thon sur le pain, ajoute la tomate en tranches."]),
 ("noix-et-pomme", "Poignée de noix et pomme", [CO, EN], ["rapide"], 1,
  [("15005", 20), ("13086", 150)], ["Une petite poignée de noix, une pomme."]),
 ("chocolat-noir-amandes", "Chocolat noir et amandes", [EN, CO], ["rapide"], 1,
  [("31074", 20), ("15000", 15)], ["Deux carrés de chocolat noir, une dizaine d’amandes."]),
 ("yaourt-grec-fraises", "Yaourt à la grecque et fraises", [CO, EN, PD], ["rapide", "leger"], 2,
  [("19860", 150), ("13014", 100), ("31008", 5)], ["Coupe les fraises sur le yaourt, ajoute un peu de miel."]),
 ("compote-fromage-blanc", "Compote et fromage blanc", [CO, EN], ["leger", "seche", "rapide"], 1,
  [("13187", 100), ("19644", 150)], ["Mélange la compote au fromage blanc."]),
 ("dattes-amandes", "Dattes et amandes", [EN], ["avant_seance", "rapide"], 1,
  [("13011", 30), ("15000", 15)], ["Trois dattes et une dizaine d’amandes, 30 à 60 min avant la séance."]),
]
def macros(ings):
    t = {"kcal": 0.0, "prot": 0.0, "gluc": 0.0, "lip": 0.0, "fibres": 0.0}
    detail = []
    for cle, g in ings:
        a = HORS_CIQUAL.get(cle) or AL[f"ciqual:{cle}"]
        for k in t: t[k] += (a.get(k) or 0) * g / 100
        detail.append({"aliment_id": None if cle in HORS_CIQUAL else f"ciqual:{cle}", "nom": HORS_CIQUAL.get(cle, {}).get("nom") or N[cle], "g": g})
    return {"kcal": round(t["kcal"]), "prot": round(t["prot"]), "gluc": round(t["gluc"]), "lip": round(t["lip"]), "fibres": round(t["fibres"])}, detail
lignes = []
for ref, nom, repas, tags, temps, ings, etapes in R:
    m, detail = macros(ings)
    lignes.append({"ref": f"base:{ref}", "nom": nom, "repas": repas, "tags": tags, "temps_min": temps, **m, "ingredients": detail, "etapes": etapes})
    print(f"{nom[:46]:46} {m['kcal']:4} kcal  P{m['prot']:3} G{m['gluc']:3} L{m['lip']:3}  {','.join(repas)}")
entete = '''/**
 * Recettes de départ (généré par scripts/generer-recettes-base.py — ne pas éditer à la main).
 * Macros par portion, calculées depuis la table CIQUAL 2020 (ANSES) ; skyr et whey : moyennes d'étiquettes.
 * Importées dans `recettes` par `importerRecettesDeBase` (nutrition.ts), une fois par utilisateur (clé `ref`).
 */
export type RecetteBase = {
  ref: string;
  nom: string;
  /** Repas où elle a sa place : petit_dej, dejeuner, diner, collation (matin), encas (après-midi, autour de la séance). */
  repas: string[];
  /** riche_proteines, avant_seance, apres_seance, seche, masse, leger, rapide, vegetarien, batch. */
  tags: string[];
  temps_min: number;
  kcal: number;
  prot: number;
  gluc: number;
  lip: number;
  fibres: number;
  ingredients: Array<{ aliment_id: string | null; nom: string; g: number }>;
  etapes: string[];
};

export const RECETTES_BASE: RecetteBase[] = '''
open(os.path.join(RACINE, "packages/core/src/recettes-base.ts"), "w", encoding="utf-8").write(entete + json.dumps(lignes, ensure_ascii=False, indent=2) + ";\n")
print(len(lignes), "recettes")
