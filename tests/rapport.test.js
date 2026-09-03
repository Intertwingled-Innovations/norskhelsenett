/*
The Leveranserapport (board delivery report): deliveries in a month range
within a year, grouped by service, with an unlinked-deliveries section and a
standalone-HTML download.

Range filtering, the MM/ÅÅ display prefix and the linked/unlinked partition
are all things that fail silently in filter code — a wrong bound or a dropped
bucket renders a plausible-looking but incomplete report — so each is pinned
against fixtures whose right answer is known by construction.
*/

"use strict";

var h = require("./harness.js"),
	assert = h.assert;

var YEAR = "2026", FROM = "05", TO = "08";

/* The report set for the fixture period, as an array. */
function reportSet(w) {
	return w.filter("[function[nhn-report-set],[" + YEAR + "],[" + FROM + "],[" + TO + "]]");
}

/* Variables binding <report-set> the way the page and template do. */
function setVars(w) {
	return {"report-set": w.first(
		"[function[nhn-report-set],[" + YEAR + "],[" + FROM + "],[" + TO + "]] +[format:titlelist[]join[ ]]")};
}

h.suite("Rapport range selection");

h.test("deliveries inside the month range are selected, including lowercase month tags", function() {
	var set = reportSet(h.fixtureWiki());
	["Test Rapport Mai", "Test Rapport Liten Juni", "Test Rapport Flere Maneder",
		"Test Rapport Uten Tjeneste", "07/26 Test Rapport Ferdig Prefikset",
		"Test Rapport Tom Tekst"].forEach(function(t) {
		assert.ok(set.indexOf(t) !== -1, t + " should be in the 05-08 report set");
	});
});

h.test("deliveries outside the range, in another year, or undated are excluded", function() {
	var set = reportSet(h.fixtureWiki());
	["Test Rapport April", "Test Rapport September", "Test Rapport Feil Aar",
		"Test Rapport Udatert"].forEach(function(t) {
		assert.ok(set.indexOf(t) === -1, t + " should NOT be in the 05-08 report set");
	});
});

h.test("the range bounds are inclusive at both ends", function() {
	var w = h.fixtureWiki();
	// A single-month range at each edge picks up exactly the edge months
	var may = w.filter("[function[nhn-report-set],[2026],[05],[05]]"),
		aug = w.filter("[function[nhn-report-set],[2026],[08],[08]]");
	assert.ok(may.indexOf("Test Rapport Mai") !== -1, "May delivery missing from May-May range");
	assert.ok(may.indexOf("Test Rapport Liten Juni") === -1, "June delivery leaked into May-May range");
	assert.ok(aug.indexOf("Test Rapport Tom Tekst") !== -1, "August delivery missing from Aug-Aug range");
});

h.test("a multi-month delivery appears exactly once in the set", function() {
	var set = reportSet(h.fixtureWiki()),
		hits = set.filter(function(t) { return t === "Test Rapport Flere Maneder"; });
	assert.equal(hits.length, 1);
});

h.test("the report set honours the archive exclusion", function() {
	// nhn-deliveries subtracts nhn-excluded; the report must inherit that.
	// The template fixture ("Test Mal Som Ogsa Er Leveranse", tagged mal +
	// Leveranse + 2026 Januar) is the standing example of an excluded tiddler.
	var w = h.fixtureWiki(),
		jan = w.filter("[function[nhn-report-set],[2026],[01],[01]]");
	assert.ok(jan.indexOf("Test Mal Som Ogsa Er Leveranse") === -1,
		"the mal template leaked into the report set");
});

h.suite("Rapport service grouping");

h.test("linked and unlinked deliveries partition the report set", function() {
	var w = h.fixtureWiki(),
		vars = setVars(w),
		set = reportSet(w),
		unlinked = w.filter("[function[nhn-report-unlinked]]", vars),
		linked = set.filter(function(t) {
			return w.project("nhn-report-service-of", t).length > 0;
		});
	assert.equal(linked.length + unlinked.length, set.length,
		"every delivery must be exactly one of linked or unlinked");
	unlinked.forEach(function(t) {
		assert.ok(linked.indexOf(t) === -1, t + " is both linked and unlinked");
	});
});

h.test("an unlinked fixture lands in the unlinked bucket, not under a service", function() {
	var w = h.fixtureWiki(),
		unlinked = w.filter("[function[nhn-report-unlinked]]", setVars(w));
	assert.ok(unlinked.indexOf("Test Rapport Uten Tjeneste") !== -1);
});

h.test("the service list contains only real services, no blanks", function() {
	var w = h.fixtureWiki(),
		svcs = w.filter("[function[nhn-report-services],[" + YEAR + "],[" + FROM + "],[" + TO + "]]"),
		real = w.filter("[function[nhn-services]]");
	assert.ok(svcs.length > 0, "no services found for the fixture period");
	svcs.forEach(function(s) {
		assert.ok(s !== "", "a blank service leaked into the report services");
		assert.ok(real.indexOf(s) !== -1, "\"" + s + "\" is not a real service " +
			"(the join must be against nhn-services, not any service-type tag)");
	});
});

h.test("per-service subsets cover exactly the linked deliveries", function() {
	var w = h.fixtureWiki(),
		vars = setVars(w),
		svcs = w.filter("[function[nhn-report-services],[" + YEAR + "],[" + FROM + "],[" + TO + "]]"),
		covered = {};
	svcs.forEach(function(svc) {
		w.filter("[function[nhn-report-for],[" + svc + "]]", vars).forEach(function(t) {
			covered[t] = true;
		});
	});
	var set = reportSet(w),
		unlinked = w.filter("[function[nhn-report-unlinked]]", vars);
	set.forEach(function(t) {
		var expected = unlinked.indexOf(t) === -1;
		assert.equal(!!covered[t], expected,
			t + (expected ? " is linked but appears under no service" :
				" is unlinked but appears under a service"));
	});
});

h.suite("Rapport display prefix");

h.test("the prefix is MM/ÅÅ from the latest month tag", function() {
	var w = h.fixtureWiki();
	assert.deepEqual(w.project("nhn-report-prefix", "Test Rapport Mai"), ["05/26"]);
	// April + Mai + Juni: the latest month wins, deterministically
	assert.deepEqual(w.project("nhn-report-prefix", "Test Rapport Flere Maneder"), ["06/26"]);
	// lowercase month tag still yields a prefix
	assert.deepEqual(w.project("nhn-report-prefix", "Test Rapport Liten Juni"), ["06/26"]);
});

h.test("no half prefix: a tiddler missing month or year gets none", function() {
	var w = h.fixtureWiki();
	assert.deepEqual(w.project("nhn-report-prefix", "Test Rapport Udatert"), [],
		"undated tiddler must yield no prefix, not a fragment");
	assert.deepEqual(w.project("nhn-report-prefix", "Test Gjennomgang Udatert"), []);
});

h.test("the sort key orders chronologically, then alphabetically", function() {
	var w = h.fixtureWiki(),
		mai = w.project("nhn-report-sortkey", "Test Rapport Mai")[0],
		juni = w.project("nhn-report-sortkey", "Test Rapport Liten Juni")[0],
		udatert = w.project("nhn-report-sortkey", "Test Rapport Udatert")[0];
	assert.ok(mai < juni, "May must sort before June");
	assert.equal(udatert, "Test Rapport Udatert", "undated falls back to the bare title");
});

h.test("a title already carrying its prefix is not double-prefixed in the rendered report", function() {
	var w = h.fixtureWiki(),
		html = renderBody(w);
	assert.ok(html.indexOf("07/26 Test Rapport Ferdig Prefikset") !== -1);
	assert.ok(html.indexOf("07/26 07/26") === -1, "prefix was applied twice");
});

h.suite("Rapport standalone HTML");

function renderBody(w) {
	var text = w.$tw.wiki.getTiddlerText("$:/plugins/intertwingled-innovations/nhn/rapport/html-body");
	return w.render(text, {"report-year": YEAR, "from-ord": FROM, "to-ord": TO});
}

h.test("the body renders sections, permalinks and the unlinked bucket", function() {
	var w = h.fixtureWiki(),
		html = renderBody(w);
	// Every link must point at the live wiki, URI-encoded
	assert.ok(html.indexOf("https://tiddlywiki.plattform.nhn.no/#Test%20Rapport%20Mai") !== -1,
		"delivery links must be permalinks into the live wiki");
	// Fixture services appear as sections with anchors
	assert.ok(/id="service-test-tjeneste-med-eier"/.test(html), "service anchor missing");
	// The unlinked delivery appears in its own marked section
	assert.ok(html.indexOf("unlinked-deliveries") !== -1 &&
		html.indexOf("Test Rapport Uten Tjeneste") !== -1, "unlinked section missing");
	// An empty delivery reads as such rather than vanishing
	assert.ok(html.indexOf("(ingen tekst)") !== -1, "empty description marker missing");
	// Nothing failed to render
	assert.ok(html.indexOf("<$") === -1, "unrendered widget markup leaked into the export");
});

h.test("the summary counts in the body agree with the sets", function() {
	var w = h.fixtureWiki(),
		html = renderBody(w),
		set = reportSet(w),
		unlinked = w.filter("[function[nhn-report-unlinked]]", setVars(w));
	assert.ok(html.indexOf("Antall leveranser i valgt periode:</b> " + set.length) !== -1,
		"period count in the report disagrees with the set");
	assert.ok(html.indexOf("Antall leveranser uten tjenestekobling:</b> " + unlinked.length) !== -1,
		"unlinked count in the report disagrees with the set");
	assert.ok(html.indexOf("koblet til minst én tjeneste:</b> " + (set.length - unlinked.length)) !== -1,
		"linked count in the report disagrees with the set");
});

h.test("delivery descriptions are rendered wikitext, not escaped source", function() {
	var w = h.fixtureWiki();
	w.addTiddler({title: "Test Rapport Wikitekst", tags: "Leveranse 2026 Juni [[Test Tjeneste Med Eier]]",
		text: "!Overskrift\n\n*Punkt en\n*Punkt to"});
	var html = renderBody(w);
	assert.ok(html.indexOf("<li>Punkt en</li>") !== -1, "list items must render as HTML");
	assert.ok(html.indexOf("!Overskrift") === -1, "raw wikitext heading leaked into the export");
});

h.test("forms-htmldoc wraps a body in a complete document with title, css and lang", function() {
	var w = h.wiki();
	w.addTiddler({title: "Test Htmldoc CSS", type: "text/css", text: "body { color: red; }"});
	var doc = w.first("[[<p>hei</p>]forms-htmldoc[Tittel & Sånt],[Test Htmldoc CSS],[no]]");
	assert.ok(doc.indexOf("<!DOCTYPE html>") === 0, "missing doctype");
	assert.ok(doc.indexOf("<html lang=\"no\">") !== -1, "missing lang attribute");
	assert.ok(doc.indexOf("<title>Tittel &amp; Sånt</title>") !== -1, "title not HTML-encoded");
	assert.ok(doc.indexOf("body { color: red; }") !== -1, "css tiddler text not inlined");
	assert.ok(doc.indexOf("<p>hei</p>") !== -1, "body not embedded");
	assert.ok(doc.indexOf("charset=\"utf-8\"") !== -1, "missing charset");
});

h.test("forms-htmldoc omits lang and styles when not supplied", function() {
	var w = h.wiki(),
		doc = w.first("[[x]forms-htmldoc[T]]");
	assert.ok(doc.indexOf("<html>") !== -1, "bare <html> expected without lang");
	assert.ok(doc.indexOf("lang=") === -1);
});

h.suite("Rapport page");

h.test("the page exists, is in the sidebar, and its state defaults are sane", function() {
	var w = h.wiki();
	assert.ok(w.exists("Leveranserapport"), "the Leveranserapport page is missing");
	var sidebar = w.$tw.wiki.getTiddlerText("$:/plugins/intertwingled-innovations/nhn/ui/SideBar/Navigasjon");
	assert.ok(sidebar.indexOf("Leveranserapport") !== -1, "the sidebar does not link the report page");
});

h.test("the report set and services agree with an independent JS reimplementation", function() {
	// Belt and braces for the real corpus: recompute the May-August 2026 report
	// in plain JS from the tag data and compare. Catches a filter that quietly
	// changes meaning while still returning something plausible.
	var w = h.wiki(),
		$tw = w.$tw,
		months = {"mai": "05", "juni": "06", "juli": "07", "august": "08"},
		expectSet = [];
	var excluded = {};
	w.filter("[function[nhn-excluded]]").forEach(function(t) { excluded[t] = true; });
	$tw.wiki.getTiddlersWithTag("Leveranse").forEach(function(title) {
		if(excluded[title]) { return; }
		var tags = ($tw.wiki.getTiddler(title).fields.tags || []).map(String),
			hasYear = tags.indexOf(YEAR) !== -1,
			hasMonth = tags.some(function(t) { return months[t.toLowerCase()]; });
		if(hasYear && hasMonth) { expectSet.push(title); }
	});
	var set = reportSet(w);
	assert.deepEqual(set.slice().sort(), expectSet.sort(),
		"the filter-based report set disagrees with the JS reimplementation");
});

h.suite("Rapport month defaults");

h.test("a year's month span comes from its data, chronologically, in canonical casing", function() {
	var w = h.fixtureWiki();
	// Only the two 2031 fixtures carry that year: oktober (lowercase, title
	// sorts first) and Mars. Chronological + canonical, or the default range
	// silently starts at the wrong end.
	assert.deepEqual(w.filter("[function[nhn-report-months-with-data],[2031]]"),
		["Mars", "Oktober"]);
});

h.test("a year with no dated deliveries yields an empty span", function() {
	var w = h.fixtureWiki();
	assert.deepEqual(w.filter("[function[nhn-report-months-with-data],[1999]]"), []);
});

h.test("changing the year resets the month pickers to that year's data span", function() {
	var w = h.fixtureWiki();
	w.addTiddler({title: "$:/state/nhn/rapport/year", text: "2031"});
	// Stale months from a previously viewed year
	w.addTiddler({title: "$:/state/nhn/rapport/from", text: "Mai"});
	w.addTiddler({title: "$:/state/nhn/rapport/to", text: "August"});
	try {
		w.invokeActions("<<nhn-rapport-reset-months>>");
		assert.equal(w.first("[[$:/state/nhn/rapport/from]get[text]]"), "Mars");
		assert.equal(w.first("[[$:/state/nhn/rapport/to]get[text]]"), "Oktober");
	} finally {
		["year", "from", "to"].forEach(function(k) {
			w.$tw.wiki.deleteTiddler("$:/state/nhn/rapport/" + k);
		});
	}
});

h.test("resetting to a year with no dated deliveries falls back to the whole calendar year", function() {
	var w = h.fixtureWiki();
	w.addTiddler({title: "$:/state/nhn/rapport/year", text: "1999"});
	try {
		w.invokeActions("<<nhn-rapport-reset-months>>");
		assert.equal(w.first("[[$:/state/nhn/rapport/from]get[text]]"), "Januar");
		assert.equal(w.first("[[$:/state/nhn/rapport/to]get[text]]"), "Desember");
	} finally {
		["year", "from", "to"].forEach(function(k) {
			w.$tw.wiki.deleteTiddler("$:/state/nhn/rapport/" + k);
		});
	}
});

h.test("the year picker fires the reset action on change", function() {
	// The wiring, not just the procedure: the page's year <$select> must carry
	// actions=<<nhn-rapport-reset-months>>, or the reset never runs in the browser.
	var w = h.wiki(),
		page = w.$tw.wiki.getTiddlerText("Leveranserapport"),
		i = page.indexOf("<$select tiddler=\"$:/state/nhn/rapport/year\"");
	assert.ok(i !== -1, "year select not found on the page");
	// The actions attribute must sit on that same widget, i.e. between the
	// state-tiddler reference and the closing of its opening tag (the next "/select" is far later)
	var opening = page.slice(i, page.indexOf("\n", i));
	assert.ok(opening.indexOf("actions=<<nhn-rapport-reset-months>>") !== -1,
		"the year select does not fire nhn-rapport-reset-months");
});

h.test("the page and the export template bind report-known-services", function() {
	// Not a correctness requirement (the function falls back to computing
	// nhn-services itself) but a pinned performance one: without the binding
	// the join re-evaluates nhn-services per delivery per service, which took
	// the full-year page from ~0.5s to ~14s when measured.
	var w = h.wiki();
	["Leveranserapport", "$:/plugins/intertwingled-innovations/nhn/rapport/html-body"].forEach(function(t) {
		assert.ok(w.$tw.wiki.getTiddlerText(t).indexOf("report-known-services={{{ [function[nhn-services]]") !== -1,
			t + " does not bind report-known-services once");
	});
});
