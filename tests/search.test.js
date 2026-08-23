/*
Normalised search (design decision D2) — typing `o` should find `ø`.

The trap D2 warns about is that the obvious implementation half-works. NFD
decomposes a letter into a base plus a combining mark only where Unicode defines
that decomposition: it does for å, é and ü, and does not for ø, æ, ß, ð or þ,
which are atomic code points. So "strip the combining marks" folds some of
Norwegian's letters and silently misses the two that matter most here.
*/

"use strict";

var h = require("./harness.js"),
	assert = h.assert,
	MAP = "$:/config/forms/fold-map",
	TAB = "$:/plugins/intertwingled-innovations/nhn/ui/SearchResults/Normalisert";

function folded(wiki, s) {
	return wiki.filter("[<s>fold[]]", {s: s})[0];
}

h.suite("Folding");

h.test("letters that decompose are folded by normalisation", function() {
	var w = h.wiki();
	assert.equal(folded(w, "Måledata"), "maledata");
	assert.equal(folded(w, "café"), "cafe");
	assert.equal(folded(w, "Übung"), "ubung");
});

/*
The heart of D2. These four have no canonical decomposition, so NFD alone leaves
them untouched and the fold map has to carry them.
*/
h.test("letters that do not decompose are folded by the map", function() {
	var w = h.wiki();
	assert.equal(folded(w, "Støtte"), "stotte");
	assert.equal(folded(w, "Læring"), "laring");
	assert.equal(folded(w, "Straße"), "strasse");
	assert.equal(folded(w, "Þing"), "thing");
	// and prove NFD alone would not have done it
	assert.equal("Støtte".normalize("NFD").toLowerCase(), "støtte",
		"ø now decomposes, so the map may no longer be needed for it");
});

h.test("case is folded in the same pass", function() {
	var w = h.wiki();
	assert.equal(folded(w, "ÅRSRAPPORT"), folded(w, "årsrapport"));
	assert.equal(folded(w, "Ø"), folded(w, "ø"));
});

/*
Symmetry is the property that actually makes search work: whatever the mapping
is, the stored text and the query must go through the identical function.
*/
h.test("a query and the text it should match fold to the same thing", function() {
	var w = h.wiki();
	[["Støtte", "stotte"], ["Måledata", "maledata"], ["Læring", "laring"],
	 ["Reseptformidleren", "RESEPTFORMIDLEREN"]].forEach(function(pair) {
		assert.equal(folded(w, pair[0]), folded(w, pair[1]),
			JSON.stringify(pair[0]) + " and " + JSON.stringify(pair[1]) + " fold differently");
	});
});

h.test("the fold map is configuration, not code", function() {
	var w = h.fixtureWiki(),
		before = w.$tw.wiki.getTiddlerText(MAP);
	try {
		w.addTiddler({title: MAP, type: "application/json", text: JSON.stringify({"ø": "oe"})});
		assert.equal(folded(w, "Støtte"), "stoette", "the map is not being read at run time");
	} finally {
		w.addTiddler({title: MAP, type: "application/json", text: before});
	}
	assert.equal(folded(w, "Støtte"), "stotte", "the map did not go back");
});

h.suite("Normalised search");

h.test("an ASCII query finds the accented text", function() {
	var w = h.wiki(),
		hits = w.filter("[all[tiddlers]!is[system]forms-search:title[stotte]]");
	assert.ok(hits.length > 0, "no hits for the folded query");
	assert.ok(hits.some(function(t) { return t.indexOf("Støtte") !== -1; }),
		"nothing containing Ø/ø came back");
	// which is exactly what the core operator cannot do
	assert.deepEqual(w.filter("[all[tiddlers]!is[system]search:title[stotte]]"), []);
});

/*
Folding may only ever widen a search. If some query returned fewer results than
the core operator, normalisation would be losing matches rather than adding them.
*/
h.test("folded search never loses a match core search would find", function() {
	var w = h.wiki();
	["hovedtrekk", "Kjernejournal", "Leveranse", "2026", "e-resept"].forEach(function(query) {
		var core = w.filter("[all[tiddlers]search:title<q>]", {q: query}),
			fold = w.filter("[all[tiddlers]forms-search:title<q>]", {q: query});
		core.forEach(function(t) {
			assert.ok(fold.indexOf(t) !== -1,
				"\"" + query + "\" found " + t + " with core search but not with folding");
		});
	});
});

h.test("every word of the query must appear", function() {
	var w = h.wiki(),
		both = w.filter("[all[tiddlers]forms-search:title[stotte kommuner]]"),
		one = w.filter("[all[tiddlers]forms-search:title[stotte]]");
	assert.ok(both.length > 0 && both.length < one.length,
		"the second word did not narrow the search");
	both.forEach(function(t) {
		assert.ok(/støtte/i.test(t) && /kommuner/i.test(t), t + " matches only one of the words");
	});
});

h.test("an empty query filters nothing", function() {
	var w = h.wiki();
	assert.equal(w.filter("[all[tiddlers]!is[system]forms-search:title[]count[]]")[0],
		w.filter("[all[tiddlers]!is[system]count[]]")[0]);
});

/*
The complement invariant must hold for the empty query too. An empty query
matches everything, so its inverse matches nothing; a UI filter using
`!forms-search` with a not-yet-typed query must show nothing, not the whole wiki.
*/
h.test("an inverted empty query matches nothing", function() {
	var w = h.wiki(),
		all = w.filter("[all[tiddlers]!is[system]count[]]")[0] | 0,
		hits = w.filter("[all[tiddlers]!is[system]forms-search:title[]count[]]")[0] | 0,
		inverted = w.filter("[all[tiddlers]!is[system]!forms-search:title[]count[]]")[0] | 0;
	assert.equal(inverted, 0);
	assert.equal(hits + inverted, all);
});

h.test("the operator can be inverted and can search other fields", function() {
	var w = h.wiki(),
		all = w.filter("[all[tiddlers]!is[system]count[]]")[0] | 0,
		hits = w.filter("[all[tiddlers]!is[system]forms-search:title[stotte]count[]]")[0] | 0,
		inverted = w.filter("[all[tiddlers]!is[system]!forms-search:title[stotte]count[]]")[0] | 0;
	assert.equal(hits + inverted, all);
	// searching the text as well can only find at least as much as the title alone
	var wide = w.filter("[all[tiddlers]!is[system]forms-search:title,text[stotte]count[]]")[0] | 0;
	assert.ok(wide >= hits, "adding the text field found fewer tiddlers");
});

h.suite("Search integration");

h.test("the normalised tab is offered and is the default", function() {
	var w = h.wiki();
	assert.ok(w.exists(TAB), "the search results tab is missing");
	assert.ok(w.filter("[all[shadows+tiddlers]tag[$:/tags/SearchResults]]").indexOf(TAB) !== -1,
		"the tab is not tagged into the search results");
	assert.equal(w.$tw.wiki.getTiddlerText("$:/config/SearchResults/Default"), TAB,
		"folded search is not the default, so users would have to go looking for it");
});

h.test("the tab's filters use the folding operator and resolve", function() {
	var w = h.wiki(),
		tiddler = w.$tw.wiki.getTiddler(TAB);
	["first-search-filter", "second-search-filter"].forEach(function(field) {
		var filter = tiddler.fields[field];
		assert.ok(filter, TAB + " has no " + field);
		assert.ok(filter.indexOf("forms-search") !== -1,
			field + " does not use the folding operator: " + filter);
		var hits = w.filter(filter, {userInput: "stotte"});
		assert.ok(hits.length > 0, field + " returned nothing for a query that should match");
	});
});

/*
The symmetry that matters in practice: someone may type the accented form or the
plain one, and both must return the same set. Folding only the stored text passes
every ASCII-query test and still fails this one.
*/
h.test("an accented query and its plain form return the same results", function() {
	var w = h.wiki();
	[["Støtte", "stotte"], ["Måledata", "maledata"], ["Læring", "laring"],
	 ["LEVERANDØRER", "leverandorer"]].forEach(function(pair) {
		var accented = w.filter("[all[tiddlers]forms-search:title<q>sort[title]]", {q: pair[0]}),
			plain = w.filter("[all[tiddlers]forms-search:title<q>sort[title]]", {q: pair[1]});
		assert.deepEqual(accented, plain,
			"searching \"" + pair[0] + "\" and \"" + pair[1] + "\" gave different results");
	});
	// and at least one of those really does match something, or the test proves nothing
	assert.ok(w.filter("[all[tiddlers]forms-search:title[Støtte]]").length > 0,
		"no tiddler matches the accented query, so symmetry is untested");
});
