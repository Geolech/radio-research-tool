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
