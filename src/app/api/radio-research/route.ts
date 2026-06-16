import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getAnthropicApiKeyFromRequest } from "@/lib/get-api-key";

const MODEL = "claude-sonnet-4-6";
const AI_TIMEOUT_MS = 30_000;

// ── Retry helper ─────────────────────────────────────────────────────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 4,
  baseDelayMs = 15_000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isOverloaded = err instanceof Anthropic.APIError && err.status === 529;
      const isRateLimit  = err instanceof Anthropic.APIError && err.status === 429;
      if ((isOverloaded || isRateLimit) && attempt < maxAttempts) {
        const delay = baseDelayMs * attempt;
        console.warn(`[radio-research] API ${(err as InstanceType<typeof Anthropic.APIError>).status} – Versuch ${attempt}/${maxAttempts}. Warte ${delay / 1000}s…`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

// ── Shared types ─────────────────────────────────────────────────────────────
export type NewsItem = {
  rank: number;
  headline: string;
  radio_text: string;
  sources: string[];
  source_count: number;
  validated: boolean;
  source_type: "rss" | "web" | "verified";
  url?: string;
};

export type RadioResearchResult = {
  welt: NewsItem[];
  national: NewsItem[];
  regional: NewsItem[];
  searched_at: string;
  region: string;
  mode: "rss" | "web";
};

// ── Sprechtext-Regeln ─────────────────────────────────────────────────────────
const SPEECH_RULES = `RADIO-SPRECHTEXT-REGELN:
- Gesprochene Sprache, keine Abkürzungen
- Zahlen vollständig ausschreiben (drei Milliarden, nicht 3 Mrd.)
- Genau 3 Sätze: Satz 1 nennt das Wichtigste. Satz 2 liefert Kontext oder Hintergrund. Satz 3 gibt ein weiteres Detail oder eine Einordnung — KEIN Quellenhinweis, die Quelle wird separat angezeigt.
- Präsens oder Perfekt, nie Futur für Vergangenes
- Neutral und sachlich`;


// ════════════════════════════════════════════════════════════════════════════
// MODE A: RSS-only
//   Ranking & Kategorisierung: algorithmisch im Client (kein API-Call)
//   Dieser Schritt: Sprechtext nur für übergebene Top-Items
// ════════════════════════════════════════════════════════════════════════════

// Sprechtexte für übergebene Items generieren
async function rssStep2GenerateTexts(
  client: Anthropic,
  items: Array<{ category: string; rank: number; headline: string; sources: string[] }>
): Promise<Array<{ category: string; rank: number; radio_text: string }>> {

  const system = `Du bist Radiosprecher-Texter.
${SPEECH_RULES}
Antworte NUR mit validem JSON-Array.`;

  const itemList = items.map((it, i) =>
    `${i + 1}. [${it.category}] Rang ${it.rank}: "${it.headline}" (Quelle: ${it.sources.join(", ")})`
  ).join("\n");

  const prompt = `Schreibe für jede der folgenden Meldungen einen fertigen Radio-Sprechtext.

${itemList}

Format:
[
  {"category":"Welt","rank":1,"radio_text":"Was ist passiert. Kontext oder Hintergrund. Weiteres Detail oder Einordnung."},
  ...
]`;

  const messages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: prompt }];

  const response = await withRetry(() =>
    client.messages.create({ model: MODEL, max_tokens: 2000, system, messages })
  );

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return [];

  // Robustes Parsing: JSON-Array aus dem Text extrahieren
  const text = block.text;
  const stripped = text.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();
  const arrMatch = (stripped.match(/\[[\s\S]*\]/) ?? text.match(/\[[\s\S]*\]/));
  if (!arrMatch) return [];
  try {
    return JSON.parse(arrMatch[0]);
  } catch {
    return [];
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const {
      step = "texts",
      itemsForText = [],
    }: {
      step?: string;
      itemsForText?: Array<{ category: string; rank: number; headline: string; sources: string[] }>;
    } = await req.json();

    const client = new Anthropic({ apiKey: getAnthropicApiKeyFromRequest(req) });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), AI_TIMEOUT_MS)
    );

    const researchPromise = (async () => {
      if (step === "texts") {
        const texts = await rssStep2GenerateTexts(client, itemsForText);
        return NextResponse.json({ texts, step: "texts" });
      }
      return NextResponse.json({ error: "Unbekannter step" }, { status: 400 });
    })();

    return await Promise.race([researchPromise, timeoutPromise]);

  } catch (err) {
    const isTimeout    = err instanceof Error && err.message === "TIMEOUT";
    const isOverloaded = err instanceof Anthropic.APIError && err.status === 529;
    const rawPreview   = (err as { rawPreview?: string }).rawPreview;
    const message = isTimeout
      ? `Zeitüberschreitung nach ${AI_TIMEOUT_MS / 1000}s. Bitte erneut versuchen.`
      : isOverloaded
      ? "Die KI-API ist überlastet (529). Bitte in 1–2 Minuten erneut versuchen."
      : err instanceof Error ? err.message : "Fehler bei der Recherche";
    return NextResponse.json(
      { error: message, ...(rawPreview ? { rawPreview } : {}) },
      { status: isTimeout ? 504 : isOverloaded ? 503 : 500 }
    );
  }
}
