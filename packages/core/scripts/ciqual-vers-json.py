"""Convertit la table CIQUAL 2020 (XML ANSES, windows-1252) en JSON compact pour le seed des aliments."""
import json, re, sys, unicodedata
src, sortie = sys.argv[1], sys.argv[2]
lire = lambda f: open(f"{src}/{f}", encoding="windows-1252").read()
champ = lambda bloc, nom: (re.search(rf"<{nom}>(.*?)</{nom}>", bloc, re.S) or [None, ""])[1].strip()
groupes = {}
for b in re.findall(r"<ALIM_GRP>(.*?)</ALIM_GRP>", lire("alim_grp_2020_07_07.xml"), re.S):
    groupes[champ(b, "alim_grp_code")] = champ(b, "alim_grp_nom_fr")
    groupes[champ(b, "alim_ssgrp_code")] = champ(b, "alim_ssgrp_nom_fr")
CONST = {"328": "kcal", "333": "kcal2", "25000": "prot", "25003": "prot2", "31000": "gluc", "40000": "lip", "32000": "sucres", "34100": "fibres", "10004": "sel", "40302": "satures"}
compo = {}
for b in re.findall(r"<COMPO>(.*?)</COMPO>", lire("compo_2020_07_07.xml"), re.S):
    c = champ(b, "const_code")
    if c not in CONST: continue
    t = champ(b, "teneur").replace(",", ".")
    if t in ("", "-"): continue
    v = 0.0 if t.lower().startswith("traces") else float(re.sub(r"[<> ]", "", t)) / (2 if t.startswith("<") else 1)
    compo.setdefault(champ(b, "alim_code"), {})[CONST[c]] = v
def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", "".join(c for c in s if unicodedata.category(c) != "Mn"))).strip()
out = []
for b in re.findall(r"<ALIM>(.*?)</ALIM>", lire("alim_2020_07_07.xml"), re.S):
    code = champ(b, "alim_code"); c = compo.get(code, {})
    prot = c.get("prot", c.get("prot2"))
    if prot is None or "gluc" not in c or "lip" not in c: continue
    # Énergie : règlement UE, sinon facteurs de Jones, sinon calculée (4 / 4 / 9 kcal par g, fibres 2 kcal).
    if "kcal" not in c: c["kcal"] = c.get("kcal2", 4 * prot + 4 * c["gluc"] + 9 * c["lip"] + 2 * (c.get("fibres") or 0))
    nom = champ(b, "alim_nom_fr")
    r = lambda k: None if c.get(k) is None else round(c[k], 1)
    out.append({"id": f"ciqual:{code}", "nom": nom, "nom_recherche": norm(nom), "groupe": groupes.get(champ(b, "alim_grp_code"), None), "sous_groupe": groupes.get(champ(b, "alim_ssgrp_code"), None),
                "kcal": round(c["kcal"]), "prot": round(prot, 1), "gluc": r("gluc"), "lip": r("lip"), "sucres": r("sucres"), "fibres": r("fibres"), "sel": r("sel"), "satures": r("satures")})
json.dump(out, open(sortie, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(len(out), "aliments ;", len({o['groupe'] for o in out}), "groupes")
