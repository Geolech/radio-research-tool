import Anthropic from "@anthropic-ai/sdk";
import { serverError } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";
import { getAnthropicApiKeyFromRequest } from "@/lib/get-api-key";

const MODEL = "claude-sonnet-4-6";
const TOOLS = [{ type: "web_search_20250305" as const, name: "web_search" as const }];

const SYSTEM = `Du bist ein HiFi-Experte und hilfst dabei, Bedienungsanleitungen für HiFi-Geräte zu finden.
Quellen: hifi-engine.com, vinylengine.com, manualslib.com, Herstellerwebsite.
Antworte NUR mit validem JSON – kein Markdown, keine Codeblöcke, kein weiterer Text.`;

const JSON_FORMAT = `{
  "manuals": [
    {
      "title": "Name des Manuals",
      "url": "https://...",
      "source": "hifi-engine.com",
      "type": "Bedienungsanleitung",
      "language": "Deutsch"
    }
  ]
}`;

function parseManuals(text: string): unknown[] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  const data = JSON.parse(match[0]);
  return data.manuals ?? [];
}

export async function POST(req: NextRequest) {
  try {
    const { brand, model, forceWeb = false } = await req.json();
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
Liste Bedienungsanleitungen für ${brand} ${model} die du kennst (hifi-engine.com, manualslib.com, Herstellerseite).
Bis zu 6 Treffer, Deutsch zuerst. Nur URLs die du sicher kennst.
Falls keine bekannt: { "manuals": [] }

Antworte im Format:
${JSON_FORMAT}`,
        }],
      });
      const t1 = r1.content.find((b) => b.type === "text");
      if (t1?.type === "text") {
        try {
          const manuals = parseManuals(t1.text);
          if (manuals.length > 0) {
            return NextResponse.json({ manuals, source: "model" });
          }
        } catch { /* fall through */ }
      }
    }

    // ── Phase 2: Web-Suche ───────────────────────────────────────────────
    const messages: Anthropic.Messages.MessageParam[] = [{
      role: "user",
      content: `Finde Bedienungsanleitungen für: ${brand} ${model}

Suche auf: hifi-engine.com, vinylengine.com, manualslib.com, Herstellerwebsite.
Bis zu 6 Treffer, Deutsch priorisieren. Nur echte, überprüfte URLs.

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
    if (!textBlock || textBlock.type !== "text") return NextResponse.json({ manuals: [] });
    try {
      const manuals = parseManuals(textBlock.text);
      return NextResponse.json({ manuals, source: "web" });
    } catch {
      return NextResponse.json({ manuals: [], source: "web" });
    }
  } catch (err) {
    return serverError(err, "Fehler");
  }
}
