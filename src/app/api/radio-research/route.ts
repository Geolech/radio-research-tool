import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getAnthropicApiKey } from "@/lib/get-api-key";
import type { RSSItem } from "@/app/api/fetch-rss/route";

const MODEL = "claude-sonnet-4-6";

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
      const isOverloaded =
        err instanceof Anthropic.APIError && err.status === 529;
      const isRateLimit =
        err instanceof Anthropic.APIError && err.status === 429;

      if ((isOverloaded || isRateLimit) && attempt < maxAttempts) {
        const delay = baseDelayMs * attempt; // 15s, 30s, 45s
        console.warn(
          `[radio-research] API ${err.status} – Versuch ${attempt}/${maxAttempts}. Warte ${delay / 1000}s…`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}
const TOOLS = [{ type: "web_search_20250305" as const, name: "web_search" as const }];

const SYSTEM = `Du bist ein erfahrener Radiojournalist und Nachrichtenredakteur für eine deutsche Lokalredaktion in Ostwestfalen-Lippe (OWL).

AUFTRAG: Wähle die jeweils 3 wichtigsten Nachrichten pro Kategorie aus und formuliere sie als fertigen Radio-Sprechtext.

KATEGORIEN:
- "Welt": Internationale Meldungen
- "National": Deutschland-weite Meldungen
- "Regional": Meldungen aus OWL / Kreis Lippe / Kreis Höxter / NRW

QUELLENVALIDIERUNG: Für jede Meldung müssen MINDESTENS 2 unabhängige Quellen vorliegen.
- Prüfe ob dieselbe Nachricht in mehreren Quellen erscheint
- "validated": true nur bei ≥ 2 unabhängigen Quellen
- Gib exakte Quellennamen an (z.B. "tagesschau.de", "spiegel.de", "Stadt Lemgo")

RADIO-SPRECHTEXT-REGELN:
- Gesprochene Sprache, keine Abkürzungen
- Zahlen vollständig ausschreiben (drei Milliarden, nicht 3 Mrd.)
- Maximal 3 Sätze pro Meldung
- Präsens oder Perfekt, nie Futur für Vergangenes
- Neutral und sachlich
- Am Ende jede Meldung mit Quellenhinweis: "Das meldet [Quelle]."

Antworte NUR mit validem JSON – kein Markdown, keine Codeblöcke.`;

const JSON_FORMAT = `{
  "welt": [
    {
      "rank": 1,
      "headline": "Kurze Überschrift",
      "radio_text": "Vollständiger Sprechtext mit Quellenhinweis am Ende.",
      "sources": ["tagesschau.de", "spiegel.de"],
      "source_count": 2,
      "validated": true
    }
  ],
  "national": [ /* same structure, exactly 3 items */ ],
  "regional": [ /* same structure, exactly 3 items */ ]
}`;

export type NewsItem = {
  rank: number;
  headline: string;
  radio_text: string;
  sources: string[];
  source_count: number;
  validated: boolean;
};

export type RadioResearchResult = {
  welt: NewsItem[];
  national: NewsItem[];
  regional: NewsItem[];
  searched_at: string;
  region: string;
};

function parseResult(text: string): Omit<RadioResearchResult, "searched_at" | "region"> | null {
  // Strip markdown code fences if present
  const stripped = text
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();

  // Try the stripped version first, then fall back to the first {...} block
  const blockMatch = text.match(/\{[\s\S]*\}/);
  const candidates: string[] = [stripped, ...(blockMatch ? [blockMatch[0]] : [])].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const data = JSON.parse(candidate);
      if (data && (data.welt || data.national || data.regional)) {
        return {
          welt: data.welt ?? [],
          national: data.national ?? [],
          regional: data.regional ?? [],
        };
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

function formatRSSContext(items: RSSItem[]): string {
  if (items.length === 0) return "";
  const lines = items.map((item) => {
    const date = item.pubDateIso ? new Date(item.pubDateIso).toLocaleString("de-DE") : "unbekannt";
    return `[${item.feedName}] ${item.title} (${date})\n${item.description}`;
  });
  return `\n\n=== BEREITS VORLIEGENDE MELDUNGEN AUS RSS-FEEDS ===\n${lines.join("\n\n---\n")}`;
}

export async function POST(req: NextRequest) {
  try {
    const {
      webSources,
      region,
      rssItems = [],
    }: { webSources: string[]; region: string; rssItems?: RSSItem[] } = await req.json();

    const client = new Anthropic({ apiKey: getAnthropicApiKey() });

    const rssContext = formatRSSContext(rssItems);
    const regionClause = region?.trim()
      ? `Die Region für "Regional"-Meldungen ist: "${region}".`
      : 'Die Region für "Regional"-Meldungen ist: OWL / Ostwestfalen-Lippe.';

    const webSourceList =
      webSources.length > 0
        ? `Zu durchsuchende Web-Quellen: ${webSources.join(", ")}`
        : "Durchsuche allgemeine deutschsprachige Nachrichtenquellen.";

    const userPrompt = `Recherchiere aktuelle Nachrichten und erstelle ein Nachrichtenbulletin.

${regionClause}
${webSourceList}${rssContext}

AUFGABE:
1. Nutze die Web-Suche für Welt- und National-Nachrichten sowie zur Ergänzung regionaler Meldungen
2. Die RSS-Feed-Meldungen (falls vorhanden) sind wertvoller Input für die Regional-Kategorie
3. Wähle die 3 WICHTIGSTEN Meldungen pro Kategorie aus
4. Validiere jede Meldung mit mindestens 2 unabhängigen Quellen
5. Formuliere fertigen Radio-Sprechtext

WICHTIG: Das Ergebnis muss EXAKT 3 Meldungen pro Kategorie enthalten.

Antworte ausschließlich in diesem JSON-Format:
${JSON_FORMAT}`;

    const messages: Anthropic.Messages.MessageParam[] = [
      { role: "user", content: userPrompt },
    ];

    // ── Phase 1: Web-Suche (Tool-Loop) ──────────────────────────────────────
    let response = await withRetry(() =>
      client.messages.create({
        model: MODEL,
        max_tokens: 3000,
        system: SYSTEM,
        tools: TOOLS,
        messages,
      })
    );

    let rounds = 0;
    while (response.stop_reason === "tool_use" && rounds < 6) {
      rounds++;
      const ac = response.content;
      const toolResults = ac
        .filter((b) => b.type === "tool_use")
        .map((b) => ({
          type: "tool_result" as const,
          tool_use_id: (b as Anthropic.ToolUseBlock).id,
          content: "",
        }));
      messages.push({ role: "assistant", content: ac });
      messages.push({
        role: "user",
        content: [
          ...toolResults,
          {
            type: "text" as const,
            text:
              rounds >= 5
                ? "Recherche abgeschlossen. Gib jetzt nur das JSON aus."
                : "Weitersuchen bis du genug Quellen hast, dann JSON ausgeben.",
          },
        ],
      });
      response = await withRetry(() =>
        client.messages.create({
          model: MODEL,
          max_tokens: 3000,
          system: SYSTEM,
          tools: TOOLS,
          messages,
        })
      );
    }

    // ── Phase 2: JSON-Extraktion (Prefill, ohne Tools) ───────────────────────
    // Check if the model already returned valid JSON
    const inlineText = response.content.find((b) => b.type === "text");
    let parsed = inlineText?.type === "text" ? parseResult(inlineText.text) : null;

    if (!parsed) {
      // Force JSON via assistant prefill – the model MUST continue from "{"
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content:
          "Recherche ist fertig. Antworte jetzt AUSSCHLIESSLICH mit dem JSON-Objekt. Kein Text davor oder danach.",
      });
      // Prefill: model continues from "{"
      messages.push({ role: "assistant", content: "{" });

      const jsonResponse = await withRetry(() =>
        client.messages.create({
          model: MODEL,
          max_tokens: 3000,
          system: SYSTEM,
          // No tools – pure JSON extraction
          messages,
        })
      );

      const jsonBlock = jsonResponse.content.find((b) => b.type === "text");
      if (jsonBlock?.type === "text") {
        // Prepend the prefilled "{" that the model continued from
        parsed = parseResult("{" + jsonBlock.text);
      }
    }

    if (!parsed) {
      const rawText = inlineText?.type === "text" ? inlineText.text.slice(0, 600) : "(kein Text)";
      console.error("[radio-research] Parse failed. Raw:", rawText);
      return NextResponse.json(
        { error: "Antwort konnte nicht geparst werden", rawPreview: rawText },
        { status: 500 }
      );
    }

    const result: RadioResearchResult = {
      ...parsed,
      searched_at: new Date().toISOString(),
      region: region?.trim() || "OWL",
    };

    return NextResponse.json(result);
  } catch (err) {
    const isOverloaded = err instanceof Anthropic.APIError && err.status === 529;
    const message = isOverloaded
      ? "Die KI-API ist momentan überlastet (529). Bitte in 1–2 Minuten erneut versuchen."
      : err instanceof Error
      ? err.message
      : "Fehler bei der Recherche";
    return NextResponse.json({ error: message }, { status: isOverloaded ? 503 : 500 });
  }
}
