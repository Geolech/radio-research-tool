import Anthropic from "@anthropic-ai/sdk";
import { serverError } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";
import { getAnthropicApiKeyFromRequest } from "@/lib/get-api-key";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { brand, model, category } = (await req.json()) as {
      brand: string;
      model: string;
      category?: string;
    };
    if (!brand || !model) {
      return NextResponse.json({ error: "brand und model erforderlich" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: getAnthropicApiKeyFromRequest(req), timeout: 25000 });

    const messages: Anthropic.Messages.MessageParam[] = [
      {
        role: "user",
        content: `Recherchiere den aktuellen Preis für: ${brand} ${model}${category ? ` (${category})` : ""} in Deutschland (EUR).

Priorität:
1. Aktueller Neupreis / UVP bei deutschen Händlern oder Hersteller-Website
2. Preisvergleichsseiten (idealo.de, geizhals.de)
3. Erwähnter Preis in Testberichten

Antworte NUR mit validem JSON – kein weiterer Text:
{"uvp": 1299, "note": "Quelle, max. 80 Zeichen"}

Regeln:
- uvp: Zahl in EUR ohne Symbol, oder null falls wirklich nicht findbar
- Falls nicht mehr neu erhältlich: aktueller Gebrauchtmarkt-Richtwert, note entsprechend
- note: Quelle und Datum wenn möglich, z. B. "idealo.de, Mai 2025" oder "Hersteller-Website 2024"`,
      },
    ];

    let response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
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
          { type: "text" as const, text: "Gib jetzt das JSON mit dem Preis aus." },
        ],
      });
      response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        tools: [{ type: "web_search_20250305" as const, name: "web_search" as const }],
        messages,
      });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ uvp: null, note: "Nicht ermittelbar" });
    }
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ uvp: null, note: "Nicht ermittelbar" });
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      uvp: typeof parsed.uvp === "number" ? parsed.uvp : null,
      note: parsed.note ?? "",
    });
  } catch (err) {
    return serverError(err, "Fehler");
  }
}
