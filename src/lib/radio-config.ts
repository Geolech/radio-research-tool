import { RSS_FEEDS } from "@/lib/rss-feeds";

// ── Nutzerverwaltete Konfiguration (localStorage) ─────────────────────────────
// Region und RSS-Feeds sind nicht mehr fest im Code, sondern pro Browser
// editierbar. So lässt sich das Tool auch von Campusradios an anderen
// Standorten nutzen. Die OWL-Feeds aus rss-feeds.ts dienen nur noch als
// Voreinstellung (Seed), wenn noch nichts gespeichert ist.

export type FeedCategory = "regional-official" | "regional-media" | "education";

export type RadioFeed = {
  id: string;
  name: string;
  url: string;
  category: FeedCategory;
  enabled: boolean;
};

const REGION_KEY  = "radio-region-v1";
const FEEDS_KEY   = "radio-feeds-v1";
const API_KEY_KEY = "radio-anthropic-key-v1";

export const DEFAULT_REGION = "OWL, Kreis Lippe, Detmold";

// ── Seed aus den statischen Default-Feeds ─────────────────────────────────────
// primär + sekundär aktiv, deep deaktiviert (spiegelt das bisherige
// Default-Verhalten ohne Deep Search).
export function seedFeedsFromDefaults(): RadioFeed[] {
  return RSS_FEEDS.map((f) => ({
    id: f.id,
    name: f.name,
    url: f.url,
    category: f.category as FeedCategory,
    enabled: f.priority !== "deep",
  }));
}

// ── Region ────────────────────────────────────────────────────────────────────
export function loadRegion(): string {
  if (typeof window === "undefined") return DEFAULT_REGION;
  try {
    const raw = localStorage.getItem(REGION_KEY);
    return raw && raw.trim() ? raw : DEFAULT_REGION;
  } catch {
    return DEFAULT_REGION;
  }
}

export function saveRegion(region: string): void {
  try { localStorage.setItem(REGION_KEY, region); } catch { /* ignore */ }
}

// ── Feeds ───────────────────────────────────────────────────────────────────
export function loadFeeds(): RadioFeed[] {
  if (typeof window === "undefined") return seedFeedsFromDefaults();
  try {
    const raw = localStorage.getItem(FEEDS_KEY);
    if (!raw) return seedFeedsFromDefaults();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return seedFeedsFromDefaults();
    // Minimale Validierung / Normalisierung
    return parsed
      .filter((f) => f && typeof f.url === "string")
      .map((f) => ({
        id: typeof f.id === "string" ? f.id : crypto.randomUUID(),
        name: typeof f.name === "string" && f.name.trim() ? f.name : f.url,
        url: f.url,
        category: (["regional-official", "regional-media", "education"].includes(f.category)
          ? f.category
          : "regional-media") as FeedCategory,
        enabled: f.enabled !== false,
      }));
  } catch {
    return seedFeedsFromDefaults();
  }
}

export function saveFeeds(feeds: RadioFeed[]): void {
  try { localStorage.setItem(FEEDS_KEY, JSON.stringify(feeds)); } catch { /* ignore */ }
}

// ── Anthropic-API-Key (nur lokal gespeichert) ────────────────────────────────
// Wird per Header an den lokalen Server gereicht; verlässt das Gerät nicht.
export function loadApiKey(): string {
  if (typeof window === "undefined") return "";
  try { return localStorage.getItem(API_KEY_KEY) ?? ""; } catch { return ""; }
}

export function saveApiKey(key: string): void {
  try { localStorage.setItem(API_KEY_KEY, key.trim()); } catch { /* ignore */ }
}

// Header-Objekt für fetch-Aufrufe an KI-Routen.
export function apiKeyHeader(): Record<string, string> {
  const k = loadApiKey();
  return k ? { "x-anthropic-key": k } : {};
}

// ── Helfer: neuen Feed erzeugen ───────────────────────────────────────────────
export function makeFeed(
  url: string,
  name?: string,
  category: FeedCategory = "regional-media"
): RadioFeed {
  const clean = url.trim();
  return {
    id: crypto.randomUUID(),
    name: name?.trim() || clean,
    url: clean,
    category,
    enabled: true,
  };
}
