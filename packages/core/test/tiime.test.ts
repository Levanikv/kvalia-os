import { describe, expect, it } from "vitest";
import {
  AuthTiime,
  ClientTiime,
  ErreurTiime,
  type JetonsTiime,
  boutonsAction,
  defiPkce,
  encoreDesPages,
  etatDePage,
  extraireItems,
  methodeDuDefi,
  texteDePage,
} from "../src/tiime";

/** Faux réseau : chaque appel est noté, la réponse vient d'un routeur (url, init) → Response. */
function fauxFetch(routeur: (url: string, init: RequestInit) => Response) {
  const appels: { url: string; init: RequestInit }[] = [];
  const f = async (url: string, init: RequestInit = {}) => {
    appels.push({ url, init });
    return routeur(url, init);
  };
  return { f, appels };
}

function memoire(initial: JetonsTiime | null = null) {
  let j = initial;
  return {
    stockage: { lire: async () => j, ecrire: async (n: JetonsTiime) => void (j = n) },
    get: () => j,
  };
}

const json = (corps: unknown, statut = 200, entetes: Record<string, string> = {}) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { "Content-Type": "application/json", ...entetes } });

const MAINTENANT = new Date("2026-11-11T10:00:00Z");

describe("AuthTiime — jetons", () => {
  it("réutilise un jeton d'accès encore valide sans appeler Auth0", async () => {
    const { f, appels } = fauxFetch(() => json({}, 500));
    const m = memoire({ acces: "A", acces_expire_le: "2026-11-11T12:00:00Z", rafraichissement: "R" });
    const auth = new AuthTiime({ stockage: m.stockage, fetch: f, maintenant: () => MAINTENANT });
    expect(await auth.jetonAcces()).toBe("A");
    expect(appels).toHaveLength(0);
  });

  it("rafraîchit un jeton expiré, garde l'ancien jeton de rafraîchissement si Auth0 n'en donne pas", async () => {
    const { f, appels } = fauxFetch(() => json({ access_token: "B", expires_in: 86400 }));
    const m = memoire({ acces: "A", acces_expire_le: "2026-11-11T09:00:00Z", rafraichissement: "R" });
    const auth = new AuthTiime({ stockage: m.stockage, fetch: f, maintenant: () => MAINTENANT });
    expect(await auth.jetonAcces()).toBe("B");
    expect(JSON.parse(String(appels[0].init.body)).grant_type).toBe("refresh_token");
    expect(m.get()?.rafraichissement).toBe("R");
    // expiration = maintenant + 24 h − 1 min de marge
    expect(m.get()?.acces_expire_le).toBe("2026-11-12T09:59:00.000Z");
  });

  it("signale la double authentification au lieu d'échouer en silence", async () => {
    const { f } = fauxFetch(() => json({ error: "mfa_required" }, 403));
    const auth = new AuthTiime({ email: "x@y.fr", motDePasse: "secret", stockage: memoire().stockage, fetch: f });
    await expect(auth.jetonAcces()).rejects.toMatchObject({ name: "ErreurTiime", code: "mfa_requis" });
  });

  it("exige les identifiants quand il n'y a aucun jeton", async () => {
    const auth = new AuthTiime({ stockage: memoire().stockage, fetch: fauxFetch(() => json({})).f });
    await expect(auth.jetonAcces()).rejects.toMatchObject({ code: "identifiants_manquants" });
  });
});

/** Pages Universal Login minimales, dans l'ordre du parcours SMS. */
const PAGE_CHOIX = `<form><input type="hidden" name="state" value="ETAT1"/>
  <button type="submit" name="action" value="email::1">E-mail</button>
  <button type="submit" name="action" value="sms::0">SMS</button></form>`;
const PAGE_CODE_SMS = `<p>Code envoyé au +33 6 ** ** ** 12</p><form><input type="hidden" name="state" value="ETAT2">
  <input type="text" name="code"/><button name="action" value="default">Continuer</button></form>`;

describe("AuthTiime — connexion avec code SMS", () => {
  function auth0() {
    let codeOk = false;
    return fauxFetch((url, init) => {
      const corps = String(init.body ?? "");
      if (url.endsWith("/oauth/token")) {
        const p = JSON.parse(corps);
        if (p.grant_type === "authorization_code") return json({ access_token: "ACC", refresh_token: "REF", expires_in: 86400 });
        return json({ error: "mfa_required" }, 403);
      }
      if (url.endsWith("/co/authenticate"))
        return new Response(JSON.stringify({ login_ticket: "TICKET" }), { status: 200, headers: { "Set-Cookie": "auth0=abc; Path=/; HttpOnly" } });
      if (url.includes("/authorize?")) return new Response(null, { status: 302, headers: { Location: "/u/mfa-login-options?state=ETAT1" } });
      if (url.includes("/u/mfa-login-options") && init.method === "GET") return new Response(PAGE_CHOIX, { status: 200 });
      if (url.includes("/u/mfa-login-options")) return new Response(null, { status: 302, headers: { Location: "/u/mfa-sms-challenge?state=ETAT2" } });
      if (url.includes("/u/mfa-sms-challenge") && init.method === "GET") return new Response(PAGE_CODE_SMS, { status: 200 });
      if (url.includes("/u/mfa-sms-challenge")) {
        codeOk = new URLSearchParams(corps).get("code") === "123456";
        return codeOk
          ? new Response(null, { status: 302, headers: { Location: "https://apps.tiime.fr/auth-callback?code=CODEAUTH&state=x" } })
          : new Response(PAGE_CODE_SMS.replace("Code envoyé", "Code invalide. Code envoyé"), { status: 400 });
      }
      return new Response("inconnu", { status: 404 });
    });
  }

  it("choisit le SMS, rend le défi, puis échange le code contre des jetons stockés", async () => {
    const { f, appels } = auth0();
    const m = memoire();
    const auth = new AuthTiime({ email: "x@y.fr", motDePasse: "secret", stockage: m.stockage, fetch: f, maintenant: () => MAINTENANT });

    const defi = await auth.demarrerConnexion("sms");
    expect(defi).toMatchObject({ methode: "sms", attend_code: true });
    expect(defi?.message).toContain("Code envoyé");
    expect(auth.connexionEnCours).toBe(true);

    // le choix de méthode a posté sms::0 avec l'état de la page, en renvoyant le cookie reçu
    const choix = appels.find((a) => a.url.includes("mfa-login-options") && a.init.method === "POST")!;
    expect(new URLSearchParams(String(choix.init.body)).get("action")).toBe("sms::0");
    expect(new Headers(choix.init.headers).get("Cookie")).toBe("auth0=abc");

    expect(await auth.validerCode("123456")).toBeNull();
    expect(auth.connexionEnCours).toBe(false);
    expect(m.get()).toMatchObject({ acces: "ACC", rafraichissement: "REF" });
    const echange = JSON.parse(String(appels.at(-1)!.init.body));
    expect(echange).toMatchObject({ grant_type: "authorization_code", code: "CODEAUTH", redirect_uri: "https://apps.tiime.fr/auth-callback" });
    expect(echange.code_verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("redonne un défi si le code est faux, sans perdre la connexion en cours", async () => {
    const { f } = auth0();
    const auth = new AuthTiime({ email: "x@y.fr", motDePasse: "secret", stockage: memoire().stockage, fetch: f });
    await auth.demarrerConnexion();
    const defi = await auth.validerCode("000000");
    expect(defi?.message).toContain("Code invalide");
    expect(auth.connexionEnCours).toBe(true);
  });

  it("refuse un code sans connexion en cours", async () => {
    const auth = new AuthTiime({ email: "x@y.fr", motDePasse: "s", stockage: memoire().stockage, fetch: fauxFetch(() => json({})).f });
    await expect(auth.validerCode("123456")).rejects.toMatchObject({ code: "aucune_connexion_en_cours" });
  });
});

/** Page de validation par notification dans l'app Tiime (ce que renvoie le compte de Levani). */
const PAGE_PUSH = (erreur = "") => `<p>${erreur}Nous avons envoyé une notification à l'appareil suivant via l'application Tiime: iPhone</p>
  <form method="POST"><input type="hidden" name="state" value="ETATPUSH"/>
  <input type="checkbox" name="rememberBrowser" value="true"/> Se souvenir de cet appareil pendant 30 jours
  <button type="submit" name="action" value="default">J'ai répondu sur mon appareil</button>
  <button type="submit" name="action" value="resend">Renvoyer</button>
  <button type="submit" name="action" value="pick-authenticator">Essayer une autre méthode</button></form>`;

describe("AuthTiime — connexion avec notification dans l'app Tiime", () => {
  function auth0Push() {
    let valide = false;
    const fake = fauxFetch((url, init) => {
      const corps = String(init.body ?? "");
      if (url.endsWith("/oauth/token")) {
        const p = JSON.parse(corps);
        if (p.grant_type === "authorization_code") return json({ access_token: "ACC", refresh_token: "REF", expires_in: 86400 });
        return json({ error: "mfa_required" }, 403);
      }
      if (url.endsWith("/co/authenticate")) return json({ login_ticket: "TICKET" });
      if (url.includes("/authorize?")) return new Response(null, { status: 302, headers: { Location: "/u/mfa-push-challenge-push?state=ETATPUSH" } });
      if (url.includes("/u/mfa-push-challenge-push") && init.method === "GET") return new Response(PAGE_PUSH(), { status: 200 });
      if (url.includes("/u/mfa-push-challenge-push")) {
        const action = new URLSearchParams(corps).get("action");
        if (action === "pick-authenticator") return new Response(null, { status: 302, headers: { Location: "/u/mfa-login-options?state=ETAT1" } });
        return valide
          ? new Response(null, { status: 302, headers: { Location: "https://apps.tiime.fr/auth-callback?code=CODEPUSH" } })
          : new Response(PAGE_PUSH("Notification pas encore validée. "), { status: 400 });
      }
      if (url.includes("/u/mfa-login-options") && init.method === "GET") return new Response(PAGE_CHOIX, { status: 200 });
      if (url.includes("/u/mfa-login-options")) return new Response(null, { status: 302, headers: { Location: "/u/mfa-sms-challenge?state=ETAT2" } });
      if (url.includes("/u/mfa-sms-challenge")) return new Response(PAGE_CODE_SMS, { status: 200 });
      return new Response("inconnu", { status: 404 });
    });
    return { ...fake, valider: () => void (valide = true) };
  }

  it("sans méthode imposée, accepte la notification puis attend la validation sur le téléphone", async () => {
    const { f, appels, valider } = auth0Push();
    const m = memoire();
    const auth = new AuthTiime({ email: "x@y.fr", motDePasse: "secret", stockage: m.stockage, fetch: f });

    const defi = await auth.demarrerConnexion();
    expect(defi).toMatchObject({ methode: "push", attend_code: false });
    expect(defi?.message).toContain("notification");

    // pas encore validée sur le téléphone : Tiime renvoie la même page, on reste en attente
    const encore = await auth.validerCode();
    expect(encore).toMatchObject({ methode: "push", attend_code: false });
    expect(encore?.message).toContain("pas encore validée");
    expect(new URLSearchParams(String(appels.at(-1)!.init.body)).get("action")).toBe("default");

    valider();
    expect(await auth.validerCode()).toBeNull();
    expect(m.get()).toMatchObject({ acces: "ACC", rafraichissement: "REF" });
  });

  it("avec --sms, quitte la page de notification pour le code SMS", async () => {
    const { f, appels } = auth0Push();
    const auth = new AuthTiime({ email: "x@y.fr", motDePasse: "secret", stockage: memoire().stockage, fetch: f });
    const defi = await auth.demarrerConnexion("sms");
    expect(defi).toMatchObject({ methode: "sms", attend_code: true });
    expect(appels.some((a) => new URLSearchParams(String(a.init.body ?? "")).get("action") === "pick-authenticator")).toBe(true);
  });

  it("un code est exigé quand la page en attend un", async () => {
    const { f } = auth0Push();
    const auth = new AuthTiime({ email: "x@y.fr", motDePasse: "secret", stockage: memoire().stockage, fetch: f });
    await auth.demarrerConnexion("sms");
    await expect(auth.validerCode()).rejects.toMatchObject({ code: "connexion_refusee" });
  });
});

describe("AuthTiime — notification sans bouton lisible", () => {
  it("envoie action=default sur /u/mfa-push-challenge, comme le bouton « J'ai répondu »", async () => {
    let valide = false;
    const page = `<form method="POST"><input type="hidden" name="state" value="E"/><p>Nous avons envoyé une notification</p><a href="#">J'ai répondu sur mon appareil</a></form>`;
    const { f, appels } = fauxFetch((url, init) => {
      if (url.endsWith("/oauth/token")) {
        const p = JSON.parse(String(init.body));
        return p.grant_type === "authorization_code" ? json({ access_token: "A", refresh_token: "R", expires_in: 3600 }) : json({ error: "mfa_required" }, 403);
      }
      if (url.endsWith("/co/authenticate")) return json({ login_ticket: "T" });
      if (url.includes("/authorize?")) return new Response(null, { status: 302, headers: { Location: "/u/mfa-push-challenge?state=E" } });
      if (init.method === "GET") return new Response(page, { status: 200 });
      return valide
        ? new Response(null, { status: 302, headers: { Location: "https://apps.tiime.fr/auth-callback?code=C" } })
        : new Response(page, { status: 200 });
    });
    const auth = new AuthTiime({ email: "x@y.fr", motDePasse: "s", stockage: memoire().stockage, fetch: f });
    expect(await auth.demarrerConnexion()).toMatchObject({ methode: "push", attend_code: false });
    valide = true;
    expect(await auth.validerCode()).toBeNull();
    expect(new URLSearchParams(String(appels.find((a) => a.init.method === "POST" && a.url.includes("mfa-push"))!.init.body)).get("action")).toBe("default");
  });
});

describe("pages de connexion", () => {
  it("lit l'état, les boutons, la méthode du défi et le texte", () => {
    expect(etatDePage(PAGE_CHOIX)).toBe("ETAT1");
    expect(etatDePage('<input value="a&amp;b" name="state">')).toBe("a&b");
    expect(boutonsAction(PAGE_CHOIX).map((b) => b.valeur)).toEqual(["email::1", "sms::0"]);
    // attributs dans un autre ordre, guillemets simples, <input type="submit">
    expect(
      boutonsAction(
        `<button class="c" value='default' type="submit" name="action">J'ai répondu</button><input type="submit" name="action" value="resend-push"><input type="hidden" name="action" value="x">`,
      ),
    ).toEqual([
      { valeur: "default", libelle: "J'ai répondu" },
      { valeur: "resend-push", libelle: "resend-push" },
    ]);
    expect(methodeDuDefi("https://auth0.tiime.fr/u/mfa-sms-challenge?state=x")).toBe("sms");
    expect(methodeDuDefi("https://auth0.tiime.fr/u/mfa-push-challenge-push?state=x")).toBe("push");
    expect(texteDePage("<script>x()</script><p>Bonjour&nbsp;Levani</p>")).toBe("Bonjour Levani");
  });

  it("calcule le défi PKCE S256 comme la RFC 7636", async () => {
    // Vecteur de test de l'annexe B de la RFC 7636
    expect(await defiPkce("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("ClientTiime", () => {
  const auth = { jetonAcces: async () => "JETON", invalider: () => {} };

  it("pagine avec Range jusqu'au total annoncé et lit la liste enveloppée", async () => {
    const { f, appels } = fauxFetch((_url, init) => {
      const range = new Headers(init.headers).get("Range")!;
      const debut = Number(range.match(/items=(\d+)-/)![1]);
      const n = debut === 0 ? 100 : 20;
      const transactions = Array.from({ length: n }, (_, i) => ({ id: debut + i, amount: -1 }));
      return json({ transactions, metadata: {} }, 200, { "Content-Range": `items ${debut}-${debut + n - 1}/120` });
    });
    const client = new ClientTiime(auth, { societeId: 626568, fetch: f });
    const txs = await client.transactions(42, "2026-01-01");
    expect(txs).toHaveLength(120);
    expect(appels).toHaveLength(2);
    const u = new URL(appels[0].url);
    expect(u.pathname).toBe("/v1/accounts/companies/626568/bank_transactions");
    expect(u.searchParams.get("bank_account")).toBe("42");
    expect(u.searchParams.get("date")).toBe(">=2026-01-01");
    const h = new Headers(appels[0].init.headers);
    expect(h.get("Authorization")).toBe("Bearer JETON");
    expect(h.get("tiime-app")).toBe("tiime");
    expect(h.get("Accept")).toBe("application/vnd.tiime.bank_transactions.v2+json");
    expect(appels.every((a) => a.init.method === "GET")).toBe(true);
  });

  it("retente une fois après un 401 avec un jeton renouvelé", async () => {
    let invalide = 0;
    let n = 0;
    const { f } = fauxFetch(() => (n++ === 0 ? new Response("", { status: 401 }) : json([{ id: 1, name: "KVALIA" }])));
    const client = new ClientTiime({ jetonAcces: async () => "J", invalider: () => void invalide++ }, { societeId: 1, fetch: f });
    expect(await client.societes()).toEqual([{ id: 1, name: "KVALIA" }]);
    expect(invalide).toBe(1);
  });

  it("traduit 403 et 404 en erreurs Tiime typées", async () => {
    const client403 = new ClientTiime(auth, { societeId: 1, fetch: fauxFetch(() => new Response("", { status: 403 })).f });
    await expect(client403.comptesBancaires()).rejects.toMatchObject({ code: "acces_refuse", statut: 403 });
    const client404 = new ClientTiime(auth, { societeId: 1, fetch: fauxFetch(() => new Response("", { status: 404 })).f });
    await expect(client404.notesFrais()).rejects.toBeInstanceOf(ErreurTiime);
  });
});

describe("pagination", () => {
  it("interprète Content-Range", () => {
    expect(encoreDesPages("items 0-99/120", true)).toBe(true);
    expect(encoreDesPages("items 100-119/120", false)).toBe(false);
    expect(encoreDesPages("items 0-99/*", true)).toBe(true);
    expect(encoreDesPages(null, true)).toBe(true);
    expect(encoreDesPages(null, false)).toBe(false);
  });
  it("extrait les listes brutes, enveloppées ou vides (204)", () => {
    expect(extraireItems([1, 2])).toEqual([1, 2]);
    expect(extraireItems({ travels: [1] }, "travels")).toEqual([1]);
    expect(extraireItems(null, "travels")).toEqual([]);
  });
});
