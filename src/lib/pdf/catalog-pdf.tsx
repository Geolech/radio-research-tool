import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { HifiDevice } from "@/lib/types";

// Raw Buffer – @react-pdf/renderer's resolveBufferImage auto-detects JPEG/PNG format
export type PdfImage = Buffer;

// ─── Colours ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#FAFAF8",       // warm off-white
  dark: "#1C1917",     // stone-950
  mid: "#57534E",      // stone-600
  light: "#A8A29E",    // stone-400
  rule: "#D6D3D1",     // stone-300
  stone: "#F5F5F4",    // stone-100
  amber: "#B45309",    // amber-700 (darker for print)
  amberLight: "#FEF3C7", // amber-50
};

// Register Helvetica (built-in, no download needed)
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
    { src: "Helvetica-Oblique", fontStyle: "italic" },
  ],
});

const s = StyleSheet.create({
  // ── Shared ────────────────────────────────────────────────────────────────
  page: { backgroundColor: C.bg, fontFamily: "Helvetica", paddingBottom: 28 },
  pageNumber: {
    position: "absolute", bottom: 10, right: 16,
    fontSize: 8, color: C.light,
  },

  // ── Title page ────────────────────────────────────────────────────────────
  titlePage: { backgroundColor: C.dark },
  coverImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, objectFit: "cover", opacity: 0.45 },
  titleOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 22, backgroundColor: "rgba(28,25,23,0.88)",
  },
  titleLabel: { fontSize: 7, color: C.amber, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 },
  titleHeading: { fontSize: 28, fontWeight: "bold", color: "#FAFAF8", lineHeight: 1.15 },
  titleSub: { fontSize: 11, color: "#A8A29E", marginTop: 4 },
  titleMeta: { fontSize: 8, color: "#78716C", marginTop: 10 },

  // ── TOC ───────────────────────────────────────────────────────────────────
  tocPage: { backgroundColor: C.bg, paddingHorizontal: 22, paddingTop: 28, paddingBottom: 36 },
  tocHeading: { fontSize: 7, color: C.amber, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 },
  tocRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 5 },
  tocTitle: { fontSize: 9, color: C.dark, flex: 1 },
  tocDots: { fontSize: 9, color: C.rule, flex: 1, textAlign: "center" },
  tocPage_: { fontSize: 9, color: C.mid, width: 20, textAlign: "right" },
  tocCategoryLabel: {
    fontSize: 7, color: C.amber, letterSpacing: 1.5, textTransform: "uppercase",
    marginTop: 12, marginBottom: 4, paddingBottom: 3,
    borderBottomWidth: 0.5, borderBottomColor: C.rule,
  },

  // ── Device – left page (photo) ────────────────────────────────────────────
  // Flex-column layout: image container grows to fill all space above the overlay,
  // so the photo is always centred in whatever area remains (important when the
  // overflow-description text expands the overlay downward).
  leftPage: { backgroundColor: C.dark },
  deviceImgContainer: { flex: 1 },                        // takes all space above overlay
  deviceImg: {                                             // fills its flex container
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    objectFit: "cover", opacity: 0.75,
  },
  deviceImgPlaceholder: {                                  // no-image fallback
    flex: 1, backgroundColor: "#292524",
    alignItems: "center", justifyContent: "center",
  },
  placeholderCircle: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: "#57534E" },
  deviceNameOverlay: {                                     // in normal flow below the image
    padding: 16, paddingBottom: 20,
    backgroundColor: "rgba(28,25,23,0.88)",
  },
  deviceCategory: { fontSize: 7, color: C.amber, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 },
  deviceBrand: { fontSize: 18, fontWeight: "bold", color: "#FAFAF8", lineHeight: 1.1 },
  deviceModel: { fontSize: 12, color: "#D6D3D1", marginTop: 2 },
  deviceYear: { fontSize: 8, color: "#78716C", marginTop: 3 },
  overlayDescRule: { borderTopWidth: 0.5, borderTopColor: "#57534E", marginTop: 10, marginBottom: 8 },
  deviceDescOverlay: { fontSize: 8, color: "#A8A29E", lineHeight: 1.55 },

  // ── Device – right page (info) ────────────────────────────────────────────
  rightPage: { backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 22 },
  infoCategory: { fontSize: 7, color: C.amber, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 },
  infoBrand: { fontSize: 17, fontWeight: "bold", color: C.dark, lineHeight: 1.1 },
  infoModel: { fontSize: 11, color: C.mid, marginTop: 2, marginBottom: 10 },
  infoRule: { borderBottomWidth: 0.5, borderBottomColor: C.rule, marginBottom: 10 },
  infoDescription: { fontSize: 9, color: C.mid, lineHeight: 1.55, marginBottom: 14 },
  specsHeading: { fontSize: 7, color: C.amber, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 },
  specsGrid: { marginBottom: 12 },
  specRow: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.3, borderBottomColor: C.rule },
  specKey: { fontSize: 8, color: C.light, width: "42%" },
  specVal: { fontSize: 8, color: C.dark, flex: 1 },
  priceBox: {
    backgroundColor: C.amberLight, borderWidth: 0.5, borderColor: "#FDE68A",
    borderRadius: 4, padding: 8, marginBottom: 12, flexDirection: "row", justifyContent: "space-between",
  },
  priceItem: { alignItems: "center" },
  priceLabel: { fontSize: 7, color: C.amber },
  priceValue: { fontSize: 11, fontWeight: "bold", color: C.amber, marginTop: 2 },
  qrArea: { position: "absolute", bottom: 16, right: 16, alignItems: "center" },
  qrImg: { width: 44, height: 44 },
  qrLabel: { fontSize: 6, color: C.light, marginTop: 2, textAlign: "center" },

  // ── Summary ───────────────────────────────────────────────────────────────
  summaryPage: { backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 22 },
  sumHeading: { fontSize: 7, color: C.amber, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 },
  sumTitle: { fontSize: 14, fontWeight: "bold", color: C.dark, marginBottom: 12 },
  tableHeader: {
    flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6,
    backgroundColor: C.dark, borderRadius: 3, marginBottom: 2,
  },
  tableHeaderCell: { fontSize: 7, color: "#FAFAF8", fontWeight: "bold" },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.3, borderBottomColor: C.rule },
  tableRowAlt: { backgroundColor: C.stone },
  tableCell: { fontSize: 8, color: C.dark },
  tableCellMid: { fontSize: 8, color: C.mid },
  totalRow: {
    flexDirection: "row", paddingVertical: 7, paddingHorizontal: 6,
    backgroundColor: C.amberLight, borderRadius: 3, marginTop: 4,
  },
  totalLabel: { fontSize: 8, fontWeight: "bold", color: C.amber },
  totalValue: { fontSize: 8, fontWeight: "bold", color: C.amber, textAlign: "right" },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtEur(val?: number | null): string {
  if (val == null) return "–";
  return val.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " €";
}

function dots(n = 28): string {
  return ".".repeat(n);
}

function groupByCategory(devices: HifiDevice[]) {
  const map = new Map<string, HifiDevice[]>();
  for (const d of devices) {
    if (!map.has(d.category)) map.set(d.category, []);
    map.get(d.category)!.push(d);
  }
  return map;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TitlePage({ devices, images }: { devices: HifiDevice[]; images: Record<string, PdfImage | undefined> }) {
  const cover = devices.find((d) => images[d.id]) ?? devices[0];
  const coverImg = cover ? images[cover.id] : undefined;
  const date = new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  return (
    <Page size="A5" style={s.titlePage}>
      {coverImg && <Image src={coverImg} style={s.coverImg} />}
      <View style={s.titleOverlay}>
        <Text style={s.titleLabel}>Privatsammlung</Text>
        <Text style={s.titleHeading}>HiFi-Bibliothek</Text>
        <Text style={s.titleSub}>{devices.length} Geräte · {Array.from(new Set(devices.map((d) => d.category))).length} Kategorien</Text>
        <Text style={s.titleMeta}>{date}</Text>
      </View>
      <Text style={[s.pageNumber, { color: "#57534E" }]} render={({ pageNumber }) => String(pageNumber)} />
    </Page>
  );
}

function TocPage({ devices }: { devices: HifiDevice[] }) {
  const grouped = groupByCategory(devices);
  // Each device always occupies exactly 2 pages (photo + info, no overflow due to split logic).
  // Page 1 = title, page 2 = TOC, pages 3..N = devices (2 each), page N+1 = summary.
  const pageOf = new Map<string, number>();
  let p = 3;
  for (const d of devices) {
    pageOf.set(d.id, p);
    p += 2;
  }
  const summaryPage = p;

  return (
    <Page size="A5" style={s.tocPage}>
      <Text style={s.tocHeading}>Inhaltsverzeichnis</Text>
      {Array.from(grouped.entries()).map(([cat, devs]) => (
        <View key={cat}>
          <Text style={s.tocCategoryLabel}>{cat}</Text>
          {devs.map((d) => {
            const pg = pageOf.get(d.id) ?? 0;
            const title = `${d.brand} ${d.model}`;
            const spaceForDots = Math.max(0, 42 - title.length);
            return (
              <View key={d.id} style={s.tocRow}>
                <Text style={s.tocTitle}>{title}</Text>
                <Text style={s.tocDots}>{dots(spaceForDots)}</Text>
                <Text style={s.tocPage_}>{pg}</Text>
              </View>
            );
          })}
        </View>
      ))}
      <View style={[s.tocRow, { marginTop: 16, borderTopWidth: 0.5, borderTopColor: C.rule, paddingTop: 10 }]}>
        <Text style={[s.tocTitle, { fontWeight: "bold" }]}>Versicherungsübersicht</Text>
        <Text style={s.tocDots}>{dots(20)}</Text>
        <Text style={s.tocPage_}>{summaryPage}</Text>
      </View>
      <Text style={s.pageNumber} render={({ pageNumber }) => String(pageNumber)} />
    </Page>
  );
}

// Split description into the part that fits on the right (info) page and the overflow
// that gets pulled into the photo-page overlay.
//
// DIN A5 = 210 mm height.
// Right-page padding: paddingTop 22 mm + paddingBottom 28 mm → 160 mm usable (–2 mm buffer = 158).
// Header block (category label + brand + model + rule):  ~28 mm
// Specs: heading ~10 mm + each row ~5 mm  (9 pt × 1.55 lh ≈ 5 mm/row)
// Price box: ~26 mm (padding + two label/value pairs)
// Description: 9 pt × 1.55 lh ≈ 5 mm/line, ~42 chars/line at 108 mm usable width
function splitDescription(device: HifiDevice): { rightText: string; overflowText: string | null } {
  const desc = device.description ?? "";
  if (!desc) return { rightText: "", overflowText: null };

  const specsCount = Object.keys(device.specs ?? {}).length;
  const hasPrice = device.purchasePrice != null || device.currentValue != null;

  const specsMm  = specsCount > 0 ? 10 + specsCount * 5 : 0;
  const priceMm  = hasPrice ? 26 : 0;
  const availableDescMm = 158 - 28 - specsMm - priceMm;

  // Ensure at least a couple of lines are reserved for description on the right page
  const clampedMm = Math.max(availableDescMm, 10);
  const availableLines = Math.floor(clampedMm / 5);
  const availableChars = availableLines * 42;

  if (desc.length <= availableChars) {
    return { rightText: desc, overflowText: null };
  }

  // Split at the nearest word boundary before the character limit
  const spaceIdx = desc.lastIndexOf(" ", availableChars);
  const splitAt  = spaceIdx > availableChars * 0.6 ? spaceIdx : availableChars;

  return {
    rightText:    desc.slice(0, splitAt).trimEnd(),
    overflowText: desc.slice(splitAt).trimStart(),
  };
}

function DevicePages({
  device, image, qr,
}: {
  device: HifiDevice;
  image?: PdfImage;
  qr?: string;
}) {
  const specs = Object.entries(device.specs ?? {});
  const hasPrice = device.purchasePrice != null || device.currentValue != null;
  const { rightText, overflowText } = splitDescription(device);

  return (
    <>
      {/* Left page – photo. Flex layout: image grows to fill space above overlay.
           On overflow the overlay expands; objectFit:cover keeps the photo centred. */}
      <Page size="A5" style={s.leftPage}>
        {image
          ? (
            <View style={s.deviceImgContainer}>
              <Image src={image} style={s.deviceImg} />
            </View>
          ) : (
            <View style={s.deviceImgPlaceholder}>
              <View style={s.placeholderCircle} />
            </View>
          )}
        <View style={s.deviceNameOverlay}>
          <Text style={s.deviceCategory}>{device.category}</Text>
          <Text style={s.deviceBrand}>{device.brand}</Text>
          <Text style={s.deviceModel}>{device.model}</Text>
          {device.year && <Text style={s.deviceYear}>{device.year}</Text>}
          {overflowText && (
            <>
              <View style={s.overlayDescRule} />
              <Text style={s.deviceDescOverlay}>{overflowText}</Text>
            </>
          )}
        </View>
        <Text style={[s.pageNumber, { color: "#57534E" }]} render={({ pageNumber }) => String(pageNumber)} />
      </Page>

      {/* Right page – info page. Description shows as much as fits; remainder is on the left. */}
      <Page size="A5" style={s.rightPage}>
        <Text style={s.infoCategory}>{device.category}</Text>
        <Text style={s.infoBrand}>{device.brand}</Text>
        <Text style={s.infoModel}>{device.model}</Text>
        <View style={s.infoRule} />

        {rightText ? (
          <Text style={s.infoDescription}>{rightText}</Text>
        ) : null}

        {specs.length > 0 && (
          <View style={s.specsGrid}>
            <Text style={s.specsHeading}>Spezifikationen</Text>
            {specs.slice(0, 12).map(([key, val]) => (
              <View key={key} style={s.specRow}>
                <Text style={s.specKey}>{key}</Text>
                <Text style={s.specVal}>{val}</Text>
              </View>
            ))}
          </View>
        )}

        {hasPrice && (
          <View style={s.priceBox}>
            {device.purchasePrice != null && (
              <View style={s.priceItem}>
                <Text style={s.priceLabel}>Kaufpreis</Text>
                <Text style={s.priceValue}>{fmtEur(device.purchasePrice)}</Text>
              </View>
            )}
            {device.currentValue != null && (
              <View style={s.priceItem}>
                <Text style={s.priceLabel}>Zeitwert</Text>
                <Text style={s.priceValue}>{fmtEur(device.currentValue)}</Text>
              </View>
            )}
          </View>
        )}

        {qr && (
          <View style={s.qrArea}>
            <Image src={qr} style={s.qrImg} />
            <Text style={s.qrLabel}>Websuche</Text>
          </View>
        )}

        <Text style={s.pageNumber} render={({ pageNumber }) => String(pageNumber)} />
      </Page>
    </>
  );
}

function SummaryPage({ devices }: { devices: HifiDevice[] }) {
  const withValue = devices.filter((d) => d.currentValue != null || d.purchasePrice != null);
  const totalKauf = devices.reduce((s, d) => s + (d.purchasePrice ?? 0), 0);
  const totalZeit = devices.reduce((s, d) => s + (d.currentValue ?? 0), 0);

  const colWidths = { nr: "6%", device: "42%", kat: "20%", kauf: "16%", zeit: "16%" };

  return (
    <Page size="A5" style={s.summaryPage}>
      <Text style={s.sumHeading}>Anhang</Text>
      <Text style={s.sumTitle}>Versicherungsübersicht</Text>

      {/* Table header */}
      <View style={s.tableHeader}>
        <Text style={[s.tableHeaderCell, { width: colWidths.nr }]}>Nr.</Text>
        <Text style={[s.tableHeaderCell, { width: colWidths.device }]}>Gerät</Text>
        <Text style={[s.tableHeaderCell, { width: colWidths.kat }]}>Kategorie</Text>
        <Text style={[s.tableHeaderCell, { width: colWidths.kauf, textAlign: "right" }]}>Kaufpreis</Text>
        <Text style={[s.tableHeaderCell, { width: colWidths.zeit, textAlign: "right" }]}>Zeitwert</Text>
      </View>

      {devices.map((d, i) => (
        <View key={d.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
          <Text style={[s.tableCellMid, { width: colWidths.nr }]}>{i + 1}</Text>
          <Text style={[s.tableCell, { width: colWidths.device }]}>{d.brand} {d.model}</Text>
          <Text style={[s.tableCellMid, { width: colWidths.kat }]}>{d.category}</Text>
          <Text style={[s.tableCellMid, { width: colWidths.kauf, textAlign: "right" }]}>{fmtEur(d.purchasePrice)}</Text>
          <Text style={[s.tableCell, { width: colWidths.zeit, textAlign: "right" }]}>{fmtEur(d.currentValue)}</Text>
        </View>
      ))}

      {/* Total row */}
      <View style={s.totalRow}>
        <Text style={[s.totalLabel, { flex: 1 }]}>Gesamt ({devices.length} Geräte)</Text>
        <Text style={[s.totalValue, { width: colWidths.kauf }]}>{totalKauf > 0 ? fmtEur(totalKauf) : "–"}</Text>
        <Text style={[s.totalValue, { width: colWidths.zeit }]}>{totalZeit > 0 ? fmtEur(totalZeit) : "–"}</Text>
      </View>

      {withValue.length < devices.length && (
        <Text style={{ fontSize: 7, color: C.light, marginTop: 8 }}>
          * {devices.length - withValue.length} Geräte ohne Preisangabe – bitte auf der Geräteseite ergänzen.
        </Text>
      )}

      <Text style={{ fontSize: 7, color: C.light, marginTop: 12 }}>
        Erstellt am {new Date().toLocaleDateString("de-DE")} · Frank Lechtenberg · Privatsammlung
      </Text>

      <Text style={s.pageNumber} render={({ pageNumber }) => String(pageNumber)} />
    </Page>
  );
}

// ─── Main document ────────────────────────────────────────────────────────────

interface CatalogPDFProps {
  devices: HifiDevice[];
  images: Record<string, PdfImage | undefined>;
  qrCodes: Record<string, string | undefined>;
}

export function CatalogPDF({ devices, images, qrCodes }: CatalogPDFProps) {
  return (
    <Document
      title="HiFi-Bibliothek"
      author="Frank Lechtenberg"
      subject="HiFi-Katalog"
      creator="HiFi-App"
    >
      <TitlePage devices={devices} images={images} />
      <TocPage devices={devices} />
      {devices.map((device) => (
        <DevicePages
          key={device.id}
          device={device}
          image={images[device.id]}
          qr={qrCodes[device.id]}
        />
      ))}
      <SummaryPage devices={devices} />
    </Document>
  );
}
