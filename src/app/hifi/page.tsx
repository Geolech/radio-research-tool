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
    <main className="min-h-screen bg-paper text-ink px-6 sm:px-8 py-10">
      <div className="mx-auto max-w-6xl">

        {/* ── Masthead ────────────────────────────────────────────────────── */}
        <header className="pt-4">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-accent">Privatsammlung</span>
            <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-accent">Vinylatlas</span>
          </div>

          <h1 className="font-display font-extrabold tracking-tight leading-[0.95] mt-4 text-[clamp(2.5rem,8vw,5rem)]">
            HiFi&#8209;Bibliothek
          </h1>

          <div className="mt-5 flex items-end justify-between flex-wrap gap-x-8 gap-y-3 pb-3">
            <p className="italic text-ink-soft text-lg max-w-[34ch] leading-snug">
              Ein Katalog der eigenen Anlage – Gerät für Gerät, sachlich verzeichnet.
            </p>
            <p className="font-mono text-xs text-ink-soft tracking-wide sm:text-right">
              <span className="text-ink font-semibold tabular-nums">{devices.length}</span>&nbsp;Geräte
              &nbsp;·&nbsp;<span className="text-ink font-semibold tabular-nums">{categories.length}</span>&nbsp;Kategorien
              {withPrices > 0 && (
                <>&nbsp;·&nbsp;<span className="text-ink font-semibold tabular-nums">{withPrices}</span>&nbsp;mit&nbsp;Preis</>
              )}
            </p>
          </div>

          <div className="border-t border-rule" />
          <div className="border-t-[3px] border-double border-rule mt-[2px]" />
        </header>

        {/* ── Export ──────────────────────────────────────────────────────── */}
        <div className="mt-6 mb-8 flex flex-wrap gap-2 items-center">
          <ExcelExportButton devices={devices} />
          <PdfExportButton deviceCount={devices.length} />
        </div>

        {/* ── Filterbare Geräteliste ──────────────────────────────────────── */}
        <InventoryFilter devices={devices} />
      </div>
    </main>
  );
}
