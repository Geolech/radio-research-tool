import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-cookie";

// Zustandsändernde /api-Aufrufe (POST/PUT/PATCH/DELETE) nur von der eigenen
// Origin zulassen. Blockiert Cross-Origin-Missbrauch und naive Skripte gegen die
// kostenpflichtigen KI-Endpunkte, ohne die eigene (Same-Origin-)Frontend-Fetches
// zu stören.
//
// Kein vollwertiger Auth-Ersatz: Ein Angreifer kann Header mit curl fälschen.
// Für echten Schutz zusätzlich in Vercel "Deployment Protection" aktivieren.
export function middleware(req: NextRequest) {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return NextResponse.next();
  }

  // 1) Same-Origin-Prüfung für alle zustandsändernden Aufrufe
  if (!isSameOrigin(req)) {
    return deny("Zugriff nur von der App erlaubt");
  }

  // 2) Owner-Gate: Schreiben/KI nur mit gültigem Owner-Cookie.
  //    Nur aktiv, wenn ADMIN_TOKEN gesetzt ist. /api/admin (Login) ausgenommen.
  const adminToken = process.env.ADMIN_TOKEN;
  const isLogin = req.nextUrl.pathname === "/api/admin";
  if (adminToken && !isLogin) {
    const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
    if (cookie !== adminToken) {
      return deny("Nur der Owner darf Änderungen vornehmen");
    }
  }

  return NextResponse.next();
}

function isSameOrigin(req: NextRequest): boolean {
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite) {
    return secFetchSite === "same-origin" || secFetchSite === "same-site";
  }
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host) {
    try { return new URL(origin).host === host; } catch { return false; }
  }
  return false;
}

function deny(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

export const config = {
  matcher: "/api/:path*",
};
