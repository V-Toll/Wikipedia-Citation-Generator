// ==UserScript==
// @name         Wikipedia Citation Generator
// @namespace    https://github.com/V-Toll
// @version      2.4.0
// @description  German Wikipedia {{Internetquelle}} citation generator - Enhanced error handling
// @author       V-Toll
// @homepageURL  https://github.com/V-Toll/Wikipedia-Citation-Generator
// @supportURL   https://github.com/V-Toll/Wikipedia-Citation-Generator/issues
// @downloadURL  https://raw.githubusercontent.com/V-Toll/Wikipedia-Citation-Generator/main/wikipedia-citation-generator.user.js
// @updateURL    https://raw.githubusercontent.com/V-Toll/Wikipedia-Citation-Generator/main/wikipedia-citation-generator.user.js
// @match        *://*/*
// @exclude      *://*.wikipedia.org/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @run-at       document-end
// ==/UserScript==

(function() {
	'use strict';

	const CONFIG = {
		version: '2.4.0',
		debug: true,
		storage: {
			learnedPatterns: 'wcg_learned_patterns',
			externalPatterns: 'wcg_external_patterns',
			externalVersion: 'wcg_external_version',
			lastUpdate: 'wcg_last_db_update',
			theme: 'wcg_theme',  // 'auto' | 'light' | 'dark'
			optGermanLang: 'wcg_opt_german_lang',  // emit sprache=de for German sources (default off)
			optPlainWerk: 'wcg_opt_plain_werk',    // strip [[…]] wikilinks in werk (default off)
			optFab: 'wcg_opt_fab',                 // show floating button on every site (default off)
			optNoRef: 'wcg_opt_no_ref',            // omit the <ref></ref> wrapper (default off)
			optRefName: 'wcg_opt_ref_name'         // add name="…" to the <ref> (default off)
		},
		ui: {
			modalId: 'wcg-modal',
			overlayId: 'wcg-overlay',
			changelogId: 'wcg-changelog-modal'
		},
		externalDB: {
			url: 'https://raw.githubusercontent.com/V-Toll/Wikipedia-Citation-Generator/main/patterns/site-patterns.json',
			cacheDuration: 24 * 60 * 60 * 1000
		}
	};

	// ================================
	// CHANGELOG (newest first). Shown when the version badge is clicked.
	// Keep old entries — only ever prepend new ones.
	// ================================
	const CHANGELOG = [
		{
			version: '2.4.0',
			name: 'Anchor',
			date: '2026-07-09',
			changes: [
				'Neue Option: <ref></ref>-Tags beim Kopieren weglassen (standardmäßig aus) – kopiert dann nur die {{Internetquelle}}-Vorlage.',
				'Neue Option: benannter Einzelnachweis <ref name="…"> mit automatisch erzeugtem, kurzem und eindeutigem Namen (standardmäßig aus).'
			]
		},
		{
			version: '2.3.2',
			name: null,
			date: '2026-07-07',
			changes: [
				'Neuer Autoren-Modus für Bylines in Großbuchstaben (z. B. „SCOTT HANNAFORD“ → „Scott Hannaford“), genutzt von The Canberra Times.'
			]
		},
		{
			version: '2.3.1',
			name: null,
			date: '2026-07-07',
			changes: [
				'Der schwebende Button ist jetzt nur noch halb so groß.'
			]
		},
		{
			version: '2.3.0',
			name: 'Beacon',
			date: '2026-07-07',
			changes: [
				'Neue Option „Citation-Generator-Modus“ (standardmäßig aus): blendet unten rechts auf jeder Seite einen schwebenden Button ein, der den Generator öffnet.',
				'Der Button erscheint nicht auf Wikipedia-, Wikimedia-Commons- und verwandten Wikimedia-Seiten.'
			]
		},
		{
			version: '2.2.3',
			name: null,
			date: '2026-07-07',
			changes: [
				'Englische Langdaten wie „17 November 2008“ werden jetzt korrekt als Datum erkannt.'
			]
		},
		{
			version: '2.2.2',
			name: null,
			date: '2026-07-02',
			changes: [
				'Das Zitations-Feld ist jetzt etwas größer.',
				'Button „Abbrechen“ entfernt – das Fenster wird über das ✕ oben rechts geschlossen.'
			]
		},
		{
			version: '2.2.1',
			name: null,
			date: '2026-07-02',
			changes: [
				'Info-Hinweis oben entfernt. Die Optionen sind jetzt als moderne Schalter in einer eigenen Karte am Anfang untergebracht.'
			]
		},
		{
			version: '2.2.0',
			name: 'Switchboard',
			date: '2026-07-02',
			changes: [
				'Neue Option: bei deutschsprachigen Quellen „sprache=de“ setzen (standardmäßig aus).',
				'Neue Option: Wikilinks im Werk entfernen, z. B. „[[The Atlantic]]“ → „The Atlantic“ (standardmäßig aus).',
				'Kompakteres Fenster – die Buttons unten sind jetzt ohne Scrollen erreichbar.'
			]
		},
		{
			version: '2.1.1',
			name: null,
			date: '2026-07-02',
			changes: [
				'Skript und Muster-Datenbank leben jetzt in einem gemeinsamen GitHub-Repository.',
				'Automatische Skript-Updates über Violentmonkey (via @updateURL).'
			]
		},
		{
			version: '2.1.0',
			name: 'Nightfall',
			date: '2026-07-01',
			changes: [
				'Neuer automatischer Dark Mode: folgt der System-Einstellung von macOS bzw. des Browsers.',
				'Umschalter im Kopfbereich: zwischen Automatisch, Hell und Dunkel wechseln – die Auswahl wird gespeichert.',
				'Die Versionsnummer oben ist jetzt anklickbar und öffnet diesen Changelog.',
				'Überarbeitetes Design: weichere Schatten, unscharfer Hintergrund und eine sanfte Einblend-Animation.'
			]
		},
		{
			version: '2.0.11',
			name: null,
			date: '2026-07-01',
			changes: [
				'Sprachcodes wie „en-GB“ oder „de-DE“ werden jetzt auf den Basiscode „en“, „de“ gekürzt.'
			]
		}
	];

	let modalFunctions = {};
	let patternsCache = null;
	let isWizardActive = false;

	// ================================
	// THEME (auto dark mode + manual override)
	// ================================

	// Ordered cycle for the toggle button and the icon/label shown for each mode.
	const THEME_ORDER = ['auto', 'light', 'dark'];
	const THEME_META = {
		auto:  { icon: '🌗', label: 'Automatisch' },
		light: { icon: '☀️', label: 'Hell' },
		dark:  { icon: '🌙', label: 'Dunkel' }
	};

	/** Read the persisted theme; defaults to 'auto' (follow the OS). */
	function getTheme() {
		const stored = GM_getValue(CONFIG.storage.theme, 'auto');
		return THEME_ORDER.includes(stored) ? stored : 'auto';
	}

	/**
	 * Apply a theme by tagging <html> with data-wcg-theme.
	 * CSS handles the rest: 'light'/'dark' force a palette, 'auto' lets the
	 * prefers-color-scheme media query decide.
	 */
	function applyTheme(mode) {
		document.documentElement.setAttribute('data-wcg-theme', mode);
	}

	/** Advance auto → light → dark → auto, persist and re-apply. Returns the new mode. */
	function cycleTheme() {
		const next = THEME_ORDER[(THEME_ORDER.indexOf(getTheme()) + 1) % THEME_ORDER.length];
		GM_setValue(CONFIG.storage.theme, next);
		applyTheme(next);
		return next;
	}

	/** Sync a toggle button's icon + tooltip to the current theme. */
	function updateThemeToggleButton(btn) {
		if (!btn) return;
		const meta = THEME_META[getTheme()];
		btn.textContent = meta.icon;
		btn.setAttribute('title', `Design: ${meta.label} (klicken zum Wechseln)`);
		btn.setAttribute('aria-label', `Design umschalten – aktuell: ${meta.label}`);
	}

	// ================================
	// CITATION OPTIONS (both default OFF, persisted per user)
	// ================================

	/** Current option states. */
	function getOptions() {
		return {
			germanLang: GM_getValue(CONFIG.storage.optGermanLang, false),  // add sprache=de for German
			plainWerk:  GM_getValue(CONFIG.storage.optPlainWerk, false),   // remove [[…]] in werk
			fab:        GM_getValue(CONFIG.storage.optFab, false),         // floating button on every site
			noRef:      GM_getValue(CONFIG.storage.optNoRef, false),       // omit <ref></ref> wrapper
			refName:    GM_getValue(CONFIG.storage.optRefName, false)      // add name="…" to <ref>
		};
	}

	/**
	 * Wikimedia-family sites where the floating button should never appear
	 * (you don't cite Wikipedia on Wikipedia). Note: wikipedia.org is already
	 * excluded for the whole script via @exclude / the init() guard.
	 */
	function isExcludedSite() {
		return /(?:^|\.)(?:wikipedia|wikimedia|wiktionary|wikidata|wikisource|wikivoyage|wikinews|wikibooks|wikiquote|wikiversity|mediawiki|wikimediafoundation)\.org$/i
			.test(window.location.hostname);
	}

	/**
	 * Create or remove the floating "Citation Generator" button depending on the
	 * option and the current site. Safe to call repeatedly (idempotent).
	 */
	function renderFloatingButton() {
		const existing = document.getElementById('wcg-fab');
		const shouldShow = getOptions().fab && !isExcludedSite();

		if (!shouldShow) {
			if (existing) existing.remove();
			return;
		}
		if (existing) return;  // already shown

		const fab = document.createElement('button');
		fab.id = 'wcg-fab';
		fab.type = 'button';
		fab.textContent = '📋';
		fab.title = 'Wikipedia Citation Generator öffnen';
		fab.setAttribute('aria-label', 'Wikipedia Citation Generator öffnen');
		fab.addEventListener('click', async () => {
			const metadata = await extractAllMetadata();
			showCitationModal(metadata);
		});
		document.body.appendChild(fab);
	}

	/**
	 * Strip MediaWiki links from a string:
	 *   "[[Vox (Website)|Vox]]" → "Vox", "[[The Atlantic]]" → "The Atlantic".
	 * Uses the piped display text when present, otherwise the target.
	 */
	function stripWikilinks(text) {
		if (!text) return '';
		return text.replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1');
	}
	let selectedElements = { title: null, author: null, date: null };
	let wizardEventHandlers = { mouseover: null, click: null, keydown: null };

	// ================================
	// UTILITY FUNCTIONS
	// ================================
	
	function debug(message, data = null) {
		if (CONFIG.debug) {
			if (data !== null) {
				console.log(`[WCG v${CONFIG.version}] ${message}`, data);
			} else {
				console.log(`[WCG v${CONFIG.version}] ${message}`);
			}
		}
	}

	function getCleanText(element) {
		if (!element) return '';
		return element.textContent?.trim().replace(/\s+/g, ' ') || '';
	}

	function getCurrentDate() {
		return new Date().toISOString().slice(0, 10);
	}

	function normalizeDate(dateString) {
		if (!dateString) return '';

		const raw = String(dateString).trim();

		// English long-form dates, e.g. "17 November 2008" or "November 17, 2008".
		// Handled before the whitespace split below, which would otherwise discard the month/year.
		const monthNames = {
			january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
			july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
		};
		let em;
		if ((em = raw.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/))) {          // 17 November 2008
			const mo = monthNames[em[2].toLowerCase()];
			if (mo) return `${em[3]}-${String(mo).padStart(2, '0')}-${String(em[1]).padStart(2, '0')}`;
		}
		if ((em = raw.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/))) {          // November 17, 2008
			const mo = monthNames[em[1].toLowerCase()];
			if (mo) return `${em[3]}-${String(mo).padStart(2, '0')}-${String(em[2]).padStart(2, '0')}`;
		}

		let dateStr = raw.split(/[\sT,]/)[0];

		if (/^heute$/i.test(dateStr)) return getCurrentDate();
		
		if (/^gestern$/i.test(dateStr)) {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			return yesterday.toISOString().slice(0, 10);
		}
		
		let match;
		if ((match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/))) {
			return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
		}
		
		if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
		if ((match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/))) return match[1];
		
		return dateStr;
	}

	function detectLanguage(text) {
		if (!text) return '';
		const t = text.toLowerCase();
		if (/\b(der|die|das|und|oder)\b/.test(t)) return 'de';
		if (/\b(the|and|or|with)\b/.test(t)) return 'en';
		return '';
	}

	function getDomainFromUrl(url) {
		try {
			const urlObj = new URL(url);
			return urlObj.hostname.replace(/^www\./, '');
		} catch (e) {
			return '';
		}
	}

	/**
	 * Check if element is likely a valid author element (not navigation/button)
	 */
	function isValidAuthorElement(element) {
		if (!element) return false;
		
		const text = getCleanText(element);
		if (!text || text.length < 2) return false;
		
		// Filter out common navigation/UI text
		const navPatterns = [
			/^(abo|abonnement|login|menu|menü|navigation|suche|search)$/i,
			/^(zum\s+inhalt|zur\s+)/i,
			/^skip\s+to\s+(main\s+)?content$/i,  // a11y skip link (Guardian, BBC, NYT, …)
			/^(startseite|home|impressum|kontakt)$/i,
			/^(window\.|var\s+|function\s+)/i,  // JavaScript code
			/^[{[\]};()=]/  // JavaScript syntax
		];
		
		for (const pattern of navPatterns) {
			if (pattern.test(text)) {
				debug('Filtered navigation/code text:', text);
				return false;
			}
		}
		
		// Check if element is inside a button or link with obvious UI purpose
		const parent = element.closest('button, a[href*="abo"], a[href*="login"], nav, [role="navigation"], script');
		if (parent) {
			const parentText = getCleanText(parent);
			if (/^(abo|abonnement|login|menü)/i.test(parentText)) {
				debug('Filtered element in UI container:', text, 'parent:', parentText);
				return false;
			}
		}
		
		return true;
	}

	function processAuthorName(author, siteInfo) {
		if (!author) return '';
		
		let cleaned = author.trim();
		const processing = siteInfo?.authorProcessing;
		
		debug('Processing author:', cleaned, 'with', processing);
		
		if (processing === 'spiegel') {
			cleaned = cleaned.replace(/,\s*(DER\s+SPIEGEL|SPIEGEL).*$/i, '');
			
			if (/^(zum\s+inhalt|menü|navigation|abo|abonnement)/i.test(cleaned)) {
				return '';
			}
			
			if (siteInfo.filterNames) {
				for (const filterName of siteInfo.filterNames) {
					if (new RegExp(`^${filterName}$`, 'i').test(cleaned)) {
						debug('Filtered publication name:', cleaned);
						return '';
					}
				}
			}
			
			// Handle abbreviations like "hba/dpa"
			if (/^[a-zäöü]{2,4}(\/[a-zäöü]{2,4})*$/i.test(cleaned)) {
				debug('Found abbreviation(s):', cleaned);
				
				const parts = cleaned.split('/');
				const resolved = [];
				
				for (const part of parts) {
					const lower = part.trim().toLowerCase();
					
					if (siteInfo.filterAgencies && siteInfo.filterAgencies.includes(lower)) {
						debug('Filtered news agency:', lower);
						continue;
					}
					
					if (siteInfo.authorAbbreviations && siteInfo.authorAbbreviations[lower]) {
						const fullName = siteInfo.authorAbbreviations[lower];
						debug('Resolved:', lower, '→', fullName);
						resolved.push(fullName);
					} else {
						resolved.push(part.trim());
					}
				}
				
				if (resolved.length > 0) {
					return resolved.join(', ');
				}
				
				return '';
			}
			
		} else if (processing === 'transfermarkt') {
			cleaned = cleaned.replace(/\s+TM-Username:.*$/i, '');
			cleaned = cleaned.replace(/\s+@[a-zA-Z0-9_]+.*$/i, '');

			if (siteInfo.filterAgencies) {
				for (const agency of siteInfo.filterAgencies) {
					if (new RegExp(`\\b${agency}\\b`, 'i').test(cleaned)) {
						debug('Filtered agency from text:', agency);
						cleaned = cleaned.replace(new RegExp(`\\b${agency}\\b`, 'gi'), '').trim();
					}
				}
			}
		} else if (processing === 'uppercase-byline') {
			// Byline is embedded as ALL-CAPS bold text (e.g. "SCOTT HANNAFORD").
			// Only accept multi-word ALL-CAPS candidates; convert them to title case.
			// This filters out ordinary bold text in the article body (usually mixed case).
			if (!/^[A-ZÄÖÜ][A-ZÄÖÜ.'\-]*(?:\s+[A-ZÄÖÜ][A-ZÄÖÜ.'\-]*)+$/.test(cleaned)) {
				return '';
			}
			cleaned = cleaned.replace(/\S+/g, w => w.charAt(0) + w.slice(1).toLowerCase());
		}

		return cleaned.trim();
	}

	// ================================
	// EXTERNAL DATABASE - ENHANCED ERROR HANDLING
	// ================================
	
	async function fetchExternalDatabase() {
		return new Promise((resolve, reject) => {
			debug('🔄 Fetching external database from GitHub...');
			debug('URL:', CONFIG.externalDB.url);
			
			GM_xmlhttpRequest({
				method: 'GET',
				url: CONFIG.externalDB.url,
				timeout: 15000,
				onload: function(response) {
					try {
						debug('📡 Response received');
						debug('Status:', response.status);
						debug('Status Text:', response.statusText);
						debug('Content Length:', response.responseText.length);
						
						if (response.status === 200) {
							// Zeige Preview der ersten 300 Zeichen
							const preview = response.responseText.substring(0, 300);
							debug('Response Preview:', preview);
							
							// Versuche zu parsen
							let data;
							try {
								data = JSON.parse(response.responseText);
							} catch (parseError) {
								debug('❌ JSON Parse Error:', parseError.message);
								debug('Error at position:', parseError.message.match(/position (\d+)/)?.[1]);
								throw new Error(`JSON Parse Fehler: ${parseError.message}`);
							}
							
							// Validiere Struktur
							if (!data.patterns || typeof data.patterns !== 'object') {
								throw new Error('Ungültige Datenbank-Struktur: "patterns" fehlt oder ist kein Objekt');
							}
							
							if (!data.version) {
								debug('⚠️ Warning: No version field in database');
							}
							
							const patternCount = Object.keys(data.patterns).length;
							
							if (patternCount === 0) {
								throw new Error('Datenbank enthält keine Patterns');
							}
							
							// Speichere
							GM_setValue(CONFIG.storage.externalPatterns, JSON.stringify(data.patterns));
							GM_setValue(CONFIG.storage.externalVersion, data.version || 'unknown');
							GM_setValue(CONFIG.storage.lastUpdate, Date.now());
							patternsCache = data.patterns;
							
							debug('✅ Database loaded successfully!');
							debug('Version:', data.version);
							debug('Sites:', patternCount);
							debug('Sample sites:', Object.keys(data.patterns).slice(0, 5).join(', '));
							
							resolve(data.patterns);
						} else {
							throw new Error(`HTTP ${response.status}: ${response.statusText || 'Unbekannter Fehler'}`);
						}
					} catch (e) {
						debug('❌ Error in onload handler:', e.message);
						console.error('[WCG] Full error:', e);
						reject(e);
					}
				},
				onerror: function(error) {
					debug('❌ Network error occurred');
					debug('Error details:', error);
					reject(new Error('Netzwerkfehler: Konnte GitHub nicht erreichen'));
				},
				ontimeout: () => {
					debug('❌ Request timeout (15s)');
					reject(new Error('Timeout: GitHub antwortet nicht (>15s)'));
				}
			});
		});
	}

	async function getPatternsDatabase() {
		if (patternsCache) {
			debug('Using in-memory cache');
			return patternsCache;
		}
		
		const lastUpdate = GM_getValue(CONFIG.storage.lastUpdate, 0);
		const now = Date.now();
		const age = now - lastUpdate;
		const ageHours = Math.floor(age / (1000 * 60 * 60));
		
		debug('Cache age:', ageHours, 'hours');
		
		if (age < CONFIG.externalDB.cacheDuration) {
			const cached = GM_getValue(CONFIG.storage.externalPatterns, null);
			if (cached) {
				try {
					patternsCache = JSON.parse(cached);
					const version = GM_getValue(CONFIG.storage.externalVersion, 'unknown');
					debug('Using cached database:', {
						version: version,
						sites: Object.keys(patternsCache).length,
						age: ageHours + 'h'
					});
					return patternsCache;
				} catch (e) {
					debug('⚠️ Cached data corrupted, fetching fresh...');
				}
			}
		}
		
		try {
			debug('Cache expired or missing, fetching fresh data...');
			return await fetchExternalDatabase();
		} catch (e) {
			debug('⚠️ Fetch failed, trying to use old cache...');
			const cached = GM_getValue(CONFIG.storage.externalPatterns, null);
			if (cached) {
				try {
					patternsCache = JSON.parse(cached);
					debug('Using stale cache as fallback');
					return patternsCache;
				} catch (e2) {
					debug('❌ Stale cache also corrupted');
				}
			}
			debug('❌ No fallback available');
			return {};
		}
	}

	async function forceRefreshDatabase() {
		debug('🔄 Force refresh requested');
		GM_setValue(CONFIG.storage.lastUpdate, 0);
		patternsCache = null;
		return await fetchExternalDatabase();
	}

	// ================================
	// FALLBACK SELECTORS
	// ================================
	
	const FALLBACK_SELECTORS = {
		title: ['h1', '.title, .headline', 'article h1'],
		author: ['.author, .byline', '[rel="author"]'],
		date: ['time[datetime]', 'time, .date']
	};

	// ================================
	// LEARNING SYSTEM
	// ================================
	
	function saveLearntPattern(type, selector, text) {
		try {
			const hostname = window.location.hostname.replace(/^www\./, '');
			const patterns = JSON.parse(GM_getValue(CONFIG.storage.learnedPatterns, '{}'));
			
			if (!patterns[hostname]) {
				patterns[hostname] = { learned: {}, createdAt: Date.now() };
			}
			
			patterns[hostname].learned[type] = {
				selector: selector,
				sampleText: text?.slice(0, 100),
				lastModified: Date.now()
			};
			
			GM_setValue(CONFIG.storage.learnedPatterns, JSON.stringify(patterns));
			debug('Pattern saved:', { hostname, type, selector });
		} catch (e) {}
	}

	function applyLearntPatterns(metadata) {
		try {
			const hostname = window.location.hostname.replace(/^www\./, '');
			const patterns = JSON.parse(GM_getValue(CONFIG.storage.learnedPatterns, '{}'));
			
			if (patterns[hostname]?.learned) {
				for (const [type, pattern] of Object.entries(patterns[hostname].learned)) {
					if (!metadata[type] && pattern.selector) {
						const elem = document.querySelector(pattern.selector);
						if (elem) {
							const text = type === 'date' ? 
								(elem.getAttribute('datetime') || getCleanText(elem)) : 
								getCleanText(elem);
							
							if (text && text.length > 2) {
								metadata[type] = text;
							}
						}
					}
				}
			}
		} catch (e) {}
		
		return metadata;
	}

	// ================================
	// METADATA EXTRACTION - WITH MULTI-AUTHOR SUPPORT
	// ================================
	
	async function getSiteInfo(hostname) {
		const cleanHost = hostname.replace(/^www\./, '');
		const patterns = await getPatternsDatabase();
		return patterns[cleanHost] || null;
	}

	function extractMetaTags() {
		const meta = {};
		meta.title = document.querySelector('meta[property="og:title"]')?.content || document.title;
		
		const authorMeta = document.querySelector('meta[name="author"]')?.content;
		if (authorMeta) {
			meta.author = authorMeta.split(',')[0].trim();
		}
		
		meta.date = document.querySelector('meta[property="article:published_time"]')?.content;
		meta.siteName = document.querySelector('meta[property="og:site_name"]')?.content;
		meta.language = document.documentElement.lang;
		
		return meta;
	}

	async function extractFromHTML() {
		const html = {};
		const hostname = window.location.hostname;
		const siteInfo = await getSiteInfo(hostname);
		
		if (siteInfo?.selectors) {
			const sel = siteInfo.selectors;
			
			// Title extraction
			if (sel.title) {
				for (const s of sel.title.split(', ')) {
					const elem = document.querySelector(s.trim());
					if (elem && getCleanText(elem)) {
						html.title = getCleanText(elem);
						break;
					}
				}
			}
			
			// Author extraction - WITH MULTI-AUTHOR SUPPORT
			if (sel.author) {
				const selectors = sel.author.split(', ').map(s => s.trim());
				debug('Trying author selectors:', selectors);
				
				const authors = [];
				
				for (const s of selectors) {
					const elements = document.querySelectorAll(s);
					debug(`Selector "${s}" found ${elements.length} elements`);
					
					for (const elem of elements) {
						const text = getCleanText(elem);
						
						if (!isValidAuthorElement(elem)) {
							debug('❌ Skipped invalid author element:', text);
							continue;
						}
						
						debug('✓ Valid author candidate:', { selector: s, text });
						
						const processed = processAuthorName(text, siteInfo);
						
						if (processed && processed.length > 2) {
							// Check for duplicates
							if (!authors.includes(processed)) {
								authors.push(processed);
								debug('✅ Author added:', processed);
							}
						} else {
							debug('❌ Author rejected after processing:', { text, processed });
						}
					}
					
					if (authors.length > 0) break;
				}
				
				if (authors.length > 0) {
					html.author = authors.join(', ');
					debug('✅ Final authors:', html.author);
				}
			}
			
			// Date extraction
			if (sel.date) {
				for (const s of sel.date.split(', ')) {
					const elem = document.querySelector(s.trim());
					if (elem) {
						const dateText = elem.getAttribute('datetime') || getCleanText(elem);
						if (dateText) {
							html.date = dateText;
							break;
						}
					}
				}
			}
			
			html.siteName = siteInfo.name;
		} else {
			for (const s of FALLBACK_SELECTORS.title) {
				const elem = document.querySelector(s);
				if (elem && getCleanText(elem)) {
					html.title = getCleanText(elem);
					break;
				}
			}
		}
		
		return html;
	}

	async function extractAllMetadata() {
		debug('Extracting metadata...');
		
		const meta = extractMetaTags();
		const html = await extractFromHTML();
		
		const combined = {
			title: meta.title || html.title || document.title,
			author: html.author || meta.author || '',
			date: html.date || meta.date || '',
			siteName: html.siteName || meta.siteName || '',
			language: meta.language || detectLanguage(document.title),
			url: window.location.href
		};
		
		combined.title = combined.title?.trim() || '';
		combined.author = combined.author?.trim() || '';
		combined.date = normalizeDate(combined.date);
		
		// Reduce region-specific language tags to the primary subtag:
		// "en-GB"/"en-US" → "en", "de-DE"/"de-AT" → "de" (Wikipedia wants only the base code)
		if (combined.language) {
			combined.language = combined.language.split('-')[0].toLowerCase();
		}

		// Mark German sources explicitly as 'de'. By default generateCitation omits
		// sprache for German; the "sprache=de" option makes it emit it instead.
		const hostname = window.location.hostname.replace(/^www\./, '');
		if (hostname.endsWith('.de') || combined.language?.startsWith('de')) {
			combined.language = 'de';
		}
		
		if (!combined.siteName) {
			combined.siteName = getDomainFromUrl(combined.url);
		}
		
		debug('✅ Final metadata:', combined);
		
		return applyLearntPatterns(combined);
	}

	// ================================
	// CITATION GENERATION
	// ================================
	
	function generateCitation(metadata) {
		const params = [];
		const options = getOptions();

		// Werk: optionally strip [[…]] wikilinks (e.g. "[[The Atlantic]]" → "The Atlantic").
		let werk = metadata.siteName || getDomainFromUrl(window.location.href);
		if (options.plainWerk) werk = stripWikilinks(werk);

		// Sprache: German is emitted only when the option is on; other languages always.
		let sprache = metadata.language || '';
		if (sprache === 'de' && !options.germanLang) sprache = '';

		const values = {
			autor: metadata.author || '',
			url: metadata.url || window.location.href,
			titel: metadata.title || document.title,
			werk: werk,
			datum: metadata.date || '',
			sprache: sprache,
			abruf: getCurrentDate()
		};
		
		for (const [key, value] of Object.entries(values)) {
			if (value && value.toString().trim()) {
				params.push(`|${key}=${value}`);
			}
		}

		const inner = `{{Internetquelle ${params.join(' ')}}}`;

		// Option: return the bare template without the <ref> wrapper.
		if (options.noRef) return inner;

		// Option: give the <ref> a fitting, unique, short name.
		const nameAttr = options.refName
			? ` name="${buildRefName(values.autor, werk, values.datum, values.url)}"`
			: '';

		return `<ref${nameAttr}>${inner}</ref>`;
	}

	/**
	 * Build a ref name that is fitting (author/work + year), short and unique.
	 * Readable base = last name of the first author, else the work name, else the
	 * domain; followed by the publication year and a short deterministic hash of
	 * the URL so two articles never collide. Example: "Gudenrath2026-1f3a".
	 */
	function buildRefName(author, werk, date, url) {
		let base = '';
		if (author) {
			const first = author.split(',')[0].trim();          // first of multiple authors
			const parts = first.split(/\s+/).filter(Boolean);
			base = parts.length ? parts[parts.length - 1] : '';  // last name
		}
		if (!base && werk) base = stripWikilinks(werk);
		if (!base && url) base = getDomainFromUrl(url);
		base = (base || 'ref').replace(/[^A-Za-z0-9]/g, '');     // sanitize for a valid name

		const year = /^(\d{4})/.test(date || '') ? date.slice(0, 4) : '';
		return `${base}${year}-${shortHash(url || base + year)}`;
	}

	/** Small deterministic string hash → 4 base-36 chars (for ref-name uniqueness). */
	function shortHash(str) {
		let h = 5381;
		for (let i = 0; i < str.length; i++) {
			h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
		}
		return h.toString(36).slice(0, 4);
	}

	// ================================
	// ELEMENT SELECTION WIZARD
	// ================================
	
	function createSelectionOverlay() {
		const overlay = document.createElement('div');
		overlay.id = CONFIG.ui.overlayId;
		overlay.style.cssText = `
			position: fixed !important;
			top: 0 !important;
			left: 0 !important;
			width: 100% !important;
			height: 100% !important;
			background: rgba(0, 0, 0, 0.3) !important;
			z-index: 999999 !important;
			pointer-events: none !important;
		`;
		
		const instructions = document.createElement('div');
		instructions.style.cssText = `
			position: fixed !important;
			top: 20px !important;
			left: 50% !important;
			transform: translateX(-50%) !important;
			background: var(--wcg-picker-tip-bg, #333) !important;
			color: white !important;
			padding: 15px 25px !important;
			border-radius: 8px !important;
			font-family: Arial, sans-serif !important;
			font-size: 14px !important;
			z-index: 1000000 !important;
			box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
			pointer-events: auto !important;
		`;
		instructions.innerHTML = `
			<strong>🎯 Element-Auswahl aktiv</strong><br>
			Klicken Sie auf ein Element, um es zu markieren<br>
			<small>ESC zum Beenden</small>
		`;
		overlay.appendChild(instructions);
		document.body.appendChild(overlay);
		
		return overlay;
	}

	function startElementSelection(type, callback) {
		if (isWizardActive) return;
		
		debug('Starting element selection for:', type);
		isWizardActive = true;
		
		const overlay = createSelectionOverlay();
		let highlightedElement = null;

		function highlightElement(element) {
			if (highlightedElement) {
				highlightedElement.style.outline = '';
				highlightedElement.style.backgroundColor = '';
			}
			
			if (element && element !== document.body && element !== document.documentElement) {
				highlightedElement = element;
				element.style.outline = '3px solid #ff6b35';
				element.style.backgroundColor = 'rgba(255, 107, 53, 0.1)';
			}
		}

		function cleanup() {
			isWizardActive = false;
			
			if (highlightedElement) {
				highlightedElement.style.outline = '';
				highlightedElement.style.backgroundColor = '';
				highlightedElement = null;
			}
			
			if (overlay && overlay.parentNode) overlay.remove();
			
			if (wizardEventHandlers.mouseover) {
				document.removeEventListener('mouseover', wizardEventHandlers.mouseover, true);
				wizardEventHandlers.mouseover = null;
			}
			
			if (wizardEventHandlers.click) {
				document.removeEventListener('click', wizardEventHandlers.click, true);
				wizardEventHandlers.click = null;
			}
			
			if (wizardEventHandlers.keydown) {
				document.removeEventListener('keydown', wizardEventHandlers.keydown);
				wizardEventHandlers.keydown = null;
			}
		}

		wizardEventHandlers.mouseover = function(e) {
			e.preventDefault();
			e.stopPropagation();
			highlightElement(e.target);
		};

		wizardEventHandlers.click = function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			if (highlightedElement) {
				const text = getCleanText(highlightedElement);
				const selector = getElementSelector(highlightedElement);
				
				selectedElements[type] = {
					element: highlightedElement,
					text: text,
					selector: selector
				};
				
				saveLearntPattern(type, selector, text);
				cleanup();
				
				if (callback && typeof callback === 'function') {
					callback(text);
				}
			} else {
				cleanup();
			}
		};

		wizardEventHandlers.keydown = function(e) {
			if (e.key === 'Escape') {
				cleanup();
			}
		};

		document.addEventListener('mouseover', wizardEventHandlers.mouseover, true);
		document.addEventListener('click', wizardEventHandlers.click, true);
		document.addEventListener('keydown', wizardEventHandlers.keydown);
	}

	function getElementSelector(element) {
		if (!element || element === document) return '';
		
		if (element.id && !/^\d/.test(element.id)) {
			return '#' + CSS.escape(element.id);
		}
		
		if (element.className && typeof element.className === 'string') {
			const classes = element.className.split(' ').filter(c => c && !/^\d/.test(c));
			if (classes.length > 0 && classes.length <= 3) {
				return '.' + classes.map(c => CSS.escape(c)).join('.');
			}
		}
		
		return element.tagName.toLowerCase();
	}

	// ================================
	// USER INTERFACE
	// ================================
	
	function addStyles() {
		// Palette is driven by CSS custom properties so light/dark share one rule set.
		// Dark values are applied for a forced dark theme AND for auto+OS-dark.
		const WCG_DARK_VARS = `
				--wcg-surface: #1e1e2a;
				--wcg-text: #e8e8f0;
				--wcg-text-muted: #a8b0bd;
				--wcg-border: #3a3a4d;
				--wcg-border-subtle: #2c2c3a;
				--wcg-input-bg: #16161f;
				--wcg-secondary-bg: #2a2a38;
				--wcg-secondary-bg-hover: #34344a;
				--wcg-overlay-bg: rgba(0, 0, 0, 0.72);
				--wcg-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
				--wcg-focus-ring: rgba(102, 126, 234, 0.30);
				--wcg-picker-tip-bg: #2a2a38;`;

		GM_addStyle(`
			/* ---- Theme tokens: light defaults ---- */
			:root {
				--wcg-surface: #ffffff;
				--wcg-text: #1a1a2e;
				--wcg-text-muted: #495057;
				--wcg-border: #e1e5e9;
				--wcg-border-subtle: #f0f0f0;
				--wcg-input-bg: #ffffff;
				--wcg-accent: #667eea;
				--wcg-accent-2: #764ba2;
				--wcg-secondary-bg: #f8f9fa;
				--wcg-secondary-bg-hover: #e9ecef;
				--wcg-overlay-bg: rgba(0, 0, 0, 0.6);
				--wcg-shadow: 0 24px 64px rgba(0, 0, 0, 0.25);
				--wcg-focus-ring: rgba(102, 126, 234, 0.15);
				--wcg-picker-tip-bg: #333333;
				--wcg-badge-bg: rgba(255, 255, 255, 0.18);
				--wcg-badge-bg-hover: rgba(255, 255, 255, 0.32);
			}
			/* Manual dark override (highest priority, beats the media query below) */
			:root[data-wcg-theme="dark"] {${WCG_DARK_VARS}
			}
			/* Auto mode: only when the user has NOT forced light or dark */
			@media (prefers-color-scheme: dark) {
				:root:not([data-wcg-theme="light"]):not([data-wcg-theme="dark"]) {${WCG_DARK_VARS}
				}
			}

			@keyframes wcg-modal-in {
				from { opacity: 0; transform: translate(-50%, -46%) scale(0.97); }
				to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
			}
			@keyframes wcg-overlay-in {
				from { opacity: 0; }
				to   { opacity: 1; }
			}

			#${CONFIG.ui.modalId}, #${CONFIG.ui.changelogId} {
				position: fixed !important;
				top: 50% !important;
				left: 50% !important;
				transform: translate(-50%, -50%) !important;
				display: flex !important;
				flex-direction: column !important;
				width: 90% !important;
				max-width: 800px !important;
				max-height: 90vh !important;
				background: var(--wcg-surface) !important;
				color: var(--wcg-text) !important;
				border-radius: 16px !important;
				box-shadow: var(--wcg-shadow) !important;
				z-index: 2147483646 !important;
				font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
				overflow: hidden !important;
				animation: wcg-modal-in 0.2s ease-out !important;
				color-scheme: light dark !important;  /* native caret/scrollbar follow the theme */
			}
			/* Changelog sits above the citation modal and is a bit narrower */
			#${CONFIG.ui.changelogId} {
				max-width: 560px !important;
				z-index: 2147483647 !important;
			}
			
			.wcg-modal-header {
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
				color: white !important;
				padding: 16px 24px !important;
				display: flex !important;
				justify-content: space-between !important;
				align-items: flex-start !important;
			}

			.wcg-modal-title { font-size: 18px !important; font-weight: 700 !important; margin: 0 !important; display: flex !important; align-items: center !important; flex-wrap: wrap !important; gap: 8px !important; }
			.wcg-db-info { font-size: 12px !important; opacity: 0.92 !important; margin-top: 6px !important; }

			/* Clickable version badge -> opens the changelog */
			.wcg-version-badge {
				font-size: 12px !important;
				font-weight: 600 !important;
				line-height: 1 !important;
				color: white !important;
				background: var(--wcg-badge-bg) !important;
				border: none !important;
				border-radius: 999px !important;
				padding: 4px 10px !important;
				cursor: pointer !important;
				transition: background 0.2s, transform 0.1s !important;
				font-family: inherit !important;
			}
			.wcg-version-badge:hover { background: var(--wcg-badge-bg-hover) !important; }
			.wcg-version-badge:active { transform: scale(0.96) !important; }

			.wcg-header-actions { display: flex !important; align-items: center !important; gap: 8px !important; }

			.wcg-modal-close, .wcg-theme-toggle {
				background: rgba(255, 255, 255, 0.15) !important;
				border: none !important;
				color: white !important;
				font-size: 20px !important;
				cursor: pointer !important;
				width: 36px !important;
				height: 36px !important;
				border-radius: 8px !important;
				display: flex !important;
				align-items: center !important;
				justify-content: center !important;
				transition: background 0.2s !important;
				padding: 0 !important;
				line-height: 1 !important;
			}
			.wcg-modal-close { font-size: 24px !important; }
			.wcg-modal-close:hover, .wcg-theme-toggle:hover { background: rgba(255, 255, 255, 0.25) !important; }
			
			.wcg-modal-content { padding: 18px 24px !important; flex: 1 1 auto !important; min-height: 0 !important; overflow-y: auto !important; }
			.wcg-form-group { margin-bottom: 12px !important; }

			.wcg-form-label {
				display: flex !important;
				align-items: center !important;
				justify-content: space-between !important;
				font-weight: 600 !important;
				margin-bottom: 5px !important;
				color: var(--wcg-text) !important;
				font-size: 13px !important;
			}

			.wcg-form-input {
				width: 100% !important;
				padding: 9px 12px !important;
				background: var(--wcg-input-bg) !important;
				color: var(--wcg-text) !important;
				border: 2px solid var(--wcg-border) !important;
				border-radius: 8px !important;
				font-size: 14px !important;
				font-family: inherit !important;
				transition: border-color 0.2s, background 0.2s, color 0.2s !important;
				box-sizing: border-box !important;
			}
			.wcg-form-input::placeholder { color: var(--wcg-text-muted) !important; opacity: 0.7 !important; }

			.wcg-form-input:focus {
				outline: none !important;
				border-color: var(--wcg-accent) !important;
				box-shadow: 0 0 0 3px var(--wcg-focus-ring) !important;
			}

			.wcg-form-textarea {
				min-height: 96px !important;
				resize: vertical !important;
				font-family: Monaco, Menlo, monospace !important;
				font-size: 13px !important;
			}

			/* Citation options — card with modern toggle switches */
			.wcg-options {
				background: var(--wcg-secondary-bg) !important;
				border: 1px solid var(--wcg-border) !important;
				border-radius: 12px !important;
				padding: 2px 14px !important;
				margin-bottom: 16px !important;
			}
			.wcg-options-title {
				font-size: 11px !important;
				font-weight: 700 !important;
				text-transform: uppercase !important;
				letter-spacing: 0.6px !important;
				color: var(--wcg-text-muted) !important;
				padding: 10px 0 2px !important;
			}
			.wcg-toggle {
				display: flex !important;
				align-items: center !important;
				justify-content: space-between !important;
				gap: 14px !important;
				padding: 11px 0 !important;
				cursor: pointer !important;
			}
			.wcg-toggle + .wcg-toggle { border-top: 1px solid var(--wcg-border) !important; }
			.wcg-toggle-text { font-size: 13px !important; color: var(--wcg-text) !important; line-height: 1.4 !important; }
			.wcg-toggle code {
				font-size: 12px !important;
				font-family: Monaco, Menlo, monospace !important;
				background: var(--wcg-input-bg) !important;
				border: 1px solid var(--wcg-border) !important;
				padding: 1px 6px !important;
				border-radius: 4px !important;
			}
			.wcg-toggle input { position: absolute !important; opacity: 0 !important; width: 0 !important; height: 0 !important; }
			.wcg-toggle-track {
				position: relative !important;
				flex-shrink: 0 !important;
				width: 40px !important;
				height: 23px !important;
				background: var(--wcg-border) !important;
				border-radius: 999px !important;
				transition: background 0.2s !important;
			}
			.wcg-toggle-track::after {
				content: "" !important;
				position: absolute !important;
				top: 2px !important;
				left: 2px !important;
				width: 19px !important;
				height: 19px !important;
				background: #fff !important;
				border-radius: 50% !important;
				box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35) !important;
				transition: transform 0.2s !important;
			}
			.wcg-toggle input:checked + .wcg-toggle-track { background: var(--wcg-accent) !important; }
			.wcg-toggle input:checked + .wcg-toggle-track::after { transform: translateX(17px) !important; }
			.wcg-toggle input:focus-visible + .wcg-toggle-track { box-shadow: 0 0 0 3px var(--wcg-focus-ring) !important; }

			.wcg-button {
				padding: 9px 18px !important;
				border: none !important;
				border-radius: 8px !important;
				font-size: 14px !important;
				font-weight: 600 !important;
				cursor: pointer !important;
				transition: all 0.2s !important;
				display: inline-flex !important;
				align-items: center !important;
				gap: 6px !important;
			}
			
			.wcg-button-primary {
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
				color: white !important;
				box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3) !important;
			}
			
			.wcg-button-primary:hover:not(.wcg-button-success):not(:disabled) {
				transform: translateY(-2px) !important;
				box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4) !important;
			}
			
			.wcg-button-success { background: linear-gradient(135deg, #28a745 0%, #20c997 100%) !important; }
			.wcg-button-error { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%) !important; color: white !important; }
			
			.wcg-button-secondary {
				background: var(--wcg-secondary-bg) !important;
				color: var(--wcg-text) !important;
				border: 2px solid var(--wcg-border) !important;
			}
			.wcg-button-secondary:hover:not(:disabled) { background: var(--wcg-secondary-bg-hover) !important; }
			
			.wcg-button:disabled {
				opacity: 0.6 !important;
				cursor: not-allowed !important;
			}
			
			.wcg-button-select {
				background: #28a745 !important;
				color: white !important;
				font-size: 12px !important;
				padding: 6px 12px !important;
				border-radius: 6px !important;
			}
			.wcg-button-select:hover { background: #218838 !important; }
			
			.wcg-modal-actions {
				display: flex !important;
				justify-content: flex-end !important;
				flex-wrap: wrap !important;
				gap: 10px !important;
				flex-shrink: 0 !important;
				padding: 13px 24px !important;
				border-top: 2px solid var(--wcg-border-subtle) !important;
				background: var(--wcg-surface) !important;
				border-radius: 0 0 16px 16px !important;
			}

			.wcg-overlay {
				position: fixed !important;
				top: 0 !important;
				left: 0 !important;
				width: 100% !important;
				height: 100% !important;
				background: var(--wcg-overlay-bg) !important;
				-webkit-backdrop-filter: blur(3px) !important;
				backdrop-filter: blur(3px) !important;
				animation: wcg-overlay-in 0.2s ease-out !important;
				z-index: 2147483645 !important;
			}
			/* Changelog overlay above the citation modal */
			.wcg-overlay-changelog { z-index: 2147483646 !important; }
			
			.wcg-learned .wcg-form-label::after {
				content: "✓ Gespeichert" !important;
				color: #28a745 !important;
				font-size: 11px !important;
				background: rgba(40, 167, 69, 0.15) !important;
				padding: 3px 8px !important;
				border-radius: 4px !important;
			}

			/* Floating "Citation Generator" button (optional, bottom-right) */
			#wcg-fab {
				position: fixed !important;
				right: 20px !important;
				bottom: 20px !important;
				width: 26px !important;
				height: 26px !important;
				padding: 0 !important;
				margin: 0 !important;
				border: none !important;
				border-radius: 50% !important;
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
				color: #fff !important;
				font-size: 13px !important;
				line-height: 1 !important;
				cursor: pointer !important;
				display: flex !important;
				align-items: center !important;
				justify-content: center !important;
				box-shadow: 0 6px 18px rgba(102, 126, 234, 0.45) !important;
				z-index: 2147483640 !important;
				transition: transform 0.15s, box-shadow 0.15s !important;
			}
			#wcg-fab:hover {
				transform: translateY(-2px) scale(1.05) !important;
				box-shadow: 0 8px 24px rgba(102, 126, 234, 0.55) !important;
			}
			#wcg-fab:active { transform: scale(0.97) !important; }

			/* ---- Changelog modal ---- */
			.wcg-changelog-content {
				padding: 24px 28px !important;
				max-height: calc(80vh - 90px) !important;
				overflow-y: auto !important;
				color: var(--wcg-text) !important;
			}
			.wcg-changelog-entry { margin-bottom: 22px !important; }
			.wcg-changelog-entry:last-child { margin-bottom: 0 !important; }
			.wcg-changelog-head {
				display: flex !important;
				align-items: baseline !important;
				gap: 8px !important;
				margin-bottom: 8px !important;
			}
			.wcg-changelog-ver { font-weight: 700 !important; font-size: 15px !important; color: var(--wcg-text) !important; }
			.wcg-changelog-name { font-weight: 600 !important; font-size: 13px !important; color: var(--wcg-accent) !important; }
			.wcg-changelog-date { margin-left: auto !important; font-size: 12px !important; color: var(--wcg-text-muted) !important; }
			.wcg-changelog-list { margin: 0 !important; padding-left: 20px !important; }
			.wcg-changelog-list li { margin-bottom: 6px !important; font-size: 13px !important; line-height: 1.5 !important; color: var(--wcg-text-muted) !important; }
		`);
	}

	/**
	 * Render the changelog in its own modal, layered above the citation modal.
	 * Closes via the X button, a click on the backdrop, or the Escape key.
	 */
	function showChangelogModal() {
		// Remove a previous instance if the badge is clicked twice.
		document.getElementById(CONFIG.ui.changelogId)?.remove();
		document.querySelector('.wcg-overlay-changelog')?.remove();

		function close() {
			document.getElementById(CONFIG.ui.changelogId)?.remove();
			document.querySelector('.wcg-overlay-changelog')?.remove();
			document.removeEventListener('keydown', onKey);
		}
		function onKey(e) {
			if (e.key === 'Escape') close();
		}

		const overlay = document.createElement('div');
		overlay.className = 'wcg-overlay wcg-overlay-changelog';
		overlay.addEventListener('click', close);

		// Build one block per changelog entry (CHANGELOG content is a trusted constant).
		const entriesHtml = CHANGELOG.map(entry => `
			<div class="wcg-changelog-entry">
				<div class="wcg-changelog-head">
					<span class="wcg-changelog-ver">v${entry.version}</span>
					${entry.name ? `<span class="wcg-changelog-name">„${entry.name}“</span>` : ''}
					<span class="wcg-changelog-date">${entry.date}</span>
				</div>
				<ul class="wcg-changelog-list">
					${entry.changes.map(c => `<li>${c}</li>`).join('')}
				</ul>
			</div>
		`).join('');

		const modal = document.createElement('div');
		modal.id = CONFIG.ui.changelogId;
		modal.innerHTML = `
			<div class="wcg-modal-header">
				<h2 class="wcg-modal-title">📝 Changelog</h2>
				<div class="wcg-header-actions">
					<button class="wcg-modal-close" type="button">&times;</button>
				</div>
			</div>
			<div class="wcg-changelog-content">${entriesHtml}</div>
		`;

		document.body.appendChild(overlay);
		document.body.appendChild(modal);
		modal.querySelector('.wcg-modal-close').addEventListener('click', close);
		document.addEventListener('keydown', onKey);
	}

	async function showCitationModal(metadata) {
		const existing = document.getElementById(CONFIG.ui.modalId);
		if (existing) existing.remove();
		const existingOverlay = document.querySelector('.wcg-overlay');
		if (existingOverlay) existingOverlay.remove();
		
		const dbVersion = GM_getValue(CONFIG.storage.externalVersion, 'unknown');
		const lastUpdate = GM_getValue(CONFIG.storage.lastUpdate, 0);
		const hoursAgo = lastUpdate ? Math.floor((Date.now() - lastUpdate) / (1000 * 60 * 60)) : '?';
		
		const hostname = window.location.hostname.replace(/^www\./, '');
		const learnedPatterns = JSON.parse(GM_getValue(CONFIG.storage.learnedPatterns, '{}'));
		const hasLearned = learnedPatterns[hostname]?.learned || {};
		
		const opts = getOptions();

		const overlay = document.createElement('div');
		overlay.className = 'wcg-overlay';
		overlay.addEventListener('click', () => modalFunctions.closeModal());

		const modal = document.createElement('div');
		modal.id = CONFIG.ui.modalId;
		modal.innerHTML = `
			<div class="wcg-modal-header">
				<div>
					<h2 class="wcg-modal-title">Wikipedia Citation Generator
						<button type="button" class="wcg-version-badge" id="wcg-version-badge" title="Changelog anzeigen">v${CONFIG.version}</button>
					</h2>
					<div class="wcg-db-info">📦 Database v${dbVersion} • ${hoursAgo}h alt</div>
				</div>
				<div class="wcg-header-actions">
						<button class="wcg-theme-toggle" type="button" id="wcg-theme-toggle"></button>
						<button class="wcg-modal-close" type="button">&times;</button>
					</div>
			</div>
			<div class="wcg-modal-content">
				<div class="wcg-options">
					<div class="wcg-options-title">⚙️ Optionen</div>
					<label class="wcg-toggle">
						<span class="wcg-toggle-text">Bei deutschsprachigen Quellen <code>sprache=de</code> setzen</span>
						<input type="checkbox" id="wcg-opt-german" ${opts.germanLang ? 'checked' : ''}>
						<span class="wcg-toggle-track"></span>
					</label>
					<label class="wcg-toggle">
						<span class="wcg-toggle-text">Wikilinks im Werk entfernen (<code>[[…]]</code>)</span>
						<input type="checkbox" id="wcg-opt-plainwerk" ${opts.plainWerk ? 'checked' : ''}>
						<span class="wcg-toggle-track"></span>
					</label>
					<label class="wcg-toggle">
						<span class="wcg-toggle-text"><code>&lt;ref&gt;</code>-Tags beim Kopieren weglassen</span>
						<input type="checkbox" id="wcg-opt-noref" ${opts.noRef ? 'checked' : ''}>
						<span class="wcg-toggle-track"></span>
					</label>
					<label class="wcg-toggle">
						<span class="wcg-toggle-text">Benannter Einzelnachweis <code>&lt;ref name="…"&gt;</code></span>
						<input type="checkbox" id="wcg-opt-refname" ${opts.refName ? 'checked' : ''}>
						<span class="wcg-toggle-track"></span>
					</label>
					<label class="wcg-toggle">
						<span class="wcg-toggle-text">Citation-Generator-Modus: schwebender Button auf jeder Seite</span>
						<input type="checkbox" id="wcg-opt-fab" ${opts.fab ? 'checked' : ''}>
						<span class="wcg-toggle-track"></span>
					</label>
				</div>
				<form id="wcg-form">
					<div class="wcg-form-group${hasLearned.author ? ' wcg-learned' : ''}">
						<label class="wcg-form-label">
							Autor
							<button type="button" class="wcg-button wcg-button-select" data-select="author">🎯 Auswählen</button>
						</label>
						<input type="text" class="wcg-form-input" id="wcg-author" value="${metadata.author || ''}" placeholder="z.B. Max Mustermann">
					</div>
					<div class="wcg-form-group${hasLearned.title ? ' wcg-learned' : ''}">
						<label class="wcg-form-label">
							Titel
							<button type="button" class="wcg-button wcg-button-select" data-select="title">🎯 Auswählen</button>
						</label>
						<input type="text" class="wcg-form-input" id="wcg-title" value="${metadata.title || ''}" placeholder="Titel des Artikels">
					</div>
					<div class="wcg-form-group">
						<label class="wcg-form-label">Werk</label>
						<input type="text" class="wcg-form-input" id="wcg-werk" value="${metadata.siteName || ''}" placeholder="z.B. Der Spiegel">
					</div>
					<div class="wcg-form-group${hasLearned.date ? ' wcg-learned' : ''}">
						<label class="wcg-form-label">
							Datum
							<button type="button" class="wcg-button wcg-button-select" data-select="date">🎯 Auswählen</button>
						</label>
						<input type="text" class="wcg-form-input" id="wcg-date" value="${metadata.date || ''}" placeholder="YYYY-MM-DD">
					</div>
					<div class="wcg-form-group">
						<label class="wcg-form-label">Zitation</label>
						<textarea class="wcg-form-input wcg-form-textarea" id="wcg-citation" readonly></textarea>
					</div>
				</form>
			</div>
			<div class="wcg-modal-actions">
				<button type="button" class="wcg-button wcg-button-secondary" id="wcg-refresh">🔄 DB laden</button>
				<button type="button" class="wcg-button wcg-button-secondary" id="wcg-update">🔄 Aktualisieren</button>
				<button type="button" class="wcg-button wcg-button-primary" id="wcg-copy">📋 Kopieren</button>
			</div>
		`;
		
		document.body.appendChild(overlay);
		document.body.appendChild(modal);
		
		modalFunctions.closeModal = function() {
			const m = document.getElementById(CONFIG.ui.modalId);
			const o = document.querySelector('.wcg-overlay');
			if (m) m.remove();
			if (o) o.remove();
		};

		modalFunctions.updateCitation = function() {
			const formData = {
				author: document.getElementById('wcg-author')?.value || '',
				title: document.getElementById('wcg-title')?.value || '',
				siteName: document.getElementById('wcg-werk')?.value || '',
				date: document.getElementById('wcg-date')?.value || '',
				url: metadata.url,
				language: metadata.language
			};
			document.getElementById('wcg-citation').value = generateCitation(formData);
		};

		modalFunctions.copyCitation = function() {
			const citation = document.getElementById('wcg-citation')?.value || '';
			const copyBtn = document.getElementById('wcg-copy');
			if (citation) {
				GM_setClipboard(citation);
				const originalText = copyBtn.innerHTML;
				copyBtn.innerHTML = '✅ Kopiert!';
				copyBtn.classList.add('wcg-button-success');
				setTimeout(() => {
					copyBtn.innerHTML = originalText;
					copyBtn.classList.remove('wcg-button-success');
				}, 2000);
			}
		};

		modalFunctions.refreshDB = async function() {
			const btn = document.getElementById('wcg-refresh');
			const originalText = btn.innerHTML;
			
			console.log('[WCG] ==================== DATABASE REFRESH START ====================');
			
			try {
				btn.innerHTML = '⏳ Lädt...';
				btn.disabled = true;
				
				await forceRefreshDatabase();
				
				const version = GM_getValue(CONFIG.storage.externalVersion, '?');
				const patterns = GM_getValue(CONFIG.storage.externalPatterns, '{}');
				const count = Object.keys(JSON.parse(patterns)).length;
				
				console.log('[WCG] ✅ Refresh successful!');
				console.log(`[WCG] Version: ${version}`);
				console.log(`[WCG] Sites: ${count}`);
				
				btn.innerHTML = `✅ v${version} (${count} Sites)`;
				btn.classList.add('wcg-button-success');
				
				setTimeout(() => {
					btn.innerHTML = originalText;
					btn.classList.remove('wcg-button-success');
					btn.disabled = false;
					debug('Page reload in 1 second...');
					setTimeout(() => location.reload(), 1000);
				}, 2000);
			} catch (e) {
				console.error('[WCG] ❌ Refresh failed:', e);
				console.error('[WCG] Error stack:', e.stack);
				
				btn.innerHTML = `❌ ${e.message.substring(0, 30)}`;
				btn.classList.add('wcg-button-error');
				
				setTimeout(() => {
					btn.innerHTML = originalText;
					btn.classList.remove('wcg-button-error');
					btn.disabled = false;
				}, 4000);
			} finally {
				console.log('[WCG] ==================== DATABASE REFRESH END ====================');
			}
		};
		
		modal.querySelector('.wcg-modal-close').addEventListener('click', modalFunctions.closeModal);
		modal.querySelector('#wcg-update').addEventListener('click', modalFunctions.updateCitation);
		modal.querySelector('#wcg-copy').addEventListener('click', modalFunctions.copyCitation);
		modal.querySelector('#wcg-refresh').addEventListener('click', modalFunctions.refreshDB);

		// Theme switcher: cycles Auto -> Light -> Dark and updates its own icon.
		const themeToggleBtn = modal.querySelector('#wcg-theme-toggle');
		updateThemeToggleButton(themeToggleBtn);
		themeToggleBtn.addEventListener('click', () => {
			cycleTheme();
			updateThemeToggleButton(themeToggleBtn);
		});

		// Version badge opens the changelog.
		modal.querySelector('#wcg-version-badge').addEventListener('click', showChangelogModal);

		// Citation options: persist the choice and regenerate the preview immediately.
		modal.querySelector('#wcg-opt-german').addEventListener('change', (e) => {
			GM_setValue(CONFIG.storage.optGermanLang, e.target.checked);
			modalFunctions.updateCitation();
		});
		modal.querySelector('#wcg-opt-plainwerk').addEventListener('change', (e) => {
			GM_setValue(CONFIG.storage.optPlainWerk, e.target.checked);
			modalFunctions.updateCitation();
		});
		modal.querySelector('#wcg-opt-noref').addEventListener('change', (e) => {
			GM_setValue(CONFIG.storage.optNoRef, e.target.checked);
			modalFunctions.updateCitation();
		});
		modal.querySelector('#wcg-opt-refname').addEventListener('change', (e) => {
			GM_setValue(CONFIG.storage.optRefName, e.target.checked);
			modalFunctions.updateCitation();
		});
		// Floating-button option: persist and show/hide it immediately.
		modal.querySelector('#wcg-opt-fab').addEventListener('change', (e) => {
			GM_setValue(CONFIG.storage.optFab, e.target.checked);
			renderFloatingButton();
		});

		modal.querySelectorAll('[data-select]').forEach(btn => {
			btn.addEventListener('click', (e) => {
				e.preventDefault();
				const type = btn.getAttribute('data-select');
				modalFunctions.closeModal();
				startElementSelection(type, (text) => {
					const currentMetadata = { ...metadata };
					currentMetadata[type] = type === 'date' ? normalizeDate(text) : text;
					setTimeout(() => showCitationModal(currentMetadata), 100);
				});
			});
		});
		
		modal.querySelectorAll('.wcg-form-input:not([readonly])').forEach(input => {
			input.addEventListener('input', modalFunctions.updateCitation);
		});
		
		modalFunctions.updateCitation();
	}

	// ================================
	// INITIALIZATION
	// ================================
	
	function init() {
		debug('🚀 Initializing Wikipedia Citation Generator');
		
		if (window.location.hostname.includes('wikipedia.org')) {
			debug('⏭️ Skipping Wikipedia');
			return;
		}
		
		addStyles();
		applyTheme(getTheme());  // tag <html> so the auto/manual palette applies right away
		renderFloatingButton();  // show the floating button if the option is enabled

		// Hotkey: Ctrl+Shift+C
		document.addEventListener('keydown', async (e) => {
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyC') {
				e.preventDefault();
				const metadata = await extractAllMetadata();
				showCitationModal(metadata);
			}
		});
		
		// Menu commands
		GM_registerMenuCommand('📋 Zitation generieren (Ctrl+Shift+C)', async () => {
			const metadata = await extractAllMetadata();
			showCitationModal(metadata);
		});
		
		GM_registerMenuCommand('🔄 DB aktualisieren', async () => {
			console.log('[WCG] Manual database refresh triggered');
			try {
				await forceRefreshDatabase();
				const version = GM_getValue(CONFIG.storage.externalVersion, 'unknown');
				alert(`✅ Datenbank aktualisiert!\n\nVersion: ${version}`);
			} catch (e) {
				console.error('[WCG] Refresh error:', e);
				alert(`❌ Fehler beim Aktualisieren:\n\n${e.message}\n\nÖffne die Console (F12) für Details.`);
			}
		});
		
		GM_registerMenuCommand('📊 DB Info', async () => {
			const patterns = await getPatternsDatabase();
			const version = GM_getValue(CONFIG.storage.externalVersion, 'unknown');
			const sites = Object.keys(patterns).length;
			const learned = JSON.parse(GM_getValue(CONFIG.storage.learnedPatterns, '{}'));
			const lastUpdate = GM_getValue(CONFIG.storage.lastUpdate, 0);
			const hoursAgo = lastUpdate ? Math.floor((Date.now() - lastUpdate) / (1000 * 60 * 60)) : '?';
			
			alert(`📊 Database Info\n\nVersion: ${version}\nWebsites: ${sites}\nGelernte Patterns: ${Object.keys(learned).length}\nCache Alter: ${hoursAgo}h`);
		});
		
		GM_registerMenuCommand('🗑️ Gelernte löschen', () => {
			if (confirm('Alle gelernten Patterns löschen?')) {
				GM_setValue(CONFIG.storage.learnedPatterns, '{}');
				alert('✅ Alle gelernten Patterns gelöscht');
			}
		});
		
		// Preload database
		getPatternsDatabase().then(p => {
			debug('✅ Database preloaded:', Object.keys(p).length, 'sites');
		}).catch(e => {
			debug('⚠️ Database preload failed:', e.message);
		});
		
		debug('✅ Ready! Use Ctrl+Shift+C or Violentmonkey menu');
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

})();