import { NextRequest, NextResponse } from "next/server";
import { serverError } from "@/lib/security";
import fs from "fs";
import { getSupabaseClient } from "@/lib/supabase";

// ─── Lokaler Fallback-Pfad (nur auf dem Entwicklungsrechner vorhanden) ──────────
const STYLE_GUIDE_PATH =
  "/Users/franklechtenberg/Obsidian Vault/Franks KI Speicher/HiFi App Schreibstil.md";

// ─── Parser ────────────────────────────────────────────────────────────────────

interface StyleRules {
  remove: string[];
  replace: Array<{ from: string; to: string | null }>; // null = entfernen
}

function parseStyleGuide(md: string): StyleRules {
  const rules: StyleRules = { remove: [], replace: [] };

  // Sections aufteilen (## Heading)
  const sections = md.split(/^## /m);

  for (const section of sections) {
    const lines = section.split("\n");
    const heading = lines[0].trim().toLowerCase();

    if (heading.startsWith("entfernen")) {
      // Listenzeilen "- phrase"
      for (const line of lines.slice(1)) {
        const m = line.match(/^-\s+(.+)$/);
        if (m) rules.remove.push(m[1].trim());
      }
    }

    if (heading.startsWith("umformulieren")) {
      // Format: - "original" → "ersatz"  ODER  - "original" → entfernen
      for (const line of lines.slice(1)) {
        const m = line.match(/^-\s+"(.+?)"\s*→\s*(.+)$/);
        if (!m) continue;
        const from = m[1].trim();
        const toRaw = m[2].trim();
        const to = toRaw.toLowerCase() === "entfernen" ? null : toRaw.replace(/^"|"$/g, "");
        rules.replace.push({ from, to });
      }
    }
  }

  return rules;
}

// ─── Anwendung der Regeln ──────────────────────────────────────────────────────

function applyRules(text: string, rules: StyleRules): { result: string; matched: number } {
  let result  = text;
  let matched = 0;

  // 1. Entfernen-Phrasen (case-insensitive)
  for (const phrase of rules.remove) {
    const re    = new RegExp(escapeRegex(phrase), "gi");
    const hits  = (result.match(re) ?? []).length;
    if (hits > 0) { result = result.replace(re, ""); matched += hits; }
  }

  // 2. Umformulierungen (case-insensitive)
  for (const { from, to } of rules.replace) {
    const re    = new RegExp(escapeRegex(from), "gi");
    const hits  = (result.match(re) ?? []).length;
    if (hits > 0) { result = result.replace(re, to ?? ""); matched += hits; }
  }

  // 3. Doppelte Leerzeichen + doppelte Leerzeilen bereinigen
  result = result
    .replace(/[ \t]{2,}/g, " ")          // mehrfache Leerzeichen → eins
    .replace(/\n{3,}/g, "\n\n")          // mehr als 2 Zeilenumbrüche → zwei
    .replace(/\.\s*\./g, ".")            // Doppelpunkte durch Entfernen
    .replace(/,\s*\./g, ".")             // Komma + Punkt
    .replace(/\s+\./g, ".")             // Leerzeichen vor Punkt
    .replace(/\s+,/g, ",")             // Leerzeichen vor Komma
    .trim();

  return { result, matched };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { existing, notes } = await req.json() as {
      existing?: string;
      notes: string;
    };

    if (!notes?.trim()) {
      return NextResponse.json({ error: "Keine Notizen übergeben" }, { status: 400 });
    }

    // Rohtext zusammenführen
    const rawMerged = existing?.trim()
      ? `${existing.trim()}\n\n${notes.trim()}`
      : notes.trim();

    // Stil-Guide laden: Supabase zuerst, dann lokale Datei als Fallback
    let rules: StyleRules = { remove: [], replace: [] };
    try {
      let md: string | null = null;

      // 1. Supabase (funktioniert lokal + auf Vercel)
      const sb = getSupabaseClient();
      if (sb) {
        const { data } = await sb
          .from("app_settings")
          .select("value")
          .eq("key", "style_guide")
          .maybeSingle();
        if (data?.value) md = data.value;
      }

      // 2. Lokale Obsidian-Datei (Fallback ohne Supabase)
      if (!md) {
        try { md = fs.readFileSync(STYLE_GUIDE_PATH, "utf-8"); } catch { /* nicht vorhanden */ }
      }

      if (md) rules = parseStyleGuide(md);
    } catch {
      // Stil-Guide nicht verfügbar — trotzdem fortfahren
    }

    const { result: cleaned, matched } = applyRules(rawMerged, rules);

    return NextResponse.json({
      merged:          cleaned,
      rulesApplied:    matched,
      styleGuideFound: rules.remove.length + rules.replace.length > 0,
    });
  } catch (err) {
    return serverError(err, "Fehler");
  }
}
