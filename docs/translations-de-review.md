# German UI translation — review notes

Status of `frontend/src/locales/de.json` (first full translation 2026-07-03, expansion terms added same day) and what still needs a native-speaker / physical-copy check.

## Terminology sources

1. **Official Frosted Games documents** in `docs/EBR-german-documents/` — core rulebook (incl. its index/glossary), campaign tracker sheets (core + LoA), achievements sheet ("Triumphe"), FAQ, card update PDF, the LoA campaign guide (pages 1–9, incl. full entry TOC), the SOTV rulesheet, and the MOTP rules cards. These settled the core game terms **and** the LoA expansion terms.
2. **German card data** from `rangers-card-data` (`i18n/de/*.po`) — trait names, use-token names, set names, aspect names. These mirror the printed German cards.

Key official terms used throughout: Wahrnehmung/Souveränität/Fitness/Ruhe (WAH/SOV/FIT/RUH); Herangehensweisen: Konflikt, Vernunft, Tatendrang, Verständnis; Vorgeschichte (Background), Expertise (Specialty), Charakteristik (Personality), Hobby (Outside Interest), Berufung (Role); Werker/Sammler/Hirte/Reisender; Schöpfer/Vermittler/Forscher/Former; **Sagenweber** (Talespinner) and **Geistsprecher** (Spirit Speaker), both official per the SOTV rulesheet; Welteffekt (Challenge), Schwächung (Malady), Ausstattung (Gear), Anhang (Attachment), Eigenart (Attribute), Wesen (Being), Besonderheit (Feature); Müdigkeit (Fatigue), Wunde (Injury), Mühe (Effort), Leistung (test result), Last (Equip value), Präsenz (Presence); Pfadstapel, Pfadkarten-Set, Kampagnenbuch-Eintrag, Aufbau bei Ankunft, Erstellen des Pfadstapels.

Official product/campaign names: **Der Ruf des Tals** (Lure of the Valley), **Das Vermächtnis der Ahnen** (Legacy of the Ancestors), **Die Hüter des Tals** (Stewards of the Valley / sotv), **Augenblicke Unterwegs** (Moments on the Path). LoA weather: Schreiende Stille (Enveloping Silence), Glitzernder Niesel (Glitterain), Schimmernder Niederschlag (Shimmering Runoff). LoA terrain/sets: Uralte Ruinen, Überschwemmte Ruinen (Flooded Ruins), Tiefe Wurzeln, Pilzwald, Höhlensystem, Die Arkologie. Travel restrictions: Überflutete/Verschlossene/Überwucherte Passage.

## Deliberate decisions

- **Spire in Bloom / Shadow of the Storm content stays English** (product names, locations spire_crossing…the_undergrove, terrain "Thoroughfare"/"Nimbus"): no German documents for these exist yet. Revisit when Frosted Games publishes them.
- `common.category.personality` uses the rulebook term **Charakteristik** (the community RangersDB translation uses "Persönlichkeit"; the official rulebook index wins).
- App uses informal **du**, matching the rulebook's tone.

## Needs verification against the physical German map

Most location names are now confirmed official (core rulebook, mission docs, and the LoA campaign guide TOC, which lists every location entry by name). Corrections applied from the LoA guide: **Felsenmeer** (Boulder Field), **Kobos Emporium** (Kobo's Market), **Oberlauf-Station** (Headwaters Station), **Stechwinden-Höhe** (Greenbriar Knoll), **Die Konkordanten Zikkurats**, plus all underground/LoA locations (Der Schlot, Oase des Lichts, Krabblertunnel-Netz, Schwemmkammer, Dünen der Endlosen Nacht, Orlins Gewölbe, Durchtrennte Arterie, Arterien-Verzweigung, Arterien-Endstelle, Verlassene Unterkünfte, Der Himmelblaue Vorhang, Myzelien-Konzil, Karbongeschmiedeter Irrgarten, Die Zisterne, Der Kopfstehende Wald, Die Grünsphäre, Die Wurzelstraße, Gedächtnisarboretum, Sternmulls Enge, Der Käfig).

Still **best-effort guesses** — check against the German Wanderkarte and fix `campaign.data.locations` in `de.json`:

| Key | English | Guess |
| --- | --- | --- |
| golden_shore | Golden Shore | Goldufer |
| ancestors_grove | Ancestor's Grove | Ahnenhain |
| the_philosophers_garden | The Philosopher's Garden | Garten des Philosophen |
| the_high_basin | The High Basin | Das Hochbecken |
| crossroads_station | Crossroads Station | Kreuzweg-Station |
| the_furrow | The Furrow | Die Furche |
| terravore | Terravore | Terravore |
| mound_of_the_navigator | Mound of the Navigator | Hügel des Navigators |
| the_greenbridge | The Greenbridge | Die Grünbrücke |
| michaels_bog | Michael's Bog | Michaels Moor |
| the_cypress_citadel | The Cypress Citadel | Zypressen-Zitadelle |
| sunken_outpost | Sunken Outpost | Versunkener Außenposten |
| the_frowning_gate | The Frowning Gate | Das Grimmige Tor |
| bowl_of_the_sun | Bowl of the Sun | Schale der Sonne |
| watchers_rock | Watcher's Rock | Wächterfels |
| archeological_outpost | Archaeological Outpost | Archäologie-Stützpunkt |
| rings_of_the_moon | Rings of the Moon | Ringe des Mondes |
| stoneweaver_bridge | Stoneweaver Bridge | Steinweber-Brücke |
| the_plummet | The Plummet | Der Sturz — confirmed by LoA guide entry 19 |

Note: `biologists_outpost` is "Biologie-Stützpunkt" per the printed card; the one-day-missions doc says "Biologie-Außenposten". Card wins. "Archäologie-Stützpunkt" is inferred from that pattern.

## Other items to double-check

- `campaign.missions.subject_placeholder` uses "Köder" (official, = Lure) and "Helfende Hand" (unverified guess for Helping Hand — check the German Kampagnenbuch).
- `draw_simulator.help` cites the card "Lingering Injury" in English — replace with the German card name if known.
- `filters.health.title` = "Schadensschwelle" and `filters.properties.*` ("Heilt Schaden", "Erfolg um") were translated without an official reference.
- Use-token names missing from the card data and guessed: Riss (crack), Lektion (lesson), Haken (piton), Scheibe (slice), Sprühstoß (spray).
- General native-speaker pass for tone/grammar; check tight layouts (buttons, tabs, filter chips) for German text overflow.

## Unofficial terms with no source to check against

App-specific terms (mostly deckbuilder concepts, not game terms) that were freely translated — a reviewer should judge them on their own merits:

- "Multi-Aspekt" (multi-aspect), "Kartenzugriff" (card access), "Begrenzter Zugriff" (limited access)
- "Verdrängte Karten" (displaced cards), "Weiterentwickelt" / "Startdeck" (deck evolution states)
- "Reiseprotokoll" (journey log), "Verbindungsort" (connecting location), "Gruppe" (party tab), "Gegenstand" (mission subject)
- "Ziehsimulator" (draw simulator), "Freigabe" (public share), "Platz" (slot filter; "Asset" filter left in English — both likely arkham.build residue)
- Default deck names (`deck_create.default_name`): "{{name}} beobachtet", "{{name}} auf Wanderschaft", "{{name}} plant voraus", "{{name}}s Berufung" — invented flavor
- The font-size preview sentence and the 10 background/specialty descriptions translate earthborne.build's own (unofficial) English flavor text

## Trust level of the community card data

Trait and use-token translations came from `rangers-card-data` `i18n/de/*.po`. They appear to be transcriptions of printed German cards and everything cross-checkable against the official PDFs matched, but the data contains at least one confirmed error ("Tech / Weapon" mapped to "Fähigkeit / Hilfe"), so spot-check token names against physical cards where possible — especially the non-obvious ones: Route (hunch), Wissen (marker), Hinweis (sensor), Pause (session), Flimmer (shift), Formung (strain), Ernte (vittle), Drohne (remote), Memopix (inkrill).

## Style decisions for the reviewer

- The app addresses the user with informal **du**; campaign/achievement texts use **ihr**, matching how the official material addresses the group. `campaign.subtitle` ("Verfolge eure Reise durch das Tal.") deliberately mixes both in one sentence.
- "Die Konkordanten Zikkurats" is capitalized; the LoA guide writes "Die konkordanten Zikkurats" (lowercase adjective).

## Known gaps outside `de.json`

- Card-list rows show trait lines from card data (English) — card data localization is stage 2.
- A few keyword filters render values not present in `en.json` either (Dangerous, Illumination, Mycelial, Spirit, Untraversable — from newer card data); they show untranslated in both languages. Official German for these, from the LoA guide / SOTV rulesheet, for when they get added: Beleuchtung (Illumination), Myzele (Mycelial), Geist (Spirit), Undurchquerbar (Untraversable), Bedrohung (Threat), Ziel (Goal), Initialisieren (Initialize). "Dangerous" has no German source yet.
- The footer disclaimer in `frontend/src/components/footer.tsx` is hardcoded English.
- The rules reference content (`frontend/src/assets/*.html`) is English scraper output — deliberately out of scope for now.
