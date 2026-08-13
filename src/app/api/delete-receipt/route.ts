import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { ReceiptFile } from "@/lib/types";
import { getSupabaseClient } from "@/lib/supabase";
import { safeDeviceId, resolveWithin, serverError } from "@/lib/security";

const OVERRIDES_PATH = path.join(process.cwd(), "src/lib/devices-overrides.json");
const RECEIPTS_DIR   = path.join(process.cwd(), "public/receipts");

export async function DELETE(req: NextRequest) {
  try {
    const { deviceId: rawId, receiptId } = await req.json();
    const deviceId = safeDeviceId(rawId);
    if (!deviceId || !receiptId) {
      return NextResponse.json({ error: "gültige deviceId und receiptId erforderlich" }, { status: 400 });
    }

    // ── Supabase ─────────────────────────────────────────────────────────────
    const sb = getSupabaseClient();
    if (sb) {
      const { data } = await sb
        .from("device_overrides").select("receipts").eq("id", deviceId).maybeSingle();
      const existing: ReceiptFile[] = data?.receipts ?? [];
      const target = existing.find((r) => r.id === receiptId);
      if (!target) return NextResponse.json({ error: "Rechnung nicht gefunden" }, { status: 404 });

      // Datei aus Storage löschen (URL-Pfad → Storage-Pfad)
      const storagePathMatch = target.url.match(/receipts\/(.+)$/);
      if (storagePathMatch) {
        await sb.storage.from("receipts").remove([storagePathMatch[1]]);
      }

      const { error } = await sb.from("device_overrides").upsert({
        id: deviceId, receipts: existing.filter((r) => r.id !== receiptId),
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    // ── JSON-Fallback ─────────────────────────────────────────────────────────
    const overrides = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf-8"));
    const entry     = overrides[deviceId] ?? {};
    const existing: ReceiptFile[] = entry.receipts ?? [];
    const target    = existing.find((r) => r.id === receiptId);
    if (!target) return NextResponse.json({ error: "Rechnung nicht gefunden" }, { status: 404 });

    const victim = resolveWithin(RECEIPTS_DIR, deviceId, path.basename(target.url));
    if (victim) { try { fs.unlinkSync(victim); } catch { /* gone */ } }
    entry.receipts      = existing.filter((r) => r.id !== receiptId);
    overrides[deviceId] = entry;
    fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2) + "\n");
    return NextResponse.json({ ok: true });

  } catch (err) {
    return serverError(err, "Löschen fehlgeschlagen");
  }
}
