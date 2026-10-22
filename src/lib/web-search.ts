// ── Websuche für die Gegenprüfung einzelner Meldungen ──────────────────────────
// Kette ohne API-Key: 1) DuckDuckGo HTML, 2) Bing News RSS, 3) Google News RSS.
// Keiner davon ist eine offizielle Such-API — fällt einer aus (Layout geändert,
// Bot-Abfrage), springt die Kette zum nächsten. Erst wenn alle ausfallen, meldet
// searchWeb() WebSearchUnavailable. Weitere Anbieter hier ergänzen, ohne Route/UI.

export type WebHit = { title: string; url: string; snippet: string; domain: string };
export type WebSearchEngine = "DuckDuckGo" | "Bing News" | "Google News";

export class WebSearchUnavailable extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "WebSearchUnavailable";
  }
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// Mindestabstand zwischen zwei Suchanfragen (prozessweit), um nicht geblockt zu werden.
const MIN_GAP_MS = 2500;
let lastRequestAt = 0;
let queue: Promise<void> = Promise.resolve();

function throttle(): Promise<void> {
  const next = queue.then(async () => {
    const wait = lastRequestAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
  });
  queue = next.catch(() => undefined);
  return next;
}

function decodeEntities(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

// DuckDuckGo verpackt Ziel-URLs als Redirect: //duckduckgo.com/l/?uddg=<encoded>&rut=…
function resolveHref(href: string): string | null {
  try {
    const abs = href.startsWith("//") ? "https:" + href : href;
    const u = new URL(abs, "https://duckduckgo.com");
    const target = u.searchParams.get("uddg");
    const final = target ? decodeURIComponent(target) : u.toString();
    const fu = new URL(final);
    if (fu.protocol !== "http:" && fu.protocol !== "https:") return null;
    if (fu.hostname.endsWith("duckduckgo.com")) return null; // Werbung / interne Links
    return fu.toString();
  } catch {
    return null;
  }
}

export function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Felder kürzen: Fremdtext geht in den KI-Prompt und in die UI.
function clampHit(h: WebHit): WebHit {
  return { title: h.title.slice(0, 300), url: h.url.slice(0, 2000), snippet: h.snippet.slice(0, 500), domain: h.domain.slice(0, 120) };
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

async function searchDuckDuckGo(query: string, max: number): Promise<WebHit[]> {
  await throttle();
  let res: Response;
  try {
    res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept-Language": "de-DE,de;q=0.9",
      },
      body: new URLSearchParams({ q: query, kl: "de-de" }).toString(),
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new WebSearchUnavailable("Websuche nicht erreichbar (Netzwerk/Zeitüberschreitung).");
  }
  if (!res.ok) throw new WebSearchUnavailable(`Websuche antwortet mit Status ${res.status}.`);
  const html = (await res.text()).slice(0, 600_000);
  if (/anomaly-modal|challenge-form/i.test(html)) {
    throw new WebSearchUnavailable("Websuche hat die Anfrage vorübergehend blockiert.");
  }

  const hits: WebHit[] = [];
  // Jeder Treffer: <a … class="result__a" href="…">Titel</a> … <a class="result__snippet" …>Snippet</a>
  const blocks = html.split(/class="result__body"|class="result results_links/).slice(1);
  for (const block of blocks) {
    const a = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
      ?? block.match(/<a[^>]*href="([^"]+)"[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/);
    if (!a) continue;
    const url = resolveHref(decodeEntities(a[1]));
    if (!url) continue;
    const sn = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div|td)>/);
    const hit: WebHit = {
      title: decodeEntities(a[2]),
      url,
      snippet: sn ? decodeEntities(sn[1]) : "",
      domain: domainOf(url),
    };
    if (!hits.some((h) => h.url === hit.url)) hits.push(hit);
    if (hits.length >= max) break;
  }
  return hits;
}

function tag(item: string, name: string): string {
  const m = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decodeEntities(m[1].replace(/^<!\\[CDATA\\[|\\]\\]>$/g, "")) : "";
}

async function fetchRss(url: string): Promise<string> {
  await throttle();
  let res: Response;
  try {
    res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "de-DE,de;q=0.9" }, signal: AbortSignal.timeout(12_000) });
  } catch {
    throw new WebSearchUnavailable("Newssuche nicht erreichbar.");
  }
  if (!res.ok) throw new WebSearchUnavailable(`Newssuche antwortet mit Status ${res.status}.`);
  const xml = (await res.text()).slice(0, 600_000);
  if (!/<rss|<channel/i.test(xml)) throw new WebSearchUnavailable("Newssuche liefert kein RSS.");
  return xml;
}

async function searchBingNews(query: string, max: number): Promise<WebHit[]> {
  const xml = await fetchRss(`https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss&setlang=de&cc=de`);
  const hits: WebHit[] = [];
  for (const item of xml.split("<item>").slice(1)) {
    const link = tag(item, "link");
    let url = link;
    try {
      const target = new URL(link).searchParams.get("url");
      if (target) url = target; // Bing-Klick-Redirect auflösen
    } catch { continue; }
    const domain = domainOf(url);
    if (!domain) continue;
    hits.push({ title: tag(item, "title"), url, snippet: tag(item, "description"), domain });
    if (hits.length >= max) break;
  }
  return hits;
}

async function searchGoogleNews(query: string, max: number): Promise<WebHit[]> {
  const xml = await fetchRss(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=de&gl=DE&ceid=DE:de`);
  const hits: WebHit[] = [];
  for (const item of xml.split("<item>").slice(1)) {
    const src = item.match(/<source url="([^"]+)"[^>]*>([\s\S]*?)<\/source>/);
    const domain = src ? domainOf(decodeEntities(src[1])) : "";
    if (!domain) continue;
    const name = src ? decodeEntities(src[2]) : "";
    let title = tag(item, "title");
    if (name && title.endsWith(` - ${name}`)) title = title.slice(0, -(name.length + 3));
    // Google liefert keinen Textauszug; Titel dient als Grundlage für den Abgleich.
    hits.push({ title, url: tag(item, "link"), snippet: "", domain });
    if (hits.length >= max) break;
  }
  return hits;
}

const ENGINES: Array<[WebSearchEngine, (q: string, max: number) => Promise<WebHit[]>]> = [
  ["DuckDuckGo", searchDuckDuckGo],
  ["Bing News", searchBingNews],
  ["Google News", searchGoogleNews],
];

export async function searchWeb(query: string, max = 10): Promise<{ hits: WebHit[]; engine: WebSearchEngine }> {
  const errors: string[] = [];
  for (const [engine, fn] of ENGINES) {
    try {
      const hits = (await fn(query, max)).filter((h) => isHttpUrl(h.url)).map(clampHit);
      if (hits.length > 0) return { hits, engine };
      errors.push(`${engine}: keine Treffer`);
    } catch (e) {
      errors.push(`${engine}: ${e instanceof Error ? e.message : "Fehler"}`);
    }
  }
  // Alle Anbieter leer, aber mindestens einer erreichbar → echtes "nichts gefunden"
  if (errors.some((e) => e.endsWith("keine Treffer"))) return { hits: [], engine: "DuckDuckGo" };
  throw new WebSearchUnavailable(errors.join(" · "));
}
