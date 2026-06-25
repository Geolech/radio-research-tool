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

// ── KI-Zugänge (Profile, nur lokal gespeichert) ──────────────────────────────
// Mehrere benannte Zugänge mit Anbieter + Key + Modell. Der aktive Zugang
// erzeugt die Sprechtexte; im Betrieb umschaltbar. Keys verlassen das Gerät
// nicht — sie werden nur per Header an den lokalen Server gereicht.

// "custom" = beliebiger OpenAI-kompatibler Endpoint (Infomaniak, lokales LLM
// wie Ollama/LM Studio/vLLM, Groq, Together …) mit frei wählbarer baseUrl.
export type AiProvider = "anthropic" | "openai" | "custom";

export type AiProfile = {
  id: string;
  label: string;
  provider: AiProvider;
  key: string;
  model: string;
  baseUrl?: string; // nur für "custom"
};

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI (GPT)",
  custom: "OpenAI-kompatibel (Custom)",
};

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
  custom: "",
};

const VALID_PROVIDERS: AiProvider[] = ["anthropic", "openai", "custom"];

// Beispiel-Endpunkte als Hilfestellung im UI.
export const CUSTOM_PRESETS: Array<{ label: string; baseUrl: string; model: string }> = [
  { label: "Ollama (lokal)",   baseUrl: "http://localhost:11434/v1", model: "llama3.1" },
  { label: "LM Studio (lokal)", baseUrl: "http://localhost:1234/v1",  model: "local-model" },
  { label: "Infomaniak",        baseUrl: "https://api.infomaniak.com/1/ai/PRODUKT_ID/openai/v1", model: "mixtral" },
];

const PROFILES_KEY = "radio-ai-profiles-v2";
const ACTIVE_KEY   = "radio-ai-active-v2";

export function loadProfiles(): AiProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((p) => p && typeof p.key === "string")
          .map((p) => {
            const provider: AiProvider = VALID_PROVIDERS.includes(p.provider) ? p.provider : "anthropic";
            return {
              id: typeof p.id === "string" ? p.id : crypto.randomUUID(),
              label: typeof p.label === "string" && p.label.trim() ? p.label : "Zugang",
              provider,
              key: p.key,
              model: typeof p.model === "string" && p.model.trim() ? p.model : DEFAULT_MODELS[provider],
              baseUrl: typeof p.baseUrl === "string" ? p.baseUrl : undefined,
            };
          });
      }
    }
    // Migration: alter Einzel-Key → ein Anthropic-Profil
    const legacy = localStorage.getItem(API_KEY_KEY);
    if (legacy && legacy.trim()) {
      const migrated: AiProfile[] = [{
        id: crypto.randomUUID(),
        label: "Anthropic",
        provider: "anthropic",
        key: legacy.trim(),
        model: DEFAULT_MODELS.anthropic,
      }];
      saveProfiles(migrated);
      return migrated;
    }
  } catch { /* ignore */ }
  return [];
}

export function saveProfiles(profiles: AiProfile[]): void {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch { /* ignore */ }
}

export function loadActiveId(): string {
  if (typeof window === "undefined") return "";
  try { return localStorage.getItem(ACTIVE_KEY) ?? ""; } catch { return ""; }
}

export function saveActiveId(id: string): void {
  try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* ignore */ }
}

// Aktives Profil (oder erstes vorhandenes als Fallback)
export function getActiveProfile(): AiProfile | null {
  const profiles = loadProfiles();
  if (profiles.length === 0) return null;
  const id = loadActiveId();
  return profiles.find((p) => p.id === id) ?? profiles[0];
}

export function makeProfile(provider: AiProvider, label: string, key: string, model?: string, baseUrl?: string): AiProfile {
  return {
    id: crypto.randomUUID(),
    label: label.trim() || PROVIDER_LABELS[provider],
    provider,
    key: key.trim(),
    model: model?.trim() || DEFAULT_MODELS[provider],
    baseUrl: provider === "custom" ? (baseUrl?.trim() || undefined) : undefined,
  };
}

// Ein Profil ist „nutzbar", wenn es einen Key hat — oder ein custom-Endpoint
// (lokale LLMs brauchen oft keinen Key).
export function profileUsable(p: AiProfile | null): boolean {
  if (!p) return false;
  if (p.provider === "custom") return !!(p.baseUrl && p.baseUrl.trim());
  return !!p.key;
}

// Header für die Text-Erzeugung (aktiver Zugang).
export function aiHeaders(): Record<string, string> {
  const p = getActiveProfile();
  if (!profileUsable(p) || !p) return {};
  const h: Record<string, string> = {
    "x-ai-provider": p.provider,
    "x-ai-key": p.key || "",
    "x-ai-model": p.model,
  };
  if (p.provider === "custom" && p.baseUrl) h["x-ai-base-url"] = p.baseUrl;
  return h;
}

// Header für die Feed-Suche: braucht zwingend Anthropic (Web-Suche).
// Nimmt den aktiven Zugang, wenn Anthropic, sonst das erste Anthropic-Profil.
export function anthropicKeyForDiscovery(): string {
  const profiles = loadProfiles();
  const active = getActiveProfile();
  if (active && active.provider === "anthropic" && active.key) return active.key;
  const anth = profiles.find((p) => p.provider === "anthropic" && p.key);
  return anth ? anth.key : "";
}

export function discoveryHeader(): Record<string, string> {
  const k = anthropicKeyForDiscovery();
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
