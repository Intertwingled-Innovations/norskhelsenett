/*
The published plugin JSONs: `npm run build` renders each plugin tiddler
through the core JsonFile exporter into build/plugins/<name>.json, and the
Pages deploy publishes them. Each file is a JSON array holding the one packed
plugin tiddler, which is TiddlyWiki's drag-and-drop import format — drop it
into any wiki, import, save, reload.

Three silent failure modes are pinned here: the build target quietly dropped
or misnamed (nothing errors — the files just stop appearing), a plugin title
rename leaving the target pointing at nothing (the render command logs and
carries on), and an export that emits something other than the complete,
importable plugin.
*/

"use strict";

var fs = require("fs"),
	path = require("path"),
	h = require("./harness.js"),
	assert = h.assert;

var PLUGINS = [
	{title: "$:/plugins/tiddlywiki/forms", file: "plugins/forms.json",
		type: "plugin", knownShadow: "$:/plugins/tiddlywiki/forms/csv.js"},
	{title: "$:/plugins/intertwingled-innovations/nhn", file: "plugins/nhn.json",
		type: "plugin", knownShadow: "$:/plugins/intertwingled-innovations/nhn/projections"},
	{title: "$:/plugins/intertwingled-innovations/nhn-theme", file: "plugins/nhn-theme.json",
		type: "theme", knownShadow: "$:/plugins/intertwingled-innovations/nhn-theme/palette"}
];

var EXPORTER = "$:/core/templates/exporters/JsonFile";

/* Render the exporter template exactly the way `--render` does in
   commands/render.js: parse the template, make a widget with the variables,
   take textContent (the build target's type is text/plain). */
function renderExport(w, exportFilter) {
	var $tw = w.$tw,
		parser = $tw.wiki.parseTiddler(EXPORTER),
		widgetNode = $tw.wiki.makeWidget(parser,
			{variables: {exportFilter: exportFilter, currentTiddler: EXPORTER, storyTiddler: EXPORTER}}),
		container = $tw.fakeDocument.createElement("div");
	widgetNode.render(container, null);
	return container.textContent;
}

h.suite("Published plugin JSONs");

h.test("the plugins build target renders every plugin through the JSON exporter", function() {
	var info = JSON.parse(fs.readFileSync(
			path.resolve(__dirname, "..", "wiki", "tiddlywiki.info"), "utf8")),
		target = info.build && info.build.plugins;
	assert.ok(target, "tiddlywiki.info has no \"plugins\" build target");
	var flat = target.join(" ");
	PLUGINS.forEach(function(p) {
		assert.ok(flat.indexOf("[[" + p.title + "]]") !== -1,
			"the plugins target does not render " + p.title);
		assert.ok(flat.indexOf("[[" + p.file + "]]") !== -1,
			"the plugins target does not write " + p.file);
	});
	assert.ok(flat.indexOf(EXPORTER) !== -1,
		"the plugins target does not use the JsonFile exporter");
	// And the npm build actually runs the target
	var pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf8"));
	assert.ok(/--build[^"]*\bplugins\b/.test(pkg.scripts.build),
		"npm run build does not invoke the plugins target");
});

h.test("each export is a one-element array holding the complete packed plugin", function() {
	var w = h.wiki();
	PLUGINS.forEach(function(p) {
		var arr = JSON.parse(renderExport(w, "[[" + p.title + "]]"));
		assert.equal(arr.length, 1, p.title + " export must hold exactly the plugin tiddler");
		var fields = arr[0];
		assert.equal(fields.title, p.title);
		assert.equal(fields["plugin-type"], p.type, p.title + " export lost its plugin-type");
		assert.equal(fields.type, "application/json");
		assert.ok(fields.version, p.title + " export carries no version");
		// The packed text holds every constituent the live plugin has — no more, no less
		var packed = Object.keys(JSON.parse(fields.text).tiddlers).sort(),
			live = Object.keys(w.pluginTiddlers(p.title)).sort();
		assert.deepEqual(packed, live,
			p.title + " export disagrees with the live plugin's constituents");
		assert.ok(packed.indexOf(p.knownShadow) !== -1);
	});
});

h.test("each export deserializes as a drag-and-drop import would", function() {
	var w = h.wiki();
	PLUGINS.forEach(function(p) {
		var text = renderExport(w, "[[" + p.title + "]]"),
			tiddlers = w.$tw.wiki.deserializeTiddlers("application/json", text, {});
		assert.equal(tiddlers.length, 1, p.file + " does not deserialize to one tiddler");
		assert.equal(tiddlers[0].title, p.title);
		assert.equal(tiddlers[0]["plugin-type"], p.type);
	});
});
