import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getAnthropicApiKeyFromRequest } from "@/lib/get-api-key";
import { tryFetch, parseFeed } from "@/app/api/fetch-rss/route";

const MODEL = "claude-sonnet-4-6";
const MAX_TOOL_ROUNDS = 4;
const AI_TIMEOUT_MS = 110_000;

// ── Retry helper (529/429) ────────────────────────────────────────────────────
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, baseDelayMs = 12_000): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err instanceof Anthropic.APIError ? err.status : 0;
      if ((status === 529 || status === 429) && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

// ── Typen ──────────────────────────────────────────────────────────────────────
type Candidate = {
  name: string;
  url: string;
  category: "regional-official" | "regional-media" | "education";
  location?: string;
};

export type DiscoveredFeed = Candidate & {
  verified: boolean;
  itemCount: number;
};

// ── JSON-Array aus Text extrahieren ─────────────────────────────────────────────
function parseCandidates(text: string): Candidate[] {
  const stripped = text.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();
  const arrMatch = stripped.match(/\[[\s\S]*\]/) ?? text.match(/\[[\s\S]*\]/);
  if (!arrMatch) return [];
  try {
    const arr = JSON.parse(arrMatch[0]);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((c) => c && typeof c.url === "string" && c.url.startsWith("http"))
      .map((c) => ({
        name: typeof c.name === "string" && c.name.trim() ? c.name : c.url,
        url: c.url.trim(),
        category: ["regional-official", "regional-media", "education"].includes(c.category)
          ? c.category
          : "regional-official",
        location: typeof c.location === "string" ? c.location : undefined,
      }));
  } catch {
    return [];
  }
}

// ── KI-Suche ────────────────────────────────────────────────────────────────────
async function discoverCandidates(client: Anthropic, region: string): Promise<Candidate[]> {
  const TOOLS = [{ type: "web_search_20250305" as const, name: "web_search" as const }];

  const system = `Du recherchierst RSS-Feeds für eine Lokal-/Campusradio-Redaktion.

AUFGABE:
- Bestimme das geografische Zentrum der angegebenen Region.
- Finde Städte, Gemeinden und öffentliche Institutionen im Umkreis von ca. 30 km
  (Stadtverwaltungen, Landkreis/Kreis, Hochschulen/Universitäten, ggf. Polizei-/Feuerwehr-Presse,
  sowie reichweitenstarke Lokalmedien/Zeitungen der Region).
- Ermittle für diese deren offizielle RSS- oder Atom-Feed-URLs (nicht die Webseite, sondern den Feed).
- Bevorzuge offizielle Quellen. Nimm nur Feeds auf, deren URL du tatsächlich gefunden hast — keine geratenen URLs.

KATEGORIEN:
- "regional-official": Stadt/Gemeinde/Kreis/Behörde
- "education": Hochschule/Universität
- "regional-media": Zeitung/Lokalmedium

Antworte am Ende NUR mit einem validen JSON-Array, keine Erklärung:
[
  {"name":"Stadt Musterstadt","url":"https://...","category":"regional-official","location":"Musterstadt (Zentrum)"}
]`;

  const prompt = `Region: "${region}"

Finde RSS-Feeds für Städte und öffentliche Institutionen im Umkreis von ca. 30 km um das Zentrum dieser Region. Gib am Ende das JSON-Array aus.`;

  const messages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: prompt }];

  let response = await withRetry(() =>
    client.messages.create({ model: MODEL, max_tokens: 3500, system, tools: TOOLS, messages })
  );

  let rounds = 0;
  while (response.stop_reason === "tool_use" && rounds < MAX_TOOL_ROUNDS) {
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
          text: rounds >= MAX_TOOL_ROUNDS
            ? "Suche abgeschlossen. Gib jetzt nur das JSON-Array aus."
            : "Weitersuchen, dann das JSON-Array ausgeben.",
        },
      ],
    });
    response = await withRetry(() =>
      client.messages.create({ model: MODEL, max_tokens: 3500, system, tools: TOOLS, messages })
    );
  }

  const block = response.content.find((b) => b.type === "text");
  return block?.type === "text" ? parseCandidates(block.text) : [];
}

// ── Live-Verifikation der Kandidaten ──────────────────────────────────────────
async function verifyCandidates(candidates: Candidate[]): Promise<DiscoveredFeed[]> {
  return Promise.all(
    candidates.map(async (c) => {
      const res = await tryFetch(c.url);
      if (res.ok && res.xml) {
        const items = parseFeed(res.xml, c.url, c.name, c.category);
        return { ...c, verified: items.length > 0, itemCount: items.length };
      }
      return { ...c, verified: false, itemCount: 0 };
    })
  );
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { region = "" }: { region?: string } = await req.json();
    if (!region.trim()) {
      return NextResponse.json({ error: "Region fehlt" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: getAnthropicApiKeyFromRequest(req) });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), AI_TIMEOUT_MS)
    );

    const work = (async () => {
      const candidates = await discoverCandidates(client, region);
      // Duplikate nach URL entfernen
      const seen = new Set<string>();
      const unique = candidates.filter((c) => {
        const key = c.url.replace(/\/$/, "").toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const verified = await verifyCandidates(unique);
      // Verifizierte zuerst
      verified.sort((a, b) => Number(b.verified) - Number(a.verified));
      return NextResponse.json({ feeds: verified });
    })();

    return await Promise.race([work, timeoutPromise]);
  } catch (err) {
    const isTimeout = err instanceof Error && err.message === "TIMEOUT";
    const isOverloaded = err instanceof Anthropic.APIError && err.status === 529;
    const message = isTimeout
      ? `Zeitüberschreitung. Bitte mit präziserer Region erneut versuchen.`
      : isOverloaded
      ? "Die KI-API ist überlastet (529). Bitte in 1–2 Minuten erneut versuchen."
      : err instanceof Error ? err.message : "Fehler bei der Feed-Suche";
    return NextResponse.json({ error: message }, { status: isTimeout ? 504 : isOverloaded ? 503 : 500 });
  }
}
