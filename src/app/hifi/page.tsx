import ExcelExportButton from "@/components/ExcelExportButton";
import PdfExportButton from "@/components/PdfExportButton";
import InventoryFilter from "@/components/InventoryFilter";
import { getAllDevicesWithOverrides } from "@/lib/devices";
import { DeviceCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const devices = await getAllDevicesWithOverrides();
  const categories = Array.from(new Set(devices.map((d) => d.category))) as DeviceCategory[];
  const withPrices = devices.filter((d) => d.purchasePrice != null || d.currentValue != null).length;

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8">
      <div className="mx-auto max-w-6xl">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-8 rounded-2xl overflow-hidden border border-zinc-800/80" style={{ background: "#1c1c1f" }}>
          <div className="grid grid-cols-[1fr_auto]">

            {/* Text + Stats */}
            <div className="px-8 py-7 border-r border-zinc-800/60">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-500 mb-2">
                Privatsammlung
              </p>
              <h1 className="text-3xl font-bold text-zinc-100 tracking-tight mb-6">
                HiFi-Bibliothek
              </h1>
              <div className="flex gap-8">
                <div>
                  <div className="text-2xl font-bold text-zinc-200 tabular-nums">{devices.length}</div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-600 mt-0.5">Geräte</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-zinc-200 tabular-nums">{categories.length}</div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-600 mt-0.5">Kategorien</div>
                </div>
                {withPrices > 0 && (
                  <div>
                    <div className="text-2xl font-bold text-zinc-200 tabular-nums">{withPrices}</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-600 mt-0.5">mit Preisangabe</div>
                  </div>
                )}
              </div>
            </div>

            {/* Dekoratives Lautsprecher-Membran-Panel */}
            <div className="flex items-center justify-center px-8 py-6" style={{ background: "#141416" }}>
              <svg width="110" height="90" viewBox="0 0 110 90" fill="none" className="opacity-[0.18]">
                <ellipse cx="55" cy="45" rx="50" ry="40" stroke="#f59e0b" strokeWidth="1"/>
                <ellipse cx="55" cy="45" rx="37" ry="29" stroke="#f59e0b" strokeWidth="1"/>
                <ellipse cx="55" cy="45" rx="24" ry="19" stroke="#f59e0b" strokeWidth="1"/>
                <ellipse cx="55" cy="45" rx="12" ry="9"  stroke="#f59e0b" strokeWidth="1"/>
                <circle  cx="55" cy="45" r="4"           stroke="#f59e0b" strokeWidth="1.5"/>
                <circle  cx="55" cy="45" r="1.5"         fill="#f59e0b"/>
              </svg>
            </div>

          </div>
          {/* Amber-Trennlinie unten */}
          <div className="h-px bg-gradient-to-r from-amber-500/40 via-amber-500/15 to-transparent" />
        </div>

        {/* ── Export-Buttons ───────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap gap-2 items-center">
          <ExcelExportButton devices={devices} />
          <PdfExportButton deviceCount={devices.length} />
          <span className="text-xs text-zinc-600 ml-1">
            {withPrices > 0
              ? `${withPrices} von ${devices.length} Geräten mit Preisangabe`
              : "Noch keine Preise eingetragen"}
          </span>
        </div>

        {/* ── Filterbare Geräteliste ───────────────────────────────────────── */}
        <InventoryFilter devices={devices} />
      </div>
    </main>
  );
}
