# Radio Research Tool — Datenschutz-Kurzinfo

Diese Übersicht beschreibt, welche Daten das Tool verarbeitet und wohin sie fließen — als Grundlage für die eigene datenschutzrechtliche Prüfung deiner Redaktion. **Dies ist keine Rechtsberatung.** Jede Redaktion ist als Betreiberin der Software selbst datenschutzrechtlich verantwortlich (Art. 4 Nr. 7 DSGVO) und sollte diese Einschätzung mit der eigenen Datenschutzbeauftragten / dem eigenen Justiziariat abgleichen.

## Was die App macht

Das Tool lädt öffentlich zugängliche RSS-Feeds, wählt daraus Meldungen aus und lässt einen KI-Anbieter daraus Radio-Sprechtexte formulieren.

## Welche Daten wohin fließen

| Daten | Wohin | Zweck |
|---|---|---|
| RSS-Feed-Inhalte (Überschrift + Kurztext, öffentlich publiziert) | An den in der App **selbst gewählten** KI-Anbieter (Anthropic, OpenAI oder ein selbstgehosteter/dritter Endpoint) | Sprechtext-Erzeugung |
| Region (Freitext) | Bei Nutzung der „RSS-Quellen suchen"-Funktion an Anthropic (Web-Suche) | Automatische Feed-Suche |
| API-Keys | **Nur lokal** auf dem jeweiligen Windows-Rechner, verschlüsselt über den OS-Anmeldeinformationsspeicher (Windows Credential Manager / macOS Schlüsselbund) | Authentifizierung gegenüber dem KI-Anbieter |
| Sendername, Region, Feed-Liste, erzeugte Bulletins (Archiv) | **Nur lokal** auf dem jeweiligen Rechner (Browser-/App-Speicher) | Konfiguration, Archiv |

**Es gibt keinen eigenen Server, keine Cloud-Datenbank und keine Telemetrie.** Die Entwickler des Tools (TH OWL) erhalten zu keinem Zeitpunkt Einblick in Keys, Region, Feeds oder erzeugte Inhalte einer Redaktion.

## Worauf du selbst achten solltest

- **Auftragsverarbeitung (Art. 28 DSGVO):** Wenn RSS-Meldungen personenbezogene Daten enthalten können (z. B. Namen in Lokalnachrichten), ist die Übermittlung an den KI-Anbieter eine Auftragsverarbeitung. Prüfe die Auftragsverarbeitungsbedingungen deines gewählten Anbieters (Anthropic, OpenAI, oder eines Drittanbieters bei „Custom"-Zugang).
- **Drittlandtransfer:** Anthropic und OpenAI sind US-Unternehmen. Prüfe, auf welcher Rechtsgrundlage die Datenübermittlung in die USA erfolgt (z. B. Standardvertragsklauseln, EU-US Data Privacy Framework — Stand jeweils beim Anbieter direkt erfragen).
- **Selbst gehostete/lokale KI (Custom-Zugang):** Läuft dein KI-Modell lokal (z. B. Ollama) oder bei einem europäischen Anbieter, verlassen die Daten ggf. gar nicht dein Netzwerk/die EU — das kann die Prüfung vereinfachen.
- **Redaktionelle Sorgfaltspflicht:** Unabhängig vom Datenschutz gilt medienrechtlich: KI-generierte Texte sind Entwürfe und müssen vor der Sendung redaktionell geprüft werden.

## Kontakt für Rückfragen zur Software (nicht zum Datenschutz)

TH OWL — Lehrprojekt „KI und Forschung". Für eine Einschätzung der Verarbeitung durch den jeweils gewählten KI-Anbieter wende dich bitte direkt an dessen Datenschutz-/Compliance-Unterlagen.
