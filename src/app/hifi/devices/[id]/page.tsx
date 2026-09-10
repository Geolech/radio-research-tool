import Link from "next/link";
import { notFound } from "next/navigation";
import { IconPhotoOff, IconArrowLeft } from "@tabler/icons-react";
import { devices, getAllDevicesWithOverrides } from "@/lib/devices";
import { isAdmin } from "@/lib/admin";
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

  const admin = await isAdmin();

  type ManualEntry = { title: string; url: string; source: string; type: string; language?: string };
  const allManuals = manualsData as Record<string, ManualEntry[]>;
  const savedManuals: ManualEntry[] = allManuals[id] ?? [];

  type ReviewEntry = { title: string; url: string; source: string; type: string; language?: string; year?: string };
  const allReviews = reviewsData as Record<string, ReviewEntry[]>;
  const savedReviews: ReviewEntry[] = allReviews[id] ?? [];

  const hasOfficialImage = !!device.officialImageUrl;

  return (
    <main className="min-h-screen bg-paper text-ink px-6 sm:px-8 py-10">
      <div className="mx-auto max-w-4xl">
        {/* Back */}
        <Link
          href="/hifi"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-soft hover:text-accent transition-colors mb-8"
        >
          <IconArrowLeft size={14} stroke={1.8} /> Zurück zur Sammlung
        </Link>

        {/* Hero */}
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          {/* Bilder: eigenes Foto + optionales Pressebild */}
          <div className="space-y-3">
            {admin ? (
              <HeroPhotoUpload deviceId={device.id} currentImageUrl={device.imageUrl} />
            ) : (
              <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] border border-rule bg-surface-2">
                {device.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={device.imageUrl} alt={`${device.brand} ${device.model}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <IconPhotoOff size={44} className="text-ink-soft/60" stroke={1.3} />
                  </div>
                )}
              </div>
            )}

            {hasOfficialImage && (
              <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] border border-rule bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={device.officialImageUrl}
                  alt={`${device.brand} ${device.model} - offizielles Bild`}
                  className="w-full h-full object-contain"
                />
                <span className="absolute bottom-2 left-2 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-[2px] bg-paper/85 text-accent border border-rule">
                  Pressebild
                </span>
                {device.officialImagePageUrl && (
                  <a
                    href={device.officialImagePageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-2 right-2 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-[2px] bg-paper/85 text-ink-soft hover:text-accent border border-rule transition-colors"
                  >
                    Quelle ↗
                  </a>
                )}
              </div>
            )}

            {hasOfficialImage && device.officialImageAttribution && (
              <p className="text-xs text-ink-soft px-1">
                © {device.officialImageAttribution}
              </p>
            )}
          </div>

          <div className="md:pt-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
              {device.category}
            </span>
            <h1 className="font-display font-extrabold text-4xl leading-[1.05] tracking-tight mt-2 text-ink">
              {device.brand} <span className="italic font-semibold text-ink-soft">{device.model}</span>
            </h1>
            {device.year && (
              <p className="mt-2 font-mono text-xs text-ink-soft tabular-nums">{device.year}</p>
            )}
            <div className="border-t border-rule mt-4" />
            {device.description && (
              <MarkdownDescription text={device.description} className="mt-4" />
            )}
          </div>
        </div>

        {/* Offizielles Produktbild recherchieren — nur Owner */}
        {admin && (
          <div className="mt-6">
            <OfficialImageSection device={device} />
          </div>
        )}

        {/* Beschreibung recherchieren — nur Owner (KI) */}
        {admin && <EnrichButton device={device} />}

        {/* Eigene Notizen & Ergänzungen — nur Owner */}
        {admin && <NotesEditor device={device} />}

        {/* Specs — Inhalt öffentlich, Bearbeiten nur Owner */}
        <SpecsEditor device={device} canEdit={admin} />

        {/* Bestand & Rechnungen (Versicherungsbelege) — nur Owner */}
        {admin && (
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <InventorySelector device={device} />
            <ReceiptSection device={device} />
          </div>
        )}

        {/* Handbücher, Tests, Preise, Reparatur — nur Owner */}
        {admin && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ManualSection device={device} savedManuals={savedManuals} />
            <ReviewSection device={device} savedReviews={savedReviews} />
            <PriceEditor device={device} />
            <RepairSection device={device} />
            <div className="sm:col-span-2">
              <PriceSection device={device} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
