import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getAnthropicApiKey } from "@/lib/get-api-key";

interface ReviewInput {
  title: string;
  url: string;
  source: string;
  language?: string;
  year?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPdf(url: string): boolean {
  return /\.pdf(\?.*)?$/i.test(url);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function fetchPageText(url: string, maxChars = 10000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("pdf")) return null; // server returned PDF anyway
    const html = await res.text();
    return stripHtml(html).slice(0, maxChars);
  } catch {
    return null;
  }
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { brand, model, reviews } = (await req.json()) as {
      brand: string;
      model: string;
      reviews: ReviewInput[];
    };

    if (!brand || !model || !reviews?.length) {
      return NextResponse.json(
        { error: "brand, model und reviews erforderlich" },
        { status: 400 }
      );
    }

    // ── 1. Separate HTML from PDF ───────────────────────────────────────────
    const htmlReviews = reviews.filter((r) => !isPdf(r.url));
    const skippedPdfs = reviews.filter((r) => isPdf(r.url));

    if (htmlReviews.length === 0) {
      return NextResponse.json(
        {
          error:
            "Alle hinterlegten Testberichte sind PDFs – zum Zusammenfassen werden HTML-Seiten benötigt. Bitte zuerst HTML-Quellen im Web suchen und speichern.",
        },
        { status: 422 }
      );
    }

    // ── 2. Fetch HTML pages in parallel ────────────────────────────────────
    const fetched = await Promise.all(
      htmlReviews.map(async (r) => ({
        review: r,
        text: await fetchPageText(r.url),
      }))
    );

    const loaded = fetched.filter((f) => f.text !== null);
    const failed = fetched.filter((f) => f.text === null);

    if (loaded.length === 0) {
      return NextResponse.json(
        {
          error:
            "Keiner der HTML-Testberichte konnte abgerufen werden (Paywall oder Netzwerkfehler). Bitte prüfe die gespeicherten URLs.",
        },
        { status: 422 }
      );
    }

    // ── 3. Build content block for Claude ──────────────────────────────────
    const reviewBlocks = loaded
      .map(
        ({ review, text }, i) =>
          `=== Testbericht ${i + 1}: „${review.title}" | ${review.source}${review.year ? ` ${review.year}` : ""} ===
URL: ${review.url}
INHALT:
${text}
=== Ende Testbericht ${i + 1} ===`
      )
      .join("\n\n");

    const skippedNote = [
      ...(skippedPdfs.length > 0
        ? [`${skippedPdfs.length} PDF-Quelle(n) übersprungen: ${skippedPdfs.map((r) => r.source).join(", ")}`]
        : []),
      ...(failed.length > 0
        ? [`${failed.length} HTML-Seite(n) nicht abrufbar: ${failed.map((f) => f.review.source).join(", ")}`]
        : []),
    ].join(" | ");

    // ── 4. Call Claude ──────────────────────────────────────────────────────
    const client = new Anthropic({ apiKey: getAnthropicApiKey() });

    const systemPrompt = `Du bist ein sachlicher HiFi-Redakteur. Du erstellst Gerätebeschreibungen im Markdown-Format auf Basis bereitgestellter Testbericht-Texte.

Format der Ausgabe (strikt einhalten):
1. Überschrift: ## Marke Modell
2. Dann 2–3 Sätze sachliche Beschreibung mit Fakten und Messwerten (kein Marketing, keine Floskeln)
3. Dann pro ausgewertetem Testbericht eine sinngemäße Aussage (KEIN wörtliches Zitat):
> Sinngemäße Zusammenfassung der zentralen Aussage des Berichts in eigenen Worten. — [Quellenname, Jahr](URL)

Regeln:
- Nur Fakten und technische Eigenschaften in der Einleitung
- KEINE wörtlichen Zitate – ausschließlich sinngemäße Paraphrasen in eigenen Worten
- Alle Aussagen auf Deutsch (übersetzen falls nötig)
- Kein Meta-Kommentar über Abrufbarkeit oder deine Arbeitsweise
- Ausschließlich Markdown ausgeben, kein erklärender Text davor oder danach`;

    const userPrompt = `Erstelle eine vollständige Gerätebeschreibung für den **${brand} ${model}** auf Basis der folgenden ${loaded.length} abgerufenen Testberichte.

Nutze NUR die unten stehenden Texte – keine Web-Suche erforderlich:

${reviewBlocks}

Gib jetzt die vollständige Gerätebeschreibung im vorgegebenen Markdown-Format aus.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Keine Antwort erhalten" }, { status: 500 });
    }

    // Strip only genuine meta-commentary lines (not regular German content)
    const cleaned = textBlock.text
      .split("\n")
      .filter((line) => {
        const l = line.trim().toLowerCase();
        return (
          !l.startsWith("hinweis:") &&
          !l.startsWith("anmerkung:") &&
          !l.startsWith("note:") &&
          !l.includes("nicht direkt abrufbar") &&
          !l.includes("basiert daher auf")
        );
      })
      .join("\n")
      .trim();

    return NextResponse.json({
      description: cleaned,
      ...(skippedNote ? { skippedNote } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
