import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { getAiProviderFromRequest, type AiProviderConfig } from "@/lib/get-api-key";

const AI_TIMEOUT_MS = 45_000;

// ── Retry helper (anbieterübergreifend: 529/429) ──────────────────────────────
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 4, baseDelayMs = 12_000): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { status?: number })?.status ?? 0;
      if ((status === 529 || status === 429) && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
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
  description?: string; // RSS-Kurztext als inhaltliche Grundlage der Sprechtext-Erzeugung
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
- QUELLENTREUE (WICHTIGSTE REGEL): Nutze AUSSCHLIESSLICH die zur jeweiligen Meldung gegebenen Informationen (Überschrift + Kurztext). Erfinde KEINE Fakten, Zahlen, Namen, Orte, Zitate oder Details, die dort nicht stehen. Wenn Informationen fehlen, formuliere allgemeiner oder lass den Punkt weg — niemals dazudichten. Nicht spekulieren, nicht abstrahieren.
- Gesprochene Sprache, keine Abkürzungen
- Zahlen vollständig ausschreiben (drei Milliarden, nicht 3 Mrd.)
- In der Regel 4 vollständige Sätze; schöpfe die im Kurztext genannten Details voll aus (Satz 1: Kern · Satz 2: Kontext · Satz 3: Hintergrund · Satz 4: weiteres Detail/Einordnung). Erfinde dabei nichts dazu — wenn der Kurztext für 4 Sätze nicht genug hergibt, lieber weniger Sätze als erfundene Inhalte. KEIN Quellenhinweis (die Quelle wird separat angezeigt).
- Präsens oder Perfekt, nie Futur für Vergangenes
- Neutral und sachlich, nah am Wortlaut der Quelle`;

// ── Modellaufruf je Anbieter → liefert reinen Text ────────────────────────────
async function callModel(cfg: AiProviderConfig, system: string, prompt: string): Promise<string> {
  // OpenAI sowie jeder OpenAI-kompatible Custom-Endpoint (Infomaniak, lokales LLM …)
  if (cfg.provider === "openai" || cfg.provider === "custom") {
    const client = new OpenAI({
      apiKey: cfg.key,
      ...(cfg.provider === "custom" && cfg.baseUrl ? { baseURL: cfg.baseUrl } : {}),
    });
    const res = await withRetry(() =>
      client.chat.completions.create({
        model: cfg.model,
        max_tokens: 2000,
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      })
    );
    return res.choices[0]?.message?.content ?? "";
  }

  // anthropic (Default)
  const client = new Anthropic({ apiKey: cfg.key });
  const res = await withRetry(() =>
    client.messages.create({
      model: cfg.model,
      max_tokens: 2000,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: prompt }],
    })
  );
  const block = res.content.find((b) => b.type === "text");
  return block?.type === "text" ? block.text : "";
}

// ── Sprechtexte für übergebene Items generieren ───────────────────────────────
async function generateTexts(
  cfg: AiProviderConfig,
  items: Array<{ category: string; rank: number; headline: string; sources: string[]; summary?: string }>
): Promise<Array<{ category: string; rank: number; radio_text: string }>> {

  const system = `Du bist Radiosprecher-Texter. Du formulierst gegebene Meldungen in Radiosprache um — du recherchierst NICHT und fügst NICHTS hinzu.
${SPEECH_RULES}
Antworte NUR mit validem JSON-Array.`;

  const itemList = items.map((it, i) =>
    `${i + 1}. [${it.category}] Rang ${it.rank}\n   Überschrift: "${it.headline}"\n   Quelle: ${it.sources.join(", ")}` +
    (it.summary && it.summary.trim()
      ? `\n   Kurztext (einzige inhaltliche Grundlage): ${it.summary.trim()}`
      : `\n   Kurztext: (keiner — nur die Überschrift verwenden, nichts ergänzen)`)
  ).join("\n\n");

  const prompt = `Formuliere für jede der folgenden Meldungen einen fertigen Radio-Sprechtext — ausschließlich auf Basis von Überschrift und Kurztext. Nichts hinzuerfinden.

${itemList}

Format (nur JSON, radio_text nah am Kurztext):
[
  {"category":"Regional","rank":1,"radio_text":"…"},
  ...
]`;

  const text = await callModel(cfg, system, prompt);
  if (!text) return [];

  // Robustes Parsing: JSON-Array aus dem Text extrahieren
  const stripped = text.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();
  const arrMatch = stripped.match(/\[[\s\S]*\]/) ?? text.match(/\[[\s\S]*\]/);
  if (!arrMatch) return [];
  try {
    return JSON.parse(arrMatch[0]);
  } catch {
    return [];
  }
}

// ── Quellenabgleich: sucht Aussagen im Sprechtext ohne Deckung im Kurztext ────
async function verifyAgainstSource(
  cfg: AiProviderConfig,
  headline: string,
  summary: string,
  radioText: string
): Promise<string[]> {
  const system = `Du bist Faktenprüfer für Radio-Nachrichten. Du vergleichst einen Sprechtext mit seiner Quelle und suchst NUR nach Aussagen im Sprechtext, die NICHT durch die Quelle gedeckt sind (erfundene Fakten, Zahlen, Namen, Orte, Zitate, Datumsangaben, Kausalitäten). Umformulierungen, Zusammenfassungen und Auslassungen sind KEIN Problem — nur inhaltliche Erfindungen/Abweichungen zählen.
Antworte NUR mit validem JSON: {"issues": ["…", "…"]} — leeres Array, wenn alles durch die Quelle gedeckt ist.`;

  const prompt = `QUELLE:
Überschrift: "${headline}"
Kurztext: ${summary || "(kein Kurztext vorhanden)"}

SPRECHTEXT (zu prüfen):
${radioText}

Liste alle Aussagen im Sprechtext, die nicht durch die Quelle gedeckt sind.`;

  const text = await callModel(cfg, system, prompt);
  if (!text) return [];
  const stripped = text.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();
  const objMatch = stripped.match(/\{[\s\S]*\}/) ?? text.match(/\{[\s\S]*\}/);
  if (!objMatch) return [];
  try {
    const parsed = JSON.parse(objMatch[0]);
    return Array.isArray(parsed.issues) ? parsed.issues.filter((x: unknown): x is string => typeof x === "string") : [];
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
      verifyHeadline = "",
      verifySummary = "",
      verifyRadioText = "",
    }: {
      step?: string;
      itemsForText?: Array<{ category: string; rank: number; headline: string; sources: string[]; summary?: string }>;
      verifyHeadline?: string;
      verifySummary?: string;
      verifyRadioText?: string;
    } = await req.json();

    const cfg = getAiProviderFromRequest(req);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), AI_TIMEOUT_MS)
    );

    const researchPromise = (async () => {
      if (step === "test") {
        // Minimaler Verbindungstest: prüft, ob der Anbieter überhaupt antwortet.
        const sample = await callModel(
          cfg,
          "Du bist ein Verbindungstest. Antworte in genau einem kurzen Satz.",
          "Bestätige kurz, dass du erreichbar bist."
        );
        if (!sample.trim()) {
          return NextResponse.json({ error: "Keine Rückantwort von der KI erhalten." }, { status: 502 });
        }
        return NextResponse.json({ ok: true, sample: sample.trim().slice(0, 160) });
      }
      if (step === "texts") {
        let texts = await generateTexts(cfg, itemsForText);
        // Kleine Modelle liefern nicht immer sauberes JSON → ein Nachversuch,
        // wenn die erste Antwort leer geparst wurde.
        if (texts.length === 0 && itemsForText.length > 0) {
          texts = await generateTexts(cfg, itemsForText);
        }
        return NextResponse.json({ texts, step: "texts" });
      }
      if (step === "verify") {
        if (!verifyRadioText.trim()) {
          return NextResponse.json({ error: "Kein Sprechtext zum Prüfen übergeben." }, { status: 400 });
        }
        const issues = await verifyAgainstSource(cfg, verifyHeadline, verifySummary, verifyRadioText);
        return NextResponse.json({ issues });
      }
      return NextResponse.json({ error: "Unbekannter step" }, { status: 400 });
    })();

    return await Promise.race([researchPromise, timeoutPromise]);

  } catch (err) {
    const isTimeout    = err instanceof Error && err.message === "TIMEOUT";
    const status       = (err as { status?: number })?.status ?? 0;
    const isOverloaded = status === 529;
    const message = isTimeout
      ? `Zeitüberschreitung nach ${AI_TIMEOUT_MS / 1000}s. Bitte erneut versuchen.`
      : isOverloaded
      ? "Die KI-API ist überlastet (529). Bitte in 1–2 Minuten erneut versuchen."
      : err instanceof Error ? err.message : "Fehler bei der Recherche";
    return NextResponse.json(
      { error: message },
      { status: isTimeout ? 504 : isOverloaded ? 503 : 500 }
    );
  }
}
