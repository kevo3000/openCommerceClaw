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

## Confluent + Debezium CDC Stack (Avro + Schema Registry)

- 2026-04-04: Lokaler CDC-Stack auf der VM aufgesetzt und verifiziert.
  - **Stack:** Zookeeper + Kafka + Schema Registry (Confluent 7.4.0) + Debezium Connect (debezium/connect:2.4) mit Confluent Avro Converter
  - **Compose-Pfad:** /home/kevin/.openclaw/workspace/kafka-confluent/docker-compose.yml
  - **Plugin-Volume:** cp_connect_plugins → gemountet als /kafka/connect im Connect-Container; enthält confluent-avro/ mit allen benötigten JARs (kafka-connect-avro-converter, kafka-avro-serializer, kafka-schema-serializer, kafka-schema-registry-client, avro, guava, etc.)
  - **Connect-Container:** quick-debezium-connect (one-off docker run, nicht im compose; Image debezium/connect:2.4, Netzwerk cp-network, Port 18083→8083)
  - **Postgres-Anpassungen (Host):** listen_addresses='*', pg_hba.conf für Docker-Bridges 172.17.0.0/16 + 172.20.0.0/16; User `debezium` (SUPERUSER, REPLICATION); Logical Slot `broadleaf_slot` (pgoutput)
  - **Connector:** broadleaf-postgres-connector (topic.prefix=broadleaf, AvroConverter, Schema Registry http://schema-registry:8081)
  - **Ergebnis:** CDC funktioniert; Test-Topic broadleaf.public.test_cdc erstellt; Avro-Schemas in Schema Registry registriert (key id=1, value id=2); kafka-avro-console-consumer zeigt deserialisierte Events
  - **Offene Punkte:** Connect-Container ist ein one-off (nicht im compose integriert); debezium-User hat SUPERUSER (sollte für Prod eingeschränkt werden); Replication-Faktor = 1 (single broker)

