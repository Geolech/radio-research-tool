"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { HifiDevice } from "@/lib/types";

// ─── Farben (identisch mit catalog-pdf.tsx) ───────────────────────────────────
const C = {
  bg:         "#FAFAF8",
  dark:       "#1C1917",
  mid:        "#57534E",
  light:      "#A8A29E",
  rule:       "#D6D3D1",
  stone:      "#F5F5F4",
  amber:      "#B45309",
  amberLight: "#FEF3C7",
};

const FONT = "Georgia,serif";

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

function fmtEur(v?: number | null): string {
  if (v == null) return "–";
  return v.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " €";
}

function splitDesc(device: HifiDevice): { right: string; overflow: string | null } {
  const desc = device.description ?? "";
  if (!desc) return { right: "", overflow: null };
  const specsCount = Object.keys(device.specs ?? {}).length;
  const hasPrice   = device.purchasePrice != null || device.currentValue != null;
  const specsMm    = specsCount > 0 ? 10 + specsCount * 5 : 0;
  const priceMm    = hasPrice ? 26 : 0;
  const availMm    = Math.max(158 - 28 - specsMm - priceMm, 10);
  const availChars = Math.floor(availMm / 5) * 42;
  if (desc.length <= availChars) return { right: desc, overflow: null };
  const spaceIdx = desc.lastIndexOf(" ", availChars);
  const splitAt  = spaceIdx > availChars * 0.6 ? spaceIdx : availChars;
  return { right: desc.slice(0, splitAt).trimEnd(), overflow: desc.slice(splitAt).trimStart() };
}

function groupByCategory(devices: HifiDevice[]): Map<string, HifiDevice[]> {
  const map = new Map<string, HifiDevice[]>();
  for (const d of devices) {
    if (!map.has(d.category)) map.set(d.category, []);
    map.get(d.category)!.push(d);
  }
  return map;
}

// ─── Seiten-HTML ──────────────────────────────────────────────────────────────

function coverHTML(devices: HifiDevice[]): string {
  const coverDevice = devices.find((d) => d.imageUrl) ?? devices[0];
  const imgStyle    = coverDevice?.imageUrl
    ? `background-image:url('${coverDevice.imageUrl}');background-size:cover;background-position:center;`
    : "";
  const catCount = new Set(devices.map((d) => d.category)).size;
  const date     = new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  return `<div style="width:100%;height:100%;${imgStyle}background-color:${C.dark};position:relative;overflow:hidden;font-family:${FONT};">
  <div style="position:absolute;inset:0;background:rgba(28,25,23,0.52);"></div>
  <div style="position:absolute;bottom:0;left:0;right:0;padding:22px;background:rgba(28,25,23,0.90);box-sizing:border-box;">
    <p style="font-size:7px;color:${C.amber};letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;font-family:${FONT};">Privatsammlung</p>
    <p style="font-size:26px;font-weight:bold;color:#FAFAF8;margin:0;line-height:1.15;font-family:${FONT};">HiFi-Bibliothek</p>
    <p style="font-size:11px;color:${C.light};margin:4px 0 0;font-family:${FONT};">${devices.length} Geräte · ${catCount} Kategorien</p>
    <p style="font-size:8px;color:#78716C;margin:10px 0 0;font-family:${FONT};">${date}</p>
  </div>
  <p style="position:absolute;bottom:8px;right:12px;font-size:8px;color:${C.mid};font-family:${FONT};">1</p>
</div>`;
}

function tocHTML(devices: HifiDevice[]): string {
  const grouped = groupByCategory(devices);
  const pageOf  = new Map<string, number>();
  devices.forEach((d, i) => pageOf.set(d.id, 3 + i * 2));
  const summaryPageNum = 3 + devices.length * 2;

  let rows = "";
  for (const [cat, devs] of grouped.entries()) {
    rows += `<p style="font-size:7px;color:${C.amber};letter-spacing:1.5px;text-transform:uppercase;margin:10px 0 4px;padding-bottom:3px;border-bottom:.5px solid ${C.rule};font-family:${FONT};">${cat}</p>`;
    for (const d of devs) {
      const pg    = pageOf.get(d.id) ?? 0;
      const title = `${d.brand} ${d.model}`;
      rows += `<div style="display:flex;align-items:baseline;margin-bottom:4px;">
  <span style="font-size:9px;color:${C.dark};flex-shrink:0;max-width:55%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:${FONT};">${title}</span>
  <span style="flex:1;border-bottom:.5px dotted ${C.rule};margin:0 4px 2px;min-width:8px;"></span>
  <span style="font-size:9px;color:${C.mid};flex-shrink:0;font-family:${FONT};">${pg}</span>
</div>`;
    }
  }
  rows += `<div style="display:flex;align-items:baseline;margin-top:14px;padding-top:9px;border-top:.5px solid ${C.rule};">
  <span style="font-size:9px;color:${C.dark};font-weight:bold;flex-shrink:0;font-family:${FONT};">Versicherungsübersicht</span>
  <span style="flex:1;border-bottom:.5px dotted ${C.rule};margin:0 4px 2px;min-width:8px;"></span>
  <span style="font-size:9px;color:${C.mid};flex-shrink:0;font-family:${FONT};">${summaryPageNum}</span>
</div>`;

  return `<div style="width:100%;height:100%;background:${C.bg};padding:22px 22px 28px;box-sizing:border-box;overflow:hidden;position:relative;font-family:${FONT};">
  <p style="font-size:7px;color:${C.amber};letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;font-family:${FONT};">Inhaltsverzeichnis</p>
  ${rows}
  <p style="position:absolute;bottom:8px;right:12px;font-size:8px;color:${C.light};font-family:${FONT};">2</p>
</div>`;
}

function photoHTML(device: HifiDevice, pageNum: number, overflowText: string | null): string {
  const imgCss = device.imageUrl
    ? `background-image:url('${device.imageUrl}');background-size:cover;background-position:center;`
    : "";
  const noImgFallback = !device.imageUrl
    ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;"><div style="width:48px;height:48px;border-radius:50%;border:1.5px solid #57534E;"></div></div>`
    : "";
  const overflowBlock = overflowText
    ? `<div style="border-top:.5px solid #57534E;margin-top:8px;padding-top:8px;"><p style="font-size:8px;color:${C.light};line-height:1.55;margin:0;font-family:${FONT};">${overflowText}</p></div>`
    : "";
  return `<div style="width:100%;height:100%;${imgCss}background-color:${C.dark};position:relative;overflow:hidden;font-family:${FONT};">
  ${noImgFallback}
  <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.10) 0%,transparent 35%,rgba(0,0,0,.78) 100%);pointer-events:none;"></div>
  <div style="position:absolute;bottom:0;left:0;right:0;padding:16px 16px 22px;background:rgba(28,25,23,0.90);box-sizing:border-box;">
    <p style="font-size:7px;color:${C.amber};letter-spacing:2px;text-transform:uppercase;margin:0 0 4px;font-family:${FONT};">${device.category}</p>
    <p style="font-size:18px;font-weight:bold;color:#FAFAF8;margin:0;line-height:1.1;font-family:${FONT};">${device.brand}</p>
    <p style="font-size:12px;color:#D6D3D1;margin:2px 0 0;font-family:${FONT};">${device.model}</p>
    ${device.year ? `<p style="font-size:8px;color:#78716C;margin:3px 0 0;font-family:${FONT};">${device.year}</p>` : ""}
    ${overflowBlock}
  </div>
  <p style="position:absolute;bottom:8px;right:12px;font-size:8px;color:#57534E;font-family:${FONT};">${pageNum}</p>
</div>`;
}

function infoHTML(device: HifiDevice, pageNum: number, rightText: string): string {
  const specs = Object.entries(device.specs ?? {}).slice(0, 12);
  const hasPx = device.purchasePrice != null || device.currentValue != null;

  const descBlock = rightText
    ? `<p style="font-size:9px;color:${C.mid};line-height:1.55;margin:0 0 14px;font-family:${FONT};">${rightText}</p>`
    : "";

  const specsBlock = specs.length > 0 ? `<div style="margin-bottom:12px;">
  <p style="font-size:7px;color:${C.amber};letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;font-family:${FONT};">Spezifikationen</p>
  ${specs.map(([k, v]) => `<div style="display:flex;padding:3px 0;border-bottom:.3px solid ${C.rule};">
    <span style="font-size:8px;color:${C.light};width:42%;flex-shrink:0;font-family:${FONT};">${k}</span>
    <span style="font-size:8px;color:${C.dark};font-family:${FONT};">${v}</span>
  </div>`).join("")}
</div>` : "";

  const priceBlock = hasPx ? `<div style="background:${C.amberLight};border:.5px solid #FDE68A;border-radius:4px;padding:8px 10px;display:flex;gap:18px;margin-bottom:12px;">
  ${device.purchasePrice != null ? `<div><p style="font-size:7px;color:${C.amber};margin:0;font-family:${FONT};">Kaufpreis</p><p style="font-size:11px;font-weight:bold;color:${C.amber};margin:2px 0 0;font-family:${FONT};">${fmtEur(device.purchasePrice)}</p></div>` : ""}
  ${device.currentValue != null ? `<div><p style="font-size:7px;color:${C.amber};margin:0;font-family:${FONT};">Zeitwert</p><p style="font-size:11px;font-weight:bold;color:${C.amber};margin:2px 0 0;font-family:${FONT};">${fmtEur(device.currentValue)}</p></div>` : ""}
</div>` : "";

  return `<div style="width:100%;height:100%;background:${C.bg};padding:22px 20px 28px;box-sizing:border-box;overflow:hidden;position:relative;font-family:${FONT};">
  <p style="font-size:7px;color:${C.amber};letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;font-family:${FONT};">${device.category}</p>
  <p style="font-size:17px;font-weight:bold;color:${C.dark};margin:0;line-height:1.1;font-family:${FONT};">${device.brand}</p>
  <p style="font-size:11px;color:${C.mid};margin:2px 0 10px;font-family:${FONT};">${device.model}</p>
  <div style="border-bottom:.5px solid ${C.rule};margin-bottom:10px;"></div>
  ${descBlock}
  ${specsBlock}
  ${priceBlock}
  <p style="position:absolute;bottom:8px;right:12px;font-size:8px;color:${C.light};font-family:${FONT};">${pageNum}</p>
</div>`;
}

function summaryHTML(devices: HifiDevice[], pageNum: number): string {
  const totalKauf = devices.reduce((s, d) => s + (d.purchasePrice ?? 0), 0);
  const totalZeit = devices.reduce((s, d) => s + (d.currentValue  ?? 0), 0);
  const withValue = devices.filter((d) => d.currentValue != null || d.purchasePrice != null);

  const tableRows = devices.map((d, i) => `<div style="display:flex;padding:4px 6px;border-bottom:.3px solid ${C.rule};${i % 2 === 1 ? `background:${C.stone};` : ""}">
  <span style="font-size:7.5px;color:${C.mid};width:6%;flex-shrink:0;font-family:${FONT};">${i + 1}</span>
  <span style="font-size:7.5px;color:${C.dark};width:40%;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:${FONT};">${d.brand} ${d.model}</span>
  <span style="font-size:7.5px;color:${C.mid};width:20%;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:${FONT};">${d.category}</span>
  <span style="font-size:7.5px;color:${C.mid};width:17%;flex-shrink:0;text-align:right;font-family:${FONT};">${fmtEur(d.purchasePrice)}</span>
  <span style="font-size:7.5px;color:${C.dark};width:17%;flex-shrink:0;text-align:right;font-family:${FONT};">${fmtEur(d.currentValue)}</span>
</div>`).join("");

  const footNote = withValue.length < devices.length
    ? `<p style="font-size:7px;color:${C.light};margin-top:8px;font-family:${FONT};">* ${devices.length - withValue.length} Geräte ohne Preisangabe</p>`
    : "";

  return `<div style="width:100%;height:100%;background:${C.bg};padding:22px 20px 28px;box-sizing:border-box;overflow:hidden;position:relative;font-family:${FONT};">
  <p style="font-size:7px;color:${C.amber};letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;font-family:${FONT};">Anhang</p>
  <p style="font-size:14px;font-weight:bold;color:${C.dark};margin:0 0 12px;font-family:${FONT};">Versicherungsübersicht</p>
  <div style="display:flex;padding:5px 6px;background:${C.dark};border-radius:3px;margin-bottom:2px;">
    <span style="font-size:7px;color:#FAFAF8;font-weight:bold;width:6%;flex-shrink:0;font-family:${FONT};">Nr.</span>
    <span style="font-size:7px;color:#FAFAF8;font-weight:bold;width:40%;flex-shrink:0;font-family:${FONT};">Gerät</span>
    <span style="font-size:7px;color:#FAFAF8;font-weight:bold;width:20%;flex-shrink:0;font-family:${FONT};">Kategorie</span>
    <span style="font-size:7px;color:#FAFAF8;font-weight:bold;width:17%;flex-shrink:0;text-align:right;font-family:${FONT};">Kaufpreis</span>
    <span style="font-size:7px;color:#FAFAF8;font-weight:bold;width:17%;flex-shrink:0;text-align:right;font-family:${FONT};">Zeitwert</span>
  </div>
  ${tableRows}
  <div style="display:flex;padding:6px 6px;background:${C.amberLight};border-radius:3px;margin-top:4px;">
    <span style="font-size:7.5px;font-weight:bold;color:${C.amber};flex:1;font-family:${FONT};">Gesamt (${devices.length} Geräte)</span>
    <span style="font-size:7.5px;font-weight:bold;color:${C.amber};width:17%;text-align:right;font-family:${FONT};">${totalKauf > 0 ? fmtEur(totalKauf) : "–"}</span>
    <span style="font-size:7.5px;font-weight:bold;color:${C.amber};width:17%;text-align:right;font-family:${FONT};">${totalZeit > 0 ? fmtEur(totalZeit) : "–"}</span>
  </div>
  ${footNote}
  <p style="font-size:7px;color:${C.light};margin-top:10px;font-family:${FONT};">Erstellt am ${new Date().toLocaleDateString("de-DE")} · Frank Lechtenberg · Privatsammlung</p>
  <p style="position:absolute;bottom:8px;right:12px;font-size:8px;color:${C.light};font-family:${FONT};">${pageNum}</p>
</div>`;
}

function backCoverHTML(): string {
  return `<div style="width:100%;height:100%;background:${C.dark};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;box-sizing:border-box;font-family:${FONT};">
  <div style="width:28px;height:1px;background:${C.amber};margin:0 auto 18px;"></div>
  <p style="font-size:11px;color:${C.mid};letter-spacing:.18em;text-transform:uppercase;text-align:center;margin:0;font-family:${FONT};">Frank Lechtenberg</p>
  <p style="font-size:8px;color:#44403C;text-align:center;margin:8px 0 0;font-family:${FONT};">Privatsammlung · ${new Date().getFullYear()}</p>
</div>`;
}

// ─── Seitenstruktur ───────────────────────────────────────────────────────────
// Index 0        : Titelseite (hard cover)
// Index 1        : Inhaltsverzeichnis
// Index 2 + 2i   : Foto-Seite Gerät i  (i = 0 … N-1)
// Index 3 + 2i   : Info-Seite Gerät i
// Index 2 + 2N   : Versicherungsübersicht
// Index 3 + 2N   : Rückseite (hard cover)
// Gesamt         : N*2 + 4

// ─── Komponente ──────────────────────────────────────────────────────────────

export default function DeviceFlipBook({ devices }: { devices: HifiDevice[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const flipRef      = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [ready,       setReady]       = useState(false);
  const [initError,   setInitError]   = useState<string | null>(null);

  const N              = devices.length;
  const totalPageCount = N * 2 + 4;
  const categoryCount  = new Set(devices.map((d) => d.category)).size;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Cancelled-Flag für React StrictMode (doppelter Effect-Aufruf in Dev)
    let cancelled = false;
    let pf: any;
    let rafId: number;

    // ── 1. Seiten-Divs imperativ anlegen ─────────────────────────────────────
    const pageDivs: HTMLDivElement[] = [];
    for (let i = 0; i < totalPageCount; i++) {
      const div       = document.createElement("div");
      div.className   = "flip-page";
      div.style.cssText = "overflow:hidden;";
      container.appendChild(div);
      pageDivs.push(div);
    }

    // ── 2. Seiteninhalte befüllen ─────────────────────────────────────────────
    pageDivs[0].innerHTML = coverHTML(devices);
    pageDivs[1].innerHTML = tocHTML(devices);
    devices.forEach((device, i) => {
      const { right, overflow } = splitDesc(device);
      pageDivs[2 + i * 2].innerHTML = photoHTML(device, 3 + i * 2, overflow);
      pageDivs[3 + i * 2].innerHTML = infoHTML(device,  4 + i * 2, right);
    });
    pageDivs[2 + N * 2].innerHTML = summaryHTML(devices, 3 + N * 2);
    pageDivs[3 + N * 2].innerHTML = backCoverHTML();

    // ── 3. page-flip nach Layout-Frame initialisieren ─────────────────────────
    // requestAnimationFrame stellt sicher, dass der Container gerendert und
    // dimensioniert ist, bevor PageFlip den Container übernimmt.
    rafId = requestAnimationFrame(() => {
      if (cancelled) return;

      import("page-flip")
        .then(({ PageFlip, SizeType }) => {
          if (cancelled || !containerRef.current) return;
          try {
            pf = new PageFlip(container, {
              width:               380,
              height:              540,
              size:                SizeType.STRETCH,
              minWidth:            200,
              maxWidth:            420,
              minHeight:           280,
              maxHeight:           1080,
              drawShadow:          true,
              flippingTime:        700,
              usePortrait:         true,
              showCover:           true,
              mobileScrollSupport: true,
              showPageCorners:     true,
              maxShadowOpacity:    0.5,
              autoSize:            true,
            });

            pf.loadFromHTML(pageDivs);
            flipRef.current = pf;

            if (!cancelled) {
              setReady(true);
              pf.on("flip", (e: { data: number }) => setCurrentPage(e.data));
            }
          } catch (err) {
            console.error("[FlipBook] Initialisierungsfehler:", err);
            if (!cancelled) setInitError(String(err));
          }
        })
        .catch((err) => {
          console.error("[FlipBook] Import-Fehler:", err);
          if (!cancelled) setInitError(String(err));
        });
    });

    // ── 4. Cleanup ────────────────────────────────────────────────────────────
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      try { pf?.destroy?.(); } catch { /* ignore */ }
      flipRef.current = null;
      pageDivs.forEach((d) => d.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const flipNext = useCallback(() => flipRef.current?.flipNext(), []);
  const flipPrev = useCallback(() => flipRef.current?.flipPrev(), []);
  const goTo     = useCallback((page: number) => flipRef.current?.flip(page), []);

  // Aktuelles Gerät (Seiten 2..2N+1 gehören zu Geräten)
  const deviceIndex =
    currentPage >= 2 && currentPage <= 1 + N * 2
      ? Math.floor((currentPage - 2) / 2)
      : -1;
  const currentDevice = deviceIndex >= 0 ? devices[deviceIndex] : null;
  const isToc     = currentPage === 1;
  const isSummary = currentPage === 2 + N * 2;
  const isBack    = currentPage >= 3 + N * 2;

  const posLabel = isBack
    ? "Rückseite"
    : isSummary
      ? "Versicherungsübersicht"
      : isToc
        ? "Inhaltsverzeichnis"
        : currentDevice
          ? `${currentDevice.brand} ${currentDevice.model}`
          : "HiFi-Bibliothek";

  const posSubLabel = currentDevice
    ? currentDevice.category
    : currentPage === 0
      ? `${N} Geräte · ${categoryCount} Kategorien`
      : null;

  return (
    <div className="flex flex-col items-center gap-6 w-full">

      {/* Wrapper mit relativer Positionierung für den Skeleton-Overlay */}
      <div className="relative w-full">
        {/* page-flip Container — Kinder werden imperativ injiziert */}
        <div ref={containerRef} className="w-full" />

        {/* Skeleton-Overlay verdeckt die flache Seitenliste während der Initialisierung */}
        {!ready && !initError && (
          <div className="absolute inset-0 z-10 bg-zinc-950 flex items-center justify-center"
               style={{ minHeight: "400px" }}>
            <div className="w-full max-w-sm h-64 rounded-2xl bg-zinc-900 border border-zinc-800 animate-pulse" />
          </div>
        )}
      </div>

      {/* Fehlermeldung */}
      {initError && (
        <div className="w-full max-w-lg rounded-xl bg-red-950 border border-red-800 px-5 py-4 text-sm text-red-300">
          <p className="font-semibold mb-1">Flipbook konnte nicht geladen werden</p>
          <p className="font-mono text-xs text-red-400 break-all">{initError}</p>
        </div>
      )}

      {/* Navigationsleiste */}
      {ready && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg">
          <button
            onClick={flipPrev}
            className="w-9 h-9 flex items-center justify-center rounded-xl
                       text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
            aria-label="Zurückblättern"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                 stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3L5 8l5 5" />
            </svg>
          </button>

          <div className="text-center min-w-[200px]">
            <p className="text-sm font-medium text-zinc-200 leading-snug">{posLabel}</p>
            {posSubLabel && (
              <p className="text-[10px] text-zinc-600 mt-0.5">{posSubLabel}</p>
            )}
          </div>

          <button
            onClick={flipNext}
            className="w-9 h-9 flex items-center justify-center rounded-xl
                       text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
            aria-label="Weiterblättern"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                 stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3l5 5-5 5" />
            </svg>
          </button>
        </div>
      )}

      {/* Punkt-Navigation — ein Punkt pro Gerät */}
      {ready && (
        <div className="flex flex-wrap justify-center gap-1.5 max-w-sm">
          {devices.map((device, i) => {
            const active = deviceIndex === i;
            return (
              <button
                key={device.id}
                onClick={() => goTo(2 + i * 2)}
                title={`${device.brand} ${device.model}`}
                className={`rounded-full transition-all duration-200 ${
                  active
                    ? "w-4 h-2 bg-amber-500"
                    : "w-2 h-2 bg-zinc-700 hover:bg-zinc-500"
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
