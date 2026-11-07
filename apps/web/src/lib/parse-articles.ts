/**
 * « 2 skyr, riz 1 kg, œufs » → [{ nom: "skyr", quantite: 2 }, { nom: "riz", quantite: 1, unite: "kg" }, { nom: "œufs", quantite: 1 }]
 * v0 volontairement simple ; l'agent fait mieux en langage naturel.
 */
const UNITES = ["kg", "g", "l", "ml", "cl", "pcs", "pièces", "pieces", "boîtes", "boites", "paquets", "sachets"];

export type Article = { nom: string; quantite: number; unite?: string };

export function parseArticles(texte: string): Article[] {
  return texte
    .split(/[,\n;]+/)
    .map((m) => m.trim())
    .filter(Boolean)
    .map((morceau) => {
      // « 2 skyr » / « 1 kg riz »
      let m = morceau.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Zéè]+)?\s+(.+)$/);
      if (m && (!m[2] || UNITES.includes(m[2].toLowerCase()))) {
        return { nom: m[3].trim(), quantite: Number(m[1].replace(",", ".")), unite: m[2]?.toLowerCase() };
      }
      // « riz 1 kg » / « skyr x2 » / « skyr 2 »
      m = morceau.match(/^(.+?)\s+x?(\d+(?:[.,]\d+)?)\s*([a-zA-Zéè]+)?$/);
      if (m && (!m[3] || UNITES.includes(m[3].toLowerCase()))) {
        return { nom: m[1].trim(), quantite: Number(m[2].replace(",", ".")), unite: m[3]?.toLowerCase() };
      }
      return { nom: morceau, quantite: 1 };
    });
}
