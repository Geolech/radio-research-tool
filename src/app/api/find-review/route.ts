import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getAnthropicApiKeyFromRequest } from "@/lib/get-api-key";

const MODEL = "claude-sonnet-4-6";
const TOOLS = [{ type: "web_search_20250305" as const, name: "web_search" as const }];

const SYSTEM = `Du bist ein HiFi-Experte und hilfst dabei, Testberichte für HiFi-Geräte zu finden.
Bevorzuge deutschsprachige Quellen: fidelity-online.de, stereoplay.de, audio.de, fairaudio.de, lowbeats.de, hifi-stars.de, stereonet.de.
Englischsprachige Quellen (stereophile.com, whathifi.com, hifinews.com, hifichoice.com) nur als Ergänzung.
Antworte NUR mit validem JSON – kein Markdown, keine Codeblöcke, kein weiterer Text.`;

const JSON_FORMAT = `{
  "reviews": [
    {
      "title": "Titel des Testberichts",
      "url": "https://...",
      "source": "fidelity-online.de",
      "type": "Testbericht",
      "language": "Deutsch",
      "year": "2023"
    }
  ]
}`;

function parseReviews(text: string): unknown[] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  const data = JSON.parse(match[0]);
  return data.reviews ?? [];
}

export async function POST(req: NextRequest) {
  try {
    const { brand, model, category, forceWeb = false } = await req.json();
    if (!brand || !model) {
      return NextResponse.json({ error: "brand und model erforderlich" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: getAnthropicApiKeyFromRequest(req) });

    // ── Phase 1: Modellwissen ────────────────────────────────────────────
    if (!forceWeb) {
      const r1 = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        messages: [{
          role: "user",
          content: `Nutze ausschließlich dein Trainingswissen – kein Web-Zugriff.
Liste Testberichte und Reviews für ${brand} ${model} (${category ?? "HiFi"}) die du kennst.
Bis zu 6 Treffer, priorisiere Deutsch. Nur URLs die du mit Sicherheit kennst.
Falls keine bekannt: { "reviews": [] }

Antworte im Format:
${JSON_FORMAT}`,
        }],
      });
      const t1 = r1.content.find((b) => b.type === "text");
      if (t1?.type === "text") {
        try {
          const reviews = parseReviews(t1.text);
          if (reviews.length > 0) {
            return NextResponse.json({ reviews, source: "model" });
          }
        } catch { /* fall through */ }
      }
    }

    // ── Phase 2: Web-Suche ───────────────────────────────────────────────
    const messages: Anthropic.Messages.MessageParam[] = [{
      role: "user",
      content: `Finde Testberichte für: ${brand} ${model} (${category ?? "HiFi"})

Suche auf: fidelity-online.de, stereoplay.de, audio.de, fairaudio.de, lowbeats.de, stereophile.com, hifinews.com
Bis zu 6 Treffer, Deutsch zuerst. Nur echte URLs.

${JSON_FORMAT}`,
    }];

    let response = await client.messages.create({ model: MODEL, max_tokens: 1024, system: SYSTEM, tools: TOOLS, messages });
    let rounds = 0;
    while (response.stop_reason === "tool_use" && rounds < 4) {
      rounds++;
      const ac = response.content;
      const results = ac.filter((b) => b.type === "tool_use")
        .map((b) => ({ type: "tool_result" as const, tool_use_id: (b as Anthropic.ToolUseBlock).id, content: "" }));
      messages.push({ role: "assistant", content: ac });
      messages.push({
        role: "user",
        content: [...results, { type: "text" as const, text: rounds >= 3 ? "Jetzt sofort JSON ausgeben." : "Weitersuchen, dann JSON." }],
      });
      response = await client.messages.create({ model: MODEL, max_tokens: 1024, system: SYSTEM, tools: TOOLS, messages });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return NextResponse.json({ reviews: [] });
    try {
      const reviews = parseReviews(textBlock.text);
      return NextResponse.json({ reviews, source: "web" });
    } catch {
      return NextResponse.json({ reviews: [], source: "web" });
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Fehler" }, { status: 500 });
  }
}
