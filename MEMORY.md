# MEMORY.md - Long-Term Memory

## Kevin

- Name: Kevin Mertes
- Timezone: Europe/Berlin
- Sprache: Deutsch bevorzugt

## Masterarbeit

**Titel:** "Towards a Unified Commerce Schema Registry: Design eines kanonischen Integrationsmodells agentischer Shopsysteme"

- Thema: Entwurf einer Schema-Registry als kanonisches Integrationsmodell für agentische (KI-gestützte) Shopsysteme
- Kontext: Unified Commerce, API-Integration, Schema-Design, AI Agents im E-Commerce
- Stand: In Arbeit (seit März 2026)

## Erste Session

- 2026-03-10: Workspace initialisiert, Erstgespräch via Telegram

## Autonomie-Preferences

- 2026-03-27: Kevin wünscht, dass der Assistent innerhalb dieser VM möglichst autonom arbeitet und proaktiv Aktionen im Workspace ausführt.

## Kafka Streams App

- 2026-03-28: Planning note — In diesem Channel soll eine Kafka Streams App entworfen werden, die eine EventStore DB zwischen Producer und Consumer verankert. Dieses Pattern (EventStore DB als persistente Schicht zwischen Producer und Consumer, eingebettet in Kafka Streams) wird als zentrales Konzept der Masterarbeit vermerkt. Relevanz: fügt eine konkrete technische Architektur (Event Sourcing / Event Store + Kafka Streams) zum Integrationsmodell hinzu und beeinflusst Designentscheidungen für die Schema-Registry, Konsistenzmodelle und Replay/Recovery-Strategien.

- Wirkung auf die Arbeit:
  - Schema-Registry muss Ereignistypen, Versionierung und Kompatibilitätsregeln für eventbasierte Integrationen unterstützen.
  - Design der Agenten/Producer/Consumer muss Replay-Fähigkeit, idempotente Verarbeitung und Snapshotting berücksichtigen.
  - Performance- und Konsistenztradeoffs (synchron vs. eventual consistency) werden explizit im Architekturkapitel behandelt.

