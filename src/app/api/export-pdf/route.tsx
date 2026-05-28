import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import sharp from "sharp";
import { getAllDevicesWithOverrides } from "@/lib/devices";
import { CatalogPDF, PdfImage } from "@/lib/pdf/catalog-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Read and normalise a local image to a JPEG buffer compatible with @react-pdf/renderer.
// sharp normalises any JPEG variant (JFIF, Exif, progressive, etc.) and converts WebP/other
// formats to JPEG so react-pdf's internal parser can handle it.
async function readPdfImage(imageUrl?: string): Promise<PdfImage | undefined> {
  if (!imageUrl) return undefined;
  try {
    const filePath = path.join(process.cwd(), "public", imageUrl);
    if (!fs.existsSync(filePath)) return undefined;
    const normalised = await sharp(filePath)
      .jpeg({ quality: 85 })
      .resize({ width: 800, withoutEnlargement: true })
      .toBuffer();
    return normalised;
  } catch {
    return undefined;
  }
}

export async function GET() {
  try {
    const devices = await getAllDevicesWithOverrides();

    // Prepare images: prefer own photo, fall back to official image
    const images: Record<string, PdfImage | undefined> = {};
    for (const device of devices) {
      images[device.id] =
        (await readPdfImage(device.imageUrl)) ??
        (await readPdfImage(device.officialImageUrl));
    }

    // Generate QR codes (Google search for the device)
    const qrCodes: Record<string, string | undefined> = {};
    await Promise.all(
      devices.map(async (device) => {
        try {
          const query = encodeURIComponent(`${device.brand} ${device.model}`);
          qrCodes[device.id] = await QRCode.toDataURL(
            `https://www.google.de/search?q=${query}`,
            { width: 88, margin: 1, color: { dark: "#1C1917", light: "#FAFAF8" } }
          );
        } catch {
          // silently skip
        }
      })
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(CatalogPDF, { devices, images, qrCodes }) as any;
    const buffer = await renderToBuffer(element);

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="HiFi-Sammlung_${date}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF-Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
