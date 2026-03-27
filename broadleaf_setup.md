# Technische Architektur — Commerce Schema Registry

Dieses Dokument hält den geplanten Aufbau und die technischen Schritte fest, einschließlich Annahmen und offenen Punkten.

Ziel: Agentifizierung des Shopsystem Broadleaf Commerce und damit assoziierten Retail-Enterprise-Systemen. Dazu gehört der Retail Messenger "OmniTalk" für Verkäufer von Omnichannel-Händlern, die einen persönlichen Klon bekommen, der in einem Chat komplexe Beratungs- und überzeungsintensive shop-logik durch UI-Elemente kanalisiert. Dahintersteht als Messaging Operating System RocketChat, das für die komplette interne Kommunikation von Menschen und KI-Agenten mit und untereinander genutzt wird. Dies geht also über nicht-funktionale Kommunikation, wie einfachen H2H-Nachrichten, hinaus. Es erfolgt eine Toolchain bzw. ein Integrationsmodell, das eine vollständige Workflow-Koordination operativer (Broadleaf Commerce Admin/CMS-Modul) und analytischer (BigQuery, dbt) Systeme, sowie deren technische Wartung und Weiterentwicklung (Broadleaf Commerce restliche Module wie API, Site etc.) bzw. mindestens das logbasierte Abbild all dieser Prozesse der Quellsysteme zum Ziel hat.  Ein Gateway eines Multi-Agent-System einer OpenClaw-Instanz steuert, welche funktionalen Nachrichten an welche Subsysteme (Google Workspace, Shop-Operation, OmniTalk-Operation uvm.) delegiert werden.
Die Umsetzung dieser omnipräsenten Event-Observability und Historisierungs-Anliegen soll mit Apache Kafka erfolgen. Das Ziel dieser Schicht ist es, darin einen kanonisch-integrativen Referenzraum zu schaffen, der interne und externe Systemzuständen durch Checkpoints möglichst agil evolviert. Das heißt, über Updates, Rollbacks und Recoverys zwischen Systemzuständen und Versionierungen zu navigieren. Das impliziert ein zentrales Schema-Register von rekonstruierbaren Datenstrukturen und Datenbeständen. Der Kern der Arbeit dieses "Schema Registry" ist genau der Kern der Verzahnung von Kafka und Agentenkommunikation. Die Umsetzung dient primär der Masterarbeit, weitere Infos stellt thesis_academic_setup.md bereit. Dennoch soll Code mäglichst production-ready, sicher und mit genug Kommentaren geschrieben werden. Insofern bitte wirf den ball zu im zweifel zurück solltest du dir nicht über 

Komponenten (Übersicht)
- Openclaw Gateway (/home/kevin/.openclaw)
- Broadleaf Commerce Monolith (/home/kevin/BroadleafCommerce) mit postgreSQL (noch nicht downgeloaded)
- Rocket.Chat (/home/kevin/rocketchat-compose) 
- Rocket.Chat Plugin Openclaw (/home/kevin/.openclaw/extensions/openclaw-channel-rocketchat)
- OmniTalk als next.js-Retail-Messenger (/home/kevin/OmniTalk/omnitalk) via Supabase, aktuell noch nicht vollständig buildfähig
- Commerce Schema Registry (eigener Service)
- Confluent Schema Registry (noch zu downloaden)
- Message Broker Kafka (noch zu downloaden)
- Koog Agent Framework Java API (noch ein alle Java-Systeme intern einzubinden, insb. Broadleaf)
- Temporal Framework Java (noch downzuloaden)
- Entwicklungs-Tools: Docker Compose für lokale Container, git (https://github.com/kevo3000/), VS Code (OmniTalk, RocketChat), IntelliJ (BroadleafC, Kafka, Confluence Schema Registry...)

Architektur (konzeptionell)
1. Broadleaf Commerce
   - Herzstück der Spielwiese: Produktkatalog, Warenkorb, Checkout-Flow.
   - Deployment lokal via Docker Compose (Postgres, Redis, Broadleaf-Service).
2. OmniTalk / Rocket.Chat
   - OmniTalk stellt Kommunikationskanal und Agenten-Oberfläche bereit.
   - Verbindung zu Broadleaf über REST/Webhook-Adapter und Message Broker.
   - Hinweis: Aktuell ist OmniTalk in dieser Umgebung nicht buildfähig — als Folge müssen wir entweder eine Mock-Integration nutzen oder OmniTalk extern bauen und die entstandenen Artefakte bereitstellen.
3. Schema Registry
   - Zentrales Service zur Definition kanonischer Schemata (Produkt, Bestellung, Kunde, Inventar).
   - Bereitstellung als eigener Microservice (z. B. Spring Boot + DB) mit HTTP-API.
4. Message Broker
   - Vermittlung von Events (OrderCreated, InventoryChanged, ProductUpdated) zwischen Services.
5. Agentische Schicht / AI-Agenten
   - Experimentelle Agenten, die auf Nachrichten/Event reagieren, Schemata transformieren oder Integrationen orchestrierren.

Setup-Schritte (Kurzfassung)
1. Basisumgebung
   - Installiere Docker & Docker Compose
   - Git-Repo initialisieren: /home/kevin/.openclaw/workspace/broadleaf-playground
2. Datenbank & Broker
   - Start: Postgres, Redis, RabbitMQ via Docker Compose
3. Broadleaf starten
   - Konfiguriere application.properties für lokale DB
   - Build & Run (Maven/Gradle) oder Docker-Image
   - Falls Broadleaf zu schwer, alternativ Minimal-Mock-Service für Kern-APIs
4. Schema Registry
   - Minimal-API implementieren (CRUD für Schemata, Versionierung)
5. OmniTalk Integration
   - Falls OmniTalk nicht buildbar: Implementiere einen Proxy/Mock, der Rocket.Chat Webhooks emuliert
6. Tests & Experimente
   - Simuliere Events, teste Agenten-Workflows, verifiziere Schema-Mappings

Offene Punkte / ToDo
- OmniTalk build-Probleme analysieren und beheben (Logs, fehlende Dependencies)
- Exakte Broadleaf-Version bestimmen (Kompatibilität mit lokalen Java-/DB-Versionen)
- Entscheidung: Kafka vs RabbitMQ
- Security: API-Keys / Auth für Registry & Broadleaf

Dokumentation
- Dieses Dokument ist ein lebendes Protokoll. Ergänzungen: konkrete Docker Compose Files, Build-Skripte, und Troubleshooting-Notizen.

(Platzhalter) Diagramm: siehe die bereitgestellten Visualisierungen — falls du möchtest, kann ich daraus ein Architekturdiagramm als SVG/Markdown-Diagramm erzeugen. Aktuell habe ich das Exposé/Diagramm nicht lokal einlesen können; bitte hochladen oder Pfad bestätigen.

---

Schema-Evolution im Broadleaf-Monolithen (Finaler Prozess)

1) Die Daten-Basis (Broadleaf Java / DB)
- Agile Weg (Sonderfall):
  - Nutzt die vorhandene ProductAttribute-Map (Key-Value-Map für Produktattribute).
  - Vorteil: Keine Java-Code-Änderung, keine Liquibase-Migration nötig — neues Attribut per Admin/DB-Eintrag.
  - Technik: Feld im Admin anlegen oder direkt per DB-Insert.
- Heavy Weg (Standard für strukturierte Änderungen):
  - Erweiterung der Implementierungs-Klasse (z. B. MyProductImpl) mit echtem Java-Field + Getter/Setter.
  - Vorteil: Typsicherheit, echte Spalten, Indexierung möglich, bessere Performance.
  - Technik: Java-Field hinzufügen und eine Liquibase-Migration schreiben (Spalte anlegen, ggf. Default-Werte, Indexe).

Entscheidungsregel:
- Kurzfristige, unkritische Felder → Agile Weg.
- Persistente, query‑relevante Felder oder Felder mit Regeln → Heavy Weg.

2) API-Schicht (Spring GraphQL)
- Vertragsdefinition (Schema): Neuer Feld-Eintrag (z. B. sustainabilityScore: Int) wird manuell in schema.graphqls ergänzt — das ist der externe Vertrag.
- Auflösung / Resolver:
  - Heavy Weg: Spring GraphQL erkennt Java-Getter per Reflection; kein zusätzlicher Controller-Code nötig (Level 2 Automatisierung).
  - Agile Weg: Ein generischer Universal-Resolver (einmalig implementiert) mapped Schema-Felder auf Keys in der Broadleaf-Attribute-Map (Level 3 Automatisierung).

3) Middleware-Synchronisation (Next.js / Frontend)
- Broadleaf als Single Source of Truth: Änderungen am Schema werden im Java-GraphQL-Schema gepflegt.
- Codegen: graphql-codegen scannt das Java-GraphQL-Schema und generiert TypeScript-Interfaces für Next.js.
- Effekt: Frontend (Anzeige) und KI‑Tools (Function Calling) sind automatisch mit dem neuen Feld synchronisiert; manuelles Anlegen von Interfaces entfällt.

4) Hybrides Nutzungsmodell
- Legacy: Bestehende Shop-Logik (Warenkorb/Checkout) bleibt bei Broadleaf-REST-Services.
- Evolution: Neue Features & KI-Interaktionen laufen über GraphQL. Keine parallele Pflege neuer REST-DTOs.

5) Einbindung von Koog (Agent-Framework)

🧩 Konkrete Aufgaben von Koog im Broadleaf-Kontext

4.1 Semantic Adapter
- Beispiel-User-Intent: „Günstige Trailschuhe für Regen“
- OpenClaw/OmniTalk erkennt die Absicht (z. B. shopsystem-operation) und übergibt sie an Koog.
- Koog übersetzt natürliche Sprache in eine strukturierte Query für Broadleaf (Mapping Layer zwischen Sprache und Domainmodell).

4.2 Tool-Orchestrierung
- Koog plant die Execution: welche Services aufzurufen sind, in welcher Reihenfolge und mit welchen Parametern.
- Nicht nur ein einzelner API-Call — Koog kann komplexe Execution-Pläne (z. B. Suche → Filter → Personalization → Pricing-Check) orchestrieren.

4.3 Cross-Domain Reasoning
- Koog kombiniert Informationen aus mehreren Domänen: Pricing, Inventory, Promotions, Analytics (BigQuery).
- Broadleaf trennt diese Domänen — Koog verbindet sie semantisch und kontextualisiert Ergebnisse nach Rollen (Service Agent, Direct Marketer Agent, Category Manager Agent, Community Agent).

6) Rolle von BigQuery im Zusammenspiel
- Beispiel (Direct Marketer Agent):
  - BigQuery führt analytische Selektionen (z. B. Kampagnenkandidaten).
  - Java-Services lesen DTOs/IDs batchweise.
  - Broadleaf materialisiert die echten Product-Entities.
- Merksatz: BigQuery selektiert, Broadleaf materialisiert.

7) Technische Integration (Java)
- Koog läuft auf Java 17+ und als Spring Boot Prozess nahe an Broadleaf-Services (leichtgewichtiger Domain-Agent).

8) Verhältnis zu OpenClaw
- Koog ersetzt OpenClaw nicht.
  - OpenClaw = äußerer Agent-Router / Integrationspunkt (Rocket.Chat, Webhooks, externe Kanäle).
  - Koog = innerer Domain-Agent (Commerce-Logik, Execution Planning, Cross-Domain Reasoning).
- OpenClaw delegiert an Koog-basierte Broadleaf-Agenten für Commerce-spezifische Aufgaben.

Praktische Hinweise & ToDo
- Implementiere Universal-Resolver & Codegen-Pipeline früh (ermöglicht schnelle Iteration auf Agile-Weg).
- Für Heavy-Weg: erstelle Template-Liquibase-Migrationen und ein Review-Check für DB-Änderungen.
- Koog: erstelle ein Adapter-Skeleton (Java/Spring) das Natural Language → Domain-Query mapped; später erweitern um Planner/Orchestrator.

Wenn du möchtest, übernehme ich:
- die konkrete README‑Abschnitte mit Befehlen für: (a) Agile-Änderung via Admin/DB, (b) Heavy-Änderung: Java-Field + Liquibase-Migration + Test-Checklist; und
- ein Starter‑Skeleton für Koog (Spring Boot + Beispieladapter + Tests).

---
