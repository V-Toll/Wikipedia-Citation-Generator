# Changelog – Userscript

Changelog for the **Wikipedia Citation Generator** userscript. The pattern
database has its **own, separate** changelog in
[`patterns/CHANGELOG.md`](patterns/CHANGELOG.md).

Only ever add new entries at the top — never remove old ones.

## v2.4.1 – 2026-07-09
- The options area is now collapsible (collapsed by default) and shows the number of active options — more compact and sleeker.

## v2.4.0 "Anchor" – 2026-07-09
- New option: omit the `<ref></ref>` wrapper when copying (off by default) — copies just the `{{Internetquelle}}` template.
- New option: named reference `<ref name="…">` with an auto-generated short, unique name (off by default).

## v2.3.2 – 2026-07-07
- New author mode for ALL-CAPS bylines (e.g. "SCOTT HANNAFORD" → "Scott Hannaford"), used by The Canberra Times.

## v2.3.1 – 2026-07-07
- The floating button is now half the size.

## v2.3.0 "Beacon" – 2026-07-07
- New option "Citation-Generator-Modus" (off by default): shows a small floating button at the bottom-right of every site that opens the generator.
- The button does not appear on Wikipedia, Wikimedia Commons and related Wikimedia sites.

## v2.2.3 – 2026-07-07
- English long-form dates like "17 November 2008" are now recognized correctly.

## v2.2.2 – 2026-07-02
- The "Zitation" field is now a bit taller.
- Removed the "Abbrechen" button — the window is closed via the ✕ at the top right.

## v2.2.1 – 2026-07-02
- Removed the top info banner; the options now sit in their own card at the top as modern toggle switches.

## v2.2.0 "Switchboard" – 2026-07-02
- New option: emit `sprache=de` for German-language sources (off by default).
- New option: strip `[[…]]` wikilinks from the "werk" field, e.g. `[[The Atlantic]]` → `The Atlantic` (off by default).
- More compact window — the bottom buttons are now reachable without scrolling.

## v2.1.1 – 2026-07-02
- Script and pattern database now live together in one GitHub repository.
- Automatic script updates through Violentmonkey (via `@updateURL`).

## v2.1.0 "Nightfall" – 2026-07-01
- Automatic dark mode that follows the OS / browser color scheme.
- Theme switcher in the header (Auto / Light / Dark, choice is remembered).
- Clickable version badge opens an in-app changelog modal.
- Refreshed look — softer shadows, blurred overlay, gentle open animation.

## v2.0.11 – 2026-07-01
- Region language codes ("en-GB", "de-DE") are reduced to the base code ("en", "de").

## v2.0.10 – 2025-12-01
- Enhanced error handling with detailed logging.
- Better feedback on database refresh.
- Console output shows the exact error location.
- More informative error messages.
