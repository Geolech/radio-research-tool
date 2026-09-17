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

// ── Clustering / Deduplizierung ───────────────────────────────────────────────
// Normalisiert einen Titel für den Vergleich: Kleinbuchstaben, nur Buchstaben/Zahlen
function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9äöüß]/g, "").slice(0, 60);
}

// Einfacher SimHash-ähnlicher Fingerprint auf Wortebene:
// Teilt den Text in 4-Gramme aus Wörtern auf und bildet eine Schnittmenge.
// Gibt den Jaccard-Ähnlichkeitswert zurück (0 = völlig verschieden, 1 = identisch).
function wordShingles(text: string, k = 4): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z0-9äöüß\s]/g, " ").split(/\s+/).filter(Boolean);
  const shingles = new Set<string>();
  for (let i = 0; i <= words.length - k; i++) {
    shingles.add(words.slice(i, i + k).join(" "));
  }
  return shingles;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const s of a) if (b.has(s)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

// Gruppentyp: ein Lead-Item mit allen zugehörigen Quellen/Beschreibungen
export type ClusteredRSSItem = RSSItem & {
  allSources: Array<{ feedName: string; feedCategory: string; description: string; link: string }>;
};

// Cluster-Schwellenwert: ab dieser Ähnlichkeit gelten zwei Meldungen als dieselbe Geschichte.
// 0.25 ist bewusst niedrig gewählt — Lokalredaktionen schreiben oft sehr unterschiedliche
// Überschriften über dasselbe Ereignis (Ratsprotokoll vs. Nachrichtenmeldung).
const CLUSTER_THRESHOLD = 0.25;

function clusterItems(items: RSSItem[]): ClusteredRSSItem[] {
  const clusters: ClusteredRSSItem[] = [];

  for (const item of items) {
    const titleKey = normalizeTitle(item.title);
    const itemText = `${item.title} ${item.description ?? ""}`;
    const itemShingles = wordShingles(itemText);

    // Exakter Titelvergleich (wie bisher) — schneller Pfad
    const exactMatch = clusters.find((c) => normalizeTitle(c.title) === titleKey);
    if (exactMatch) {
      if (!exactMatch.allSources.some((s) => s.feedName === item.feedName)) {
        exactMatch.allSources.push({
          feedName: item.feedName,
          feedCategory: item.feedCategory,
          description: item.description ?? "",
          link: item.link ?? "",
        });
      }
      continue;
    }

    // Ähnlichkeitsvergleich gegen bestehende Cluster-Lead-Items
    let merged = false;
    if (itemShingles.size >= 3) {
      for (const cluster of clusters) {
        const clusterText = `${cluster.title} ${cluster.description ?? ""}`;
        const clusterShingles = wordShingles(clusterText);
        if (clusterShingles.size < 3) continue;
        const sim = jaccardSimilarity(itemShingles, clusterShingles);
        if (sim >= CLUSTER_THRESHOLD) {
          if (!cluster.allSources.some((s) => s.feedName === item.feedName)) {
            cluster.allSources.push({
              feedName: item.feedName,
              feedCategory: item.feedCategory,
              description: item.description ?? "",
              link: item.link ?? "",
            });
          }
          merged = true;
          break;
        }
      }
    }

    if (!merged) {
      clusters.push({
        ...item,
        allSources: [{
          feedName: item.feedName,
          feedCategory: item.feedCategory,
          description: item.description ?? "",
          link: item.link ?? "",
        }],
      });
    }
  }

  return clusters;
}

// ── Öffentliche Typen ─────────────────────────────────────────────────────────

export type RankedRSSItem = ClusteredRSSItem & {
  score: number;
  scoreBreakdown: { date: number; length: number; sourceBonus: number; clusterBonus: number };
};

// ── Hauptfunktion ─────────────────────────────────────────────────────────────

export function rankRSSItems(items: RSSItem[]): RankedRSSItem[] {
  // Erst clustern (gleiche Ereignisse zusammenfassen), dann ranken.
  const clustered = clusterItems(items);
  return clustered
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
      // Cluster-Bonus: mehrere Quellen zur selben Geschichte = höhere Relevanz
      // log2(n) → 1 Quelle = 0, 2 = 0.1, 4 = 0.2, 8 = 0.3 (gedeckelt bei 0.3)
      const clusterBonus = Math.min(0.3, Math.log2(item.allSources.length) * 0.1);
      const score = date * 0.5 + length * 0.3 + sourceBonus + clusterBonus;
      return { ...item, score, scoreBreakdown: { date, length, sourceBonus, clusterBonus } };
    })
    .sort((a, b) => b.score - a.score);
}

// ── RSS-Items → NewsItems (ohne radio_text) ────────────────────────────────────

export function rssToNewsItems(ranked: RankedRSSItem[]): NewsItem[] {
  return ranked.map((item, i) => ({
    rank:         i + 1,
    headline:     item.title,
    // Alle Quellnamen aus dem Cluster, nicht nur den Lead-Feed
    sources:      Array.from(new Set<string>(item.allSources.map((s) => s.feedName))),
    source_count: item.allSources.length,
    validated:
      item.allSources.some(
        (s) => s.feedCategory === "regional-official" || s.feedCategory === "education"
      ),
    source_type:  "rss" as const,
    radio_text:   "",
    url:          item.link || undefined,
    // Beschreibung: längsten verfügbaren Kurztext aus dem Cluster nehmen
    description:  item.allSources.reduce<string>(
      (best, s) => s.description.length > best.length ? s.description : best,
      item.description ?? ""
    ) || undefined,
    // Alle Quellen-URLs für Source-Divergence-Check
    clusterSources: item.allSources.length > 1 ? item.allSources : undefined,
  }));
}
