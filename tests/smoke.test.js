/*
A cheap, permanent backstop: every page the sidebar links to, and every kind
Ny can create, must render without TiddlyWiki falling back to its error
widget or a filter-syntax error. This catches the "renamed a function, forgot
a page still calls it" class of regression immediately (a widget/parser
failure is loud), which is the complement of the silent-filter-failure class
that unit tests exist to catch (a wrong-but-valid filter is quiet).

It proves nothing about correctness — only that nothing is structurally
broken. See docs/architecture.md for the gotchas that make that distinction
necessary.
*/

"use strict";

var h = require("./harness.js"),
	assert = h.assert,
	NHN = "$:/plugins/intertwingled-innovations/nhn";

var PAGES = [
	"Ny", "Eksport", "Arkiv", "Tjenesteeiere", "ToDo forretningsgjennomgang",
	"ToDo målsettinger", "Sammendrag", "Anomalier"
];

// Signals TiddlyWiki itself uses for "this could not be rendered": the error
// widget's class (most parse-time failures), the filter compiler's own error
// text (malformed filter syntax), and — separately, because it renders as a
// plain <p> with no distinguishing class — an unrecognised widget type, e.g.
// a typo'd `<$actionsetfield>` for `<$action-setfield>`.
function structuralErrors(html) {
	var found = [];
	if(/class="tc-error"/.test(html)) {
		var messages = html.match(/class="tc-error">([^<]*)</g) || [];
		found = found.concat(messages);
	}
	if(/Filter error:/.test(html)) {
		found.push("contains \"Filter error:\"");
	}
	var undefinedWidgets = html.match(/Undefined widget '[^']*'/g);
	if(undefinedWidgets) {
		found = found.concat(undefinedWidgets);
	}
	return found;
}

h.suite("Page smoke test");

PAGES.forEach(function(page) {
	h.test(page + " renders without a structural error", function() {
		var w = h.wiki(),
			html;
		try {
			html = w.render("{{" + page + "}}");
		} catch(e) {
			assert.ok(false, page + " threw while rendering: " + e.message);
			return;
		}
		assert.ok(html.length > 0, page + " rendered no content at all");
		var errors = structuralErrors(html);
		assert.deepEqual(errors, [], page + " has structural errors: " + errors.join(", "));
	});
});

h.test("every kind-forms entry renders through Ny without a structural error", function() {
	var w = h.wiki(),
		map = w.data(NHN + "/kind-forms");
	Object.keys(map).forEach(function(kind) {
		w.$tw.wiki.setText("$:/state/nhn/ny/form", "text", null, map[kind]);
		var html = w.render("{{Ny}}");
		assert.ok(html.indexOf("forms-form") !== -1, "Ny/" + kind + " (" + map[kind] + ") did not render a form");
		var errors = structuralErrors(html);
		assert.deepEqual(errors, [], "Ny/" + kind + " has structural errors: " + errors.join(", "));
	});
});

/*
Every $:/tags/ViewTemplate entry gets spliced into every tiddler's page view
(doc-field.tid is one), so a broken one would not show up in the page list
above — it would only appear when some tiddler happened to be opened directly.
Render a cross-section of real content through the actual ViewTemplate chain,
the way the story river does, rather than the {{transclusion}} shortcut the
page list above uses (which does not invoke ViewTemplate splices at all).
*/
h.test("a sample of tiddlers render through the real ViewTemplate without a structural error", function() {
	var w = h.wiki(),
		sample = w.filter("[function[nhn-services]limit[3]] [function[nhn-reviews]limit[3]] " +
			"[[$:/config/forms/fold-map]] [[$:/config/forms/labels]] [[" + NHN + "/kind-forms]]");
	assert.ok(sample.length > 0, "the sample is empty, so this test proves nothing");
	sample.forEach(function(title) {
		var html = w.render('<$tiddler tiddler=<<t>>><$transclude tiddler="$:/core/ui/ViewTemplate"/></$tiddler>',
			{t: title});
		var errors = structuralErrors(html);
		assert.deepEqual(errors, [], title + " has structural errors when opened: " + errors.join(", "));
	});
});

/* Tags must be shown as the core tag pill (with its dropdown), never as a bare
   link. The engine's forms-tag-or-link decides by whether anything is tagged
   with the title; every page that lists tag-like titles goes through it. */
h.suite("Tag pill rendering");

h.test("forms-tag-or-link renders a pill for a tag and a link otherwise", function() {
	var w = h.wiki();
	w.addTiddler({title: "Parent"});
	w.addTiddler({title: "Child", tags: "Parent"});
	w.addTiddler({title: "Loner"});
	var pill = w.render('<$transclude $variable="forms-tag-or-link" title="Parent"/>'),
		link = w.render('<$transclude $variable="forms-tag-or-link" title="Loner"/>');
	assert.ok(/tc-tag-list-item/.test(pill) && /data-tag-title="Parent"/.test(pill),
		"a title used as a tag should render as the core tag pill: " + pill);
	assert.ok(!/tc-tag-list-item/.test(link) && /tc-tiddlylink/.test(link),
		"a title nothing is tagged with should render as a plain link: " + link);
});

h.suite("Anomaly page");

/*
The detectors behind Anomalier are unit-tested in selectors.test.js; this is
about the page actually showing what they find. Both halves have already been
wrong in ways no filter test could see: `\whitespace trim` collapses a wikitext
table built inside a `$list` into a single row, so ten variants rendered as one
line of run-together cells while every underlying filter was correct.
*/
h.test("Anomalier lists what its detectors find", function() {
	var w = h.wiki(),
		html = w.render("{{Anomalier}}"),
		drift = w.filter("[function[nhn-tag-casing-drift]]"),
		drafts = w.filter("[function[nhn-drafts]]");
	assert.ok(drift.length > 0 && drafts.length > 0,
		"the snapshot has no casing drift or no drafts, so this proves nothing");
	// One row per variant, plus the header — not one row holding all of them
	var rows = (html.match(/<tr/g) || []).length;
	assert.ok(rows >= drift.length + 1,
		"the casing table rendered " + rows + " rows for " + drift.length +
		" drifting variants — the rows have collapsed into each other");
	drift.forEach(function(variant) {
		assert.ok(html.indexOf(variant) !== -1, "the casing table omits " + variant);
	});
	drafts.forEach(function(draft) {
		assert.ok(html.indexOf($tw$escape(draft)) !== -1, "the drafts section omits " + draft);
	});
});

/* Titles reach the HTML with the usual entities substituted. */
function $tw$escape(title) {
	return title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

h.suite("Tag pill rendering");

h.test("navigation trees, summaries and ToDo lists show tags as pills", function() {
	var w = h.fixtureWiki();
	[
		'<$transclude $tiddler="$:/plugins/intertwingled-innovations/nhn/ui/nav/governance"/>',
		'<$transclude $tiddler="$:/plugins/intertwingled-innovations/nhn/ui/nav/services"/>',
		"{{Sammendrag}}",
		"{{ToDo forretningsgjennomgang}}",
		"{{ToDo målsettinger}}",
		"{{Tjenesteeiere}}",
		"{{Anomalier}}"
	].forEach(function(src) {
		var html = w.render(src);
		assert.ok(/tc-tag-list-item/.test(html), src + " renders no tag pills");
	});
});
