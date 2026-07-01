import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKeyFromRequest } from "@/lib/get-api-key";

export const maxDuration = 30; // 30s max for this route

export interface OfficialImage {
  url: string;
  attribution: string;
  pageUrl?: string;
  source: "wikimedia" | "press" | "manufacturer";
  license: string;
}

// ─── Phase 1: Wikimedia Commons API (free, clearly licensed) ──────────────────

interface WikiSearchResult {
  title: string;
  snippet: string;
}

interface WikiImageInfo {
  url: string;
  thumburl?: string;
  extmetadata?: {
    LicenseShortName?: { value: string };
    Artist?: { value: string };
    ImageDescription?: { value: string };
  };
}

async function searchWikimediaCommons(brand: string, model: string): Promise<OfficialImage | null> {
  try {
    const query = `${brand} ${model}`;
    const searchUrl =
      `https://commons.wikimedia.org/w/api.php?` +
      new URLSearchParams({
        action: "query",
        list: "search",
        srsearch: query,
        srnamespace: "6", // File namespace
        srlimit: "5",
        format: "json",
        origin: "*",
      });

    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "HifiCatalogApp/1.0 (educational project)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const results: WikiSearchResult[] = searchData?.query?.search ?? [];
    if (results.length === 0) return null;

    // Find the most relevant result (title should contain brand or model)
    const brandLower = brand.toLowerCase();
    const modelLower = model.toLowerCase();
    const best = results.find((r) => {
      const t = r.title.toLowerCase();
      return t.includes(brandLower) || t.includes(modelLower.split(" ")[0]);
    }) ?? results[0];

    // Get image info including direct URL and license
    const infoUrl =
      `https://commons.wikimedia.org/w/api.php?` +
      new URLSearchParams({
        action: "query",
        titles: best.title,
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiurlwidth: "1200",
        format: "json",
        origin: "*",
      });

    const infoRes = await fetch(infoUrl, {
      headers: { "User-Agent": "HifiCatalogApp/1.0 (educational project)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!infoRes.ok) return null;

    const infoData = await infoRes.json();
    const pages = infoData?.query?.pages ?? {};
    const page = Object.values(pages)[0] as { imageinfo?: WikiImageInfo[] };
    const info = page?.imageinfo?.[0];
    if (!info?.url) return null;

    const license = info.extmetadata?.LicenseShortName?.value ?? "Wikimedia Commons";
    const rawArtist = info.extmetadata?.Artist?.value ?? "";
    // Strip HTML tags from artist field
    const artist = rawArtist.replace(/<[^>]+>/g, "").trim() || "Wikimedia Commons";

    const imageUrl = info.thumburl ?? info.url;
    const pageUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(best.title)}`;

    return {
      url: imageUrl,
      attribution: `${artist} / Wikimedia Commons / ${license}`,
      pageUrl,
      source: "wikimedia",
      license,
    };
  } catch {
    return null;
  }
}

// ─── Phase 2: Claude web search for press/manufacturer images ─────────────────

async function searchPressImage(brand: string, model: string, apiKey: string): Promise<OfficialImage | null> {
  const client = new Anthropic({ apiKey, timeout: 20000 });

  const messages: Anthropic.Messages.MessageParam[] = [
    {
      role: "user",
      content: `Suche ein offizielles Produktbild für: ${brand} ${model}

Priorität (absteigend):
1. Presse-/Pressebereich der Herstellerwebsite (z. B. brand.com/presse, /press, /media)
2. Offizielle Produktseite des Herstellers

Gib NUR dieses JSON zurück – kein weiterer Text:
{
  "url": "https://direkter-bildlink.jpg",
  "attribution": "© ${brand}",
  "pageUrl": "https://quellseite.com",
  "license": "Alle Rechte vorbehalten / Copyright ${brand}"
}

Wichtig:
- url muss ein direkter Bildlink sein (endet auf .jpg, .jpeg, .png oder .webp)
- Keine Bildagentur-Wasserzeichen-Bilder (Getty, Shutterstock etc.)
- Kein JSON-Block, nur das rohe JSON-Objekt`,
    },
  ];

  try {
    let response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      tools: [{ type: "web_search_20250305" as const, name: "web_search" as const }],
      messages,
    });

    let rounds = 0;
    while (response.stop_reason === "tool_use" && rounds < 2) {
      rounds++;
      const assistantContent = response.content;
      const toolResults = assistantContent
        .filter((b) => b.type === "tool_use")
        .map((b) => ({
          type: "tool_result" as const,
          tool_use_id: (b as Anthropic.ToolUseBlock).id,
          content: "",
        }));
      messages.push({ role: "assistant", content: assistantContent });
      messages.push({
        role: "user",
        content: [
          ...toolResults,
          { type: "text" as const, text: "Gib jetzt das JSON mit dem direkten Bildlink aus." },
        ],
      });
      response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        tools: [{ type: "web_search_20250305" as const, name: "web_search" as const }],
        messages,
      });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    const text = textBlock.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.url || !/\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(parsed.url)) return null;

    return {
      url: parsed.url,
      attribution: parsed.attribution ?? `© ${brand}`,
      pageUrl: parsed.pageUrl,
      source: "press",
      license: parsed.license ?? `Alle Rechte vorbehalten / © ${brand}`,
    };
  } catch {
    return null;
  }
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { brand, model } = (await req.json()) as { brand: string; model: string };
    if (!brand || !model) {
      return NextResponse.json({ error: "brand und model erforderlich" }, { status: 400 });
    }

    // Phase 1: Wikimedia Commons (free, clearly licensed)
    const wikimediaResult = await searchWikimediaCommons(brand, model);
    if (wikimediaResult) {
      console.log("[find-product-image] Wikimedia Commons hit:", wikimediaResult.url);
      return NextResponse.json({ image: wikimediaResult });
    }

    console.log("[find-product-image] Wikimedia miss → Claude web search");

    // Phase 2: Claude web search for manufacturer press image
    // Key erst hier auflösen — Phase 1 (Wikimedia) kommt ohne KI-Key aus.
    const pressResult = await searchPressImage(brand, model, getAnthropicApiKeyFromRequest(req));
    if (pressResult) {
      console.log("[find-product-image] Press image found:", pressResult.url);
      return NextResponse.json({ image: pressResult });
    }

    return NextResponse.json(
      { error: "Kein offizielles Bild gefunden. Versuche es erneut oder lade ein Bild manuell hoch." },
      { status: 404 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
