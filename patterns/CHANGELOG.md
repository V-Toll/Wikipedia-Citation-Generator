# Changelog – Pattern Database

Changelog for `site-patterns.json` (the site-selector database consumed by the
Wikipedia Citation Generator userscript). The userscript itself has its **own,
separate** changelog inside the script (click the version badge in the modal).

Only ever add new entries at the top — never remove old ones.

## v2.0.14 – 2026-07-09
- GameStar (`gamestar.de`): added author selector (`a.author-name`) and set the work
  name to `[[GameStar]]`; title and date already worked via meta tags.

## v2.0.13 – 2026-07-08
- The Independent (`independent.co.uk`): added author extraction from the byline
  (`address a[href*="/author/"]`). The work name now uses the existing wikilink
  `[[The Independent]]`; title and date already worked via meta tags.

## v2.0.12 – 2026-07-07
- The Canberra Times (`canberratimes.com.au`): added author extraction from the
  ALL-CAPS byline in the article body (requires the script's "uppercase-byline" mode).

## v2.0.11 – 2026-07-07
- The Canberra Times (`canberratimes.com.au`): sets the work name to "The Canberra Times"
  (title and date already worked via meta tags). Note: the author byline is not present
  in the page markup, so it cannot be extracted automatically.

## v2.0.10 – 2026-07-07
- Broadcast (`broadcastnow.co.uk`): added author, title and date selectors.

## v2.0.9 – 2026-07-02
- Der Spiegel (`spiegel.de`): author is now read from the byline (author-profile
  link or the abbreviation byline) instead of the footer, so magazine brand
  names like "DEIN SPIEGEL", "SPIEGEL BESTSELLER" etc. no longer appear as the
  author. Those brand names were also added to the filter list as a safety net.

## v2.0.8 – 2026-07-01
- The Telegraph (`telegraph.co.uk`): added author/title/date selectors
  (`a[rel="author"]`, `h1`, `time`) so author and date are extracted correctly.

## v2.0.7 – 2026-07-01
- The Guardian (`theguardian.com`): author is now read from `a[rel="author"]`,
  fixing the "Skip to main content" byline problem.

## v2.0.6 – 2025-12-01
- The Washington Post: fixed author detection for articles with multiple authors.
