import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKeyFromRequest } from "@/lib/get-api-key";

export interface RepairShop {
  name: string;
  priority: 1 | 2 | 3 | 4 | 5;
  priorityLabel: string;
  city?: string;
  address?: string;
  phone?: string;
  website?: string;
  brands?: string[];
  note?: string;
}

const BLOCKED_CHAINS =
  /\b(saturn|media\s*markt|kaufland|expert|euronics|media\s*saturn|ceconomy|elkjøp|elgiganten)\b/i;

const MODEL = "claude-sonnet-4-6";
const TOOLS = [{ type: "web_search_20250305" as const, name: "web_search" as const }];

function parseShops(text: string, brand: string): RepairShop[] {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = fenceMatch ? fenceMatch[1] : text;
  const start = jsonText.indexOf("{");
  const end = jsonText.lastIndexOf("}");
  if (start === -1 || end === -1) return [];
  const parsed = JSON.parse(jsonText.slice(start, end + 1));
  return (parsed.shops ?? [])
    .filter((s: RepairShop) => s.name && typeof s.priority === "number" && !BLOCKED_CHAINS.test(s.name))
    .map((s: RepairShop) => {
      const raw = s.priority as number;
      const p = raw === 6 ? 2 : raw;
      const note = p === 2 && !s.note
        ? `Bitte direkt anfragen, ob ${brand}-Geräte zur Reparatur angenommen werden.`
        : s.note;
      return { ...s, priority: p as RepairShop["priority"], note };
    })
    .sort((a: RepairShop, b: RepairShop) => a.priority - b.priority);
}

const JSON_SCHEMA = `{
  "shops": [
    {
      "name": "Firmenname",
      "priority": 1,
      "priorityLabel": "Offizieller Vertrieb",
      "city": "Stadt",
      "address": "Straße Nr, PLZ Stadt",
      "phone": "+49 ...",
      "website": "https://...",
      "brands": ["Marke"],
      "note": ""
    }
  ]
}

priorityLabel exakt:
1 → "Offizieller Vertrieb"
2 → "Fachhändler in der Nähe"
3 → "Weitere Fachhändler"
4 → "Service-Händler"
5 → "HiFi-Werkstatt"`;

export async function POST(req: Request) {
  try {
    const { brand, model, location, forceWeb = false } = (await req.json()) as {
      brand: string; model: string; location: string; forceWeb?: boolean;
    };
    if (!brand || !location) {
      return NextResponse.json({ error: "brand und location erforderlich" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: getAnthropicApiKeyFromRequest(req) });

    // ── Phase 1: Modellwissen (kein Web-Aufruf) ───────────────────────────
    if (!forceWeb) {
      const r1 = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: "Du antwortest ausschließlich mit validem JSON – kein Fließtext, keine Erklärungen, keine Markdown-Codeblöcke. Nur das rohe JSON-Objekt.",
        messages: [{
          role: "user",
          content: `Servicepartner-Liste für HiFi-Marke ${brand} (Modell: ${model}), Nutzerstandort: ${location}, Deutschland.

Gib folgendes JSON zurück – NUR das JSON, sonst nichts:
{ "shops": [ { "name": "...", "priority": 1, "priorityLabel": "Offizieller Vertrieb", "city": "...", "address": "...", "phone": "...", "website": "...", "brands": ["${brand}"], "note": "" } ] }

Regeln:
- Priorität 1 "Offizieller Vertrieb": Hersteller selbst (falls ${brand} ein Direkthersteller ist) ODER offizieller dt. Vertrieb/Importeur – IMMER eintragen wenn ${brand} bekannt
- Priorität 2 "Fachhändler in der Nähe": Händler < 50 km von ${location} mit ${brand} im Sortiment – nur wenn sicher bekannt
- Priorität 3 "Weitere Fachhändler": weitere dt. ${brand}-Händler – nur wenn sicher bekannt
- Priorität 4 "Service-Händler": nachweisliche ${brand}-Reparatur
- Priorität 5 "HiFi-Werkstatt": allg. HiFi-Werkstatt
- AUSSCHLIESSEN: Saturn, MediaMarkt, Kaufland, Expert, Euronics
- Falls du Priorität 2–5 nicht kennst: Nur Priorität 1 zurückgeben reicht`,
        }],
      });
      const text1 = r1.content.find((b) => b.type === "text");
      console.log("[find-repair] Phase 1 raw:", text1?.type === "text" ? text1.text.slice(0, 300) : "no text block");
      if (text1?.type === "text") {
        try {
          const shops = parseShops(text1.text, brand);
          console.log("[find-repair] Phase 1 shops found:", shops.length);
          if (shops.length > 0) {
            return NextResponse.json({ shops, source: "model" });
          }
        } catch (e) {
          console.log("[find-repair] Phase 1 parse error:", e);
        }
      }
      console.log("[find-repair] Phase 1 empty → falling back to web search");
    }

    // ── Phase 2: Web-Suche (Fallback oder forceWeb) ───────────────────────
    const messages: Anthropic.Messages.MessageParam[] = [{
      role: "user",
      content: `Suche Servicepartner und Reparaturbetriebe für ${brand} ${model} bei ${location}, Deutschland.

Führe maximal 2 Suchen durch, dann sofort JSON:
Suche 1: "HiFi Händler ${location}" oder "${brand} Händler ${location}"
Suche 2 (nur wenn nötig): "${brand} Vertrieb Deutschland"

AUSSCHLIESSEN: Saturn, MediaMarkt, Kaufland, Expert, Euronics.

Antworte NUR mit diesem JSON:
${JSON_SCHEMA}
Für Priorität-2-Händler ohne bestätigte ${brand}-Kompetenz: note = "Bitte direkt anfragen, ob ${brand}-Geräte zur Reparatur angenommen werden."`,
    }];

    let response = await client.messages.create({ model: MODEL, max_tokens: 2048, tools: TOOLS, messages });
    let rounds = 0;
    while (response.stop_reason === "tool_use" && rounds < 3) {
      rounds++;
      const assistantContent = response.content;
      const toolResults = assistantContent
        .filter((b) => b.type === "tool_use")
        .map((b) => ({ type: "tool_result" as const, tool_use_id: (b as Anthropic.ToolUseBlock).id, content: "" }));
      messages.push({ role: "assistant", content: assistantContent });
      messages.push({
        role: "user",
        content: [
          ...toolResults,
          { type: "text" as const, text: rounds >= 2 ? "Jetzt sofort JSON ausgeben – keine weiteren Suchen." : "Noch maximal eine Suche, dann JSON." },
        ],
      });
      response = await client.messages.create({ model: MODEL, max_tokens: 2048, tools: TOOLS, messages });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Keine Antwort vom Modell" }, { status: 500 });
    }
    const shops = parseShops(textBlock.text, brand);
    if (shops.length === 0) {
      return NextResponse.json({ error: "Keine Betriebe gefunden – versuche einen anderen Ort." }, { status: 404 });
    }
    return NextResponse.json({ shops, source: "web" });
  } catch (e) {
    console.error("find-repair error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
