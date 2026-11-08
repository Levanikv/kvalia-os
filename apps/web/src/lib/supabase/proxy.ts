import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

const PUBLIC = ["/connexion", "/manifest.webmanifest"];

/** Rafraîchit la session (cookies) et protège les routes : sans utilisateur → /connexion. */
export async function majSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(aPoser) {
        aPoser.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        aPoser.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Ne rien mettre entre createServerClient et getUser : c'est ce qui rafraîchit le token.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const estPublique = PUBLIC.some((p) => pathname.startsWith(p));

  if (!user && !estPublique) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("suite", pathname);
    return NextResponse.redirect(url);
  }
  if (user && pathname.startsWith("/connexion")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}
