/*
The date model (design decision D1 in docs/architecture.md).

Dates live as two tags — a 4-digit year and a Norwegian month name — and the
group trees depend on deriving a chronological order from them. D1 specified
`fold-year`/`month-ord`/`datekey`; what shipped is the equivalent pair of sort
keys `nhn-year-sortkey` (descending) and `nhn-month-ord` (chronological), which
`forms-group` consumes directly. These tests pin the ordering properties that
`datekey` was meant to guarantee, including the year-only padding case.
*/

"use strict";

var h = require("./harness.js"),
	assert = h.assert,
	MONTHS = ["januar", "februar", "mars", "april", "mai", "juni",
		"juli", "august", "september", "oktober", "november", "desember"];

h.suite("Date model");

h.test("nhn-month-ord maps the twelve months to 01-12", function() {
	var w = h.wiki();
	MONTHS.forEach(function(month, index) {
		var expected = String(index + 1).padStart(2, "0");
		assert.deepEqual(w.project("nhn-month-ord", month), [expected], month);
	});
});

h.test("nhn-month-ord is case-insensitive", function() {
	var w = h.wiki();
	// The data mixes `Mars` and `mars`; both must yield the same ordinal
	assert.deepEqual(w.project("nhn-month-ord", "Mars"), ["03"]);
	assert.deepEqual(w.project("nhn-month-ord", "MARS"), ["03"]);
});

h.test("an unrecognised month sorts last", function() {
	var w = h.wiki();
	assert.deepEqual(w.project("nhn-month-ord", "(Uten måned)"), ["99"]);
	assert.deepEqual(w.project("nhn-month-ord", "Smorgasbord"), ["99"]);
});

h.test("sorting by nhn-month-ord yields chronological order", function() {
	var w = h.wiki(),
		shuffled = ["Desember", "Mars", "Januar", "September", "Februar"],
		sorted = w.filter(w.$tw.utils.stringifyList(shuffled) + " :sort[function[nhn-month-ord]]");
	assert.deepEqual(sorted, ["Januar", "Februar", "Mars", "September", "Desember"]);
});

h.test("sorting by nhn-year-sortkey yields newest first", function() {
	var w = h.wiki(),
		sorted = w.filter(w.$tw.utils.stringifyList(["2024", "2026", "2023", "2025"]) + " :sort[function[nhn-year-sortkey]]");
	assert.deepEqual(sorted, ["2026", "2025", "2024", "2023"]);
});

/*
Year-only tiddlers (objectives) and undated ones fall into the "(Uten år)" and
"(Uten måned)" buckets. D1 padded these to `YYYY-00` so they sorted to the start
of the year; the shipped sort keys must put them at the *end* of the list
instead, which is what the group trees claim to do.
*/
h.test("the undated buckets sort after every real year and month", function() {
	var w = h.wiki(),
		years = w.filter(w.$tw.utils.stringifyList(["2026", "(Uten år)", "2023"]) + " :sort[function[nhn-year-sortkey]]"),
		months = w.filter(w.$tw.utils.stringifyList(["Desember", "(Uten måned)", "Januar"]) + " :sort[function[nhn-month-ord]]");
	assert.deepEqual(years, ["2026", "2023", "(Uten år)"]);
	assert.deepEqual(months, ["Januar", "Desember", "(Uten måned)"]);
});

h.test("nhn-month normalises casing drift to one group", function() {
	var w = h.fixtureWiki();
	// Two fixtures tagged `mars` and `Mars` must land in the same month group
	assert.deepEqual(w.project("nhn-month", "Test Gjennomgang Liten Mars"), ["Mars"]);
	assert.deepEqual(w.project("nhn-month", "Test Gjennomgang Stor Mars"), ["Mars"]);
});

h.test("a tiddler with no date tags falls into the undated buckets", function() {
	var w = h.fixtureWiki();
	assert.deepEqual(w.project("nhn-year", "Test Gjennomgang Udatert"), ["(Uten år)"]);
	assert.deepEqual(w.project("nhn-month", "Test Gjennomgang Udatert"), ["(Uten måned)"]);
});

h.test("the raw date projections stay blank when undated", function() {
	var w = h.fixtureWiki();
	// The -raw variants feed the group projections above; the "(Uten …)" placeholder
	// belongs to the group key, not to the underlying value
	assert.deepEqual(w.project("nhn-year-raw", "Test Gjennomgang Udatert"), []);
	assert.deepEqual(w.project("nhn-month-raw", "Test Gjennomgang Udatert"), []);
});

/*
The exporter takes only the first result of a projection, so the multi-valued
group projections cannot double as export columns. `nhn-years`/`nhn-months` fold
every value into one cell for the CSV.
*/
h.test("the export date projections list every value in one cell", function() {
	var w = h.wiki();
	// A service tagged three years must not export as though it were only the first
	assert.deepEqual(w.project("nhn-years", "Kjernejournal Pasientens journaldokumenter"),
		["2024, 2025, 2026"]);
	// Months come out chronologically, not alphabetically
	assert.deepEqual(w.project("nhn-months", "Oppgraderinger og rydding Q2 2026"), ["April, Mai"]);
});

h.test("the export date projections deduplicate casing drift", function() {
	var w = h.wiki();
	// This review is tagged both `april` and `April`; one month, listed once
	assert.deepEqual(
		w.project("nhn-months", "04 Støtte og hjelpe Leverandører - hovedtrekk og endringer april 2026"),
		["April"]);
});

h.test("the export date projections stay blank when undated", function() {
	var w = h.fixtureWiki();
	assert.deepEqual(w.project("nhn-years", "Test Gjennomgang Udatert"), []);
	assert.deepEqual(w.project("nhn-months", "Test Gjennomgang Udatert"), []);
});
