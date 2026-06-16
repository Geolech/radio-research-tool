# Windows-EXE bauen (Radio Research Tool)

Die App ist eine **Electron-Anwendung**, die intern einen gebündelten Next.js-Server
startet. Sie läuft **autark** — kein Dev-Server, keine Internetverbindung außer für die
KI-Aufrufe (Anthropic) nötig.

## API-Key

Es wird **kein** Key in die .exe eingebaut. Jede Redaktion trägt ihren eigenen
Anthropic-API-Key direkt in der App ein:

> Menü (☰) → **Einstellungen → KI-Zugang (API-Key)**

Der Key wird nur lokal auf dem Gerät gespeichert und bei KI-Aufrufen per Header an den
lokalen Server gereicht. Key gibt es unter `console.anthropic.com`. Ohne Key funktionieren
RSS-Laden und Editor; KI-Sprechtexte und Feed-Suche brauchen den Key.

---

## Weg A — Bauen über GitHub Actions (empfohlen)

Baut die .exe auf einem echten Windows-Runner — am zuverlässigsten.

1. Code nach GitHub pushen (Repo `Geolech/hifi-bibliothek`, Branch `main`).
2. Auf GitHub → Tab **Actions** → Workflow **„Build Windows EXE"** → **Run workflow**.
   (Oder einen Tag pushen: `git tag v0.1.0 && git push --tags`.)
3. Nach ~5–10 min unter dem Job → **Artifacts** → `RadioResearchTool-Windows`
   herunterladen. Enthält:
   - `RadioResearchTool-Setup-<version>.exe` — Installer
   - `RadioResearchTool-Portable-<version>.exe` — ohne Installation startbar

## Weg B — Selbst auf einem Windows-Rechner bauen

Voraussetzung: Node.js 20+ auf Windows.

```bat
npm install
npm run dist
```

Ergebnis liegt in `dist\`:
- `RadioResearchTool-Setup-<version>.exe`
- `RadioResearchTool-Portable-<version>.exe`

---

## Lokal testen (macOS/Windows, ohne Paketieren)

In zwei Terminals:

```bash
npm run dev          # Terminal 1: Next-Dev-Server auf :3000
npm run electron:dev # Terminal 2: Electron-Fenster gegen den Dev-Server
```

## Hinweise

- **Icon:** Aktuell wird das Standard-Electron-Icon verwendet. Für ein eigenes Icon
  `build/icon.ico` (256×256) anlegen und in `package.json` unter `build.win.icon` eintragen.
- **Code-Signing:** Die .exe ist nicht signiert; Windows SmartScreen zeigt ggf. eine
  Warnung („Weitere Informationen → Trotzdem ausführen"). Für eine signierte .exe ist ein
  Code-Signing-Zertifikat nötig.
- Die App bündelt das gesamte Projekt (auch die HiFi-Teile), öffnet aber direkt das
  Radio Research Tool (`/radio`).
