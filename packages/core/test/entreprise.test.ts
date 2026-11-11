import { describe, expect, it } from "vitest";
import {
  debutSynchro,
  montantMeta,
  pilotageSasu,
  stockageJetonsSupabase,
  synchroniserTiime,
  versNoteFrais,
  versTrajet,
  versTransaction,
} from "../src/entreprise";
import { ErreurTiime } from "../src/tiime";
import { USER, fausseDb } from "./fausse-db";

const MAINTENANT = new Date("2026-11-11T10:00:00Z");

/** Faux client Tiime : renvoie des données fixes ; `refus` fait échouer une ressource comme Tiime (403). */
function fauxTiime(refus: string[] = []) {
  const refuser = (nom: string) => {
    if (refus.includes(nom)) throw new ErreurTiime("acces_refuse", `GET ${nom} : accès refusé par Tiime`, 403);
  };
  const depuisDemandes: (string | undefined)[] = [];
  return {
    depuisDemandes,
    comptesBancaires: async () => {
      refuser("banque");
      return [{ id: 7, name: "Compte pro", bank_name: "Tiime", balance_amount: 12345.67, enabled: true, closed: false }];
    },
    transactions: async (_id: number, depuis?: string) => {
      depuisDemandes.push(depuis);
      return [
        { id: 1, transaction_date: "2026-10-30", wording: "VIR CLIENT ACME", amount: 14400, count_documents: 0, count_invoices: 1 },
        {
          id: 2,
          transaction_date: "2026-11-02",
          wording: "FIGMA",
          original_wording: "CB FIGMA 01/11",
          amount: -15,
          count_documents: 0,
          imputations: [{ label: { label: "Logiciels" } }],
        },
        { id: 3, transaction_date: "2025-12-20", wording: "URSSAF", amount: -500, count_documents: 1 },
      ];
    },
    factures: async () => [
      {
        id: 27430462,
        compiled_number: "F-008",
        title: "Product Design System",
        status: "paid",
        emission_date: "2026-10-28",
        client_name: "ACME",
        total_excluding_taxes: 12000,
        total_including_taxes: 14400,
      },
      {
        id: 27430463,
        compiled_number: "F-009",
        status: "sent",
        emission_date: "2026-11-05",
        client_name: "Beta",
        total_excluding_taxes: 1000,
        total_including_taxes: 1200,
      },
      { id: 27430464, status: "draft", emission_date: "2026-11-10", total_excluding_taxes: 999, total_including_taxes: 999 },
    ],
    notesFrais: async () => {
      refuser("notes");
      return [
        {
          id: 90,
          name: "Salon Paris",
          date: "2026-09-12",
          expense_type: "advanced_expense",
          lifecycle_status: "saved",
          payment_status: "to_pay",
          metadata: [
            { key: "amount", value: { value: 86.4 } },
            {
              key: "vat_amount",
              value: [
                { key: "20", value: 10 },
                { key: "total", value: 14.4 },
              ],
            },
          ],
        },
      ];
    },
    trajets: async () => [
      { id: 501, date: "2026-10-03", distance: 42, departure_address: "Massy", arrival_company_name: "ACME", round_trip: true, amount: 25.3 },
      { id: 502, date: "pas une date", distance: 10 },
    ],
  };
}

describe("conversions Tiime", () => {
  it("lit les montants de métadonnées sous toutes leurs formes", () => {
    expect(montantMeta([{ key: "amount", value: 12.5 }], "amount")).toBe(12.5);
    expect(montantMeta([{ key: "amount", value: { value: 3 } }], "amount")).toBe(3);
    expect(
      montantMeta(
        [
          {
            key: "vat_amount",
            value: [
              { key: "20", value: 1 },
              { key: "total", value: { value: 2 } },
            ],
          },
        ],
        "vat_amount",
      ),
    ).toBe(2);
    expect(montantMeta(undefined, "amount")).toBe(0);
  });

  it("transaction : empreinte stable, catégorie de l'imputation, justificatifs comptés", () => {
    const l = versTransaction(
      {
        id: 2,
        transaction_date: "2026-11-02T00:00:00",
        wording: "FIGMA",
        amount: -15,
        count_documents: 1,
        count_invoices: 1,
        imputations: [{ label: { label: "Logiciels" } }],
      },
      "c1",
      USER,
    );
    expect(l).toMatchObject({ jour: "2026-11-02", empreinte: "tiime:2", externe_id: "2", categorie_externe: "Logiciels", nb_justificatifs: 2 });
    expect(versTransaction({ id: 9, amount: 1 }, "c1", USER)).toBeNull();
  });

  it("note de frais et trajet", () => {
    expect(versNoteFrais({ id: 1, metadata: [{ key: "amount", value: 10 }] }, USER)).toMatchObject({ type: "advanced_expense", montant: 10, montant_tva: 0 });
    expect(
      versTrajet({ id: 1, date: "2026-01-02", total_distance: 84, distance: 42, round_trip: true, arrival_address: { label: "Lyon" } }, USER),
    ).toMatchObject({
      jour: "2026-01-02",
      distance_km: 84,
      aller_retour: true,
      arrivee: "Lyon",
      montant: null,
    });
  });

  it("départ de synchro : 1er janvier de l'an passé la première fois, puis dernière synchro − 10 jours", () => {
    expect(debutSynchro(null, MAINTENANT)).toBe("2025-01-01");
    expect(debutSynchro("2026-11-10T08:00:00Z", MAINTENANT)).toBe("2026-10-31");
  });
});

describe("synchroniserTiime", () => {
  it("crée le compte pro SASU et range tout, sans doublon à la deuxième synchro", async () => {
    const db = fausseDb({});
    const tiime = fauxTiime();
    const bilan = await synchroniserTiime(db, USER, tiime, { maintenant: MAINTENANT });
    expect(bilan).toMatchObject({ depuis: "2025-01-01", comptes: 1, transactions: 3, factures: 3, notes_frais: 1, trajets: 1, avertissements: [] });

    const [compte] = db.tables.comptes;
    expect(compte).toMatchObject({ perimetre: "sasu", source: "tiime", externe_id: "7", solde: 12345.67, user_id: USER });
    expect(db.tables.transactions.every((t: { compte_id: string }) => t.compte_id === compte.id)).toBe(true);
    expect(db.tables.notes_frais[0]).toMatchObject({ montant: 86.4, montant_tva: 14.4, statut_paiement: "to_pay" });
    expect(db.tables.connexions_externes[0]).toMatchObject({ fournisseur: "tiime", derniere_sync: MAINTENANT.toISOString() });

    // Une catégorie posée chez nous survit à la synchro suivante (l'upsert n'envoie pas categorie_id).
    db.tables.transactions[0].categorie_id = "cat-perso";
    const bilan2 = await synchroniserTiime(db, USER, tiime, { maintenant: new Date("2026-11-12T10:00:00Z") });
    expect(bilan2.depuis).toBe("2026-11-01");
    expect(tiime.depuisDemandes).toEqual(["2025-01-01", "2026-11-01"]);
    expect(db.tables.comptes).toHaveLength(1);
    expect(db.tables.transactions).toHaveLength(3);
    expect(db.tables.factures).toHaveLength(3);
    expect(db.tables.transactions[0].categorie_id).toBe("cat-perso");
  });

  it("une ressource refusée par Tiime n'empêche pas les autres", async () => {
    const db = fausseDb({});
    const bilan = await synchroniserTiime(db, USER, fauxTiime(["banque", "notes"]), { maintenant: MAINTENANT });
    expect(bilan).toMatchObject({ comptes: 0, factures: 3, notes_frais: 0, trajets: 1 });
    expect(bilan.avertissements).toEqual(["banque : GET banque : accès refusé par Tiime", "notes de frais : GET notes : accès refusé par Tiime"]);
  });

  it("une erreur de connexion arrête la synchro", async () => {
    const tiime = { ...fauxTiime(), factures: async () => Promise.reject(new ErreurTiime("mfa_requis", "code requis")) };
    await expect(synchroniserTiime(fausseDb({}), USER, tiime, { maintenant: MAINTENANT })).rejects.toMatchObject({ code: "mfa_requis" });
  });
});

describe("pilotageSasu", () => {
  it("additionne CA, encaissé, banque, notes de frais et IK de l'année", async () => {
    const db = fausseDb({});
    await synchroniserTiime(db, USER, fauxTiime(), { maintenant: MAINTENANT });
    const p = await pilotageSasu(db, USER, 2026);
    expect(p.factures).toEqual({ emises: 2, ca_facture_ht: 13000, ca_facture_ttc: 15600, payees: 1, encaisse_ttc: 14400, en_attente: 1, en_attente_ttc: 1200 });
    // la transaction URSSAF de 2025 est hors de l'année
    expect(p.banque).toEqual({ solde: 12345.67, entrees: 14400, sorties: -15, operations: 2, sans_justificatif: 1 });
    expect(p.notes_frais).toEqual({ nombre: 1, montant: 86.4, a_rembourser: 86.4 });
    expect(p.indemnites_km).toEqual({ trajets: 1, km: 42, montant: 25.3 });
    expect(p.derniere_sync).toBe(MAINTENANT.toISOString());
  });

  it("sans données : zéros et solde inconnu", async () => {
    const p = await pilotageSasu(fausseDb({}), USER, 2026);
    expect(p.banque.solde).toBeNull();
    expect(p.factures.emises).toBe(0);
    expect(p.indemnites_km.montant).toBeNull();
  });
});

describe("stockageJetonsSupabase", () => {
  it("écrit puis relit les jetons d'une seule ligne par fournisseur", async () => {
    const db = fausseDb({});
    const s = stockageJetonsSupabase(db, USER);
    expect(await s.lire()).toBeNull();
    await s.ecrire({ acces: "A", acces_expire_le: "2026-11-12T00:00:00Z", rafraichissement: "R" });
    await s.ecrire({ acces: "B", acces_expire_le: "2026-11-13T00:00:00Z", rafraichissement: "R" });
    expect(db.tables.connexions_externes).toHaveLength(1);
    expect(await s.lire()).toEqual({ acces: "B", acces_expire_le: "2026-11-13T00:00:00Z", rafraichissement: "R" });
  });
});
