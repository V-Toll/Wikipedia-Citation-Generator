# Changelog – Userscript

Changelog for the **Wikipedia Citation Generator** userscript. The pattern
database has its **own, separate** changelog in
[`patterns/CHANGELOG.md`](patterns/CHANGELOG.md).

Only ever add new entries at the top — never remove old ones.

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
