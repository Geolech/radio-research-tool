export type FeedCategory =
  | "regional-official"
  | "regional-media"
  | "regional-radio"
  | "education";

export type FeedPriority = "primary" | "secondary" | "deep";

export type FeedConfig = {
  id: string;
  name: string;
  url: string;
  category: FeedCategory;
  priority: FeedPriority;
  note?: string;
};

export const RSS_FEEDS: FeedConfig[] = [
  // ── Primär: verifiziert aktiv ────────────────────────────────────────────
  {
    id: "lemgo",
    name: "Stadt Lemgo",
    url: "https://www.lemgo.de/rss?type=9818",
    category: "regional-official",
    priority: "primary",
  },
  {
    id: "th-owl-news",
    name: "TH OWL – Neuigkeiten",
    url: "https://www.th-owl.de/news/feed.xml",
    category: "education",
    priority: "primary",
  },
  {
    id: "th-owl-main",
    name: "TH OWL – Hochschule",
    url: "https://www.th-owl.de/feed.xml",
    category: "education",
    priority: "primary",
  },

  // ── Sekundär: Medien, reduzierte Priorität ───────────────────────────────
  {
    id: "lz-kreis-lippe",
    name: "Lippische Landes-Zeitung – Kreis Lippe",
    url: "https://www.lz.de/_lz_daten/_export/rss/kreislippe/index.rss",
    category: "regional-media",
    priority: "secondary",
  },
  {
    id: "lz-detmold",
    name: "LZ – Detmold",
    url: "https://www.lz.de/_lz_daten/_export/rss/detmold/index.rss",
    category: "regional-media",
    priority: "secondary",
  },
  {
    id: "lz-lemgo",
    name: "LZ – Lemgo",
    url: "https://www.lz.de/_lz_daten/_export/rss/lemgo/index.rss",
    category: "regional-media",
    priority: "secondary",
  },
  {
    id: "lz-bad-salzuflen",
    name: "LZ – Bad Salzuflen",
    url: "https://www.lz.de/_lz_daten/_export/rss/bad-salzuflen/index.rss",
    category: "regional-media",
    priority: "secondary",
  },

  // ── Deep Search: Versuche, können fehlschlagen ───────────────────────────
  {
    id: "detmold",
    name: "Stadt Detmold",
    url: "https://www.detmold.de/rss?type=9818",
    category: "regional-official",
    priority: "deep",
    note: "TYPO3-Pattern, nicht offiziell bestätigt",
  },
  {
    id: "hoexter",
    name: "Stadt Höxter",
    url: "https://www.hoexter.de/rss?type=9818",
    category: "regional-official",
    priority: "deep",
    note: "TYPO3-Pattern, nicht offiziell bestätigt",
  },
  {
    id: "bad-salzuflen",
    name: "Stadt Bad Salzuflen",
    url: "https://www.stadt-bad-salzuflen.de/rss?type=9818",
    category: "regional-official",
    priority: "deep",
    note: "TYPO3-Pattern",
  },
  {
    id: "lage",
    name: "Stadt Lage",
    url: "https://www.lage.de/rss?type=9818",
    category: "regional-official",
    priority: "deep",
  },
  {
    id: "blomberg",
    name: "Stadt Blomberg",
    url: "https://www.blomberg.de/rss?type=9818",
    category: "regional-official",
    priority: "deep",
  },
  {
    id: "lz-lage",
    name: "LZ – Lage",
    url: "https://www.lz.de/_lz_daten/_export/rss/lage/index.rss",
    category: "regional-media",
    priority: "deep",
  },
  {
    id: "lz-blomberg",
    name: "LZ – Blomberg",
    url: "https://www.lz.de/_lz_daten/_export/rss/blomberg/index.rss",
    category: "regional-media",
    priority: "deep",
  },
  {
    id: "lz-horn",
    name: "LZ – Horn-Bad Meinberg",
    url: "https://www.lz.de/_lz_daten/_export/rss/horn-bad-meinberg/index.rss",
    category: "regional-media",
    priority: "deep",
  },
  {
    id: "lz-oerlinghausen",
    name: "LZ – Oerlinghausen",
    url: "https://www.lz.de/_lz_daten/_export/rss/oerlinghausen/index.rss",
    category: "regional-media",
    priority: "deep",
  },
  {
    id: "lz-barntrup",
    name: "LZ – Barntrup",
    url: "https://www.lz.de/_lz_daten/_export/rss/barntrup/index.rss",
    category: "regional-media",
    priority: "deep",
  },
];

export const FEED_PRIORITY_ORDER: FeedPriority[] = ["primary", "secondary", "deep"];
