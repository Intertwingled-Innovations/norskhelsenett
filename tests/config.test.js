/*
Structural tests over the plugins themselves: packaging, the data tiddlers that
carry the configuration, and the hard constraint that `forms` stays generic.

These catch the failure modes that are invisible at runtime — a trailing comma
in a JSON config, a projection renamed in one place but not the other, an NHN
string that has crept into the engine.
*/

"use strict";

var h = require("./harness.js"),
	assert = h.assert,
	FORMS = "$:/plugins/tiddlywiki/forms",
	NHN = "$:/plugins/intertwingled-innovations/nhn",
	DIAGRAM = "Datamodell",
	DIAGRAM_STRINGS = NHN + "/datamodell-strings",
	COLUMN_SPECS = [
		NHN + "/extracts/governance-columns",
		NHN + "/extracts/services-columns"
	];

h.suite("Plugin configuration");

h.test("both plugins are loaded", function() {
	var w = h.wiki();
	assert.ok(w.pluginTiddlers(FORMS), "the forms plugin is not loaded");
	assert.ok(w.pluginTiddlers(NHN), "the nhn plugin is not loaded");
});

h.test("nhn declares its dependency on forms", function() {
	var w = h.wiki(),
		tiddler = w.$tw.wiki.getTiddler(NHN);
	assert.equal(tiddler.fields.dependents, FORMS);
});

h.test("every JSON data tiddler in the plugins parses", function() {
	var w = h.wiki();
	[FORMS, NHN].forEach(function(plugin) {
		var tiddlers = w.pluginTiddlers(plugin);
		Object.keys(tiddlers).forEach(function(title) {
			if(tiddlers[title].type === "application/json") {
				assert.notEqual(w.data(title), undefined, title + " is not valid JSON");
			}
		});
	});
});

/*
A JSON config tiddler may carry a "documentation" key: wikitext, rendered above
the JSON editor by the engine's doc-field ViewTemplate, so an override is not
left to speak for itself. This renders it through the real page view chain
(as the story river would), not a bare {{transclusion}}, because ViewTemplate
splices only apply there.
*/
h.test("a JSON tiddler's documentation key is wikified when the tiddler is viewed", function() {
	var w = h.wiki(),
		title = "$:/config/forms/fold-map",
		html = w.render('<$tiddler tiddler="' + title + '"><$transclude tiddler="$:/core/ui/ViewTemplate"/></$tiddler>'),
		box = (html.match(/forms-json-doc[\s\S]*?<\/div>/) || [""])[0];
	assert.ok(box, title + " has a documentation key but no doc box was rendered");
	assert.ok(/tc-tiddlylink/.test(box), "the documentation text did not wikify its [[links]]");
	assert.ok(!/tc-tiddlylink-missing/.test(box), "a link in the documentation points at a title that does not exist: " + box);
});

h.test("a JSON tiddler with no documentation key renders no doc box", function() {
	var w = h.wiki(),
		html = w.render('<$tiddler tiddler="$:/config/forms/labels"><$transclude tiddler="$:/core/ui/ViewTemplate"/></$tiddler>');
	assert.ok(!/forms-json-doc/.test(html), "labels has no documentation key, but a doc box was rendered anyway");
});

h.test("every projection named in a column spec is a defined function", function() {
	var w = h.wiki();
	COLUMN_SPECS.forEach(function(spec) {
		w.data(spec).forEach(function(column) {
			assert.ok(w.isFunction(column.fn),
				spec + " names \"" + column.fn + "\", which is not a defined function " +
				"(the column would silently export as blank)");
		});
	});
});

h.test("every column spec entry has a header and a projection", function() {
	var w = h.wiki();
	COLUMN_SPECS.forEach(function(spec) {
		var columns = w.data(spec);
		assert.ok(columns.length > 0, spec + " is empty");
		columns.forEach(function(column) {
			assert.ok(column.header, "a column in " + spec + " has no header");
			assert.ok(column.fn, "column \"" + column.header + "\" in " + spec + " has no fn");
		});
	});
});

h.test("every kind nhn-kind produces has a colour", function() {
	var w = h.wiki(),
		colours = w.data(NHN + "/kind-colours"),
		// `:map:flat` still emits a blank for an unclassified tiddler, hence !is[blank]
		kinds = w.filter("[all[tiddlers]] :map:flat[function[nhn-kind]] +[!is[blank]unique[]]");
	assert.ok(kinds.length > 0, "nhn-kind classified nothing at all");
	kinds.forEach(function(kind) {
		assert.ok(colours[kind], "kind \"" + kind + "\" has no entry in kind-colours");
	});
});

h.test("the two month maps agree on their keys", function() {
	var w = h.wiki(),
		ordinals = w.data(NHN + "/months"),
		names = w.data(NHN + "/month-names");
	assert.deepEqual(Object.keys(ordinals), Object.keys(names));
	assert.equal(Object.keys(ordinals).length, 12);
	Object.keys(ordinals).forEach(function(key) {
		assert.equal(key, key.toLowerCase(), "month key \"" + key + "\" is not lowercase, " +
			"so case normalisation on read will miss it");
	});
});

h.test("every tab a plugin declares has a tiddler behind it", function() {
	var w = h.wiki();
	[FORMS, NHN].forEach(function(plugin) {
		var declared = w.$tw.wiki.getTiddler(plugin).fields.list || "";
		// The info panel resolves each list entry as <plugin-title>/<entry>
		w.$tw.utils.parseStringArray(declared).forEach(function(tab) {
			assert.ok(w.exists(plugin + "/" + tab),
				plugin + " declares a \"" + tab + "\" tab, but " + plugin + "/" + tab +
				" does not exist, so the panel shows an empty tab");
		});
	});
});

h.test("every internal link in the plugins points somewhere", function() {
	var w = h.wiki(),
		broken = [];
	[FORMS, NHN].forEach(function(plugin) {
		var tiddlers = w.pluginTiddlers(plugin);
		Object.keys(tiddlers).forEach(function(title) {
			var text = tiddlers[title].text || "",
				match;
			// The diagram links to tags, not pages; checked by its own test below
			if(title === DIAGRAM) {
				return;
			}
			// Literal link targets only; anything computed is beyond a static check
			var pattern = /<\$link\s+to="([^"<>{]+)"/g;
			while((match = pattern.exec(text)) !== null) {
				if(!w.exists(match[1])) {
					broken.push(title + " links to \"" + match[1] + "\"");
				}
			}
		});
	});
	assert.deepEqual(broken, [], "broken links in the plugins:\n	" + broken.join("\n	"));
});

/* The diagram carries string keys, not strings, so its geometry is shared by both
   languages — which also means a key present in one table and not the other renders
   as an empty label rather than an error. Nothing at runtime would notice. */
h.test("the Datamodell diagram says the same things in both languages", function() {
	var w = h.wiki(),
		table = w.data(DIAGRAM_STRINGS),
		langs = Object.keys(table);
	assert.deepEqual(langs.sort(), ["en", "no"], "unexpected languages in " + DIAGRAM_STRINGS);
	assert.deepEqual(Object.keys(table.en).sort(), Object.keys(table.no).sort(),
		"the two language tables in " + DIAGRAM_STRINGS + " do not carry the same keys, " +
		"so some labels in the diagram render blank");
	var used = {}, match,
		pattern = /\[function\[dm-t\],\[([^\]]+)\]\]/g,
		text = w.pluginTiddlers(NHN)[DIAGRAM].text;
	while((match = pattern.exec(text)) !== null) {
		used[match[1]] = true;
	}
	assert.deepEqual(Object.keys(used).sort(), Object.keys(table.no).sort(),
		"the diagram and its strings disagree about which labels exist");
});

/* The diagram's nodes are tags, and a tag needs no tiddler behind it: `Resultat`,
   `mal`, `Arkiv` and the year tags are carried by hundreds of tiddlers with none.
   The diagram says so — a chip with no tiddler is drawn dashed — so the check above
   would report the picture as broken for telling the truth. What is worth catching
   is a *misspelt* tag, which that check cannot see either (a typo is just another
   missing tiddler), so this replaces it rather than waiving it. */
h.test("every node in the Datamodell diagram names a tiddler or a tag in use", function() {
	var w = h.wiki(),
		inUse = {},
		unknown = [],
		match;
	w.$tw.wiki.filterTiddlers("[all[tiddlers]tags[]unique[]]").forEach(function(tag) {
		inUse[tag] = true;
	});
	var text = w.pluginTiddlers(NHN)[DIAGRAM].text,
		pattern = /<\$link\s+to="([^"<>{]+)"/g;
	while((match = pattern.exec(text)) !== null) {
		if(!w.exists(match[1]) && !inUse[match[1]]) {
			unknown.push(match[1]);
		}
	}
	assert.deepEqual(unknown, [], DIAGRAM + " points at names that are neither a " +
		"tiddler nor a tag anything carries:\n	" + unknown.join("\n	"));
});

h.test("every navigation tab listed in the sidebar exists", function() {
	var w = h.wiki(),
		listed = w.$tw.utils.parseStringArray(w.$tw.wiki.getTiddler("$:/tags/nhn/NavTab").fields.list || "");
	assert.ok(listed.length > 0, "the NHN sidebar lists no navigation tabs");
	listed.forEach(function(title) {
		assert.ok(w.exists(title), "the sidebar lists \"" + title + "\", which does not exist");
	});
});

/*
The repo's first hard constraint: the engine must carry no NHN or Norwegian
specifics, so it can be reused unchanged by another client. See
docs/architecture.md. Anything matching below belongs in an `nhn` config shadow.
*/
h.test("forms contains no NHN or Norwegian specifics", function() {
	var w = h.wiki(),
		tiddlers = w.pluginTiddlers(FORMS),
		banned = [
			"nhn", "tjeneste", "tjenesteid", "tjenesteeier", "leveranse", "styring",
			"malsetting", "målsetting", "resultat", "divisjon", "helsenett",
			"forretningsomrade", "forretningsområde",
			"januar", "februar", "mars", "april", "mai", "juni",
			"juli", "august", "september", "oktober", "november", "desember"
		],
		offences = [];
	Object.keys(tiddlers).forEach(function(title) {
		var fields = tiddlers[title];
		Object.keys(fields).forEach(function(field) {
			var value = String(fields[field]);
			banned.forEach(function(term) {
				if(new RegExp("\\b" + term + "\\b", "i").test(value)) {
					offences.push(title + " (" + field + ") contains \"" + term + "\"");
				}
			});
		});
	});
	assert.deepEqual(offences, [],
		"NHN specifics leaked into the forms engine:\n	" + offences.join("\n	"));
});
