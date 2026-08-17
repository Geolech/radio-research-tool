# Radio Research Tool — Einrichtung für deine Redaktion

Kurzanleitung für Campusradios/Lokalredaktionen, die das Tool neu einsetzen. Dauer: ca. 10 Minuten.

*Ausführlicheres Handbuch (Systemvoraussetzungen, lokale KI mit Ollama, Cloud-KI mit Kostenhinweisen): [HANDBUCH.md](HANDBUCH.md).*

## 1. Installieren

1. `.exe` aus dem Artifact/Release herunterladen (Installer oder Portable-Version).
2. Beim ersten Start warnt Windows SmartScreen vor „unbekanntem Herausgeber" — das ist normal, die App ist nicht (kostenpflichtig) signiert:
   → **„Weitere Informationen"** → **„Trotzdem ausführen"**.

## 2. Sender & Region festlegen

Menü (☰ oben rechts) → **„Sendername & Region"**:
- **Sendername** — erscheint in der Kopfzeile, z. B. „Campusradio Musterstadt"
- **Sendegebiet** — möglichst eindeutig angeben (Stadt + Bundesland), das steuert auch die spätere Feed-Suche

## 3. Eigenen KI-Zugang einrichten

Menü → **„KI-Zugänge"** → „Zugang hinzufügen":
- **Anthropic (Claude)**, **OpenAI (GPT)** oder ein **eigener/lokaler Endpoint** (z. B. Ollama, LM Studio, Infomaniak)
- API-Key bei `console.anthropic.com` bzw. `platform.openai.com` besorgen — **jede Redaktion braucht einen eigenen Account und eigenen Key.** Keys werden nur lokal auf diesem Rechner gespeichert (verschlüsselt über den Windows-Anmeldeinformationsspeicher), nie an Dritte übertragen.
- Danach **„Testlauf"** klicken, um zu prüfen, ob der Zugang funktioniert.
- Es entstehen Kosten gemäß dem Tarif deines gewählten Anbieters — die App selbst verlangt kein Geld.

## 4. RSS-Quellen einrichten

Menü → **„RSS-Quellen editieren"**, um vorhandene Feeds zu prüfen/deaktivieren, oder Menü → **„RSS-Quellen suchen"**, um per KI automatisch Feeds aus eurer Region finden und live prüfen zu lassen (nutzt den Anthropic-Zugang, verursacht KI-Kosten — daher als bewusster Schritt gestaltet).

## 5. Erstes Bulletin erstellen

Auf der Startseite **„RSS-Bulletin erstellen"** klicken. Dauer meist 15–20 Sekunden. Fertige Sprechtexte lassen sich per Klick in den Editor übernehmen, dort bearbeiten und drucken (14 pt, zweizeilig).

## ⚠ Wichtig vor der Sendung

**KI-generierte Sprechtexte sind Entwürfe.** Sie müssen vor der Ausstrahlung redaktionell geprüft werden (Fakten, Aktualität, Tonalität) — wie bei jeder anderen Nachrichtenquelle auch. Die App validiert nicht automatisch, ob Inhalte korrekt oder vollständig sind.

## Bei Problemen

- Server läuft nicht mehr / App reagiert nicht: App komplett schließen und neu starten.
- KI antwortet nicht: Menü → KI-Zugänge → „Testlauf" beim betroffenen Zugang, zeigt die genaue Fehlermeldung.
- Feed liefert nichts: Menü → RSS-Quellen editieren, Status prüfen (✓/✕ bei der Feed-Suche, Feed-Status-Anzeige während eines Laufs).

Siehe auch: [DATENSCHUTZ.md](DATENSCHUTZ.md) für Hinweise zum Umgang mit Daten.
