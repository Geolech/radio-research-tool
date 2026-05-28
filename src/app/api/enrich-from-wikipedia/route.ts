import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getAnthropicApiKey } from "@/lib/get-api-key";

const UA = "HifiCatalogApp/1.0 (educational project; contact via hifi-app)";

// ─── Wikipedia helpers ────────────────────────────────────────────────────────

interface WikiSearchHit {
  title: string;
  snippet: string;
}

async function searchWikipedia(lang: string, query: string): Promise<WikiSearchHit[]> {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?` +
    new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      srlimit: "5",
      format: "json",
      origin: "*",
    });
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data?.query?.search ?? [];
}

async function fetchArticleText(lang: string, title: string): Promise<string | null> {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?` +
    new URLSearchParams({
      action: "query",
      prop: "extracts",
      titles: title,
      explaintext: "true",
      exsectionformat: "plain",
      format: "json",
      origin: "*",
    });
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages ?? {};
  const page = Object.values(pages)[0] as { extract?: string; missing?: string };
  if (page?.missing !== undefined || !page?.extract) return null;
  // Limit to ~8000 chars to keep Claude input cost low
  return page.extract.slice(0, 8000);
}

function articlePageUrl(lang: string, title: string) {
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

// Significant model words (length > 1, filters out roman numeral "I" but keeps "II", "IV" etc.)
function modelWords(model: string): string[] {
  return model.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
}

// Check if article text is relevant: brand + ALL significant model words must appear
function isRelevant(text: string, brand: string, model: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes(brand.toLowerCase()) &&
    modelWords(model).every((w) => t.includes(w))
  );
}

// Check if a search-hit title specifically mentions the model (strong signal: product article)
function isTitleRelevant(title: string, model: string): boolean {
  const t = title.toLowerCase();
  return modelWords(model).some((w) => t.includes(w));
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { brand, model, category, existingDescription, existingSpecs } = (await req.json()) as {
      brand: string;
      model: string;
      category?: string;
      existingDescription?: string;
      existingSpecs?: Record<string, string>;
    };
    if (!brand || !model) {
      return NextResponse.json({ error: "brand und model erforderlich" }, { status: 400 });
    }

    const query = `${brand} ${model}`;

    // ── 1. Search DE Wikipedia first, then EN ─────────────────────────────────
    let articleText: string | null = null;
    let articleTitle = "";
    let articleLang = "de";

    for (const lang of ["de", "en"]) {
      const hits = await searchWikipedia(lang, query);
      if (hits.length === 0) continue;

      // Prefer hits whose title specifically names the model, fall back to snippet+title match
      const best =
        hits.find((h) => isTitleRelevant(h.title, model)) ??
        hits.find((h) => isRelevant(h.title + " " + h.snippet, brand, model));

      if (!best) continue; // no plausible hit in this language → try next

      const text = await fetchArticleText(lang, best.title);
      if (text && isRelevant(text, brand, model)) {
        articleText = text;
        articleTitle = best.title;
        articleLang = lang;
        break;
      }
    }

    if (!articleText) {
      return NextResponse.json(
        { error: `Kein passender Wikipedia-Artikel für „${query}" gefunden.` },
        { status: 404 }
      );
    }

    // ── 2. Claude: extract description + specs from article text ──────────────
    // (No web search needed – article text is already provided)
    const client = new Anthropic({ apiKey: getAnthropicApiKey(), timeout: 20000 });

    const langNote = articleLang === "en"
      ? "Der Text ist auf Englisch – bitte Beschreibung und Spezifikationen auf Deutsch ausgeben."
      : "";

    const hasExisting = !!(existingDescription?.trim() || (existingSpecs && Object.keys(existingSpecs).length > 0));

    const existingBlock = hasExisting
      ? `\n=== Bereits vorhandene Daten (aus Webrecherche) ===\nBeschreibung: ${existingDescription ?? "(keine)"}\nSpezifikationen: ${JSON.stringify(existingSpecs ?? {}, null, 2)}\n=== Ende vorhandene Daten ===\n`
      : "";

    const taskDescription = hasExisting
      ? `Reichere die vorhandene Beschreibung mit zusätzlichen Informationen aus dem Wikipedia-Artikel an und ergänze fehlende Spezifikationen.`
      : `Extrahiere aus dem folgenden Wikipedia-Artikel über „${brand} ${model}" eine sachliche Gerätebeschreibung und technische Spezifikationen.`;

    const descriptionRule = hasExisting
      ? `- Beschreibung: Fasse vorhandene Infos und Wikipedia-Infos zu 3–4 sachlichen Sätzen zusammen – keine Wiederholungen, kein Marketing`
      : `- Beschreibung: 2–3 sachliche Sätze über das Gerät und seine Besonderheiten – kein Marketing, keine Floskeln`;

    const specsRule = hasExisting
      ? `- Specs: Behalte alle vorhandenen Specs, ergänze fehlende Werte aus Wikipedia (4–12 Einträge gesamt)`
      : `- Specs: 4–10 technische Werte (Ausgangsleistung, Impedanz, Röhren, Frequenzgang, Abmessungen, Gewicht o. ä.)`;

    const prompt = `Du bist ein HiFi-Redakteur. ${taskDescription}
${langNote}
${existingBlock}
Antworte NUR mit validem JSON – kein weiterer Text, keine Codeblöcke:
{"description":"...","specs":{"Eigenschaft":"Wert"}}

Regeln:
- Nur Fakten aus dem Wikipedia-Artikel oder den vorhandenen Daten – keine Erfindungen
${descriptionRule}
${specsRule}
- Falls ein Wert nirgends vorhanden: weglassen

=== Wikipedia-Artikel ===
${articleText}
=== Ende ===`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Keine Antwort von Claude" }, { status: 500 });
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Kein JSON in Antwort" }, { status: 500 });
    }

    const extracted = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      description: extracted.description ?? "",
      specs: extracted.specs ?? {},
      source: "wikipedia",
      articleTitle,
      articleLang,
      articleUrl: articlePageUrl(articleLang, articleTitle),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
