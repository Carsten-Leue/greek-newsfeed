# Greek Newsfeed Kindle Digest

Stellt jeden Morgen automatisch einen "Pressespiegel" aus griechischen
Nachrichten-RSS-Feeds zusammen, packt ihn als EPUB und schickt ihn per
E-Mail an die "Send to Kindle"-Adresse eines Kindle Paperwhite (oder jedes
anderen Kindle). Der Versand läuft über einen täglichen GitHub-Actions-Job.

## Wie es funktioniert

1. `config/feeds.json` listet die griechischen RSS-Feeds (Name, URL, Kategorie).
2. `src/index.mjs` lädt alle Feeds parallel (`src/lib/fetchFeeds.mjs`). Ein
   defekter oder nicht erreichbarer Feed lässt den Job nicht scheitern –
   er wird übersprungen und im Log sowie im Digest selbst als Fehler
   vermerkt.
3. Für jeden Artikel wird optional der Volltext nachgeladen und mittels
   Readability-Extraktion bereinigt (`src/lib/extractArticle.mjs`,
   `src/lib/sanitizeHtml.mjs`). Bilder, Skripte und Styling werden bewusst
   entfernt, damit das E-Book klein bleibt und auf dem E-Ink-Display schnell
   und sauber rendert. Schlägt die Extraktion fehl (Paywall, Timeout, ...),
   wird die RSS-Zusammenfassung als Fallback verwendet.
4. `src/lib/buildEbook.mjs` baut daraus ein EPUB (ein Kapitel pro Quelle,
   plus eine Übersichtsseite mit Datum und Status aller Feeds).
5. `src/lib/sendMail.mjs` verschickt das EPUB per SMTP als Anhang an die
   Kindle-Mailadresse. Amazon konvertiert/liefert es automatisch auf das
   Gerät.
6. `.github/workflows/daily-digest.yml` führt das Ganze jeden Morgen
   automatisch aus.

## Einmalige Einrichtung

### 1. Kindle-E-Mail-Adresse vorbereiten

1. Auf `amazon.de` unter **Inhalte und Geräte verwalten → Geräte → [dein
   Kindle]** die persönliche Dokumenten-E-Mail-Adresse ablesen
   (`meinname_XXXXX@kindle.com`).
2. Unter **Einstellungen → Persönliche Dokumenteneinstellungen →
   Genehmigte persönliche Dokument-E-Mail-Liste** die Absenderadresse
   eintragen, die für `MAIL_FROM` verwendet wird (z. B. deine Gmail-Adresse).
   Nur E-Mails von genehmigten Absendern werden von Amazon angenommen.
3. EPUB wird von Kindle-Geräten (Firmware-Update 2022+) direkt
   unterstützt, eine Konvertierung ist nicht nötig.

### 2. SMTP-Postfach zum Versenden

Jedes SMTP-fähige Postfach funktioniert, z. B. Gmail mit einem
[App-Passwort](https://myaccount.google.com/apppasswords):

- `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`

### 3. GitHub Secrets anlegen

Im Repository unter **Settings → Secrets and variables → Actions → New
repository secret** folgende Secrets anlegen:

| Secret        | Beschreibung                                              |
| ------------- | ---------------------------------------------------------- |
| `SMTP_HOST`   | z. B. `smtp.gmail.com`                                     |
| `SMTP_PORT`   | z. B. `587`                                                 |
| `SMTP_SECURE` | `true` bei Port 465, sonst `false`                          |
| `SMTP_USER`   | Login-Name des SMTP-Postfachs                               |
| `SMTP_PASS`   | Passwort / App-Passwort                                     |
| `MAIL_FROM`   | Absenderadresse (muss bei Amazon genehmigt sein)             |
| `KINDLE_EMAIL`| Send-to-Kindle-Adresse(n), kommagetrennt für mehrere Geräte  |

### 4. Zeitplan

Der Workflow läuft per Cron um `30 4 * * *` (UTC), das entspricht ca.
07:30 Uhr im griechischen Sommer (EEST) bzw. 06:30 Uhr im Winter (EET) –
beides morgens. Zeit bei Bedarf in
`.github/workflows/daily-digest.yml` anpassen (Cron ist immer UTC).

Der Workflow lässt sich zusätzlich jederzeit manuell über **Actions →
Täglicher Pressespiegel → Run workflow** starten, optional mit Haken bei
"Nur EPUB erzeugen, keine Mail versenden" (Dry-Run, EPUB landet als
Artefakt am Workflow-Run).

## Lokal testen

```bash
npm install
npm run dry-run
```

Erzeugt `output/Pressespiegel-YYYY-MM-DD.epub` ohne eine E-Mail zu
versenden. Für einen echten Testversand `.env` aus `.env.example`
anlegen und ausfüllen, dann:

```bash
npm start
```

## Feeds anpassen

`config/feeds.json` frei erweitern/kürzen:

```json
{ "name": "Anzeigename", "url": "https://beispiel.gr/feed/", "category": "Allgemein" }
```

RSS-URLs von Nachrichtenseiten ändern sich gelegentlich. Schlägt ein Feed
dauerhaft fehl, erscheint das im Workflow-Log und im Digest selbst
("Nicht verfügbare Quellen") – URL dann in `config/feeds.json`
korrigieren oder den Feed entfernen.

## Konfigurationsoptionen (Umgebungsvariablen)

| Variable               | Default              | Bedeutung                                    |
| ----------------------- | --------------------- | --------------------------------------------- |
| `TIMEZONE`              | `Europe/Athens`       | Zeitzone für Datum/Zeit-Anzeige im Digest     |
| `MAX_ITEMS_PER_FEED`    | `8`                    | Max. Artikel pro Quelle                       |
| `FETCH_FULL_ARTICLES`   | `true`                 | Volltext statt nur RSS-Zusammenfassung laden  |
| `ARTICLE_TIMEOUT_MS`    | `10000`                | Timeout pro Artikel-Volltext-Abruf            |
| `ARTICLE_CONCURRENCY`   | `4`                    | Parallele Volltext-Abrufe                     |
| `FEED_TIMEOUT_MS`       | `15000`                | Timeout pro RSS-Feed-Abruf                    |
| `DRY_RUN`               | `false`                | EPUB nur lokal speichern, nicht versenden     |

## Grenzen

- Manche Seiten liefern hinter einer Paywall nur einen Teaser – dann wird
  automatisch die RSS-Zusammenfassung statt des Volltexts verwendet.
- Bilder werden bewusst entfernt, damit das tägliche E-Book klein bleibt
  und auf dem E-Ink-Display schnell lädt.
- Die Artikel bleiben unübersetzt auf Griechisch; es findet keine
  automatische Übersetzung statt.
