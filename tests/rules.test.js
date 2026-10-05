/*
Rule tables — `forms-rule-result` in the engine, and the one table NHN ship: which
`Styring …` governance tag a review gets from the tags of its service.

The table is data, and a wrong row fails silently: the review is created under
the wrong tag, or under none, and simply turns up in the wrong place. So the
engine's semantics are pinned on a neutral table, and NHN's table is checked row
by row against the rules they wrote down (action items of 18 September 2026).
*/

"use strict";

var h = require("./harness.js"),
	assert = h.assert,
	NHN = "$:/plugins/intertwingled-innovations/nhn",
	RULES = "$:/temp/test/rules";

function result(wiki, rules, values) {
	return wiki.filter("[function[forms-rule-result],<r>,<v>]",
		{r: rules, v: wiki.$tw.utils.stringifyList(values)});
}

function withRules(table, fn) {
	var w = h.fixtureWiki();
	w.addTiddler({title: RULES, type: "application/json", text: JSON.stringify({rules: table})});
	try { fn(w); } finally { w.$tw.wiki.deleteTiddler(RULES); }
}

h.suite("Rule tables");

h.test("the first rule that applies wins", function() {
	withRules([
		{all: ["round", "red"], result: "tomato"},
		{all: ["round"], result: "ball"}
	], function(w) {
		assert.deepEqual(result(w, RULES, ["round", "red"]), ["tomato"]);
		assert.deepEqual(result(w, RULES, ["round", "blue"]), ["ball"]);
	});
	// The same two rules the other way round: the general one now shadows the specific
	withRules([
		{all: ["round"], result: "ball"},
		{all: ["round", "red"], result: "tomato"}
	], function(w) {
		assert.deepEqual(result(w, RULES, ["round", "red"]), ["ball"]);
	});
});

h.test("a rule needs every value in `all` and none of the values in `none`", function() {
	withRules([
		{all: ["round", "red"], none: ["small", "sour"], result: "tomato"}
	], function(w) {
		assert.deepEqual(result(w, RULES, ["red", "round", "shiny"]), ["tomato"], "extra values must not matter");
		assert.deepEqual(result(w, RULES, ["round"]), [], "one of two required values is not enough");
		assert.deepEqual(result(w, RULES, ["round", "red", "sour"]), [], "a barred value must stop the rule");
	});
});

h.test("values are compared without regard to case, and may contain spaces", function() {
	withRules([
		{all: ["Dark Red"], none: ["Very Small"], result: "beetroot"}
	], function(w) {
		assert.deepEqual(result(w, RULES, ["dark red"]), ["beetroot"]);
		assert.deepEqual(result(w, RULES, ["DARK RED", "very small"]), []);
		// "Dark" and "Red" as separate values are not the value "Dark Red"
		assert.deepEqual(result(w, RULES, ["Dark", "Red"]), []);
	});
});

h.test("a rule with no conditions is a default, and no rule at all gives nothing", function() {
	withRules([
		{all: ["round"], result: "ball"},
		{result: "something else"}
	], function(w) {
		assert.deepEqual(result(w, RULES, ["square"]), ["something else"]);
		assert.deepEqual(result(w, RULES, []), ["something else"]);
	});
	withRules([{all: ["round"], result: "ball"}], function(w) {
		assert.deepEqual(result(w, RULES, ["square"]), []);
		assert.deepEqual(result(w, RULES, []), []);
	});
	assert.deepEqual(result(h.fixtureWiki(), "$:/temp/test/no-such-rules", ["round"]), [],
		"a missing table must give nothing, not an error string");
});

h.suite("Governance tag rules");

/* NHN's table, as they wrote it: the tags a service has, and the tag its reviews get. */
var ROWS = [
	[["Intern tjeneste"], "Styring Intern tjeneste"],
	[["Ekstern tjeneste", "Relatert tjeneste"], "Styring Relatert tjeneste"],
	[["Ekstern tjeneste", "Satsing for fart"], "Styring Satsing for fart"],
	[["Ekstern tjeneste", "Oppgaver fra HOD"], "Styring Oppgaver fra HOD"],
	[["Ekstern tjeneste"], "Styring Ekstern tjeneste"]
];

/* A service carrying these tags, plus the ones every service has. */
function serviceWith(wiki, title, tags) {
	wiki.addTiddler({title: title, text: "Fixture service",
		tags: wiki.$tw.utils.stringifyList(tags.concat(["Test Divisjon", "2031"]))});
	return title;
}

function governanceFor(wiki, title) {
	return wiki.filter("[function[nhn-governance-for],<s>]", {s: title});
}

h.test("each row of NHN's table gives the governance tag they specified", function() {
	var w = h.fixtureWiki(), made = [];
	try {
		ROWS.forEach(function(row, i) {
			var service = serviceWith(w, "Test Regel " + i, row[0]);
			made.push(service);
			assert.deepEqual(governanceFor(w, service), [row[1]], row[0].join(" + "));
		});
	} finally {
		made.forEach(function(t) { w.$tw.wiki.deleteTiddler(t); });
	}
});

h.test("the order the service's tags are stored in does not matter, nor their casing", function() {
	var w = h.fixtureWiki(),
		made = [
			serviceWith(w, "Test Regel Omvendt", ["Oppgaver fra HOD", "Ekstern tjeneste"]),
			serviceWith(w, "Test Regel Store Bokstaver", ["Ekstern Tjeneste", "relatert tjeneste"])
		];
	try {
		assert.deepEqual(governanceFor(w, made[0]), ["Styring Oppgaver fra HOD"]);
		assert.deepEqual(governanceFor(w, made[1]), ["Styring Relatert tjeneste"]);
	} finally {
		made.forEach(function(t) { w.$tw.wiki.deleteTiddler(t); });
	}
});

/*
The cases NHN's table does not cover, decided here: Intern wins whatever else the
service carries, and a category without `Ekstern tjeneste` gives nothing — the
review form then refuses, rather than guess a tag.
*/
h.test("Intern wins, and a category on its own places nothing", function() {
	var w = h.fixtureWiki(),
		made = [
			serviceWith(w, "Test Regel Intern Relatert", ["Intern tjeneste", "Relatert tjeneste"]),
			serviceWith(w, "Test Regel Bare Relatert", ["Relatert tjeneste"]),
			serviceWith(w, "Test Regel Bare HOD", ["Oppgaver fra HOD"]),
			serviceWith(w, "Test Regel Ingen", [])
		];
	try {
		assert.deepEqual(governanceFor(w, made[0]), ["Styring Intern tjeneste"]);
		assert.deepEqual(governanceFor(w, made[1]), []);
		assert.deepEqual(governanceFor(w, made[2]), []);
		assert.deepEqual(governanceFor(w, made[3]), []);
		assert.deepEqual(governanceFor(w, "Test Finnes Ikke"), []);
	} finally {
		made.forEach(function(t) { w.$tw.wiki.deleteTiddler(t); });
	}
});

/*
A misspelt tag in the table matches nothing and says nothing — `Satsning` for
`Satsing` is one letter. So every tag the table names must come from the lists
the rest of the configuration uses.
*/
h.test("the table only names tags the configuration knows", function() {
	var w = h.wiki(),
		table = w.data(NHN + "/governance-rules").rules,
		types = w.filter("[enlist<nhn-canonical-tjeneste-types>] [enlist<nhn-secondary-tjeneste-types>]"),
		governance = w.filter("[enlist<nhn-governance-tags>]"),
		retired = w.filter("[enlist<nhn-retired-governance-tags>]");
	assert.equal(table.length, ROWS.length, "the table and this test disagree on how many rules there are");
	table.forEach(function(rule) {
		(rule.all || []).concat(rule.none || []).forEach(function(tag) {
			assert.ok(types.indexOf(tag) !== -1, "the rule for " + rule.result + " tests \"" + tag + "\", which is not a service type or category");
		});
		assert.ok(governance.indexOf(rule.result) !== -1, rule.result + " is not a recognised governance tag, so a review given it would vanish");
		assert.ok(retired.indexOf(rule.result) === -1, rule.result + " is retired and must not be handed out");
	});
	retired.forEach(function(tag) {
		assert.ok(governance.indexOf(tag) !== -1, tag + " is retired but no longer recognised, so its old reviews would vanish");
	});
});

/* Every service in the snapshot that is Ekstern or Intern is placed by the table. */
h.test("every typed service in the snapshot gets a governance tag", function() {
	var w = h.wiki(),
		typed = w.filter("[function[nhn-services]] :filter[function[nhn-canonical-of],<currentTiddler>,<nhn-canonical-tjeneste-types>]");
	assert.ok(typed.length > 0, "no service is Ekstern or Intern");
	typed.forEach(function(service) {
		assert.equal(governanceFor(w, service).length, 1, service + " is typed but the rules give it no single tag");
	});
});
