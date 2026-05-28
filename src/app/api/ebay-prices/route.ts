import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { getAnthropicApiKey } from "@/lib/get-api-key";

export interface EbayListing {
  title: string;
  price: number;
  condition: string;
  url: string;
  source: string; // "eBay" | "Kleinanzeigen"
  isNew?: boolean; // optional for backwards compat with old snapshots
}

export interface PriceSnapshot {
  date: string; // "YYYY-MM-DD"
  listings: EbayListing[];
  stats: {
    min: number;
    max: number;
    avg: number;
    median: number;
    count: number;
  };
}

export interface DevicePricesEntry {
  lastFetched: string;
  snapshots: PriceSnapshot[];
}

export async function POST(req: Request) {
  try {
    const { id, brand, model } = await req.json();
    const client = new Anthropic({ apiKey: getAnthropicApiKey() });

    const messages: Anthropic.Messages.MessageParam[] = [
      {
        role: "user",
        content: `Suche auf eBay.de UND auf Kleinanzeigen.de nach aktuell verfügbaren Angeboten für das vollständige HiFi-Gerät "${brand} ${model}".

Führe diese zwei Suchen durch:
1. eBay.de (alle Zustände): https://www.ebay.de/sch/i.html?_nkw=${encodeURIComponent(`${brand} ${model}`)}
2. Kleinanzeigen.de: https://www.kleinanzeigen.de/s/${encodeURIComponent(`${brand} ${model}`)}/k0

WICHTIGE FILTERREGELN – schließe folgende Angebote KOMPLETT AUS:
- Zubehör, Ersatzteile, Reparaturteile (Ohrpolster, Earpads, Kabel, Netzteile, Röhren, Platinen, Fernbedienungen usw.)
- Angebote, die klar nicht das gesuchte Gerät selbst betreffen
- Such-URLs oder Kategorieseiten – nur echte Einzelangebote mit direkter Artikel-URL

Neuware (Zustand "Neu") ist erlaubt, muss aber entsprechend markiert werden.

Für jedes qualifizierte Angebot extrahiere:
- title: Titel des Angebots
- price: Preis in EUR als reine Zahl (kein €-Zeichen, kein Tausenderpunkt)
- condition: Zustand laut Angebot (z. B. "Gebraucht", "Sehr gut", "Gut", "Neu")
- url: Direkte Artikel-URL (bei eBay muss sie /itm/ enthalten; bei Kleinanzeigen /s-anzeige/)
- source: "eBay" oder "Kleinanzeigen"
- isNew: true wenn Neuware, sonst false

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt ohne jeglichen Text davor oder danach:
{
  "listings": [
    {
      "title": "Beispiel ${brand} ${model} gebraucht",
      "price": 1200,
      "condition": "Gebraucht",
      "url": "https://www.ebay.de/itm/123456789",
      "source": "eBay",
      "isNew": false
    }
  ]
}`,
      },
    ];

    const MODEL = "claude-sonnet-4-6";
    const TOOLS = [{ type: "web_search_20250305" as const, name: "web_search" as const }];
    const MAX_SEARCH_ROUNDS = 4; // eBay + Kleinanzeigen + max 2 Nachsuchen

    let response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools: TOOLS,
      messages,
    });

    // Multi-turn web search – hard limit verhindert Endlosschleife
    let rounds = 0;
    while (response.stop_reason === "tool_use" && rounds < MAX_SEARCH_ROUNDS) {
      rounds++;
      const assistantContent = response.content;
      const toolUseBlocks = assistantContent.filter((b) => b.type === "tool_use");
      const toolResults = toolUseBlocks.map((b) => ({
        type: "tool_result" as const,
        tool_use_id: (b as Anthropic.ToolUseBlock).id,
        content: "",
      }));
      messages.push({ role: "assistant", content: assistantContent });
      // Nach MAX_SEARCH_ROUNDS-1 Runden: Claude anweisen, jetzt abzuschließen
      if (rounds === MAX_SEARCH_ROUNDS - 1) {
        messages.push({
          role: "user",
          content: [
            ...toolResults,
            {
              type: "text" as const,
              text: "Bitte gib jetzt sofort das JSON-Ergebnis mit den bisher gefundenen Angeboten aus – keine weiteren Suchen.",
            },
          ],
        });
      } else {
        messages.push({ role: "user", content: toolResults });
      }
      response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        tools: TOOLS,
        messages,
      });
    }

    // Extract text
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Keine Antwort vom Modell" }, { status: 500 });
    }

    // Parse JSON (handle markdown code blocks)
    let jsonText = textBlock.text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) jsonText = fenceMatch[1];
    const start = jsonText.indexOf("{");
    const end = jsonText.lastIndexOf("}");
    if (start === -1 || end === -1) {
      console.error("No JSON found in:", jsonText.slice(0, 300));
      return NextResponse.json({ error: "Kein JSON in der Antwort gefunden" }, { status: 500 });
    }
    jsonText = jsonText.slice(start, end + 1);

    let parsed: { listings: EbayListing[] };
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      console.error("JSON parse error:", e, jsonText.slice(0, 300));
      return NextResponse.json({ error: "JSON konnte nicht geparst werden" }, { status: 500 });
    }

    // Keywords that indicate spare parts / accessories (case-insensitive)
    const SPARE_PARTS_PATTERN =
      /\b(ohrpolster|earpads?|ear\s*pad|kabel|cable|netzteil|power\s*supply|fernbedien|remote|röhre|tube|platine|pcb|ersatz|repair|reparatur|ersatzteil|spare\s*part|damaged|cushion|grill|pads?\s+only)\b/i;

    // Conditions that indicate new item
    const NEW_CONDITION_PATTERN =
      /\b(neu|new|brand\s*new|neu\s*\(sonstige\)|factory\s*sealed|originalverpackt|ovp)\b/i;

    // Valid direct-listing URL: eBay /itm/ (with optional title slug before ID) or Kleinanzeigen /s-anzeige/
    const isDirectListingUrl = (url: string) =>
      /ebay\.(de|com)\/itm\//.test(url) ||
      /kleinanzeigen\.de\/s-anzeige\//.test(url) ||
      /ebay\.(de|com)\/p\//.test(url);

    const listings: EbayListing[] = (parsed.listings ?? [])
      .filter((l) => {
        if (typeof l.price !== "number" || l.price < 20 || l.price > 100000) return false;
        if (typeof l.url !== "string" || !l.url.startsWith("http")) return false;

        // Reject search/category URLs – must be a direct listing
        if (!isDirectListingUrl(l.url)) return false;

        // Reject spare parts / accessories by title keywords
        if (SPARE_PARTS_PATTERN.test(l.title ?? "")) return false;

        return true;
      })
      .map((l) => ({
        ...l,
        // Normalise isNew: trust Claude's field, but also detect from condition string
        isNew: l.isNew === true || NEW_CONDITION_PATTERN.test(l.condition ?? ""),
      }))
      .sort((a, b) => {
        // Used listings first, then new
        if (a.isNew !== b.isNew) return a.isNew ? 1 : -1;
        return a.price - b.price;
      });

    if (listings.length === 0) {
      return NextResponse.json(
        { error: "Keine Angebote gefunden – versuche es erneut." },
        { status: 404 }
      );
    }

    // Stats – based on used listings only (Neuware excluded from price curve)
    const usedListings = listings.filter((l) => !l.isNew);
    const usedPrices = (usedListings.length > 0 ? usedListings : listings).map((l) => l.price);
    const sortedUsed = [...usedPrices].sort((a, b) => a - b);
    const stats = {
      min: sortedUsed[0],
      max: sortedUsed[sortedUsed.length - 1],
      avg: Math.round(usedPrices.reduce((a, b) => a + b, 0) / usedPrices.length),
      median: sortedUsed[Math.floor(sortedUsed.length / 2)],
      count: usedListings.length > 0 ? usedListings.length : listings.length,
    };

    const today = new Date().toISOString().split("T")[0];
    const snapshot: PriceSnapshot = { date: today, listings, stats };

    // Load + update JSON
    const dataPath = path.join(process.cwd(), "src/lib/devices-prices.json");
    let allData: Record<string, DevicePricesEntry> = {};
    try {
      allData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    } catch {
      // File doesn't exist yet, start fresh
    }

    if (!allData[id]) {
      allData[id] = { lastFetched: today, snapshots: [] };
    }
    // Replace today's snapshot if it already exists
    allData[id].snapshots = allData[id].snapshots.filter((s) => s.date !== today);
    allData[id].snapshots.push(snapshot);
    allData[id].snapshots.sort((a, b) => a.date.localeCompare(b.date));
    allData[id].lastFetched = today;

    fs.writeFileSync(dataPath, JSON.stringify(allData, null, 2));

    return NextResponse.json({ snapshots: allData[id].snapshots, lastFetched: today });
  } catch (e) {
    console.error("ebay-prices error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}
