/*
Synthetic tiddlers for deterministic behaviour tests.

These exercise cases the real snapshot cannot pin down reliably — an owner that
is actually set, lowercase month tags, kind-priority collisions, a title needing
CSV quoting. They are installed into a separate wiki instance (see
harness.fixtureWiki) so they never skew assertions about the real content.

Every title is prefixed "Test " so a stray fixture is obvious in any output.
*/

"use strict";

var TIDDLERS = [
	// A business unit, so the fixture services pass the nhn-has-business-unit filter
	{title: "Test Divisjon", tags: "Divisjon", text: "Fixture business unit"},

	// A service with an owner set, and one without (owner fallback)
	{title: "Test Tjeneste Med Eier", tags: "[[Ekstern tjeneste]] [[Test Divisjon]]",
		TjenesteID: "99001", tjenesteeier: "Kari Nordmann", text: "Fixture service"},
	{title: "Test Tjeneste Uten Eier", tags: "[[Ekstern tjeneste]] [[Test Divisjon]]",
		TjenesteID: "99002", text: "Fixture service without an owner"},

	// Month-casing drift: these two must normalise to the same group
	{title: "Test Gjennomgang Liten Mars", tags: "[[Styring Ekstern tjeneste]] 2026 mars",
		text: "Lowercase month tag"},
	{title: "Test Gjennomgang Stor Mars", tags: "[[Styring Ekstern tjeneste]] 2026 Mars",
		text: "Canonical month tag"},

	// Governance-tagged but undated: falls into the (Uten år)/(Uten måned) buckets
	{title: "Test Gjennomgang Udatert", tags: "[[Styring Ekstern tjeneste]]",
		text: "No year or month tag"},

	// Kind priority: `mal` must win over `Leveranse`
	{title: "Test Mal Som Ogsa Er Leveranse", tags: "mal Leveranse 2026 Januar",
		text: "Template that also carries a delivery tag"},

	// CSV quoting
	{title: "Test Sitat \"Anførselstegn\"", tags: "[[Styring Ekstern tjeneste]] 2026 Mars",
		text: "Title containing double quotes"},

	// Tagged three years and three months, deliberately out of order: neither
	// tag order (Februar, Januar, Desember) nor alphabetical order (Desember,
	// Februar, Januar) is chronological, so only a chronological sort passes.
	// The real snapshot cannot pin this — whichever tiddler happens to be
	// tagged several months today may be tagged another one tomorrow.
	// Date tags only, deliberately: a governance tag would put it in the
	// extract and to-do populations, where three years at once would skew
	// counts in tests that have nothing to do with the date projections.
	{title: "Test Gjennomgang Flere Perioder",
		tags: "2025 2026 2024 Februar Januar Desember",
		text: "Three years and three months, none of them in order"},

	// A small, self-contained population for the summary grouped-view tests
	// (summaries.test.js): two services and two years, so every ordering in
	// the catalogue — year/month/service/business-unit, in either order —
	// has more than one group to place things under, without rendering
	// against the full ~2000-tiddler corpus.
	{title: "Test Gruppetest Leveranse A", tags: "Leveranse 2025 Januar [[Test Tjeneste Med Eier]]",
		text: "Fixture delivery A"},
	{title: "Test Gruppetest Leveranse B", tags: "Leveranse 2026 Juni [[Test Tjeneste Uten Eier]]",
		text: "Fixture delivery B"},
	{title: "Test Gruppetest Målsetting A", tags: "Målsetting 2025 [[Test Tjeneste Med Eier]] [[Test Divisjon]]",
		text: "Fixture objective A"},
	{title: "Test Gruppetest Målsetting B", tags: "Målsetting 2026 [[Test Tjeneste Uten Eier]] [[Test Divisjon]]",
		text: "Fixture objective B"},
	{title: "Test Gruppetest Resultat A", tags: "Resultat 2025 [[Test Gruppetest Målsetting A]]",
		text: "Fixture result A"},
	{title: "Test Gruppetest Resultat B", tags: "Resultat 2026 [[Test Gruppetest Målsetting B]]",
		text: "Fixture result B"},

	// --- Leveranserapport (board delivery report) fixtures -------------------
	// A deterministic population for the month-range report: two linked
	// deliveries inside the range (one via a lowercase month tag), one
	// multi-month delivery whose prefix must come from its LATEST month,
	// boundary deliveries just outside the range, an unlinked delivery,
	// an undated one, and one whose title already carries its prefix.
	{title: "Test Rapport Mai", tags: "Leveranse 2026 Mai [[Test Tjeneste Med Eier]]",
		text: "In range, canonical month tag"},
	{title: "Test Rapport Liten Juni", tags: "Leveranse 2026 juni [[Test Tjeneste Med Eier]]",
		text: "In range, lowercase month tag"},
	{title: "Test Rapport Flere Maneder", tags: "Leveranse 2026 April Mai Juni [[Test Tjeneste Uten Eier]]",
		text: "Multi-month delivery: must appear once, prefixed by its latest month"},
	{title: "Test Rapport April", tags: "Leveranse 2026 April [[Test Tjeneste Med Eier]]",
		text: "Just below the range"},
	{title: "Test Rapport September", tags: "Leveranse 2026 September [[Test Tjeneste Med Eier]]",
		text: "Just above the range"},
	{title: "Test Rapport Feil Aar", tags: "Leveranse 2025 Juni [[Test Tjeneste Med Eier]]",
		text: "Right month, wrong year"},
	{title: "Test Rapport Uten Tjeneste", tags: "Leveranse 2026 Juni",
		text: "In range but linked to no service"},
	{title: "Test Rapport Udatert", tags: "Leveranse [[Test Tjeneste Med Eier]]",
		text: "No year or month tag"},
	{title: "07/26 Test Rapport Ferdig Prefikset", tags: "Leveranse 2026 Juli [[Test Tjeneste Med Eier]]",
		text: "Title already starts with its own prefix"},
	{title: "Test Rapport Tom Tekst", tags: "Leveranse 2026 August [[Test Tjeneste Uten Eier]]",
		text: ""},

	// An isolated year for the data-span month defaults: only these two
	// deliveries carry 2031, so min/max are known by construction. The
	// October one sorts first by title and carries a lowercase month tag,
	// so the chronological sort and the canonicalisation are both load-bearing.
	{title: "Test Rapport 2031 A", tags: "Leveranse 2031 oktober [[Test Tjeneste Med Eier]]",
		text: "October delivery, lowercase tag, title sorts first"},
	{title: "Test Rapport 2031 B", tags: "Leveranse 2031 Mars [[Test Tjeneste Med Eier]]",
		text: "March delivery"}
];

exports.install = function(wiki) {
	TIDDLERS.forEach(function(fields) {
		wiki.addTiddler(fields);
	});
};
