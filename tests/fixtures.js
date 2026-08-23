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
		text: "Fixture result B"}
];

exports.install = function(wiki) {
	TIDDLERS.forEach(function(fields) {
		wiki.addTiddler(fields);
	});
};
