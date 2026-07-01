import fs from "fs";
import path from "path";
import { cache } from "react";
import { HifiDevice } from "./types";
import overrides from "./devices-overrides.json";
import { getSupabaseClient } from "./supabase";
import { OverrideData, rowToOverride } from "./device-overrides";

const CUSTOM_PATH = path.join(process.cwd(), "src/lib/devices-custom.json");
const OVERRIDES_PATH = path.join(process.cwd(), "src/lib/devices-overrides.json");

export const devices: HifiDevice[] = [
  {
    id: "hifiman-ananda-nano",
    brand: "HiFiMAN",
    model: "Ananda Nano",
    category: "Kopfhörer",
    imageUrl: "/images/devices/hifiman-ananda-nano.jpeg",
    description: "Planardynamischer Over-Ear-Kopfhörer mit Nano-Magnettechnologie und offenem Rücken. Extrem leicht und luftig.",
    specs: {
      "Bauform": "Ohrumschließend, offen",
      "Wandlerprinzip": "Planardynamisch",
      "Impedanz": "16 Ω",
      "Schalldruckpegel": "103 dB",
    },
  },
  {
    id: "lehmann-drachenfels",
    brand: "Lehmann Audio",
    model: "Drachenfels",
    category: "Kopfhörerverstärker",
    imageUrl: "/images/devices/lehmann-drachenfels.jpeg",
    description: "Hochwertiger Kopfhörerverstärker aus Köln mit zwei unabhängigen Ausgängen (A/B) und vollsymmetrischer Schaltung.",
    specs: {
      "Ausgänge": "2× 6,3 mm Klinke (A + B)",
      "Herkunft": "Deutschland",
    },
  },
  {
    id: "graham-slee-proprius",
    brand: "Graham Slee",
    model: "Proprius",
    category: "Endstufe",
    imageUrl: "/images/devices/graham-slee-proprius.jpeg",
    description: "Zwei Mono-Endstufen im Miniatur-Format. Britische Handarbeit, Class-A-Betrieb, kompromissloser Klang.",
    specs: {
      "Konfiguration": "Mono × 2",
      "Betriebsart": "Class A",
      "Herkunft": "Großbritannien",
    },
  },
  {
    id: "nakamichi-bx125e",
    brand: "Nakamichi",
    model: "BX-125E",
    category: "Kassettendeck",
    imageUrl: "/images/devices/nakamichi-bx125e.jpeg",
    description: "Legendäres 2-Kopf-Kassettendeck mit Cam-Drive-Mechanismus und individuell kalibriertem Bandeinmesssystem.",
    specs: {
      "Köpfe": "2 (Aufnahme/Wiedergabe, Lösch)",
      "Antrieb": "Cam-Drive, Drei-Motoren",
      "Rauschunterdrückung": "Dolby B/C/HX",
    },
  },
  {
    id: "luxman-k250",
    brand: "Luxman",
    model: "K-250",
    category: "Kassettendeck",
    imageUrl: "/images/devices/luxman-k250.jpeg",
    description: "Hochwertiges 3-Kopf-Kassettendeck von Luxman mit separatem Aufnahme- und Wiedergabekopf, Peak-Level-Anzeige und Dolby C.",
    specs: {
      "Köpfe": "3 (Aufnahme, Wiedergabe, Lösch)",
      "Rauschunterdrückung": "Dolby B/C",
      "Herkunft": "Japan",
    },
  },
  {
    id: "luxman-sqn150",
    brand: "Luxman",
    model: "SQ-N150",
    category: "Verstärker",
    imageUrl: "/images/devices/luxman-sqn150.jpeg",
    description: "Röhren-Vollverstärker mit EL84-Pentoden, zwei analogen VU-Metern und frontseitigem Kopfhörerausgang. Elegantes Silbergehäuse.",
    specs: {
      "Ausgangsleistung": "2× 10 W",
      "Röhren": "4× EL84, 4× 12AX7",
      "Eingänge": "4× Line, 1× Phono MM",
      "Herkunft": "Japan",
    },
  },
  {
    id: "luxman-dn150",
    brand: "Luxman",
    model: "D-N150",
    category: "CD-Spieler",
    imageUrl: "/images/devices/luxman-dn150.jpeg",
    description: "CD-Spieler aus der N150-Serie, passend zum SQ-N150. Schubladenlaufwerk, Digital-Ausgang für externe DACs.",
    specs: {
      "Laufwerk": "Schublade",
      "Digital-Ausgänge": "Koaxial, Optisch",
      "Herkunft": "Japan",
    },
  },
  {
    id: "linn-majik",
    brand: "Linn",
    model: "Majik",
    category: "Verstärker",
    imageUrl: "/images/devices/linn-majik.jpeg",
    description: "Britischer Vollverstärker von Linn Products. Charakteristisches flaches Gehäuse, direkte Tastenbedienung, legendäre Klangabstimmung.",
    specs: {
      "Herkunft": "Schottland",
      "Besonderheit": "Linn Klangphilosophie",
    },
  },
  {
    id: "harman-kardon-hd7400",
    brand: "Harman/Kardon",
    model: "HD7400",
    category: "CD-Spieler",
    imageUrl: "/images/devices/harman-kardon-hd7400.jpeg",
    description: "Eleganter CD-Spieler mit aufgeräumtem Frontpanel und typischer Harman-Kardon-Ästhetik der Neunziger.",
    specs: {
      "Farbe": "Schwarz",
    },
  },
  {
    id: "tascam-da20",
    brand: "Tascam",
    model: "DA-20",
    category: "Sonstiges",
    imageUrl: "/images/devices/tascam-da20.jpeg",
    description: "Professioneller DAT-Recorder (Digital Audio Tape) für Studio und Heimstudio. R-DAT-Format, 16 Bit / 48 kHz.",
    specs: {
      "Format": "R-DAT",
      "Abtastrate": "44,1 / 48 kHz",
      "Auflösung": "16 Bit",
    },
  },
  {
    id: "rega-p3",
    brand: "Rega",
    model: "P3",
    category: "Plattenspieler",
    imageUrl: "/images/devices/rega-p3.jpeg",
    description: "Britischer Referenzplattenspieler mit RB-Tonearm und Phenol-Subteller. Eines der meistgelobten Mittelklasse-Laufwerke weltweit.",
    specs: {
      "Tonearm": "Rega RB330",
      "Antrieb": "Riemenantrieb",
      "Herkunft": "Großbritannien",
    },
  },
  {
    id: "restek-mtun",
    brand: "Restek",
    model: "MTUN+",
    category: "Tuner",
    imageUrl: "/images/devices/restek-mtun.jpeg",
    description: "Hochwertiger Tuner/Phono-Vorverstärker von Restek. Minimalistisches Aluminium-Gehäuse, umfangreiche Klangregelung per Toggle-Schalter.",
    specs: {
      "Herkunft": "Deutschland",
    },
  },
  {
    id: "elac-miracord",
    brand: "ELAC",
    model: "Miracord 70",
    category: "Plattenspieler",
    imageUrl: "/images/devices/elac-miracord.jpeg",
    description: "Manueller Plattenspieler mit schwerem Glasteller. Tonarm mutmaßlich Audio Technica OEM-Arm der einfachen Klasse.",
    specs: {
      "Plattenteller": "Glas",
      "Antrieb": "Riemenantrieb",
      "Betrieb": "Manuell",
      "Tonarm": "Audio Technica OEM (mutmaßlich)",
    },
  },
  {
    id: "clearaudio-jubilee",
    brand: "Clearaudio",
    model: "Jubilee MC",
    category: "Sonstiges",
    imageUrl: "/images/devices/clearaudio-jubilee.jpeg",
    description: "Hochwertiger Moving-Coil-Tonabnehmer von Clearaudio. Montiert auf dem ELAC Miracord 70. Handgefertigt in Erlangen.",
    specs: {
      "Prinzip": "Moving Coil (MC)",
      "Herkunft": "Deutschland (Erlangen)",
    },
  },
  {
    id: "klipsch-heresy",
    brand: "Klipsch",
    model: "Heresy IV",
    category: "Lautsprecher",
    imageUrl: "/images/devices/klipsch-heresy.jpeg",
    description: "Standlautsprecher der aktuellen vierten Generation mit Nussbaum-Gehäuse und Horn-Mitteltöner. Extrem wirkungsgradstark, ideal für Röhrenverstärker.",
    specs: {
      "Bauform": "Standlautsprecher",
      "Generation": "Mk IV (aktuell)",
      "Wirkungsgrad": "99 dB/W/m",
      "Impedanz": "8 Ω",
      "Herkunft": "USA",
    },
  },
  {
    id: "wharfedale-vintage",
    brand: "Wharfedale",
    model: "Denton",
    category: "Lautsprecher",
    year: 1970,
    imageUrl: "/images/devices/wharfedale-vintage.jpeg",
    description: "Britische Vintage-Kompaktlautsprecher aus den 1970er Jahren mit charakteristischem W-Badge. Warmer, natürlicher Klang der klassischen britischen Schule.",
    specs: {
      "Bauform": "Kompaktlautsprecher",
      "Baujahr": "ca. 1970er",
      "Herkunft": "Großbritannien",
    },
  },
];

type Overrides = Record<string, OverrideData>;
const _overrides = overrides as Overrides;

function applyOverride(d: HifiDevice, o: Overrides[string] | undefined): HifiDevice {
  if (!o) return d;
  return { ...d, ...o, specs: { ...d.specs, ...o.specs } };
}

// Static exports (build-time, hardcoded devices only)
export const devicesWithOverrides: HifiDevice[] = devices.map((d) =>
  applyOverride(d, _overrides[d.id])
);

// ── Supabase row → TypeScript ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToDevice(row: any): HifiDevice {
  return {
    id:       row.id,
    brand:    row.brand,
    model:    row.model,
    category: row.category,
    ...rowToOverride(row),
    ...(row.year ? { year: row.year } : {}),
  } as HifiDevice;
}

// ── JSON-Fallback (lokale Entwicklung ohne Supabase) ─────────────────────────

function getAllDevicesJSON(): HifiDevice[] {
  try {
    const custom = JSON.parse(fs.readFileSync(CUSTOM_PATH, "utf-8")) as HifiDevice[];
    return [...devices, ...custom];
  } catch {
    return [...devices];
  }
}

function getAllDevicesWithOverridesJSON(): HifiDevice[] {
  let liveOverrides: Overrides = {};
  try {
    liveOverrides = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf-8")) as Overrides;
  } catch { /* ignore */ }
  return getAllDevicesJSON().map((d) => applyOverride(d, liveOverrides[d.id]));
}

// ── Öffentliche async-API ────────────────────────────────────────────────────

// `cache()` dedupliziert Aufrufe innerhalb eines Requests: Layout (Menü) und
// Page rufen dieselbe Funktion auf, lösen aber nur eine Supabase-Abfrage aus.

/** Alle Geräte (hardcodiert + benutzerdefiniert), ohne Overrides */
export const getAllDevices = cache(async function getAllDevices(): Promise<HifiDevice[]> {
  const sb = getSupabaseClient();
  if (sb) {
    try {
      const { data, error } = await sb.from("custom_devices").select("*");
      if (error) throw error;
      return [...devices, ...(data ?? []).map(rowToDevice)];
    } catch (e) {
      console.error("[Supabase] getAllDevices fallback:", e);
    }
  }
  return getAllDevicesJSON();
});

/** Alle Geräte mit angewendeten Overrides */
export const getAllDevicesWithOverrides = cache(async function getAllDevicesWithOverrides(): Promise<HifiDevice[]> {
  const sb = getSupabaseClient();
  if (sb) {
    try {
      const [customRes, overridesRes] = await Promise.all([
        sb.from("custom_devices").select("*"),
        sb.from("device_overrides").select("*"),
      ]);
      if (customRes.error) throw customRes.error;
      if (overridesRes.error) throw overridesRes.error;

      const customDevices = (customRes.data ?? []).map(rowToDevice);
      const overrideMap: Overrides = Object.fromEntries(
        (overridesRes.data ?? []).map((row) => [row.id, rowToOverride(row)])
      );

      return [...devices, ...customDevices].map((d) =>
        applyOverride(d, overrideMap[d.id])
      );
    } catch (e) {
      console.error("[Supabase] getAllDevicesWithOverrides fallback:", e);
    }
  }
  return getAllDevicesWithOverridesJSON();
});
