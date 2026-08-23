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

h.test("nhn-deliveries is exactly the Leveranse-tagged set", function() {
	var w = h.wiki();
	assert.deepEqual(w.filter("[function[nhn-deliveries]sort[title]]"),
		w.filter("[[Leveranse]tagging[]sort[title]]"));
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
