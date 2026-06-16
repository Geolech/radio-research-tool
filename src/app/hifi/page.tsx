import ExcelExportButton from "@/components/ExcelExportButton";
import PdfExportButton from "@/components/PdfExportButton";
import InventoryFilter from "@/components/InventoryFilter";
import { getAllDevicesWithOverrides } from "@/lib/devices";
import { DeviceCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const devices = await getAllDevicesWithOverrides();
  const categories = Array.from(new Set(devices.map((d) => d.category))) as DeviceCategory[];

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10 border-b border-zinc-800 pb-8">
          <p className="text-xs font-medium uppercase tracking-widest text-amber-500 mb-2">
            Privatsammlung
          </p>
          <h1 className="text-4xl font-bold text-zinc-100 tracking-tight">
            HiFi-Bibliothek
          </h1>
          <p className="mt-2 text-zinc-500">
            {devices.length} Geräte · {categories.length} Kategorien
          </p>
        </div>

        {/* Actions */}
        <div className="mb-8 flex flex-wrap gap-3 items-center">
          <ExcelExportButton devices={devices} />
          <PdfExportButton deviceCount={devices.length} />
        </div>

        {/* Filterbare Geräteliste */}
        <InventoryFilter devices={devices} />
      </div>
    </main>
  );
}
