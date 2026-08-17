# Handbuch — Radio Research Tool

*Erster Entwurf. Für den schnellen Einstieg siehe [RADIO-EINRICHTUNG.md](RADIO-EINRICHTUNG.md); dieses Handbuch geht tiefer, insbesondere zu KI-Anbindung und Kosten.*

---

## Teil 1 — Installation

### 1.1 Systemvoraussetzungen (Rechner)

Das Tool selbst ist eine schlanke Desktop-App (Electron + Next.js) und stellt kaum Anforderungen:

| | Minimum | Empfohlen |
|---|---|---|
| Betriebssystem | Windows 10 (64-Bit) | Windows 11 |
| Arbeitsspeicher | 4 GB frei | 8 GB frei |
| Festplattenspeicher | ~300 MB | 500 MB |
| Internetverbindung | für RSS-Abruf und Cloud-KI nötig | — |

> Diese Tabelle gilt für die App **ohne** ein lokales KI-Modell. Willst du KI lokal betreiben (Teil 2), gelten deutlich höhere Anforderungen — siehe dort.

### 1.2 App installieren

1. `.exe` herunterladen (Installer oder Portable-Version).
2. Beim ersten Start warnt Windows SmartScreen vor „unbekanntem Herausgeber" — normal bei einer nicht kostenpflichtig signierten App:
   → **„Weitere Informationen"** → **„Trotzdem ausführen"**.
3. App startet und öffnet direkt das Radio Research Tool.

### 1.3 Ersteinrichtung

Menü (☰ oben rechts) → **„Sendername & Region"**:
- **Sendername** — erscheint in der Kopfzeile (z. B. „Campusradio Musterstadt")
- **Sendegebiet** — möglichst eindeutig (Stadt + Bundesland), steuert auch die automatische Feed-Suche

Danach RSS-Quellen einrichten (Menü → „RSS-Quellen editieren" bzw. „RSS-Quellen suchen").

**Als Nächstes brauchst du eine KI-Anbindung**, damit aus den Meldungen Sprechtexte werden. Zwei Wege stehen offen — lokal (Teil 2) oder über einen Cloud-Anbieter (Teil 3). Beide lassen sich parallel einrichten und im Betrieb umschalten (Menü → „KI-Zugänge").

---

## Teil 2 — Lokale KI mit Ollama

### 2.1 Wann lokal sinnvoll ist

| Vorteil | Nachteil |
|---|---|
| Keine laufenden Kosten | Braucht einen leistungsfähigen Rechner |
| Daten verlassen den Rechner nicht (Datenschutz einfacher, siehe DATENSCHUTZ.md) | Textqualität bei kleinen Modellen schwächer als bei großen Cloud-Modellen |
| Funktioniert offline (nur RSS-Abruf braucht Internet) | Etwas mehr Einrichtungsaufwand |

### 2.2 Systemvoraussetzungen für lokale Modelle

Die Anforderungen hängen fast ausschließlich vom **Modell** ab, nicht von der App. Faustregel: **Arbeitsspeicher ≈ Modellgröße in Milliarden Parametern × 1,5–2 GB** (bei den üblichen 4-Bit-quantisierten Modellen, die Ollama standardmäßig lädt).

| Modellgröße | RAM (Minimum) | Geeignet für | Hinweis |
|---|---|---|---|
| ~3–4 Mrd. Parameter (z. B. Phi-3, Llama 3.2 3B) | 8 GB | ältere/schwächere Rechner | Textqualität deutlich einfacher, mehr Nachbearbeitung nötig |
| ~7–8 Mrd. Parameter (z. B. Llama 3.1 8B, Mistral 7B) | 8–16 GB | die meisten aktuellen Büro-/Redaktionsrechner | guter Kompromiss; Grundlage unserer bisherigen Tests |
| ~13–14 Mrd. Parameter | 16 GB+ | Rechner mit mehr Ausstattung | spürbar bessere Texttreue |
| ~30 Mrd.+ Parameter | 32 GB+, idealerweise GPU | leistungsstarke Workstations | für den Alltag meist nicht nötig |

- **GPU:** nicht zwingend nötig (Ollama läuft auch reinem CPU-Betrieb), aber eine Grafikkarte (NVIDIA mit CUDA, oder Apple-Silicon-Mac mit viel Arbeitsspeicher) beschleunigt die Texterzeugung erheblich.
- **Festplatte:** pro Modell zusätzlich **4–8 GB** einplanen.
- **Erfahrungswert aus diesem Projekt:** Mit einem kleinen 8B-Modell (Llama 3.1) neigte die KI anfangs zum Abstrahieren/Fabulieren, wenn ihr zu wenig Quellentext gegeben wurde. Nach Anpassung des Prompts (mehr Quellentext, strikte „nichts erfinden"-Anweisung, niedrige Temperature) wurde die Textqualität deutlich verlässlicher — nutzt zusätzlich den eingebauten **„🔍 Gegen Quelle prüfen"**-Button, um Abweichungen pro Meldung zu erkennen.

### 2.3 Ollama installieren

1. Auf [ollama.com](https://ollama.com) die Windows-Version herunterladen und installieren.
2. Ollama läuft danach automatisch im Hintergrund und stellt einen lokalen Server unter `http://localhost:11434` bereit.

### 2.4 Ein Modell herunterladen

Terminal/Eingabeaufforderung öffnen und z. B.:

```
ollama pull llama3.1
```

Das lädt das Modell einmalig herunter (mehrere GB, je nach Internetverbindung dauert das). Andere Modelle analog, z. B. `ollama pull mistral`.

### 2.5 In der App verbinden

Menü → **KI-Zugänge** → „Zugang hinzufügen":
- Anbieter: **OpenAI-kompatibel (Custom)**
- Vorlage-Button **„Ollama (lokal)"** anklicken — trägt Endpoint (`http://localhost:11434/v1`) und Modellname automatisch ein
- Modellname ggf. anpassen, falls du ein anderes Modell geladen hast (muss exakt dem Namen bei `ollama pull` entsprechen, z. B. `mistral` statt `llama3.1`)
- Kein API-Key nötig (Feld leer lassen)
- „+ Hinzufügen" → „Speichern" → mit **„Testlauf"** prüfen, ob die Verbindung funktioniert

---

## Teil 3 — Große Modelle über Cloud-APIs

### 3.1 Wann Cloud-Modelle sinnvoll sind

Wenn kein geeigneter Rechner für ein großes lokales Modell vorhanden ist, oder wenn maximale Textqualität wichtiger ist als laufende Kosten zu vermeiden. Unterstützt werden aktuell **Anthropic (Claude)** und **OpenAI (GPT)**.

### 3.2 Anthropic-Zugang einrichten

1. Auf [console.anthropic.com](https://console.anthropic.com) registrieren.
2. Unter „API Keys" einen neuen Key erzeugen.
3. Zahlungsmethode hinterlegen (siehe Kostenhinweis unten).
4. In der App: Menü → KI-Zugänge → „Zugang hinzufügen" → Anbieter **Anthropic (Claude)** → Key einfügen → Speichern → Testlauf.

### 3.3 OpenAI-Zugang einrichten

Analog: [platform.openai.com](https://platform.openai.com) → API-Key erzeugen → Zahlungsmethode hinterlegen → in der App als Anbieter **OpenAI (GPT)** eintragen.

### 3.4 ⚠ Wichtiger Kostenhinweis

**Beide Anbieter berechnen nach Verbrauch** (pro verarbeitetem Textumfang, nicht pauschal pro Bulletin). Das Radio Research Tool selbst verlangt kein Geld — die Kosten entstehen direkt zwischen deiner Redaktion und dem gewählten Anbieter.

- Ein einzelnes Bulletin (5 kurze Sprechtexte) verbraucht vergleichsweise wenig Text — die Kosten pro Lauf liegen typischerweise im **Cent-Bereich**, können sich aber bei häufiger Nutzung, langen Kurztexten oder der „RSS-Quellen suchen"-Funktion (nutzt Web-Suche, teurer als reine Texterzeugung) summieren.
- **Aktuelle Preise bitte immer direkt beim Anbieter prüfen** (`anthropic.com/pricing`, `openai.com/pricing`) — diese ändern sich und sollen hier nicht veraltet stehen.
- **Empfehlungen zur Kostenkontrolle:**
  - Bei beiden Anbietern lassen sich in den Kontoeinstellungen **Ausgabenlimits** setzen — unbedingt einrichten.
  - Regelmäßig das **Nutzungs-Dashboard** des Anbieters prüfen.
  - Den **„Testlauf"**-Button in der App nutzen, statt für Verbindungstests ein ganzes Bulletin zu erzeugen.
  - Für Redaktionen mit engem Budget: lokale KI (Teil 2) als kostenfreie Alternative in Betracht ziehen, ggf. nur für die Feed-Suche (die zwingend Anthropic braucht) einen Cloud-Zugang parallel einrichten.

---

## Anhang — Lokal vs. Cloud im Überblick

| | Lokal (Ollama) | Cloud (Anthropic/OpenAI) |
|---|---|---|
| Laufende Kosten | Keine | Verbrauchsabhängig |
| Textqualität | Gut bis sehr gut, je nach Modellgröße | Sehr gut bis exzellent |
| Systemanforderungen | Hoch (RAM/Speicher/ggf. GPU) | Gering (nur Internetverbindung) |
| Datenschutz | Daten bleiben auf dem Rechner | Übermittlung an US-Anbieter (siehe DATENSCHUTZ.md) |
| Geschwindigkeit | Abhängig von Rechnerleistung | Meist schnell und konstant |
| RSS-Quellen-Suche | Nicht möglich (braucht zwingend Anthropic) | Möglich mit Anthropic-Zugang |

Beide Wege lassen sich **parallel** einrichten und in der App jederzeit umschalten (Dropdown „KI" auf der Startseite bzw. Menü → KI-Zugänge).
