import type { NextRequest } from "next/server";
import { majSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return majSession(request);
}

export const config = {
  // Tout sauf les assets statiques.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)"],
};
