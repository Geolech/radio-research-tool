"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Spread-Berechnung ────────────────────────────────────────────────────────
// Spread 0          : [null, page0]         ← Titelseite allein rechts
// Spread k (k ≥ 1) : [page(2k-1), page(2k)]
// Letzter Spread    : [page(N-1), null]     ← Rückseite allein links (wenn N gerade)

function totalSpreads(n: number): number {
  if (n === 0) return 1;
  return Math.floor(n / 2) + 1;
}

function spreadPages(
  s: number,
  pages: string[],
): [string | null, string | null] {
  const n = pages.length;
  if (s === 0) return [null, n > 0 ? pages[0] : null];
  const li = 2 * s - 1;
  const ri = 2 * s;
  return [
    li < n ? pages[li] : null,
    ri < n ? pages[ri] : null,
  ];
}

// ─── Seiten-Platzhalter ───────────────────────────────────────────────────────
function PageSlot({
  src,
  side,
  isLoading,
}: {
  src: string | null;
  side: "left" | "right";
  isLoading?: boolean;
}) {
  return (
    <div
      className={`relative w-full h-full overflow-hidden ${
        side === "left" ? "rounded-l-sm" : "rounded-r-sm"
      }`}
      style={{ background: src ? "transparent" : "#1C1917" }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover select-none pointer-events-none"
          draggable={false}
        />
      ) : isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-zinc-950" />
      )}
      {/* Buchbindungs-Schatten */}
      {side === "left" && (
        <div
          className="absolute inset-y-0 right-0 w-8 pointer-events-none"
          style={{
            background:
              "linear-gradient(to left, rgba(0,0,0,0.25), transparent)",
          }}
        />
      )}
      {side === "right" && (
        <div
          className="absolute inset-y-0 left-0 w-8 pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, rgba(0,0,0,0.25), transparent)",
          }}
        />
      )}
    </div>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export default function BookViewer() {
  const [pages, setPages] = useState<string[]>([]);
  const [numPdfPages, setNumPdfPages] = useState(0);
  const [loadState, setLoadState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [loadProgress, setLoadProgress] = useState(0);
  const [spread, setSpread] = useState(0);

  // Flip-Animation
  type FlipDir = "next" | "prev";
  const [flipping, setFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState<FlipDir>("next");
  const [flipAngle, setFlipAngle] = useState(0);
  const [transitionOn, setTransitionOn] = useState(false);
  // Snapshots für die Flip-Animation
  const [flipFront, setFlipFront] = useState<string | null>(null);
  const [flipBack, setFlipBack] = useState<string | null>(null);
  const [bgPage, setBgPage] = useState<string | null>(null);

  // ── PDF laden und Seiten rendern ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");

    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const pdf = await pdfjsLib.getDocument("/api/export-pdf").promise;
        if (cancelled) return;

        const n = pdf.numPages;
        setNumPdfPages(n);
        const rendered: string[] = [];

        for (let i = 1; i <= n; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.5 });
          const canvas = document.createElement("canvas");
          canvas.width  = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          const url = canvas.toDataURL("image/jpeg", 0.88);
          rendered.push(url);
          if (!cancelled) {
            setPages([...rendered]);
            setLoadProgress(i / n);
          }
        }

        if (!cancelled) setLoadState("ready");
      } catch (err) {
        console.error("[BookViewer]", err);
        if (!cancelled) setLoadState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Keyboard-Navigation ───────────────────────────────────────────────────
  const canNext = spread < totalSpreads(pages.length) - 1 && !flipping;
  const canPrev = spread > 0 && !flipping;

  const doFlip = useCallback(
    (dir: FlipDir) => {
      if (flipping) return;
      if (dir === "next" && !canNext) return;
      if (dir === "prev" && !canPrev) return;

      const ns = dir === "next" ? spread + 1 : spread - 1;
      const [curL, curR] = spreadPages(spread, pages);
      const [nxL, nxR]   = spreadPages(ns,     pages);

      if (dir === "next") {
        setFlipFront(curR);   // Vorderseite = aktuelle rechte Seite
        setFlipBack(nxL);     // Rückseite   = nächste linke Seite
        setBgPage(nxR);       // darunter    = nächste rechte Seite
      } else {
        setFlipFront(curL);   // Vorderseite = aktuelle linke Seite
        setFlipBack(nxR);     // Rückseite   = vorherige rechte Seite
        setBgPage(nxL);       // darunter    = vorherige linke Seite
      }

      setFlipDir(dir);
      setFlipAngle(0);
      setFlipping(true);

      // Transition an, dann Winkel setzen
      requestAnimationFrame(() => {
        setTransitionOn(true);
        requestAnimationFrame(() => {
          setFlipAngle(dir === "next" ? -180 : 180);
        });
      });

      // Nach Animation: Spread wechseln, Transition zurücksetzen
      setTimeout(() => {
        setTransitionOn(false);
        setFlipAngle(0);
        setSpread(ns);
        setFlipping(false);
      }, 650);
    },
    [flipping, canNext, canPrev, spread, pages],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") doFlip("next");
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   doFlip("prev");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [doFlip]);

  // ── Aktuelle Seiten ───────────────────────────────────────────────────────
  const [curLeft, curRight] = spreadPages(spread, pages);
  const nSpreads = totalSpreads(pages.length);

  // Welche Seite bleibt statisch während des Flips?
  const staticLeft  = flipDir === "next" ? curLeft  : bgPage;
  const staticRight = flipDir === "next" ? bgPage   : curRight;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-6 w-full select-none">

      {/* ── Lade-Fortschritt ── */}
      {loadState === "loading" && (
        <div className="w-full max-w-2xl flex flex-col items-center gap-4 py-16">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-500 rounded-full animate-spin" />
          <div className="w-64 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${loadProgress * 100}%` }}
            />
          </div>
          <p className="text-xs text-zinc-600">
            {pages.length} / {numPdfPages || "?"} Seiten geladen …
          </p>
        </div>
      )}

      {/* ── Fehler ── */}
      {loadState === "error" && (
        <div className="rounded-xl bg-red-950 border border-red-800 px-6 py-5 text-sm text-red-300 max-w-md text-center">
          <p className="font-semibold mb-1">PDF konnte nicht geladen werden</p>
          <p className="text-red-500 text-xs">
            Stelle sicher, dass der Server läuft und /api/export-pdf erreichbar
            ist.
          </p>
        </div>
      )}

      {/* ── Buchansicht ── */}
      {pages.length > 0 && (
        <>
          {/* Buch-Bühne */}
          <div
            className="relative w-full"
            style={{ perspective: "3000px", maxWidth: "900px" }}
          >
            {/* Äußerer Buchschatten */}
            <div
              className="relative mx-auto"
              style={{
                boxShadow:
                  "0 20px 60px rgba(0,0,0,0.7), 0 8px 20px rgba(0,0,0,0.5)",
                borderRadius: "2px",
              }}
            >
              {/* Buch-Spread (aspect ratio A5 landscape = 2:1.414) */}
              <div
                className="relative overflow-hidden"
                style={{ aspectRatio: "2 / 1.414" }}
              >
                {/* ── Hintergrund-Layer (darunter liegende Seiten) ── */}
                <div
                  className="absolute inset-0 flex"
                  style={{ zIndex: 1 }}
                >
                  <div className="w-1/2 h-full">
                    {flipping && (
                      <PageSlot
                        src={flipDir === "prev" ? bgPage : curLeft}
                        side="left"
                      />
                    )}
                    {!flipping && <PageSlot src={curLeft} side="left" />}
                  </div>
                  <div className="w-1/2 h-full">
                    {flipping && (
                      <PageSlot
                        src={flipDir === "next" ? bgPage : curRight}
                        side="right"
                      />
                    )}
                    {!flipping && <PageSlot src={curRight} side="right" />}
                  </div>
                </div>

                {/* ── Statische Seiten-Layer ── */}
                {!flipping && (
                  <div className="absolute inset-0 flex" style={{ zIndex: 2 }}>
                    <div className="w-1/2 h-full">
                      <PageSlot src={curLeft} side="left" />
                    </div>
                    <div className="w-1/2 h-full">
                      <PageSlot src={curRight} side="right" />
                    </div>
                  </div>
                )}

                {flipping && (
                  <div className="absolute inset-0 flex" style={{ zIndex: 2 }}>
                    {/* Die nicht-flippende Seite bleibt statisch */}
                    {flipDir === "next" && (
                      <>
                        <div className="w-1/2 h-full">
                          <PageSlot src={curLeft} side="left" />
                        </div>
                        <div className="w-1/2 h-full" /> {/* rechts frei für Flip */}
                      </>
                    )}
                    {flipDir === "prev" && (
                      <>
                        <div className="w-1/2 h-full" /> {/* links frei für Flip */}
                        <div className="w-1/2 h-full">
                          <PageSlot src={curRight} side="right" />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── Flipping-Seite (3D-animiert) ── */}
                {flipping && (
                  <div
                    className="absolute inset-y-0 w-1/2"
                    style={{
                      zIndex: 3,
                      transformStyle: "preserve-3d",
                      ...(flipDir === "next"
                        ? { right: 0, transformOrigin: "left center" }
                        : { left: 0, transformOrigin: "right center" }),
                      transform: `rotateY(${flipAngle}deg)`,
                      transition: transitionOn
                        ? "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
                        : "none",
                    }}
                  >
                    {/* Vorderseite */}
                    <div
                      className="absolute inset-0"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <PageSlot
                        src={flipFront}
                        side={flipDir === "next" ? "right" : "left"}
                      />
                      {/* Blätter-Schatten auf der Vorderseite */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `linear-gradient(${
                            flipDir === "next" ? "to right" : "to left"
                          }, rgba(0,0,0,0.18), transparent 60%)`,
                        }}
                      />
                    </div>
                    {/* Rückseite (horizontally gespiegelt) */}
                    <div
                      className="absolute inset-0"
                      style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                      }}
                    >
                      <PageSlot
                        src={flipBack}
                        side={flipDir === "next" ? "left" : "right"}
                      />
                      {/* Blätter-Schatten auf der Rückseite */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `linear-gradient(${
                            flipDir === "next" ? "to left" : "to right"
                          }, rgba(0,0,0,0.18), transparent 60%)`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* ── Buch-Mittelfalz ── */}
                <div
                  className="absolute inset-y-0 left-1/2 -translate-x-px pointer-events-none"
                  style={{
                    zIndex: 10,
                    width: "2px",
                    background:
                      "linear-gradient(to right, rgba(0,0,0,0.4), rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.4))",
                  }}
                />

                {/* ── Klick-Bereiche am Seitenrand ── */}
                <button
                  onClick={() => doFlip("prev")}
                  disabled={!canPrev}
                  className="absolute inset-y-0 left-0 w-16 z-20 cursor-pointer group"
                  aria-label="Zurückblättern"
                  style={{ opacity: canPrev ? 1 : 0 }}
                >
                  <div
                    className="absolute inset-y-0 left-0 w-12 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background:
                        "linear-gradient(to right, rgba(180,83,9,0.12), transparent)",
                    }}
                  />
                </button>
                <button
                  onClick={() => doFlip("next")}
                  disabled={!canNext}
                  className="absolute inset-y-0 right-0 w-16 z-20 cursor-pointer group"
                  aria-label="Weiterblättern"
                  style={{ opacity: canNext ? 1 : 0 }}
                >
                  <div
                    className="absolute inset-y-0 right-0 w-12 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background:
                        "linear-gradient(to left, rgba(180,83,9,0.12), transparent)",
                    }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* ── Navigationsleiste ── */}
          <div className="flex items-center gap-4 px-5 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg">
            <button
              onClick={() => doFlip("prev")}
              disabled={!canPrev}
              className="w-9 h-9 flex items-center justify-center rounded-xl
                         text-zinc-400 hover:text-amber-400 hover:bg-zinc-800
                         disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Zurückblättern"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                   stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3L5 8l5 5" />
              </svg>
            </button>

            <span className="text-xs text-zinc-500 min-w-[100px] text-center">
              {loadState === "loading"
                ? `${pages.length} / ${numPdfPages} Seiten`
                : `Seite ${spread + 1} von ${nSpreads}`}
            </span>

            <button
              onClick={() => doFlip("next")}
              disabled={!canNext}
              className="w-9 h-9 flex items-center justify-center rounded-xl
                         text-zinc-400 hover:text-amber-400 hover:bg-zinc-800
                         disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Weiterblättern"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                   stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3l5 5-5 5" />
              </svg>
            </button>
          </div>

          {/* ── Spread-Punkte ── */}
          <div className="flex flex-wrap justify-center gap-1 max-w-sm">
            {Array.from({ length: nSpreads }).map((_, i) => (
              <button
                key={i}
                onClick={() => !flipping && setSpread(i)}
                disabled={flipping}
                title={`Seite ${i + 1}`}
                className={`rounded-full transition-all duration-200 ${
                  i === spread
                    ? "w-4 h-2 bg-amber-500"
                    : "w-2 h-2 bg-zinc-700 hover:bg-zinc-500"
                }`}
              />
            ))}
          </div>

          <p className="text-[10px] text-zinc-700 mt-1">
            ← → Pfeiltasten · Klick auf den Seitenrand zum Blättern
          </p>
        </>
      )}
    </div>
  );
}
