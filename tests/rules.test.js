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
