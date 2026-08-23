/*
The most dangerous silent failure in this codebase is not "the filter returns
the wrong thing" — it's "the filter compiles and returns SOMETHING, so nothing
ever points at the mistake". Two call shapes are exceptionally bad at this:

`function[name]` — if `name` is not a real \function, TiddlyWiki's own
"function" filter operator does not error; per its own source comment it
"return[s] the input list" UNCHANGED. Piped after a single title, that makes
`[<x>function[typo]]` evaluate to `[x]` — often enough to look plausible in
a `then`/`:filter` gate, so a renamed or misspelled function can sail through
review looking like it does something.

`$variable="name"` in `<$transclude>` — an unresolved variable/procedure name
renders nothing at all. No error, no console warning: the button, row or
section it was meant to produce is just absent.

Both are undetectable by reading rendered HTML (the earlier smoke test in
smoke.test.js proved this: two deliberately broken references — a renamed
function, a typo'd $variable — rendered clean, structurally-valid-looking
output). This file instead audits the SOURCE: every `function[x]` and
`$variable="x"` reference in both plugins, checked against where `x` is
actually defined and whether that definition is in scope from the calling
tiddler.

TiddlyWiki's own scoping rule (see docs/architecture.md): a \function or
\procedure defined in a tiddler tagged $:/tags/Global is callable from
anywhere; one defined in an ordinary tiddler is only callable from within
that tiddler's own rendering. A handful of procedures in this codebase (the
ToDo pages' own row procedures, the doc-field ViewTemplate's own condition)
are deliberately local — used only within the tiddler that defines them —
and are recognised as such below rather than flagged.
*/

"use strict";

var h = require("./harness.js"),
	assert = h.assert,
	FORMS = "$:/plugins/tiddlywiki/forms",
	NHN = "$:/plugins/intertwingled-innovations/nhn";

function collectSource(w) {
	var tiddlers = {};
	[FORMS, NHN].forEach(function(plugin) {
		var fields = w.pluginTiddlers(plugin);
		Object.keys(fields).forEach(function(title) { tiddlers[title] = fields[title]; });
	});
	return tiddlers;
}

function isGlobal(fields) {
	return (fields.tags || "").split(" ").indexOf("$:/tags/Global") !== -1;
}

/*
Every `name[]` (empty brackets, not a `format:suffix[]`-style suffixed call)
in the plugin source, with which tiddler it appears in and the exact prefix
matched — used to recover the real operator name even when it is glued
directly onto a preceding `>` or `]`.
*/
function collectEmptyBracketCalls(tiddlers) {
	var calls = [],
		re = /(^|[^a-zA-Z0-9_:])([a-zA-Z][a-zA-Z0-9_-]*)\[\]/g;
	Object.keys(tiddlers).forEach(function(title) {
		var text = tiddlers[title].text || "", m;
		re.lastIndex = 0;
		while((m = re.exec(text))) {
			calls.push({name: m[2], from: title});
		}
	});
	return calls;
}

/* Every \function / \procedure NAME( definition, with where it lives. */
function collectDefinitions(tiddlers) {
	var defs = {};
	Object.keys(tiddlers).forEach(function(title) {
		var text = tiddlers[title].text || "",
			re = /\\(?:function|procedure)\s+([a-zA-Z0-9_-]+)\(/g,
			m;
		while((m = re.exec(text))) {
			defs[m[1]] = {tiddler: title, global: isGlobal(tiddlers[title])};
		}
	});
	return defs;
}

/* Every reference of the given shape, with which tiddler it appears in. */
function collectReferences(tiddlers, pattern) {
	var refs = [];
	Object.keys(tiddlers).forEach(function(title) {
		var text = tiddlers[title].text || "",
			re = new RegExp(pattern.source, "g"),
			m;
		while((m = re.exec(text))) {
			refs.push({name: m[1], from: title});
		}
	});
	return refs;
}

h.suite("Function and procedure references");

h.test("every function[x] reference names a function in scope from where it is used", function() {
	var w = h.wiki(),
		tiddlers = collectSource(w),
		defs = collectDefinitions(tiddlers),
		refs = collectReferences(tiddlers, /function\[([a-zA-Z0-9_-]+)\]/),
		SENTINEL = "ZZZ-references-test-sentinel-does-not-exist",
		problems = [];
	assert.ok(refs.length > 20, "found suspiciously few function[] references — the scan is probably broken");
	refs.forEach(function(ref) {
		var def = defs[ref.name];
		if(!def) {
			problems.push(ref.from + " calls function[" + ref.name + "], which is not defined anywhere");
			return;
		}
		if(def.global) {
			// Defined globally: must actually resolve at runtime, not just exist in
			// source — the sentinel proves the "function" operator found a real
			// \function rather than falling back to its identity passthrough.
			var result = w.filter("[<s>function[" + ref.name + "]]", {s: SENTINEL});
			if(result.length === 1 && result[0] === SENTINEL) {
				problems.push(ref.from + " calls function[" + ref.name + "] (defined in " + def.tiddler +
					"), but it does not resolve at runtime — check the $:/tags/Global tagging");
			}
		} else if(def.tiddler !== ref.from) {
			// Defined locally in one tiddler, called from a different one: out of
			// scope. Local defs may only call themselves.
			problems.push(ref.from + " calls function[" + ref.name + "], but it is defined only locally " +
				"in " + def.tiddler + " (not tagged $:/tags/Global), so it is out of scope here");
		}
	});
	assert.deepEqual(problems, [], "broken function[] references:\n\t" + problems.join("\n\t"));
});

h.test("every $variable transclude target names a procedure in scope from where it is used", function() {
	var w = h.wiki(),
		tiddlers = collectSource(w),
		defs = collectDefinitions(tiddlers),
		refs = collectReferences(tiddlers, /\$variable="([a-zA-Z0-9_-]+)"/),
		problems = [];
	assert.ok(refs.length > 5, "found suspiciously few \\$variable references — the scan is probably broken");
	refs.forEach(function(ref) {
		var def = defs[ref.name];
		if(!def) {
			problems.push(ref.from + " transcludes $variable=\"" + ref.name + "\", which is not defined anywhere");
		} else if(!def.global && def.tiddler !== ref.from) {
			problems.push(ref.from + " transcludes $variable=\"" + ref.name + "\", but it is defined only " +
				"locally in " + def.tiddler + " (not tagged $:/tags/Global), so it is out of scope here");
		}
	});
	assert.deepEqual(problems, [], "broken $variable references:\n\t" + problems.join("\n\t"));
});

/*
The exact trap that produced a real bug in doc-field.tid: `type[]` looks like
it should map to the tiddler's type, by analogy with `tags[]` — but `type` has
no dedicated filter-operator module, so it falls back to TiddlyWiki's generic
`field` operator, which treats an empty operand as "field equals the empty
string" and silently returns nothing for any tiddler whose type is set. The
mistake is invisible in wikitext: `type[]` and `tags[]` read identically, and
only one of them does what it looks like it does.

Only a name TiddlyWiki registers as a genuine filter-operator MODULE (`tags`,
`links`, `count`, `first`, …) has real "derive/list a value" semantics with an
empty operand. Anything else — a plain field name used as a bare operator,
custom or built-in — falls through to that same equality-against-blank
fallback. This reads the operator registry directly from the booted wiki
(`$tw.wiki.filterOperators`) rather than guessing from TiddlyWiki's source
layout, so it can't go stale as core ships new operators.
*/
h.test("every name[] call is a real filter operator, not a bare field name misread as one", function() {
	var w = h.wiki(),
		tiddlers = collectSource(w),
		calls = collectEmptyBracketCalls(tiddlers),
		operators = w.$tw.wiki.filterOperators,
		problems = [];
	assert.ok(calls.length > 20, "found suspiciously few name[] calls — the scan is probably broken");
	calls.forEach(function(call) {
		if(!(call.name in operators)) {
			problems.push(call.from + " calls " + call.name + "[], which is not a real filter operator — " +
				"with empty brackets this silently becomes \"field " + call.name + " equals blank\", " +
				"not \"list the " + call.name + " value\"");
		}
	});
	assert.deepEqual(problems, [], "empty-bracket calls to non-operator names:\n\t" + problems.join("\n\t"));
});
