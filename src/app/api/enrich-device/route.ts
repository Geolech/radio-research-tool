import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getAnthropicApiKey } from "@/lib/get-api-key";

export async function POST(req: NextRequest) {
  try {
    const { brand, model, category } = await req.json();
    if (!brand || !model) {
      return NextResponse.json({ error: "brand und model erforderlich" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: getAnthropicApiKey() });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Du bist ein HiFi-Experte. Beschreibe das Gerät "${brand} ${model}" (Kategorie: ${category}) sachlich und neutral auf Deutsch.

Antworte NUR mit validem JSON, ohne Markdown-Formatierung, ohne Codeblöcke, ohne weiteren Text:
{"description":"2-3 sachliche Sätze über das Gerät, seine Eigenschaften und Besonderheiten","specs":{"Eigenschaft":"Wert"}}

Füge 4-8 relevante technische Spezifikationen ein.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Keine Textantwort erhalten" }, { status: 500 });
    }

    const raw = textBlock.text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Kein JSON in Antwort", raw }, { status: 500 });
    }

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
