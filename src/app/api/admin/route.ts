import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin";

// Owner-Login: Token prüfen und als httpOnly-Cookie setzen. Von der Middleware
// vom Admin-Gate ausgenommen (sonst käme man nie rein), aber Same-Origin bleibt
// erforderlich.
export async function POST(req: NextRequest) {
  const configured = process.env.ADMIN_TOKEN;
  if (!configured) {
    return NextResponse.json({ error: "Owner-Modus ist nicht konfiguriert" }, { status: 400 });
  }

  let token = "";
  try {
    ({ token } = await req.json());
  } catch {
    return NextResponse.json({ error: "Token fehlt" }, { status: 400 });
  }

  if (typeof token !== "string" || token !== configured) {
    return NextResponse.json({ error: "Falsches Token" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, configured, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 Tage
  });
  return res;
}

// Owner-Logout: Cookie löschen.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
