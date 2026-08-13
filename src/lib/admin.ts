import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "./admin-cookie";

export { ADMIN_COOKIE };

/**
 * Owner-Modus ist nur aktiv, wenn ADMIN_TOKEN gesetzt ist (z. B. auf Vercel).
 * Ohne Token verhält sich die App wie bisher (voller Zugriff) — praktisch für
 * lokale Entwicklung.
 */
export function adminEnabled(): boolean {
  return !!process.env.ADMIN_TOKEN;
}

/** Server-seitige Owner-Prüfung (in Server Components / Route Handlern). */
export async function isAdmin(): Promise<boolean> {
  if (!adminEnabled()) return true;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token === process.env.ADMIN_TOKEN;
}
