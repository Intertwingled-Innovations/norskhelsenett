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

h.test("the OKR sets are the tagged sets", function() {
	var w = h.wiki();
	assert.deepEqual(w.filter("[function[nhn-objectives]sort[title]]"),
		w.filter("[[Målsetting]tagging[]sort[title]]"));
	assert.deepEqual(w.filter("[function[nhn-results]sort[title]]"),
		w.filter("[[Resultat]tagging[]sort[title]]"));
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

/* Render the picker with an explicit state prefix so tests cannot leak into
   each other, and count the leaves it produced. */
function renderView(wiki, statePrefix, setIndex, orderIndex) {
	wiki.addTiddler({title: statePrefix + "/set", text: String(setIndex)});
	wiki.addTiddler({title: statePrefix + "/order", text: String(orderIndex)});
	var html = wiki.render('<<forms-grouped-view "' + VIEWS + '" "' + statePrefix +
		'" "Vis:" "Grupper:" "tiddlere">>');
	return {
		html: html,
		leaves: (html.match(/forms-tree-leaf/g) || []).length,
		groups: (html.match(/forms-tree-branch/g) || []).length
	};
}

h.test("each set and ordering renders its own tiddlers", function() {
	var w = h.fixtureWiki(),
		views = w.data(VIEWS);
	views.forEach(function(view, vi) {
		var size = w.filter(view.set).length;
		view.orderings.forEach(function(ordering, oi) {
			var out = renderView(w, "$:/temp/test/gv/" + vi + "/" + oi, vi, oi);
			assert.ok(out.groups > 0, view.caption + " / " + ordering.caption + " rendered no groups");
			// Multi-homed tiddlers repeat, so leaves are never fewer than the set
			assert.ok(out.leaves >= size,
				view.caption + " / " + ordering.caption + " rendered " + out.leaves +
				" leaves for a set of " + size);
		});
	});
});

h.test("reordering the group levels keeps the same leaf set", function() {
	var w = h.fixtureWiki(),
		// "År → tjeneste" and "Tjeneste → år" over the objectives: same two levels, swapped
		a = renderView(w, "$:/temp/test/gv/swap/a", 1, 0),
		b = renderView(w, "$:/temp/test/gv/swap/b", 1, 1);
	assert.equal(a.leaves, b.leaves, "swapping the group order changed how many leaves appear");
	assert.notEqual(a.html, b.html, "swapping the group order changed nothing at all");
});

h.test("an ordering left over from another set is clamped, not left broken", function() {
	var w = h.fixtureWiki(),
		// Objectives have three orderings; ask for a fourth
		out = renderView(w, "$:/temp/test/gv/clamp", 1, 9),
		first = renderView(w, "$:/temp/test/gv/clampref", 1, 0);
	assert.ok(out.groups > 0, "an out-of-range ordering rendered an ungrouped list");
	assert.equal(out.groups, first.groups, "the clamp did not fall back to the first ordering");
});
