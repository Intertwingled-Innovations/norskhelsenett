/*
Zero-dependency test harness for the NHN TiddlyWiki plugins.

Boots the `wiki` folder in-process and evaluates filter expressions against it,
so tests exercise the same code path the browser does — including the plugins'
own `$:/tags/Global` definitions.

Two mechanics here are not obvious, and both are documented in
docs/architecture.md ("TiddlyWiki mechanics worth knowing"):

1. `$:/tags/Global` definitions are only in scope beneath an `importvariables`
   widget. A bare `wiki.filterTiddlers(f)` sees none of the `nhn-*` or `forms-*`
   functions, so we build a one-off widget tree that imports the globals and
   evaluate every filter against a descendant of it.

2. Functions read `currentTiddler` from the widget scope. Piping a title in via
   `[[X]function[f]]` does *not* set it, so `filter()` takes the row tiddler as
   a variable and injects it with `makeFakeWidgetWithVariables`.

We evaluate through `filterTiddlers` rather than rendering wikitext to text,
because rendering normalises the CRLF line endings that the CSV exporter emits.
*/

"use strict";

var path = require("path"),
	assert = require("node:assert/strict");

var WIKI_PATH = path.resolve(__dirname, "..", "wiki"),
	GLOBAL_IMPORT = "[subfilter{$:/core/config/GlobalImportFilter}]";

// --- Booting ---------------------------------------------------------------

/*
Boot the wiki folder in a fresh, isolated $tw instance and return a helper.
Boot is synchronous in Node when no command is given.
*/
function bootWiki() {
	var $tw = require("tiddlywiki/boot/boot.js").TiddlyWiki(),
		booted = false;
	$tw.boot.argv = [WIKI_PATH];
	$tw.boot.boot(function() { booted = true; });
	if(!booted) {
		throw new Error("TiddlyWiki boot did not complete synchronously");
	}
	return makeHelper($tw);
}

function makeHelper($tw) {
	// A widget tree that imports the global definitions, so plugin functions resolve.
	// Parented to the root widget so that messages an action sends (tm-rename-tiddler
	// and friends) reach the handlers that startup installed there.
	var root = $tw.wiki.makeWidget({tree: [{
		type: "importvariables",
		attributes: {filter: {type: "string", value: GLOBAL_IMPORT}},
		children: [{type: "element", tag: "div", children: []}]
	}]}, {parentWidget: $tw.rootWidget});
	root.render($tw.fakeDocument.createElement("div"), null);
	var scope = root.children[0].children[0];

	function widgetFor(variables) {
		return variables ? scope.makeFakeWidgetWithVariables(variables) : scope;
	}

	// The core installs its tm-* message handlers from a browser-only startup module,
	// so a headless boot has none. Reinstate the rename handler exactly as core does,
	// so tests can follow an action that sends the message through to the wiki.
	$tw.rootWidget.addEventListener("tm-rename-tiddler", function(event) {
		var params = event.paramObject || {};
		$tw.wiki.renameTiddler(params.from || event.tiddlerTitle, params.to);
	});

	return {
		$tw: $tw,

		/* Evaluate a filter, returning an array of strings.
		   `variables` is an object of widget variables, typically {currentTiddler: "…"}.
		   Copied into a native array: TiddlyWiki evaluates its modules in a separate
		   vm context, so the arrays it returns fail assert's prototype check. */
		filter: function(filterString, variables) {
			return Array.from($tw.wiki.filterTiddlers(filterString, widgetFor(variables)));
		},

		/* The first result of a filter, or "" if there is none. */
		first: function(filterString, variables) {
			return this.filter(filterString, variables)[0] || "";
		},

		/* Apply a named projection/relation function to a tiddler. */
		project: function(fnName, title) {
			return this.filter("[function[" + fnName + "]]", {currentTiddler: title});
		},

		/* Is `name` defined as a \function by one of the plugins? */
		isFunction: function(name) {
			var info = scope.getVariableInfo(name, {defaultValue: undefined});
			return !!(info && info.srcVariable && info.srcVariable.isFunctionDefinition);
		},

		/* Render wikitext to HTML with the plugins' global definitions in scope.
		   For end-to-end checks of a UI procedure; prefer filter() for anything
		   that can be asserted at the filter level. */
		render: function(wikitext, variables) {
			return $tw.wiki.renderText("text/html", "text/vnd.tiddlywiki",
				"\\import [subfilter{$:/core/config/GlobalImportFilter}]\n" + wikitext,
				{variables: variables || {}});
		},

		/* Execute action widgets, as clicking a button would. Lets a test drive a
		   creation flow end to end instead of asserting on rendered markup. */
		invokeActions: function(wikitext, variables) {
			// invokeActionString takes variables itself; the fake widget used for
			// filter evaluation is not a full widget and cannot invoke actions
			scope.invokeActionString(wikitext, scope, {}, variables || {});
		},

		/* Does this tiddler exist? Resolves shadows, so it sees tiddlers that
		   are only shipped inside a plugin. */
		exists: function(title) {
			return !!$tw.wiki.getTiddler(title);
		},

		/* Parsed contents of a JSON data tiddler, copied out of TiddlyWiki's vm context. */
		data: function(title) {
			var data = $tw.wiki.getTiddlerDataCached(title, undefined);
			return data === undefined ? undefined : JSON.parse(JSON.stringify(data));
		},

		/* The constituent tiddlers of a plugin, as a title -> fields object. */
		pluginTiddlers: function(pluginTitle) {
			var info = $tw.wiki.getPluginInfo(pluginTitle);
			return info && info.tiddlers;
		},

		addTiddler: function(fields) {
			$tw.wiki.addTiddler(new $tw.Tiddler(fields));
		}
	};
}

// Booting costs ~450ms, so share one pristine instance and one fixture instance.
var pristine = null, fixtured = null;

/* The wiki as it ships: real NHN content, no test data. */
function wiki() {
	return pristine || (pristine = bootWiki());
}

/* The same wiki plus synthetic tiddlers, for deterministic behaviour tests.
   Kept separate so fixtures can never skew assertions about the real content. */
function fixtureWiki() {
	if(!fixtured) {
		fixtured = bootWiki();
		require("./fixtures.js").install(fixtured);
	}
	return fixtured;
}

// --- Test registry ---------------------------------------------------------

var tests = [],
	currentSuite = "",
	currentFile = "";

/* Called by the runner before loading each test file, so `npm test -- export`
   can select by file name as well as by suite or test name. */
function setFile(file) {
	currentFile = file;
}

function suite(name) {
	currentSuite = name;
}

function test(name, fn) {
	tests.push({file: currentFile, suite: currentSuite, name: name, fn: fn});
}

exports.wiki = wiki;
exports.fixtureWiki = fixtureWiki;
exports.setFile = setFile;
exports.suite = suite;
exports.test = test;
exports.tests = tests;
exports.assert = assert;
