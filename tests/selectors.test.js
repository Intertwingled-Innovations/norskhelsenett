/*
Selectors — the sets the navigation trees and extracts are built over. These
assert the *invariants* each selector claims rather than exact counts, so the
suite survives a content refresh but still catches a selector that has started
letting the wrong tiddlers through.
*/

"use strict";

var h = require("./harness.js"),
	assert = h.assert;

h.suite("Selectors");

h.test("nhn-services excludes the monthly review tiddlers", function() {
	var w = h.wiki(),
		services = w.filter("[function[nhn-services]]");
	assert.ok(services.length > 0, "nhn-services selected nothing");
	services.forEach(function(title) {
		assert.ok(!/^\d\d /.test(title),
			"the monthly review \"" + title + "\" is being treated as a service");
	});
});

h.test("every service has a business unit", function() {
	var w = h.wiki();
	w.filter("[function[nhn-services]]").forEach(function(title) {
		assert.ok(w.project("nhn-business-unit", title)[0] !== "(Ingen forretningsområde)",
			title + " has no business unit but was selected as a service");
	});
});

h.test("every review carries a month and a governance tag", function() {
	var w = h.wiki(),
		reviews = w.filter("[function[nhn-reviews]]");
	assert.ok(reviews.length > 0, "nhn-reviews selected nothing");
	reviews.forEach(function(title) {
		assert.deepEqual(w.project("nhn-has-month", title).length, 1,
			title + " was selected as a review but has no month tag");
		assert.equal(w.project("nhn-governance-type", title).length > 0, true,
			title + " was selected as a review but has no Styring tag");
	});
});

/*
A base selector is "everything carrying this tag, less what is not content" —
the `mal` templates, archived tiddlers and drafts, all of them via `nhn-excluded`.
Asserted as the two directions of that sentence rather than by re-composing the
filter here: a selector that quietly starts reading a different tag fails on the
first, and one that drops members for a reason of its own fails on the second.
*/
function assertTagLessExclusions(w, fn, tag) {
	var selected = w.filter("[function[" + fn + "]]"),
		tagged = w.filter("[[" + tag + "]tagging[]]"),
		excluded = w.filter("[function[nhn-excluded]]");
	assert.ok(selected.length > 0, fn + " selects nothing at all");
	selected.forEach(function(title) {
		assert.ok(tagged.indexOf(title) !== -1,
			fn + " selected \"" + title + "\", which is not tagged " + tag);
		assert.ok(excluded.indexOf(title) === -1,
			fn + " selected \"" + title + "\", which nhn-excluded rules out");
	});
	tagged.forEach(function(title) {
		assert.ok(selected.indexOf(title) !== -1 || excluded.indexOf(title) !== -1,
			"\"" + title + "\" is tagged " + tag + " but " + fn +
			" drops it, and nhn-excluded does not say why");
	});
}

h.test("nhn-deliveries is the Leveranse-tagged set, less what is not content", function() {
	assertTagLessExclusions(h.wiki(), "nhn-deliveries", "Leveranse");
});

/*
TiddlyWiki's editor leaves a draft copy behind whenever a tiddler is opened and
not saved, and the draft inherits the tags of what it drafts. Seven of the ones
in this snapshot were being counted as content: a draft of a `Leveranse` as a
second delivery, a draft of a `Målsetting` as a second objective. So the reports
overstated the work, against tiddlers nobody had filed.

The guard is on every population at once rather than on the seven — the point is
that no selector may ever admit a draft, not that these particular drafts are
gone. The "-all" variants are included: they keep archived content deliberately,
but archived work happened and a draft did not.
*/
h.test("no draft reaches any population", function() {
	var w = h.wiki(),
		drafts = w.filter("[function[nhn-drafts]]");
	assert.ok(drafts.length > 0, "no drafts in the snapshot — this guard proves nothing");
	["nhn-deliveries", "nhn-objectives", "nhn-objectives-all", "nhn-results",
			"nhn-reviews", "nhn-reviews-all", "nhn-services", "nhn-periodic"].forEach(function(fn) {
		var members = w.filter("[function[" + fn + "]]");
		drafts.forEach(function(draft) {
			assert.ok(members.indexOf(draft) === -1,
				fn + " counts the draft \"" + draft + "\" as content");
		});
	});
	// Both extracts read nhn-excluded too, so a draft cannot be exported either
	assert.deepEqual(w.filter("[function[nhn-extract-governance-set]] :intersection[function[nhn-drafts]]",
		{"extract-year": "", "extract-month": ""}), []);
});

/*
Two shapes of draft, and the second is the one a `has[draft.of]` test misses:
twelve in this snapshot lost that field and are recognisable only by the title
TiddlyWiki gave them.
*/
h.test("nhn-drafts catches drafts that lost their draft.of field", function() {
	var w = h.wiki(),
		drafts = w.filter("[function[nhn-drafts]]"),
		fielded = w.filter("[has[draft.of]]");
	assert.ok(drafts.length > fielded.length,
		"nhn-drafts found no more than has[draft.of] does, so the orphaned drafts are being missed");
	w.filter("[all[tiddlers]prefix<nhn-draft-title-prefix>]").forEach(function(title) {
		assert.ok(drafts.indexOf(title) !== -1, title + " is titled as a draft but nhn-drafts misses it");
	});
});

h.test("the governance tree descends from the configured root", function() {
	var w = h.wiki(),
		root = w.first("[subfilter<nhn-gov-root-filter>]"),
		children = w.project("nhn-gov-children", root);
	assert.equal(root, "Norsk Helsenett SF");
	assert.ok(children.indexOf("Divisjon Helsepersonell") !== -1,
		"the client's own division is missing from the governance tree");
});

h.test("no governance node is its own child", function() {
	var w = h.wiki();
	// Self-tagging is rife in the data (anomaly 1); the relation filters it out so
	// the tree does not render a node beneath itself
	w.filter("[function[nhn-services]] [subfilter<nhn-gov-root-filter>]").forEach(function(title) {
		assert.ok(w.project("nhn-gov-children", title).indexOf(title) === -1,
			title + " is returned as its own child");
	});
});

h.suite("Extract filtering");

h.test("blank year and month place no constraint", function() {
	var w = h.wiki(),
		unfiltered = w.filter("[function[nhn-extract-governance-set]]",
			{"extract-year": "", "extract-month": ""}),
		everything = w.filter("[enlist<nhn-governance-tags>tagging[]unique[]] -[function[nhn-excluded]]");
	assert.deepEqual(unfiltered.sort(), everything.sort());
});

/*
The MAL review template carries the same governance, year and month tags as a
real review — that is what makes it a usable template. Exporting it as a data
row is the exact "stale copy mistaken for content" failure the brief exists to
stop, so the extracts must subtract the `mal` set like every other selector.
*/
h.test("the untouched template is never a data row", function() {
	var w = h.wiki(),
		rows = w.filter("[function[nhn-extract-governance-set]]",
			{"extract-year": "", "extract-month": ""}),
		templates = w.filter("[[mal]tagging[]]");
	assert.ok(templates.length > 0, "no template in the snapshot, so the exclusion is untested");
	templates.forEach(function(title) {
		assert.ok(rows.indexOf(title) === -1, title + " is exported as a data row");
	});
});

h.test("filtering narrows monotonically", function() {
	var w = h.wiki(),
		all = w.filter("[function[nhn-extract-governance-set]]", {"extract-year": "", "extract-month": ""}),
		year = w.filter("[function[nhn-extract-governance-set]]", {"extract-year": "2026", "extract-month": ""}),
		month = w.filter("[function[nhn-extract-governance-set]]", {"extract-year": "2026", "extract-month": "Mars"});
	assert.ok(year.length > 0, "the 2026 extract is empty");
	assert.ok(month.length > 0, "the March 2026 extract is empty");
	assert.ok(all.length > year.length, "filtering by year did not narrow the set");
	assert.ok(year.length > month.length, "filtering by month did not narrow the set");
});

h.test("a month-filtered extract contains only that month", function() {
	var w = h.wiki(),
		rows = w.filter("[function[nhn-extract-governance-set]]",
			{"extract-year": "2026", "extract-month": "Mars"});
	rows.forEach(function(title) {
		assert.deepEqual(w.project("nhn-month", title), ["Mars"], title);
		assert.deepEqual(w.project("nhn-year", title), ["2026"], title);
	});
});

h.test("the month filter matches across casing drift", function() {
	var w = h.fixtureWiki(),
		rows = w.filter("[function[nhn-extract-governance-set]]",
			{"extract-year": "2026", "extract-month": "Mars"});
	// The fixtures are tagged `mars` and `Mars`; one filter must find both
	assert.ok(rows.indexOf("Test Gjennomgang Liten Mars") !== -1, "lowercase month tag was missed");
	assert.ok(rows.indexOf("Test Gjennomgang Stor Mars") !== -1, "canonical month tag was missed");
});

h.test("the services extract is filterable by year only", function() {
	var w = h.wiki(),
		all = w.filter("[function[nhn-extract-services-set]]", {"extract-year": ""}),
		year = w.filter("[function[nhn-extract-services-set]]", {"extract-year": "2026"});
	assert.ok(all.length > year.length, "filtering by year did not narrow the services extract");
	year.forEach(function(title) {
		// A service can be tagged several years at once, so the filter tests for the
		// presence of the year tag rather than a single value
		assert.ok(w.project("nhn-year", title).indexOf("2026") !== -1,
			title + " was selected for 2026 but is not tagged 2026");
	});
});

h.test("a service can carry several year tags", function() {
	var w = h.wiki(),
		multiYear = w.filter("[function[nhn-extract-services-set]]", {"extract-year": "2026"})
			.filter(function(title) { return w.project("nhn-year-raw", title).length > 1; });
	// Not a defect in the selector, but it means the exported Year column (which takes
	// the first value) can disagree with the year the user filtered on — see the note
	// in docs/plan.md
	assert.ok(multiYear.length > 0,
		"expected some multi-year services; if this is now empty the export wrinkle is gone");
});

h.suite("Data-quality detectors");

h.test("nhn-glued-lists reports only lists glued to paragraph text", function() {
	var w = h.fixtureWiki();
	w.addTiddler({title: "$:/temp/test/glued", text: "Kommentar:\n* en\n* to"});
	[
		{title: "Glued list", text: "Kommentar:\n* Internregnskapet viser\n* to"},
		{title: "Glued numbered", text: "Status\n# første"},
		{title: "Spaced list", text: "Kommentar:\n\n* en"},
		{title: "After heading", text: "! Tittel\n* en"},
		{title: "Nested list", text: "* en\n** to"},
		{title: "After table", text: "|a|b|\n* en"},
		{title: "Not wikitext", text: "x\n* y", type: "text/plain"}
	].forEach(function(t) { w.addTiddler(t); });
	var found = w.filter("[function[nhn-glued-lists]]");
	["Glued list", "Glued numbered"].forEach(function(t) {
		assert.ok(found.indexOf(t) >= 0, t + " should be reported");
	});
	["Spaced list", "After heading", "Nested list", "After table", "Not wikitext"].forEach(function(t) {
		assert.ok(found.indexOf(t) === -1, t + " should not be reported");
	});
	assert.ok(found.indexOf("$:/temp/test/glued") === -1, "system tiddlers must be ignored");
	assert.ok(found.indexOf("02 Styringsrapport DHP februar 2025") >= 0,
		"the known glued list in the February 2025 report was not detected");
});

