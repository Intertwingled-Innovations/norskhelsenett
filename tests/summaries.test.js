/*
The delivery and OKR summaries (brief §3.4) and the data-driven view catalogue
behind them.

The catalogue is the whole feature: adding an ordering means editing JSON, not
code. That only holds up if the names in the JSON resolve, so most of what
follows checks the catalogue against the functions it names — a typo there
produces an empty tree, never an error.
*/

"use strict";

var h = require("./harness.js"),
	assert = h.assert,
	VIEWS = "$:/plugins/intertwingled-innovations/nhn/summary-views";

/* Every ordering in the catalogue, flattened for iteration. */
function orderings(wiki) {
	var flat = [];
	wiki.data(VIEWS).forEach(function(view, vi) {
		view.orderings.forEach(function(ordering, oi) {
			flat.push({view: view, ordering: ordering, where: view.caption + " / " + ordering.caption,
				vi: vi, oi: oi});
		});
	});
	return flat;
}

h.suite("Summary catalogue");

h.test("every view declares a caption, a set and at least one ordering", function() {
	var w = h.wiki(),
		views = w.data(VIEWS);
	assert.ok(views.length > 0, "the catalogue is empty");
	views.forEach(function(view) {
		assert.ok(view.caption, "a view has no caption");
		assert.ok(view.set, view.caption + " has no set filter");
		assert.ok(view.orderings && view.orderings.length > 0, view.caption + " has no orderings");
	});
});

h.test("every function named in the catalogue is defined", function() {
	var w = h.wiki();
	orderings(w).forEach(function(entry) {
		var names = (entry.ordering.groups + " " + entry.ordering.sorts).split(/\s+/);
		names.forEach(function(name) {
			assert.ok(w.isFunction(name),
				entry.where + " names \"" + name + "\", which is not a defined function " +
				"(the tree would render empty rather than failing)");
		});
	});
});

h.test("every ordering pairs one sort key with each group level", function() {
	var w = h.wiki();
	orderings(w).forEach(function(entry) {
		// forms-group walks groups and sorts in step; a short sorts list silently
		// leaves the deepest levels unsorted
		assert.equal(entry.ordering.groups.split(/\s+/).length,
			entry.ordering.sorts.split(/\s+/).length,
			entry.where + " has a different number of group levels and sort keys");
	});
});

h.test("every view's set filter selects something", function() {
	var w = h.wiki();
	w.data(VIEWS).forEach(function(view) {
		assert.ok(w.filter(view.set).length > 0, view.caption + " selects no tiddlers");
	});
});

/*
The most important property in the phase. `forms-group` places a tiddler under
every value its group projection returns — so a projection that returns nothing
drops that tiddler out of the tree entirely, with no error and no gap in the UI
to notice. Every group projection must therefore be total over its own set,
which is what the "(Uten …)" fallback buckets are for.
*/
h.test("no group projection can drop a tiddler out of the tree", function() {
	var w = h.wiki();
	w.data(VIEWS).forEach(function(view) {
		var members = w.filter(view.set),
			used = {};
		view.orderings.forEach(function(ordering) {
			ordering.groups.split(/\s+/).forEach(function(fn) { used[fn] = true; });
		});
		Object.keys(used).forEach(function(fn) {
			var lost = members.filter(function(title) { return w.project(fn, title).length === 0; });
			assert.deepEqual(lost.slice(0, 3), [],
				fn + " returns nothing for " + lost.length + " of the " + members.length +
				" tiddlers in \"" + view.caption + "\", which would silently vanish from the tree");
		});
	});
});

h.suite("Summary projections");

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

h.test("the OKR sets are the tagged sets, less what is not content", function() {
	var w = h.wiki();
	assertTagLessExclusions(w, "nhn-objectives", "Målsetting");
	assertTagLessExclusions(w, "nhn-results", "Resultat");
});

h.test("nhn-service-group falls back when there is no service tag", function() {
	var w = h.fixtureWiki();
	// The fixture template carries no service-name tag
	assert.deepEqual(w.project("nhn-service-group", "Test Mal Som Ogsa Er Leveranse"),
		["(Uten tjeneste)"]);
	assert.deepEqual(w.project("nhn-service-group", "Test Tjeneste Med Eier"),
		["Test Tjeneste Med Eier"], "a service should group under itself");
});

h.test("nhn-objective-of finds the parent objective", function() {
	var w = h.wiki(),
		parented = w.filter("[function[nhn-results]]").filter(function(title) {
			return w.project("nhn-objective-of", title)[0] !== "(Uten målsetting)";
		});
	assert.ok(parented.length > 0, "no result resolved to a parent objective");
	// The join is by tagging the parent's title, so the answer must itself be an objective
	parented.slice(0, 50).forEach(function(title) {
		var parent = w.project("nhn-objective-of", title)[0];
		assert.ok(w.filter("[<currentTiddler>tag[Målsetting]]", {currentTiddler: parent}).length === 1,
			title + " resolved to \"" + parent + "\", which is not tagged Målsetting");
	});
});

h.test("the fallback buckets sort last", function() {
	var w = h.wiki(),
		services = w.filter("[[Åre]] [[(Uten tjeneste)]] [[Alfa]] :sort[function[nhn-service-sortkey]]"),
		objectives = w.filter("[[Åre]] [[(Uten målsetting)]] [[Alfa]] :sort[function[nhn-objective-sortkey]]");
	assert.equal(services[services.length - 1], "(Uten tjeneste)");
	assert.equal(objectives[objectives.length - 1], "(Uten målsetting)");
});

h.suite("Grouped view");

var GV_VIEWS = "$:/temp/test/gv-scoped-views";

/*
The real VIEWS catalogue's sets range over the whole corpus (hundreds of
deliveries/objectives/results), and forms-tree/forms-group cost scales with
leaf count, not with how interesting the assertions are — thirteen renders
against real content cost several seconds for checks that only need a
handful of tiddlers to exercise every real code path. This installs a
scoped copy of the SAME catalogue — same captions, same group/sort function
names, so the exact real widget/projection code still runs for every
ordering — with each `set` narrowed to the small fixture population
fixtures.js adds for this purpose (two services, two years per kind, so
every grouping still has more than one group to place things under). */
function installScopedViews(wiki) {
	var scoped = wiki.data(VIEWS).map(function(view) {
		return Object.assign({}, view, {set: view.set + " +[prefix[Test Gruppetest]]"});
	});
	wiki.addTiddler({title: GV_VIEWS, type: "application/json", text: JSON.stringify(scoped)});
	return scoped;
}

/* Render the picker with an explicit state prefix so tests cannot leak into
   each other, and count the leaves it produced. */
function renderView(wiki, statePrefix, setIndex, orderIndex, viewsTitle) {
	wiki.addTiddler({title: statePrefix + "/set", text: String(setIndex)});
	wiki.addTiddler({title: statePrefix + "/order", text: String(orderIndex)});
	var html = wiki.render('<<forms-grouped-view "' + (viewsTitle || VIEWS) + '" "' + statePrefix +
		'" "Vis:" "Grupper:" "tiddlere">>');
	return {
		html: html,
		leaves: (html.match(/forms-tree-leaf/g) || []).length,
		groups: (html.match(/forms-tree-branch/g) || []).length
	};
}

h.test("each set and ordering renders its own tiddlers", function() {
	var w = h.fixtureWiki(),
		views = installScopedViews(w);
	views.forEach(function(view, vi) {
		var size = w.filter(view.set).length;
		assert.ok(size > 0, view.caption + "'s scoped fixture set is empty — fixtures.js needs updating");
		view.orderings.forEach(function(ordering, oi) {
			var out = renderView(w, "$:/temp/test/gv/" + vi + "/" + oi, vi, oi, GV_VIEWS);
			assert.ok(out.groups > 0, view.caption + " / " + ordering.caption + " rendered no groups");
			// Multi-homed tiddlers repeat, so leaves are never fewer than the set
			assert.ok(out.leaves >= size,
				view.caption + " / " + ordering.caption + " rendered " + out.leaves +
				" leaves for a set of " + size);
		});
	});
});

h.test("reordering the group levels keeps the same leaf set", function() {
	var w = h.fixtureWiki();
	installScopedViews(w);
	// "År → tjeneste" and "Tjeneste → år" over the objectives: same two levels, swapped
	var a = renderView(w, "$:/temp/test/gv/swap/a", 1, 0, GV_VIEWS),
		b = renderView(w, "$:/temp/test/gv/swap/b", 1, 1, GV_VIEWS);
	assert.equal(a.leaves, b.leaves, "swapping the group order changed how many leaves appear");
	assert.notEqual(a.html, b.html, "swapping the group order changed nothing at all");
});

h.test("an ordering left over from another set is clamped, not left broken", function() {
	var w = h.fixtureWiki();
	installScopedViews(w);
	// Objectives have three orderings; ask for a fourth
	var out = renderView(w, "$:/temp/test/gv/clamp", 1, 9, GV_VIEWS),
		first = renderView(w, "$:/temp/test/gv/clampref", 1, 0, GV_VIEWS);
	assert.ok(out.groups > 0, "an out-of-range ordering rendered an ungrouped list");
	assert.equal(out.groups, first.groups, "the clamp did not fall back to the first ordering");
});
