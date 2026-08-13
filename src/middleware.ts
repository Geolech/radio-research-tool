import { NextRequest, NextResponse } from "next/server";

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

  // Bevorzugt Fetch-Metadata (von allen modernen Browsern gesendet)
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite) {
    return secFetchSite === "same-origin" || secFetchSite === "same-site"
      ? NextResponse.next()
      : deny();
  }

  // Fallback: Origin-Host muss zum Request-Host passen
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host === host) return NextResponse.next();
    } catch { /* ungültige Origin */ }
  }

  return deny();
}

function deny() {
  return NextResponse.json(
    { error: "Zugriff nur von der App erlaubt" },
    { status: 403 }
  );
}

export const config = {
  matcher: "/api/:path*",
};
