<div align="center">

# 📚 Wikipedia Citation Generator

**Erzeugt aus Nachrichtenartikeln mit einem Tastendruck fertige
`{{Internetquelle}}`-Einzelnachweise für die deutschsprachige Wikipedia.**

[![Version](https://img.shields.io/badge/version-2.2.0-2b7bba)](CHANGELOG.md)
[![Seiten](https://img.shields.io/badge/unterst%C3%BCtzte%20Seiten-209-e67e22)](patterns/site-patterns.json)
[![Lizenz](https://img.shields.io/badge/Lizenz-Unlicense-2ecc71)](LICENSE)
[![Userscript](https://img.shields.io/badge/Userscript-Violentmonkey%20%7C%20Tampermonkey-673ab7)](#-installation)

</div>

---

## ✨ Was macht das Tool?

Beim Lesen eines Artikels (z. B. auf *Spiegel*, *Guardian* oder *Telegraph*)
öffnet ein Tastenkürzel ein Fenster, in dem **Autor, Titel, Werk, Datum und
Sprache bereits automatisch ausgefüllt** sind. Nach einem kurzen Blick lässt
sich der fertige Einzelnachweis in die Zwischenablage kopieren:

```wikitext
<ref>{{Internetquelle |autor=Maya Yang |url=https://www.theguardian.com/… |titel=… |werk=[[The Guardian]] |datum=2026-07-01 |sprache=en |abruf=2026-07-02}}</ref>
```

## 🚀 Funktionen

- **Automatische Extraktion** von Autor, Titel, Werk, Datum und Sprache.
- **209 hinterlegte Nachrichtenseiten** mit maßgeschneiderten Selektoren
  (siehe [`patterns/site-patterns.json`](patterns/site-patterns.json)).
- **Mehrere Autoren** werden erkannt und korrekt zusammengeführt.
- **Kürzel-Auflösung** für *Der Spiegel* (z. B. `sol/dpa` → „Sebastian Stoll“,
  Nachrichtenagenturen werden herausgefiltert).
- **Manuelle Auswahl:** Passt etwas nicht, lässt sich das richtige Element per
  Klick auf der Seite auswählen – die Zuordnung wird pro Seite **gelernt**.
- **Automatischer Dark Mode** (folgt dem System) plus manueller Umschalter
  Auto / Hell / Dunkel.
- **Eingebauter Changelog**, erreichbar über das Versions-Badge im Fenster.
- **Selbstaktualisierend:** Skript (über `@updateURL`) und Muster-Datenbank
  (täglich, plus Button 🔄) halten sich selbst aktuell.

## 📦 Installation

1. Einen Userscript-Manager installieren:
   [Violentmonkey](https://violentmonkey.github.io/) oder
   [Tampermonkey](https://www.tampermonkey.net/).
2. **[➡️ Skript installieren](https://raw.githubusercontent.com/V-Toll/Wikipedia-Citation-Generator/main/wikipedia-citation-generator.user.js)**
   – der Klick auf die `.user.js`-Datei öffnet den Installationsdialog.

Künftige Versionen werden vom Userscript-Manager automatisch übernommen.

## ⌨️ Verwendung

| Aktion | So geht’s |
| --- | --- |
| Fenster öffnen | **Strg + Shift + C** (macOS: **⌘ + Shift + C**) |
| … oder | Menü des Userscript-Managers → „📋 Zitation generieren“ |
| Datenbank aktualisieren | Button **🔄** im Fenster oder Menü „🔄 DB aktualisieren“ |
| Design wechseln | 🌗/☀️/🌙-Schalter oben rechts im Fenster |
| Changelog ansehen | Klick auf das Versions-Badge im Fenster |

> Auf `*.wikipedia.org` ist das Skript bewusst deaktiviert.

## 🧩 Wie die Muster-Datenbank funktioniert

Die Datei [`patterns/site-patterns.json`](patterns/site-patterns.json) ordnet
jeder Domain CSS-Selektoren für Titel, Autor und Datum zu. Beispiel:

```json
"theguardian.com": {
  "name": "[[The Guardian]]",
  "selectors": {
    "title": "h1, .content__headline",
    "author": "a[rel=\"author\"], .byline, .contributor-byline",
    "date": "time, .content__dateline-wpd"
  }
}
```

Findet das Skript keine passende Regel, greifen allgemeine Meta-Tags
(`og:title`, `article:published_time` usw.) als Rückfallebene.

### Eine neue Seite ergänzen

1. In `patterns/site-patterns.json` einen Eintrag mit der Domain als Schlüssel
   anlegen (`name` = Wikilink des Werks, `selectors` = CSS-Selektoren).
2. Änderung committen und pushen – das Skript lädt die neue Datenbank
   automatisch (bzw. sofort über den Button 🔄; die Roh-Auslieferung von GitHub
   ist ca. 5 Minuten zwischengespeichert).

## 📝 Changelogs

Skript und Datenbank werden **getrennt** versioniert:

- Userscript → [`CHANGELOG.md`](CHANGELOG.md)
- Muster-Datenbank → [`patterns/CHANGELOG.md`](patterns/CHANGELOG.md)

## 📄 Lizenz

Gemeinfrei ([The Unlicense](LICENSE)) – frei nutz-, änder- und verteilbar.
