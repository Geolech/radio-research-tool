import Link from "next/link";
import { notFound } from "next/navigation";
import { devices, getAllDevicesWithOverrides } from "@/lib/devices";
import EnrichButton from "@/components/EnrichButton";
import ManualSection from "@/components/ManualSection";
import ReviewSection from "@/components/ReviewSection";
import PriceSection from "@/components/PriceSection";
import RepairSection from "@/components/RepairSection";
import SpecsEditor from "@/components/SpecsEditor";
import MarkdownDescription from "@/components/MarkdownDescription";
import OfficialImageSection from "@/components/OfficialImageSection";
import HeroPhotoUpload from "@/components/HeroPhotoUpload";
import PriceEditor from "@/components/PriceEditor";
import InventorySelector from "@/components/InventorySelector";
import ReceiptSection from "@/components/ReceiptSection";
import NotesEditor from "@/components/NotesEditor";
import manualsData from "@/lib/devices-manuals.json";
import reviewsData from "@/lib/devices-reviews.json";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return devices.map((d) => ({ id: d.id }));
}

export const dynamic = "force-dynamic";

export default async function DevicePage({ params }: PageProps) {
  const { id } = await params;
  const device = (await getAllDevicesWithOverrides()).find((d) => d.id === id);
  if (!device) notFound();

  type ManualEntry = { title: string; url: string; source: string; type: string; language?: string };
  const allManuals = manualsData as Record<string, ManualEntry[]>;
  const savedManuals: ManualEntry[] = allManuals[id] ?? [];

  type ReviewEntry = { title: string; url: string; source: string; type: string; language?: string; year?: string };
  const allReviews = reviewsData as Record<string, ReviewEntry[]>;
  const savedReviews: ReviewEntry[] = allReviews[id] ?? [];

  const hasOfficialImage = !!device.officialImageUrl;

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Back */}
        <Link
          href="/hifi"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-amber-400 transition-colors mb-8"
        >
          ← Zurück zur Sammlung
        </Link>

        {/* Hero */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Images: own photo + optional official image side by side */}
          <div className="space-y-2">
            {/* Own photo - with inline upload */}
            <HeroPhotoUpload deviceId={device.id} currentImageUrl={device.imageUrl} />

            {/* Official image (if saved) */}
            {hasOfficialImage && (
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={device.officialImageUrl}
                  alt={`${device.brand} ${device.model} - offizielles Bild`}
                  className="w-full h-full object-contain"
                />
                <span className="absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded-full bg-zinc-900/80 text-emerald-400 border border-emerald-500/30">
                  Pressebild
                </span>
                {device.officialImagePageUrl && (
                  <a
                    href={device.officialImagePageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-2 right-2 text-xs px-2 py-0.5 rounded-full bg-zinc-900/80 text-zinc-500 hover:text-amber-400 border border-zinc-700 transition-colors"
                  >
                    Quelle ↗
                  </a>
                )}
              </div>
            )}

            {/* Attribution for official image */}
            {hasOfficialImage && device.officialImageAttribution && (
              <p className="text-xs text-zinc-600 px-1">
                © {device.officialImageAttribution}
              </p>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <span className="inline-block w-fit rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 border border-amber-500/20 mb-4">
              {device.category}
            </span>
            <h1 className="text-3xl font-bold text-zinc-100">{device.brand}</h1>
            <p className="text-xl text-zinc-400 mt-1">{device.model}</p>
            {device.year && (
              <p className="mt-2 text-sm text-zinc-500">{device.year}</p>
            )}
            {device.description && (
              <MarkdownDescription text={device.description} className="mt-4" />
            )}
          </div>
        </div>

        {/* Offizielles Produktbild - direkt unter dem Hero */}
        <div className="mt-6">
          <OfficialImageSection device={device} />
        </div>

        {/* Beschreibung recherchieren */}
        <EnrichButton device={device} />

        {/* Eigene Notizen & Ergänzungen */}
        <NotesEditor device={device} />

        {/* Specs */}
        <SpecsEditor device={device} />

        {/* Bestand & Rechnungen */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <InventorySelector device={device} />
          <ReceiptSection device={device} />
        </div>

        {/* Sektionen */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ManualSection device={device} savedManuals={savedManuals} />
          <ReviewSection device={device} savedReviews={savedReviews} />
          <PriceEditor device={device} />
          <RepairSection device={device} />
          <div className="sm:col-span-2">
            <PriceSection device={device} />
          </div>
        </div>
      </div>
    </main>
  );
}
