import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { safeDeviceId, assertPublicHttpUrl, resolveWithin, serverError } from "@/lib/security";

const IMAGES_DIR = path.join(process.cwd(), "public/images/devices");
const MAX_SIZE_MB = 20;

export async function POST(req: NextRequest) {
  try {
    const { url, deviceId: rawId } = (await req.json()) as { url: string; deviceId: string };
    const deviceId = safeDeviceId(rawId);
    if (!url || !deviceId) {
      return NextResponse.json({ error: "url und gültige deviceId erforderlich" }, { status: 400 });
    }

    // SSRF-Schutz: nur öffentliche http(s)-Ziele, keine internen Adressen
    await assertPublicHttpUrl(url);

    // Fetch image server-side (bypasses hotlink protection)
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "image/webp,image/avif,image/jpeg,image/png,*/*",
        Referer: new URL(url).origin + "/",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Bild konnte nicht abgerufen werden (${res.status})` },
        { status: 502 }
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "URL enthält kein Bild" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `Bild zu groß (max. ${MAX_SIZE_MB} MB)` },
        { status: 400 }
      );
    }

    // Determine extension from content-type
    const ext =
      contentType.includes("png") ? "png"
      : contentType.includes("webp") ? "webp"
      : "jpeg";

    const filename = `${deviceId}-official.${ext}`;
    const filePath = resolveWithin(IMAGES_DIR, filename);
    if (!filePath) {
      return NextResponse.json({ error: "Ungültiger Zielpfad" }, { status: 400 });
    }
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ url: `/images/devices/${filename}` });
  } catch (err) {
    return serverError(err, "Abruf fehlgeschlagen");
  }
}
