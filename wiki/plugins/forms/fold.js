/*\
title: $:/plugins/tiddlywiki/forms/fold.js
type: application/javascript
module-type: filteroperator

Diacritic-insensitive search.

[<string>fold[]]
  Folds each input string: lower-cased, mapped through the fold map, then NFD
  normalised with the combining marks stripped.

[<titles>forms-search:<fields>[<query>]]
  Keeps the input tiddlers whose folded fields contain every folded word of the
  query. `fields` defaults to `title`; prefix the operator with `!` to invert.

Why a fold map rather than NFD alone: NFD decomposes a letter into a base plus a
combining mark only where Unicode defines that decomposition. It does for å, é
and ü, so stripping the marks turns them into a, e and u. It does not for ø, æ,
ß, ð or þ, which are atomic code points — NFD leaves them exactly as they are.
Relying on NFD alone therefore half-works: it folds some of a language's letters
and silently misses the rest.

The same function folds both the stored text and the query, so the two can only
agree or disagree together.

The engine ships the map EMPTY: which letters fold to what is language
configuration, and this plugin carries no language. A configuration layer
overrides $:/config/forms/fold-map at a higher plugin-priority with the letters
its language needs.

The map tiddler may carry one reserved key, "documentation" — wikitext shown
when the tiddler is opened, so an otherwise-bare `{}` or an unfamiliar letter
table is not left unexplained. It is never treated as a folding rule.

\*/

"use strict";

var MAP_TITLE = "$:/config/forms/fold-map",
	DOC_KEY = "documentation";

// \p{Mn} covers combining marks in every script; fall back to the Latin block
var COMBINING;
try {
	COMBINING = new RegExp("\\p{Mn}", "gu");
} catch(e) {
	COMBINING = /[̀-ͯ]/g;
}

var cache = {source: null, map: null, regexp: null};

function escapeRegExp(s) {
	return s.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
}

/* Build (and cache) the folder from the configured map. Rebuilt only when the
   map tiddler's text changes, so this costs nothing on a normal keystroke. */
function getFolder(wiki) {
	var tiddler = wiki.getTiddler(MAP_TITLE),
		source = tiddler ? tiddler.fields.text : "";
	if(cache.source !== source) {
		var configured = wiki.getTiddlerDataCached(MAP_TITLE, {}) || {},
			map = Object.create(null);
		Object.keys(configured).forEach(function(key) {
			if(key !== DOC_KEY) {
				map[key.toLowerCase()] = String(configured[key]).toLowerCase();
			}
		});
		// Longest first, so a multi-character key is never pre-empted by a prefix
		var keys = Object.keys(map).sort(function(a, b) { return b.length - a.length; });
		cache = {
			source: source,
			map: map,
			regexp: keys.length ? new RegExp(keys.map(escapeRegExp).join("|"), "g") : null
		};
	}
	return cache;
}

function fold(text, folder) {
	var s = String(text === undefined || text === null ? "" : text).toLowerCase();
	if(folder.regexp) {
		s = s.replace(folder.regexp, function(match) { return folder.map[match]; });
	}
	return s.normalize("NFD").replace(COMBINING, "");
}

exports.fold = function(source, operator, options) {
	var folder = getFolder(options.wiki),
		results = [];
	source(function(tiddler, title) {
		results.push(fold(title, folder));
	});
	return results;
};

exports["forms-search"] = function(source, operator, options) {
	var folder = getFolder(options.wiki),
		suffix = operator.suffixes && operator.suffixes[0],
		fields = suffix && suffix.length ? suffix : ["title"],
		terms = fold(operator.operand, folder).split(/\s+/).filter(Boolean),
		invert = operator.prefix === "!",
		results = [];
	source(function(tiddler, title) {
		if(terms.length === 0) {
			// An empty query matches everything, so its inverse matches nothing
			if(!invert) {
				results.push(title);
			}
			return;
		}
		var haystack = fields.map(function(field) {
				if(field === "title") { return title; }
				return tiddler ? tiddler.getFieldString(field) : "";
			}).join(" "),
			folded = fold(haystack, folder),
			matched = terms.every(function(term) { return folded.indexOf(term) !== -1; });
		if(matched !== invert) {
			results.push(title);
		}
	});
	return results;
};
