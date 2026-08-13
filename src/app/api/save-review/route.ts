import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/lib/security";
import fs from "fs";
import path from "path";

const reviewsPath = path.join(process.cwd(), "src/lib/devices-reviews.json");

export async function POST(req: NextRequest) {
  try {
    const { id, reviews } = await req.json();
    if (!id) return NextResponse.json({ error: "id erforderlich" }, { status: 400 });

    const existing = JSON.parse(fs.readFileSync(reviewsPath, "utf-8"));
    existing[id] = reviews;
    fs.writeFileSync(reviewsPath, JSON.stringify(existing, null, 2) + "\n");

    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, "Fehler");
  }
}
