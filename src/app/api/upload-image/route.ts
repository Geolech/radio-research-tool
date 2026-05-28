import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IMAGES_DIR = path.join(process.cwd(), "public/images/devices");
const MAX_SIZE_MB = 10;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const deviceId = formData.get("deviceId") as string | null;

    if (!file || !deviceId) {
      return NextResponse.json({ error: "file und deviceId erforderlich" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Nur JPEG, PNG oder WebP erlaubt" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `Datei zu groß (max. ${MAX_SIZE_MB} MB)` },
        { status: 400 }
      );
    }

    // Determine extension
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpeg";
    const filename = `${deviceId}-official.${ext}`;
    const filePath = path.join(IMAGES_DIR, filename);

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ url: `/images/devices/${filename}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
