import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { safeDeviceId, resolveWithin, serverError } from "@/lib/security";

const IMAGES_DIR = path.join(process.cwd(), "public/images/devices");
const OVERRIDES_PATH = path.join(process.cwd(), "src/lib/devices-overrides.json");
const CUSTOM_PATH = path.join(process.cwd(), "src/lib/devices-custom.json");
const MAX_SIZE_MB = 10;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const deviceId = safeDeviceId(formData.get("deviceId"));

    if (!file || !deviceId) {
      return NextResponse.json({ error: "file und gültige deviceId erforderlich" }, { status: 400 });
    }

    const contentType = file.type;
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      return NextResponse.json({ error: "Nur JPEG, PNG oder WebP erlaubt" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `Bild zu groß (max. ${MAX_SIZE_MB} MB)` }, { status: 400 });
    }

    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpeg";
    const filename = `${deviceId}.${ext}`;
    const filePath = resolveWithin(IMAGES_DIR, filename);
    if (!filePath) {
      return NextResponse.json({ error: "Ungültiger Zielpfad" }, { status: 400 });
    }

    if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
    fs.writeFileSync(filePath, buffer);

    const imageUrl = `/images/devices/${filename}`;

    // Persist imageUrl: try overrides first (works for both hardcoded + custom devices)
    try {
      const overrides = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf-8"));
      const current = overrides[deviceId] ?? {};
      overrides[deviceId] = { ...current, imageUrl };
      fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2) + "\n");
    } catch { /* ignore */ }

    // Also update in devices-custom.json if this is a custom device
    try {
      const custom = JSON.parse(fs.readFileSync(CUSTOM_PATH, "utf-8")) as Array<{ id: string; imageUrl?: string }>;
      const idx = custom.findIndex((d) => d.id === deviceId);
      if (idx !== -1) {
        custom[idx] = { ...custom[idx], imageUrl };
        fs.writeFileSync(CUSTOM_PATH, JSON.stringify(custom, null, 2) + "\n");
      }
    } catch { /* ignore */ }

    return NextResponse.json({ url: imageUrl });
  } catch (err) {
    return serverError(err, "Upload fehlgeschlagen");
  }
}
