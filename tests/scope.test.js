/*
Periodisation and archiving (brief §3.7).

Two mechanisms that are easy to confuse and must not be: archiving hides content
everywhere until it is untagged, while the period scope narrows the navigation
trees only. Both are ways of losing sight of data, so most of what follows checks
that nothing disappears that should not.
*/

"use strict";

var h = require("./harness.js"),
	assert = h.assert,
	SELECTORS = ["nhn-reviews", "nhn-deliveries", "nhn-objectives", "nhn-results", "nhn-services"];

function counts(wiki) {
	var out = {};
	SELECTORS.forEach(function(fn) { out[fn] = wiki.filter("[function[" + fn + "]count[]]")[0] | 0; });
	return out;
}

/* Run with a period scope in force, then put it back. */
function withScope(wiki, year, fn) {
	var before = wiki.$tw.wiki.getTiddlerText("$:/config/nhn/active-year");
	wiki.$tw.wiki.setText("$:/config/nhn/active-year", "text", null, year);
	try { return fn(); } finally {
		wiki.$tw.wiki.setText("$:/config/nhn/active-year", "text", null, before === undefined ? "alle" : before);
	}
}

function archiveUpTo(wiki, year) {
	wiki.$tw.wiki.setText("$:/state/nhn/arkiv/year", "text", null, year);
	wiki.invokeActions('<$list filter="[function[nhn-archivable]]">' +
		'<$action-listops $tiddler=<<currentTiddler>> $tags=<<nhn-archive-tag>>/></$list>');
}

function restoreAll(wiki) {
	wiki.invokeActions('<$list filter="[function[nhn-archived]]">' +
		'<$action-listops $tiddler=<<currentTiddler>> $tags="-[<nhn-archive-tag>]"/></$list>');
}

h.suite("Archiving");

h.test("nothing is archived in the shipped wiki", function() {
	var w = h.wiki();
	assert.deepEqual(w.filter("[function[nhn-archived]]"), [],
		"the snapshot arrives with archived content, which would hide it from every view");
});

h.test("archiving hides content from every selector, and restoring brings it all back", function() {
	var w = h.fixtureWiki(),
		before = counts(w);
	archiveUpTo(w, "2024");
	try {
		var during = counts(w);
		["nhn-reviews", "nhn-deliveries", "nhn-objectives", "nhn-results"].forEach(function(fn) {
			assert.ok(during[fn] < before[fn], fn + " was unaffected by archiving");
		});
		// Services are structural: they belong to no one year
		assert.equal(during["nhn-services"], before["nhn-services"],
			"archiving removed services, which would break the governance tree");
	} finally {
		restoreAll(w);
	}
	assert.deepEqual(counts(w), before, "restoring did not return the wiki to where it started");
});

h.test("archiving keeps the tags a tiddler already had", function() {
	var w = h.fixtureWiki(),
		sample = w.filter("[function[nhn-reviews]] :filter[<currentTiddler>tag[2024]] +[first[]]")[0];
	assert.ok(sample, "no 2024 review to archive");
	var before = w.filter("[<t>tags[]sort[]]", {t: sample});
	archiveUpTo(w, "2024");
	try {
		var after = w.filter("[<t>tags[]sort[]]", {t: sample});
		assert.ok(after.indexOf("Arkiv") !== -1, sample + " was not archived");
		before.forEach(function(tag) {
			assert.ok(after.indexOf(tag) !== -1, "archiving dropped the tag \"" + tag + "\"");
		});
	} finally {
		restoreAll(w);
	}
});

/*
An objective tagged both 2024 and 2026 is still current. Archiving "up to 2024"
must leave it alone, or tidying turns into losing things.
*/
h.test("a tiddler also tagged a later year is never archived", function() {
	var w = h.wiki();
	w.$tw.wiki.setText("$:/state/nhn/arkiv/year", "text", null, "2024");
	var archivable = w.filter("[function[nhn-archivable]]");
	assert.ok(archivable.length > 0, "nothing is archivable up to 2024");
	archivable.forEach(function(t) {
		var years = w.project("nhn-year-raw", t).map(Number);
		years.forEach(function(y) {
			assert.ok(y <= 2024, t + " is tagged " + y + " but was offered for archiving up to 2024");
		});
	});
	// and something really is being spared
	var spared = w.filter("[function[nhn-objectives]] :filter[<currentTiddler>tag[2024]] -[function[nhn-archivable]]");
	assert.ok(spared.length > 0, "expected some 2024 content to be spared for carrying a later year");
});

h.test("only period-bearing kinds are archivable", function() {
	var w = h.wiki();
	w.$tw.wiki.setText("$:/state/nhn/arkiv/year", "text", null, "2026");
	var services = {};
	w.filter("[function[nhn-services]]").forEach(function(s) { services[s] = true; });
	w.filter("[function[nhn-archivable]]").forEach(function(t) {
		assert.ok(!services[t], "the service \"" + t + "\" was offered for archiving");
		assert.ok(w.filter("[<t>!tag[mal]]", {t: t}).length === 1, "a template was offered for archiving");
	});
});

h.test("archiving twice changes nothing the second time", function() {
	var w = h.fixtureWiki();
	archiveUpTo(w, "2024");
	try {
		var first = w.filter("[function[nhn-archived]count[]]")[0];
		archiveUpTo(w, "2024");
		assert.equal(w.filter("[function[nhn-archived]count[]]")[0], first);
	} finally {
		restoreAll(w);
	}
});

h.suite("Period scope");

h.test("the default scope hides nothing", function() {
	var w = h.wiki();
	withScope(w, "alle", function() {
		w.filter("[function[nhn-deliveries]]").forEach(function(t) {
			assert.ok(w.project("nhn-in-year-scope", t).length > 0, t + " fell out of the \"alle\" scope");
		});
	});
});

h.test("a year scope narrows the navigation trees", function() {
	var w = h.wiki(),
		all = withScope(w, "alle", function() {
			return w.filter("[function[nhn-deliveries]] :filter[function[nhn-in-year-scope]] +[count[]]")[0] | 0;
		}),
		year = withScope(w, "2026", function() {
			return w.filter("[function[nhn-deliveries]] :filter[function[nhn-in-year-scope]] +[count[]]")[0] | 0;
		});
	assert.ok(year > 0 && year < all, "scoping to 2026 gave " + year + " of " + all);
});

/*
25 deliveries, 15 objectives and 57 results carry no year tag. A scope that hid
them would make them unreachable through navigation, with nothing to show they
existed.
*/
h.test("undated content stays visible under every scope", function() {
	var w = h.wiki();
	["2024", "2026"].forEach(function(y) {
		withScope(w, y, function() {
			var undated = w.filter("[function[nhn-deliveries]] :filter[function[nhn-year-raw]count[]match[0]]");
			assert.ok(undated.length > 0, "no undated deliveries to check");
			undated.forEach(function(t) {
				assert.ok(w.project("nhn-in-year-scope", t).length > 0,
					t + " has no year tag and was hidden by the " + y + " scope");
			});
		});
	});
});

h.test("services are never narrowed by the period scope", function() {
	var w = h.wiki(),
		all = withScope(w, "alle", function() { return w.filter("[function[nhn-services]count[]]")[0]; });
	["2024", "2026"].forEach(function(y) {
		assert.equal(withScope(w, y, function() { return w.filter("[function[nhn-services]count[]]")[0]; }), all,
			"the " + y + " scope removed services from the governance tree");
	});
});

/*
The extracts and the to-do lists have their own period controls. A second,
invisible filter narrowing an export would be a trap.
*/
h.test("the period scope does not reach the extracts", function() {
	var w = h.wiki(),
		unscoped = withScope(w, "alle", function() {
			return w.filter("[function[nhn-extract-governance-set]count[]]",
				{"extract-year": "2024", "extract-month": ""})[0];
		}),
		scoped = withScope(w, "2026", function() {
			return w.filter("[function[nhn-extract-governance-set]count[]]",
				{"extract-year": "2024", "extract-month": ""})[0];
		});
	assert.equal(scoped, unscoped, "a 2024 export changed when the navigation scope moved to 2026");
});

h.test("archived content does leave the extracts", function() {
	var w = h.fixtureWiki(),
		before = w.filter("[function[nhn-extract-governance-set]count[]]",
			{"extract-year": "2024", "extract-month": ""})[0] | 0;
	assert.ok(before > 0, "nothing in the 2024 extract to begin with");
	archiveUpTo(w, "2024");
	try {
		assert.equal(w.filter("[function[nhn-extract-governance-set]count[]]",
			{"extract-year": "2024", "extract-month": ""})[0] | 0, 0,
			"archived content is still being exported");
	} finally {
		restoreAll(w);
	}
});
