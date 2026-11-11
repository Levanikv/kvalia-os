/**
 * Client de l'API interne Tiime (celle de l'app web apps.tiime.fr), en LECTURE SEULE — ADR 0010.
 *
 * API non documentée, reconstituée d'après eko/mcp-tiime (MIT) : https://github.com/eko/mcp-tiime/blob/main/docs/api-tiime.md
 * - API : https://chronos-api.tiime-apps.com/v1 ; pagination par en-têtes `Range: items=a-b` / `Content-Range`.
 * - Auth0 : https://auth0.tiime.fr, client public de l'app web. Jeton d'accès 24 h + jeton de rafraîchissement (offline_access).
 * - Double authentification : le « password grant » répond `mfa_required` ; on passe alors par les pages Universal Login
 *   (choix de la méthode, code SMS) puis échange du code d'autorisation (PKCE).
 *
 * Aucune dépendance au framework ni à Supabase : `fetch` et le stockage des jetons sont injectés (tests sans réseau).
 */
export const TIIME_API = "https://chronos-api.tiime-apps.com/v1";
export const TIIME_AUTH = "https://auth0.tiime.fr";
const CLIENT_ID = "iEbsbe3o66gcTBfGRa012kj1Rb6vjAND";
const ORIGINE = "https://apps.tiime.fr";
const REDIRECTION = `${ORIGINE}/auth-callback`;
const AUDIENCE = "https://chronos/";
const REALM = "Chronos-prod-db";
const SCOPE = "openid email offline_access";
const GRANT_MOT_DE_PASSE = "http://auth0.com/oauth/grant-type/password-realm";
export const VERSION_APP_TIIME = "4.40.6";
/** On renouvelle le jeton d'accès un peu avant qu'Auth0 le refuse. */
const MARGE_MS = 60_000;
const TAILLE_PAGE = 100;
const PAGES_MAX = 100;
const ETAPES_CONNEXION_MAX = 20;

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type JetonsTiime = { acces: string | null; acces_expire_le: string | null; rafraichissement: string | null };

/** Où vivent les jetons entre deux appels (table `connexions_externes` côté agent). */
export interface StockageJetons {
  lire(): Promise<JetonsTiime | null>;
  ecrire(jetons: JetonsTiime): Promise<void>;
}

export type CodeErreurTiime =
  | "identifiants_manquants"
  | "mfa_requis"
  | "connexion_refusee"
  | "aucune_connexion_en_cours"
  | "page_inattendue"
  | "introuvable"
  | "acces_refuse"
  | "api";

export class ErreurTiime extends Error {
  constructor(
    public readonly code: CodeErreurTiime,
    message: string,
    public readonly statut?: number,
    /** HTML de la page de connexion non gérée (diagnostic local, jamais renvoyé par un outil). */
    public readonly html?: string,
  ) {
    super(message);
    this.name = "ErreurTiime";
  }
}

/**
 * Ce que Tiime attend pour finir la connexion : un code (SMS, e-mail) ou une validation dans l'app Tiime
 * (notification « push » sur le téléphone, `attend_code = false`).
 */
export type DefiConnexion = { methode: string; attend_code: boolean; message: string };

export type ConfigAuthTiime = {
  email?: string;
  motDePasse?: string;
  stockage: StockageJetons;
  fetch?: FetchLike;
  authUrl?: string;
  maintenant?: () => Date;
};

type ReponseJeton = { access_token: string; refresh_token?: string; expires_in: number };

/** Fournit des jetons d'accès Tiime : cache → rafraîchissement → mot de passe (si pas de double authentification). */
export class AuthTiime {
  private readonly f: FetchLike;
  private readonly authUrl: string;
  private readonly maintenant: () => Date;
  private jetons: JetonsTiime | null = null;
  private enCours: ParcoursConnexion | null = null;

  constructor(private readonly cfg: ConfigAuthTiime) {
    this.f = cfg.fetch ?? fetch;
    this.authUrl = cfg.authUrl ?? TIIME_AUTH;
    this.maintenant = cfg.maintenant ?? (() => new Date());
  }

  /** Vrai si un parcours SMS attend son code. */
  get connexionEnCours(): boolean {
    return this.enCours !== null;
  }

  async jetonAcces(): Promise<string> {
    this.jetons ??= await this.cfg.stockage.lire();
    const j = this.jetons;
    if (j?.acces && j.acces_expire_le && this.maintenant().getTime() < new Date(j.acces_expire_le).getTime()) return j.acces;
    if (j?.rafraichissement) {
      try {
        await this.echanger({ grant_type: "refresh_token", client_id: CLIENT_ID, refresh_token: j.rafraichissement });
        return this.jetons!.acces!;
      } catch {
        // jeton de rafraîchissement expiré ou révoqué : on retente par mot de passe
      }
    }
    if (!this.cfg.email || !this.cfg.motDePasse) throw new ErreurTiime("identifiants_manquants", "TIIME_EMAIL / TIIME_PASSWORD absents côté agent");
    await this.echanger(this.grantMotDePasse());
    return this.jetons!.acces!;
  }

  /** Force le renouvellement au prochain appel (après un 401). */
  invalider(): void {
    if (this.jetons) this.jetons = { ...this.jetons, acces_expire_le: null };
  }

  /**
   * Lance une connexion complète. Rend `null` si Tiime n'a pas demandé de code (connecté),
   * sinon le défi à résoudre avec `validerCode`. Sans `methode`, on prend celle que Tiime propose d'abord
   * (souvent la notification dans l'app) ; sinon sms, email, push…
   */
  async demarrerConnexion(methode?: string): Promise<DefiConnexion | null> {
    if (!this.cfg.email || !this.cfg.motDePasse) throw new ErreurTiime("identifiants_manquants", "TIIME_EMAIL / TIIME_PASSWORD absents côté agent");
    this.enCours = null;
    try {
      await this.echanger(this.grantMotDePasse());
      return null;
    } catch (err) {
      if (!(err instanceof ErreurTiime && err.code === "mfa_requis")) throw err;
    }
    const parcours = new ParcoursConnexion(this.f, this.authUrl, this.cfg.email, this.cfg.motDePasse, methode);
    await parcours.demarrer();
    return this.poursuivre(parcours);
  }

  /**
   * Envoie le code reçu, ou confirme une notification validée dans l'app (sans code).
   * Rend `null` une fois connecté, ou un nouveau défi si Tiime refuse (code faux, notification pas encore validée).
   */
  async validerCode(code?: string): Promise<DefiConnexion | null> {
    const parcours = this.enCours;
    if (!parcours) throw new ErreurTiime("aucune_connexion_en_cours", "Aucune connexion Tiime en cours : lancer connecter_tiime d'abord");
    try {
      await parcours.envoyerCode(code);
    } catch (err) {
      this.enCours = null;
      throw err;
    }
    return this.poursuivre(parcours);
  }

  private async poursuivre(parcours: ParcoursConnexion): Promise<DefiConnexion | null> {
    let resultat: Awaited<ReturnType<ParcoursConnexion["avancer"]>>;
    try {
      resultat = await parcours.avancer();
    } catch (err) {
      this.enCours = null;
      throw err;
    }
    if ("defi" in resultat) {
      this.enCours = parcours;
      return resultat.defi;
    }
    this.enCours = null;
    await this.echanger({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code: resultat.code,
      redirect_uri: REDIRECTION,
      code_verifier: parcours.verificateur,
    });
    return null;
  }

  private grantMotDePasse(): Record<string, string> {
    return {
      grant_type: GRANT_MOT_DE_PASSE,
      client_id: CLIENT_ID,
      username: this.cfg.email ?? "",
      password: this.cfg.motDePasse ?? "",
      scope: SCOPE,
      audience: AUDIENCE,
      realm: REALM,
    };
  }

  private async echanger(params: Record<string, string>): Promise<void> {
    const res = await this.f(`${this.authUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const corps = (await res.json().catch(() => ({}))) as { error?: string; error_description?: string };
      if (corps.error === "mfa_required") throw new ErreurTiime("mfa_requis", "Le compte Tiime demande un code (double authentification)", res.status);
      throw new ErreurTiime(
        "connexion_refusee",
        `Connexion Tiime refusée (${params.grant_type}) : ${corps.error ?? res.status} ${corps.error_description ?? ""}`.trim(),
        res.status,
      );
    }
    const jeton = (await res.json()) as ReponseJeton;
    const expire = new Date(this.maintenant().getTime() + jeton.expires_in * 1000 - MARGE_MS);
    // Auth0 ne fait pas toujours tourner le jeton de rafraîchissement : on garde l'ancien.
    this.jetons = {
      acces: jeton.access_token,
      acces_expire_le: expire.toISOString(),
      rafraichissement: jeton.refresh_token ?? this.jetons?.rafraichissement ?? null,
    };
    await this.cfg.stockage.ecrire(this.jetons);
  }
}

// ---------------------------------------------------------------------------
// Parcours Auth0 Universal Login (double authentification)
// ---------------------------------------------------------------------------

type Page = { url: string; statut: number; location: string | null; corps: string };

const RE_ETAT = /name="state"[^>]*value="([^"]+)"|value="([^"]+)"[^>]*name="state"/;
const RE_CHAMP_CODE = /<input[^>]+name="code"/;
const RE_CONTROLE = /<button\b([^>]*)>([\s\S]*?)<\/button>|<input\b([^>]*)>/gi;
const RE_ATTRIBUT = /([a-zA-Z_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
const RE_URL_DEFI = /\/u\/mfa-([a-z-]+?)-challenge/;

function decoderHtml(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** Texte lisible d'une page HTML (sans scripts ni balises), pour les messages d'erreur et de défi. */
export function texteDePage(html: string, max = 300): string {
  const texte = decoderHtml(html.replace(/<(script|style)[^>]*>[\s\S]*?<\/(script|style)>|<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  return texte.length > max ? `${texte.slice(0, max)}…` : texte;
}

/** Valeur du champ caché `state` d'une page Universal Login. */
export function etatDePage(html: string): string | null {
  const m = html.match(RE_ETAT);
  return m ? decoderHtml(m[1] ?? m[2]) : null;
}

/** Boutons `action` d'une page, dans l'ordre d'affichage. Les méthodes de vérification sont de la forme `sms::0`. */
export function boutonsAction(html: string): { valeur: string; libelle: string }[] {
  const boutons: { valeur: string; libelle: string }[] = [];
  for (const m of html.matchAll(RE_CONTROLE)) {
    const attrs: Record<string, string> = {};
    for (const a of (m[1] ?? m[3] ?? "").matchAll(RE_ATTRIBUT)) attrs[a[1].toLowerCase()] = decoderHtml(a[2] ?? a[3] ?? a[4] ?? "");
    // <button name="action" value="…"> (attributs dans n'importe quel ordre) ou <input type="submit" name="action" value="…">
    if (attrs.name !== "action" || !attrs.value) continue;
    if (m[3] !== undefined && (attrs.type ?? "").toLowerCase() !== "submit") continue;
    boutons.push({ valeur: attrs.value, libelle: (m[2] !== undefined ? texteDePage(m[2]) : "") || attrs.value });
  }
  return boutons;
}

/** Méthode d'un défi d'après l'URL (`/u/mfa-sms-challenge` → `sms`). */
export function methodeDuDefi(url: string): string {
  return url.match(RE_URL_DEFI)?.[1] ?? "";
}

/** base64url sans remplissage (Web Crypto : marche dans Node 22 comme dans un bundle navigateur). */
function base64url(octets: Uint8Array): string {
  let bin = "";
  for (const o of octets) bin += String.fromCharCode(o);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function jetonAleatoire(octets: number): string {
  return base64url(crypto.getRandomValues(new Uint8Array(octets)));
}

/** Défi PKCE S256 : base64url(sha256(vérificateur)). */
export async function defiPkce(verificateur: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verificateur))));
}

/** Erreur lisible pour une page qu'on ne sait pas traiter : chemin, boutons et texte, pour adapter le parcours. */
function pageNonGeree(page: Page, boutons: { valeur: string }[]): ErreurTiime {
  const chemin = (() => {
    try {
      return new URL(page.url).pathname;
    } catch {
      return page.url;
    }
  })();
  return new ErreurTiime(
    "page_inattendue",
    `Page de connexion Tiime non gérée (${page.statut}, ${chemin}, boutons : ${boutons.map((b) => b.valeur).join(", ") || "aucun"}) : ${texteDePage(page.corps)}`,
    page.statut,
    page.corps,
  );
}

/** Pages de connexion Auth0 avec cookies, sans suivre les redirections (chaque étape est inspectée). */
class ParcoursConnexion {
  readonly verificateur = jetonAleatoire(32);
  private readonly cookies = new Map<string, string>();
  private page: Page | null = null;
  private methodeChangee = false;

  constructor(
    private readonly f: FetchLike,
    private readonly authUrl: string,
    private readonly email: string,
    private readonly motDePasse: string,
    private readonly methode: string | undefined,
  ) {}

  async demarrer(): Promise<void> {
    const res = await this.requete(`${this.authUrl}/co/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGINE },
      body: JSON.stringify({ client_id: CLIENT_ID, username: this.email, password: this.motDePasse, realm: REALM, credential_type: GRANT_MOT_DE_PASSE }),
    });
    const corps = (await res.json().catch(() => ({}))) as { login_ticket?: string; error?: string; error_description?: string };
    if (!corps.login_ticket)
      throw new ErreurTiime(
        "connexion_refusee",
        `Connexion Tiime refusée (${res.status}) : ${corps.error ?? ""} ${corps.error_description ?? ""}`.trim(),
        res.status,
      );
    const q = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: REDIRECTION,
      scope: SCOPE,
      audience: AUDIENCE,
      realm: REALM,
      state: jetonAleatoire(16),
      nonce: jetonAleatoire(16),
      login_ticket: corps.login_ticket,
      code_challenge: await defiPkce(this.verificateur),
      code_challenge_method: "S256",
    });
    this.page = await this.obtenir(`${this.authUrl}/authorize?${q}`);
  }

  /** Suit les pages jusqu'à un champ « code » (défi) ou jusqu'à la redirection finale (code d'autorisation). */
  async avancer(): Promise<{ code: string } | { defi: DefiConnexion }> {
    for (let i = 0; i < ETAPES_CONNEXION_MAX; i++) {
      const page = this.page;
      if (!page) throw new ErreurTiime("aucune_connexion_en_cours", "Parcours de connexion non démarré");
      if (page.location) {
        const cible = new URL(page.location, page.url).toString();
        if (cible.startsWith(REDIRECTION)) {
          const q = new URL(cible).searchParams;
          const code = q.get("code");
          if (!code) throw new ErreurTiime("connexion_refusee", `Connexion Tiime échouée : ${q.get("error") ?? ""} ${q.get("error_description") ?? ""}`.trim());
          return { code };
        }
        this.page = await this.obtenir(cible);
        continue;
      }
      const etat = etatDePage(page.corps);
      if (!etat) throw new ErreurTiime("page_inattendue", `Page de connexion Tiime inattendue (${page.statut}) : ${texteDePage(page.corps)}`, page.statut);
      const boutons = boutonsAction(page.corps);
      const actuelle = methodeDuDefi(page.url);
      const attendCode = RE_CHAMP_CODE.test(page.corps);
      // Page de défi : champ « code » (SMS, e-mail, appli OTP) ou attente d'une validation dans l'app (push).
      if (attendCode || actuelle) {
        const peutChanger = boutons.some((b) => b.valeur === "pick-authenticator");
        if (this.methode && actuelle !== this.methode && peutChanger && !this.methodeChangee) {
          this.methodeChangee = true;
          this.page = await this.poster(page.url, { state: etat, action: "pick-authenticator" });
          continue;
        }
        return { defi: { methode: actuelle || "code", attend_code: attendCode, message: texteDePage(page.corps) } };
      }
      const methodes = boutons.filter((b) => b.valeur.includes("::"));
      if (methodes.length === 0) throw pageNonGeree(page, boutons);
      const choix = this.methode ? methodes.find((b) => b.valeur.startsWith(`${this.methode}::`)) : methodes[0];
      if (!choix)
        throw new ErreurTiime(
          "connexion_refusee",
          `Méthode « ${this.methode} » indisponible, au choix : ${methodes.map((m) => m.valeur.split("::")[0]).join(", ")}`,
        );
      this.page = await this.poster(page.url, { state: etat, action: choix.valeur });
    }
    throw new ErreurTiime("page_inattendue", "La connexion Tiime ne s'est pas terminée (trop d'étapes)");
  }

  /** Code sur une page à champ « code » ; sans champ (notification), clique « J'ai répondu sur mon appareil ». */
  async envoyerCode(code?: string): Promise<void> {
    const page = this.page;
    const etat = page && etatDePage(page.corps);
    if (!page || !etat) throw new ErreurTiime("aucune_connexion_en_cours", "Aucune validation attendue par Tiime");
    if (RE_CHAMP_CODE.test(page.corps)) {
      if (!code?.trim()) throw new ErreurTiime("connexion_refusee", "Tiime attend un code de vérification");
      this.page = await this.poster(page.url, { state: etat, code: code.trim(), action: "default" });
      return;
    }
    const boutons = boutonsAction(page.corps);
    const confirmer =
      boutons.find((b) => b.valeur === "default") ??
      boutons.find((b) => /répondu|responded|continuer|continue/i.test(b.libelle) && b.valeur !== "pick-authenticator");
    // Sans bouton lisible, on envoie l'action standard d'Auth0 (« J'ai répondu sur mon appareil » = action=default).
    this.page = await this.poster(page.url, { state: etat, action: confirmer?.valeur ?? "default" });
  }

  private async obtenir(url: string): Promise<Page> {
    return this.lirePage(url, await this.requete(url, { method: "GET", headers: { Accept: "text/html" } }));
  }

  private async poster(url: string, champs: Record<string, string>): Promise<Page> {
    const res = await this.requete(url, {
      method: "POST",
      // Auth0 répond 406 aux formulaires qui n'acceptent pas le HTML.
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "text/html", Origin: this.authUrl, Referer: url },
      body: new URLSearchParams(champs).toString(),
    });
    return this.lirePage(url, res);
  }

  private async lirePage(url: string, res: Response): Promise<Page> {
    return { url, statut: res.status, location: res.headers.get("location"), corps: await res.text() };
  }

  private async requete(url: string, init: RequestInit): Promise<Response> {
    const entetes = new Headers(init.headers);
    if (this.cookies.size) entetes.set("Cookie", [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "));
    const res = await this.f(url, { ...init, headers: entetes, redirect: "manual" });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [paire] = c.split(";");
      const i = paire.indexOf("=");
      if (i > 0) this.cookies.set(paire.slice(0, i).trim(), paire.slice(i + 1).trim());
    }
    return res;
  }
}

// ---------------------------------------------------------------------------
// Client API (lecture)
// ---------------------------------------------------------------------------

export type CompteBancaireTiime = {
  id: number;
  name?: string;
  bank_name?: string;
  balance_amount?: number;
  balance_currency?: string;
  enabled?: boolean;
  closed?: boolean;
};

export type TransactionTiime = {
  id: number;
  transaction_date?: string;
  realization_date?: string;
  wording?: string;
  original_wording?: string;
  amount: number;
  currency?: string;
  count_documents?: number;
  count_invoices?: number;
  imputations?: { amount?: number; label?: { label?: string; name?: string } | null }[];
};

export type FactureTiime = {
  id: number;
  compiled_number?: string;
  title?: string;
  status: string;
  emission_date?: string;
  client_name?: string;
  total_excluding_taxes?: number;
  total_including_taxes?: number;
};

export type MetadonneeTiime = { key: string; type?: string; value: unknown };

export type NoteFraisTiime = {
  id: number;
  name?: string;
  date?: string;
  expense_type?: string;
  lifecycle_status?: string;
  payment_status?: string;
  comment?: string;
  metadata?: MetadonneeTiime[];
};

/** Les trajets n'ont pas de modèle documenté : on lit les champs connus et on garde le reste. */
export type TrajetTiime = Record<string, unknown> & { id: number };

export type ConfigClientTiime = { societeId: number; fetch?: FetchLike; apiUrl?: string; versionApp?: string };

export class ClientTiime {
  private readonly f: FetchLike;
  private readonly apiUrl: string;
  private readonly versionApp: string;
  readonly societeId: number;

  constructor(
    private readonly auth: Pick<AuthTiime, "jetonAcces" | "invalider">,
    cfg: ConfigClientTiime,
  ) {
    this.f = cfg.fetch ?? fetch;
    this.apiUrl = (cfg.apiUrl ?? TIIME_API).replace(/\/$/, "");
    this.versionApp = cfg.versionApp ?? VERSION_APP_TIIME;
    this.societeId = cfg.societeId;
  }

  societes(): Promise<{ id: number; name: string }[]> {
    return this.lire("/companies");
  }

  comptesBancaires(): Promise<CompteBancaireTiime[]> {
    return this.lire(this.compta("/bank_accounts"));
  }

  /** Transactions d'un compte, depuis une date (incluse), toutes pages confondues. */
  transactions(compteId: number, depuis?: string): Promise<TransactionTiime[]> {
    const q = new URLSearchParams({ bank_account: String(compteId) });
    if (depuis) q.set("date", `>=${depuis}`);
    return this.toutesLesPages(this.compta("/bank_transactions"), q, { Accept: "application/vnd.tiime.bank_transactions.v2+json" }, "transactions");
  }

  /** Factures émises (Tiime Factures). Sans `sorts` : un tri casse l'ordre sur cette route. */
  factures(): Promise<FactureTiime[]> {
    return this.toutesLesPages(`/companies/${this.societeId}/invoices`, new URLSearchParams());
  }

  notesFrais(): Promise<NoteFraisTiime[]> {
    const q = new URLSearchParams({ expand: "preview_available", sorts: "date:desc" });
    return this.toutesLesPages(this.compta("/expense_reports"), q, {}, "expense_reports");
  }

  trajets(): Promise<TrajetTiime[]> {
    const q = new URLSearchParams({ with_total_distance: "true", has_existing_travels: "true", sorts: "date:desc" });
    return this.toutesLesPages(this.compta("/travels"), q, {}, "travels");
  }

  private compta(suffixe: string): string {
    return `/accounts/companies/${this.societeId}${suffixe}`;
  }

  private async lire<T>(chemin: string, q?: URLSearchParams, entetes: Record<string, string> = {}): Promise<T> {
    const { corps } = await this.appeler(chemin, q, entetes);
    return corps as T;
  }

  private async toutesLesPages<T>(chemin: string, q: URLSearchParams, entetes: Record<string, string> = {}, enveloppe?: string): Promise<T[]> {
    const tout: T[] = [];
    for (let page = 0; page < PAGES_MAX; page++) {
      const debut = page * TAILLE_PAGE;
      const { corps, entetes: rep } = await this.appeler(chemin, q, { ...entetes, Range: `items=${debut}-${debut + TAILLE_PAGE - 1}` });
      const items = extraireItems<T>(corps, enveloppe);
      tout.push(...items);
      if (!encoreDesPages(rep.get("content-range"), items.length === TAILLE_PAGE)) return tout;
    }
    throw new ErreurTiime("api", `${chemin} : plus de ${PAGES_MAX * TAILLE_PAGE} éléments, synchro interrompue`);
  }

  private async appeler(chemin: string, q: URLSearchParams | undefined, entetes: Record<string, string>): Promise<{ corps: unknown; entetes: Headers }> {
    const url = `${this.apiUrl}${chemin}${q && [...q].length ? `?${q}` : ""}`;
    for (let essai = 0; ; essai++) {
      const jeton = await this.auth.jetonAcces();
      const res = await this.f(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...entetes,
          Authorization: `Bearer ${jeton}`,
          "tiime-app": "tiime",
          "tiime-app-platform": "web",
          "tiime-app-version": this.versionApp,
        },
      });
      if (res.status === 401 && essai === 0) {
        this.auth.invalider();
        continue;
      }
      if (res.status === 204) return { corps: null, entetes: res.headers };
      if (res.status === 404) throw new ErreurTiime("introuvable", `GET ${chemin} : introuvable`, 404);
      if (res.status === 403) throw new ErreurTiime("acces_refuse", `GET ${chemin} : accès refusé par Tiime`, 403);
      if (!res.ok) throw new ErreurTiime("api", `GET ${chemin} : Tiime a répondu ${res.status} ${(await res.text()).slice(0, 200)}`, res.status);
      const texte = await res.text();
      return { corps: texte ? JSON.parse(texte) : null, entetes: res.headers };
    }
  }
}

/** Liste brute, ou liste rangée sous `enveloppe` (`{"transactions": […], "metadata": …}`). 204 → vide. */
export function extraireItems<T>(corps: unknown, enveloppe?: string): T[] {
  if (corps == null) return [];
  if (enveloppe && !Array.isArray(corps)) {
    const v = (corps as Record<string, unknown>)[enveloppe];
    return Array.isArray(v) ? (v as T[]) : [];
  }
  return Array.isArray(corps) ? (corps as T[]) : [];
}

/** `items 0-99/120` → encore ; `items 0-99/*` → encore ; total atteint → fini. Sans en-tête : page pleine = peut-être encore. */
export function encoreDesPages(contentRange: string | null, pagePleine: boolean): boolean {
  const m = contentRange?.match(/items\s+(\d+)-(\d+)\/(\d+|\*)/);
  if (!m) return pagePleine;
  if (m[3] === "*") return true;
  return Number(m[2]) + 1 < Number(m[3]);
}
