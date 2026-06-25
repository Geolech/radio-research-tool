import fs from "fs";
import path from "path";

export function getAnthropicApiKey(): string {
  // Erst Standard-Umgebungsvariable versuchen
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;

  // Fallback: .env.local direkt einlesen (nötig bei Pfaden mit Leerzeichen)
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const content = fs.readFileSync(envPath, "utf-8");
    const match = content.match(/^ANTHROPIC_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  } catch {
    // Datei nicht gefunden
  }

  throw new Error("ANTHROPIC_API_KEY nicht gefunden");
}

// In der Desktop-/Standalone-App gibt es keine Server-Umgebungsvariable: Der
// Nutzer trägt seinen Key in der App ein, der dann per Request-Header
// (x-anthropic-key) an den lokalen Server gereicht wird. Reihenfolge:
// 1) Header (eigener Key der Redaktion), 2) Server-Env / .env.local (Dev).
export function getAnthropicApiKeyFromRequest(req: Request): string {
  const headerKey = req.headers.get("x-anthropic-key")?.trim();
  if (headerKey) return headerKey;
  return getAnthropicApiKey();
}

// ── Auswählbarer KI-Anbieter (Text-Erzeugung) ─────────────────────────────────
// Der aktive Zugang aus der App wird per Header übergeben:
//   x-ai-provider (anthropic|openai|custom), x-ai-key, x-ai-model, x-ai-base-url
// "custom" = beliebiger OpenAI-kompatibler Endpoint (Infomaniak, lokales LLM …).
export type AiProviderConfig = {
  provider: "anthropic" | "openai" | "custom";
  key: string;
  model: string;
  baseUrl?: string;
};

export function getAiProviderFromRequest(req: Request): AiProviderConfig {
  const raw = req.headers.get("x-ai-provider")?.trim();
  const provider: AiProviderConfig["provider"] =
    raw === "openai" ? "openai" : raw === "custom" ? "custom" : "anthropic";
  const headerKey = req.headers.get("x-ai-key")?.trim();
  const baseUrl = req.headers.get("x-ai-base-url")?.trim() || undefined;
  const model = req.headers.get("x-ai-model")?.trim()
    || (provider === "anthropic" ? "claude-sonnet-4-6" : provider === "openai" ? "gpt-4o" : "");

  // Key: Header zuerst; für Anthropic Fallback auf Env/.env.local (Dev).
  let key = headerKey ?? "";
  if (!key && provider === "anthropic") {
    try { key = getAnthropicApiKey(); } catch { key = ""; }
  }

  // custom: braucht zwingend eine Endpoint-URL; Key optional (lokale LLMs).
  if (provider === "custom") {
    if (!baseUrl) throw new Error("Kein Endpoint (Base-URL) für den Custom-Zugang hinterlegt (Menü → KI-Zugänge).");
    if (!model)   throw new Error("Kein Modellname für den Custom-Zugang hinterlegt (Menü → KI-Zugänge).");
    return { provider, key: key || "no-key", model, baseUrl };
  }

  if (!key) {
    throw new Error(
      provider === "openai"
        ? "Kein OpenAI-API-Key hinterlegt (Menü → KI-Zugänge)."
        : "Kein Anthropic-API-Key hinterlegt (Menü → KI-Zugänge)."
    );
  }
  return { provider, key, model };
}
