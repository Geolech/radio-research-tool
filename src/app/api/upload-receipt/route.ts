import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { ReceiptFile } from "@/lib/types";
import { getSupabaseClient } from "@/lib/supabase";
import { safeDeviceId, resolveWithin, serverError } from "@/lib/security";

const OVERRIDES_PATH = path.join(process.cwd(), "src/lib/devices-overrides.json");
const RECEIPTS_DIR   = path.join(process.cwd(), "public/receipts");

const ALLOWED_TYPES: Record<string, ReceiptFile["mimeType"]> = {
  "image/jpeg":      "image/jpeg",
  "image/png":       "image/png",
  "image/webp":      "image/webp",
  "application/pdf": "application/pdf",
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    const deviceId = safeDeviceId(formData.get("deviceId"));

    if (!file || !deviceId) {
      return NextResponse.json({ error: "file und gültige deviceId erforderlich" }, { status: 400 });
    }

    const mimeType = ALLOWED_TYPES[file.type];
    if (!mimeType) {
      return NextResponse.json({ error: "Nur JPEG, PNG, WebP und PDF erlaubt" }, { status: 400 });
    }

    const id       = Date.now().toString();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const fileName = `${id}_${safeName}`;
    const buffer   = Buffer.from(await file.arrayBuffer());

    // ── Supabase Storage ──────────────────────────────────────────────────────
    const sb = getSupabaseClient();
    if (sb) {
      const storagePath = `${deviceId}/${fileName}`;
      const { error: uploadError } = await sb.storage
        .from("receipts")
        .upload(storagePath, buffer, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      // Öffentliche URL ermitteln
      const { data: urlData } = sb.storage.from("receipts").getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      const receipt: ReceiptFile = {
        id, filename: file.name, url: publicUrl,
        uploadedAt: new Date().toISOString(), mimeType,
      };

      // Receipts-Array in device_overrides aktualisieren
      const { data: existing } = await sb
        .from("device_overrides").select("receipts").eq("id", deviceId).maybeSingle();
      const prevReceipts: ReceiptFile[] = existing?.receipts ?? [];
      const { error: dbError } = await sb.from("device_overrides").upsert({
        id: deviceId, receipts: [...prevReceipts, receipt],
      });
      if (dbError) throw dbError;

      return NextResponse.json({ ok: true, receipt });
    }

    // ── Lokaler Fallback (Datei auf Disk) ─────────────────────────────────────
    const deviceDir = resolveWithin(RECEIPTS_DIR, deviceId);
    const targetFile = deviceDir && resolveWithin(deviceDir, fileName);
    if (!deviceDir || !targetFile) {
      return NextResponse.json({ error: "Ungültiger Zielpfad" }, { status: 400 });
    }
    fs.mkdirSync(deviceDir, { recursive: true });
    fs.writeFileSync(targetFile, buffer);
    const publicUrl = `/receipts/${deviceId}/${fileName}`;

    const receipt: ReceiptFile = {
      id, filename: file.name, url: publicUrl,
      uploadedAt: new Date().toISOString(), mimeType,
    };

    const overrides = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf-8"));
    const entry     = overrides[deviceId] ?? {};
    entry.receipts  = [...(entry.receipts ?? []), receipt];
    overrides[deviceId] = entry;
    fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2) + "\n");

    return NextResponse.json({ ok: true, receipt });

  } catch (err) {
    return serverError(err, "Upload-Fehler");
  }
}
