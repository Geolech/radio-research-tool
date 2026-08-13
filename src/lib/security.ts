import path from "path";
import dns from "dns/promises";
import net from "net";
import { NextResponse } from "next/server";

// ── Geräte-IDs ────────────────────────────────────────────────────────────────
// Nur Buchstaben, Ziffern, Bindestrich, Unterstrich (max. 64). Verhindert, dass
// Werte wie "../../etc" in Dateipfade oder Storage-Keys gelangen.
const DEVICE_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export function safeDeviceId(id: unknown): string | null {
  if (typeof id !== "string") return null;
  const trimmed = id.trim();
  return DEVICE_ID_RE.test(trimmed) ? trimmed : null;
}

// ── Pfad-Eingrenzung ──────────────────────────────────────────────────────────
// Setzt einen Pfad aus baseDir + Segmenten zusammen und gibt ihn nur zurück,
// wenn er nachweislich unterhalb von baseDir liegt (sonst null).
export function resolveWithin(baseDir: string, ...segments: string[]): string | null {
  const base = path.resolve(baseDir);
  const target = path.resolve(base, ...segments);
  return target === base || target.startsWith(base + path.sep) ? target : null;
}

// ── SSRF-Schutz ───────────────────────────────────────────────────────────────
function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;               // link-local / Cloud-Metadaten
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;                             // Multicast/reserviert
    return false;
  }
  const low = ip.toLowerCase();
  if (low === "::1" || low === "::") return true;
  if (low.startsWith("fe80")) return true;                // link-local
  if (low.startsWith("fc") || low.startsWith("fd")) return true; // unique local
  if (low.startsWith("::ffff:")) return isPrivateIp(low.slice(7)); // IPv4-mapped
  return false;
}

/**
 * Prüft, dass eine URL öffentlich per http(s) erreichbar ist. Blockiert private
 * und link-local Ziele (inkl. Cloud-Metadaten 169.254.169.254). Wirft bei
 * Verstoß. Hinweis: Schützt nicht gegen DNS-Rebinding (TOCTOU) — für diese App
 * ausreichend, da nur Bilder abgerufen werden.
 */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error("Ungültige URL"); }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("Nur http(s) erlaubt");
  }
  const host = u.hostname;
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Zieladresse nicht erlaubt");
    return u;
  }
  const records = await dns.lookup(host, { all: true });
  if (records.length === 0) throw new Error("Host nicht auflösbar");
  for (const r of records) {
    if (isPrivateIp(r.address)) throw new Error("Zieladresse nicht erlaubt");
  }
  return u;
}

// ── Einheitliche Fehlerantwort ────────────────────────────────────────────────
// Loggt Details serverseitig, gibt dem Client nur eine generische Meldung —
// damit interne Pfade, DB- oder SDK-Details (inkl. evtl. Secrets) nicht leaken.
export function serverError(err: unknown, publicMessage = "Interner Fehler"): NextResponse {
  console.error(err);
  return NextResponse.json({ error: publicMessage }, { status: 500 });
}
