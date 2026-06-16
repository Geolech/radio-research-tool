import type { RSSItem } from "@/app/api/fetch-rss/route";
import type { NewsItem } from "@/app/api/radio-research/route";

// ── Scoring ───────────────────────────────────────────────────────────────────

function scoreItem(item: RSSItem): number {
  // Datum: Halbwertszeit ~6 Stunden (neuere Items = höher)
  const hoursAgo = item.pubDateIso
    ? (Date.now() - new Date(item.pubDateIso).getTime()) / 3_600_000
    : 48;
  const dateScore = 1 / (1 + hoursAgo / 6);

  // Textlänge: ab 400 Zeichen volle Punktzahl
  const lengthScore = Math.min(1, (item.description?.length ?? 0) / 400);

  // Quellenbonus: offizielle Quellen (Stadt, Hochschule) bevorzugen
  const isOfficial =
    item.feedCategory === "regional-official" ||
    item.feedCategory === "education";
  const sourceBonus = isOfficial ? 0.2 : 0;

  return dateScore * 0.5 + lengthScore * 0.3 + sourceBonus;
}

// ── Öffentlicher Typ ──────────────────────────────────────────────────────────

export type RankedRSSItem = RSSItem & {
  score: number;
  scoreBreakdown: { date: number; length: number; sourceBonus: number };
};

// ── Deduplizierung ────────────────────────────────────────────────────────────
// Normalisiert einen Titel für den Vergleich: Kleinbuchstaben, nur Buchstaben/Zahlen
function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9äöüß]/g, "").slice(0, 60);
}

function deduplicateItems(items: RSSItem[]): RSSItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeTitle(item.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Hauptfunktion ─────────────────────────────────────────────────────────────

export function rankRSSItems(items: RSSItem[]): RankedRSSItem[] {
  // Duplikate entfernen bevor gerankt wird (erstes Vorkommen gewinnt)
  const unique = deduplicateItems(items);
  return unique
    .map((item) => {
      const hoursAgo = item.pubDateIso
        ? (Date.now() - new Date(item.pubDateIso).getTime()) / 3_600_000
        : 48;
      const date   = 1 / (1 + hoursAgo / 6);
      const length = Math.min(1, (item.description?.length ?? 0) / 400);
      const sourceBonus =
        item.feedCategory === "regional-official" || item.feedCategory === "education"
          ? 0.2
          : 0;
      const score = date * 0.5 + length * 0.3 + sourceBonus;
      return { ...item, score, scoreBreakdown: { date, length, sourceBonus } };
    })
    .sort((a, b) => b.score - a.score);
}

// ── RSS-Items → NewsItems (ohne radio_text) ────────────────────────────────────

export function rssToNewsItems(ranked: RankedRSSItem[]): NewsItem[] {
  return ranked.map((item, i) => ({
    rank:         i + 1,
    headline:     item.title,
    sources:      [item.feedName],
    source_count: 1,
    validated:
      item.feedCategory === "regional-official" ||
      item.feedCategory === "education",
    source_type:  "rss" as const,
    radio_text:   "",
    url:          item.link || undefined,
  }));
}
