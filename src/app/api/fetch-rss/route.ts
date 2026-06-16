import { NextRequest, NextResponse } from "next/server";
import { RSS_FEEDS, type FeedPriority } from "@/lib/rss-feeds";

const FETCH_TIMEOUT_MS = 6000;
const MAX_ITEMS_PER_FEED = 10;

export type RSSItem = {
  feedId: string;
  feedName: string;
  feedCategory: string;
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
  pubDateIso: string | null;
};

export type FeedResult = {
  feedId: string;
  feedName: string;
  status: "ok" | "error" | "timeout";
  itemCount: number;
  error?: string;
  resolvedUrl?: string;   // gesetzt wenn eine Fallback-URL die konfigurierte ersetzt hat
};

export type FetchRSSResponse = {
  items: RSSItem[];
  feedResults: FeedResult[];
};

// ── XML helpers ──────────────────────────────────────────────────────────────

function extractText(block: string, tag: string): string {
  const re = new RegExp(
    `<${tag}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
    "i"
  );
  const m = block.match(re);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
}

function extractAttr(block: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  try {
    return new Date(raw).toISOString();
  } catch {
    return null;
  }
}

function parseRSS2(xml: string, feedId: string, feedName: string, feedCategory: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null && items.length < MAX_ITEMS_PER_FEED) {
    const block = match[1];
    const title = extractText(block, "title");
    const link = extractText(block, "link") || extractAttr(block, "link", "href");
    const description = extractText(block, "description");
    const pubDate = extractText(block, "pubDate") || extractText(block, "dc:date");
    if (!title) continue;
    items.push({
      feedId,
      feedName,
      feedCategory,
      title,
      link,
      description: description.slice(0, 400),
      pubDate: pubDate || null,
      pubDateIso: parseDate(pubDate),
    });
  }
  return items;
}

function parseAtom(xml: string, feedId: string, feedName: string, feedCategory: string): RSSItem[] {
  const items: RSSItem[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match: RegExpExecArray | null;
  while ((match = entryRegex.exec(xml)) !== null && items.length < MAX_ITEMS_PER_FEED) {
    const block = match[1];
    const title = extractText(block, "title");
    const link =
      extractAttr(block, "link", "href") ||
      extractText(block, "link");
    const description =
      extractText(block, "summary") ||
      extractText(block, "content");
    const pubDate =
      extractText(block, "published") ||
      extractText(block, "updated");
    if (!title) continue;
    items.push({
      feedId,
      feedName,
      feedCategory,
      title,
      link,
      description: description.slice(0, 400),
      pubDate: pubDate || null,
      pubDateIso: parseDate(pubDate),
    });
  }
  return items;
}

export function parseFeed(xml: string, feedId: string, feedName: string, feedCategory: string): RSSItem[] {
  const isAtom = /<feed[\s>]/i.test(xml);
  return isAtom
    ? parseAtom(xml, feedId, feedName, feedCategory)
    : parseRSS2(xml, feedId, feedName, feedCategory);
}

// ── Fallback-URL-Kandidaten ──────────────────────────────────────────────────

function fallbackUrls(url: string): string[] {
  const candidates: string[] = [];

  // TYPO3-Pattern: ?type=9818 oder rss?type=9818 → /rss, /feed, /aktuelles/rss
  if (url.includes("type=9818")) {
    const base = url.replace(/\/?(rss)?\?type=9818.*$/, "");
    candidates.push(`${base}/rss`, `${base}/feed`, `${base}/aktuelles/rss`);
  }

  // LZ-Pattern: Bindestriche im letzten Pfadsegment → ohne Bindestrich
  const lzHyphen = url.match(/^(https?:\/\/www\.lz\.de\/.+\/)([^/]+)(\/index\.rss)$/);
  if (lzHyphen && lzHyphen[2].includes("-")) {
    candidates.push(`${lzHyphen[1]}${lzHyphen[2].replace(/-/g, "")}${lzHyphen[3]}`);
  }

  return candidates;
}

// ── Einzelner Fetch-Versuch ──────────────────────────────────────────────────

export async function tryFetch(url: string): Promise<{ ok: boolean; xml?: string; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "RadioResearchTool/1.0 (Next.js)" },
      next: { revalidate: 0 },
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, status: res.status };
    const xml = await res.text();
    return { ok: true, xml, status: res.status };
  } catch (e) {
    clearTimeout(timer);
    const isTimeout = e instanceof Error && e.name === "AbortError";
    return { ok: false, status: isTimeout ? 408 : 0 };
  }
}

// ── Fetch with timeout + automatic fallback ──────────────────────────────────

async function fetchFeed(
  feedId: string,
  feedName: string,
  feedCategory: string,
  url: string
): Promise<{ items: RSSItem[]; result: FeedResult }> {

  // Primärer Versuch
  const primary = await tryFetch(url);
  if (primary.ok && primary.xml) {
    const items = parseFeed(primary.xml, feedId, feedName, feedCategory);
    return { items, result: { feedId, feedName, status: "ok", itemCount: items.length } };
  }

  // Fallback-Versuche bei HTTP-Fehler (nicht bei Timeout)
  if (primary.status !== 408) {
    for (const candidate of fallbackUrls(url)) {
      const fb = await tryFetch(candidate);
      if (fb.ok && fb.xml) {
        const items = parseFeed(fb.xml, feedId, feedName, feedCategory);
        return {
          items,
          result: {
            feedId, feedName, status: "ok", itemCount: items.length,
            resolvedUrl: candidate,
          },
        };
      }
    }
  }

  // Alles fehlgeschlagen
  const isTimeout = primary.status === 408;
  return {
    items: [],
    result: {
      feedId, feedName,
      status: isTimeout ? "timeout" : "error",
      itemCount: 0,
      error: isTimeout ? "Timeout" : `HTTP ${primary.status}`,
    },
  };
}

// ── Route handler ────────────────────────────────────────────────────────────

type FeedInput = { id: string; name: string; url: string; category: string };

export async function POST(req: NextRequest) {
  const body: { feeds?: FeedInput[]; priorities?: FeedPriority[] } =
    await req.json().catch(() => ({}));

  // Bevorzugt: kuratierte Feed-Liste vom Client. Fallback: statische Defaults.
  const feeds: FeedInput[] =
    Array.isArray(body.feeds) && body.feeds.length > 0
      ? body.feeds
      : RSS_FEEDS
          .filter((f) => (body.priorities ?? ["primary", "secondary"]).includes(f.priority))
          .map((f) => ({ id: f.id, name: f.name, url: f.url, category: f.category }));

  const results = await Promise.all(
    feeds.map((f) => fetchFeed(f.id, f.name, f.category, f.url))
  );

  const allItems = results.flatMap((r) => r.items);
  const feedResults = results.map((r) => r.result);

  // Sort by date descending (null dates go last)
  allItems.sort((a, b) => {
    if (!a.pubDateIso && !b.pubDateIso) return 0;
    if (!a.pubDateIso) return 1;
    if (!b.pubDateIso) return -1;
    return b.pubDateIso.localeCompare(a.pubDateIso);
  });

  return NextResponse.json({ items: allItems, feedResults } satisfies FetchRSSResponse);
}
