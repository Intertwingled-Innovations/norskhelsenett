/*\
title: $:/plugins/forms/csv.js
type: application/javascript
module-type: filteroperator

Generic CSV export operators for the forms engine.

[<set-filter>] +[forms-csv<columnsDataTiddler>]
  Builds a CSV string (with a leading UTF-8 BOM) from the input tiddlers and a
  column spec. The column spec is a JSON data tiddler holding an array of
  {"header": "...", "fn": "<projection-function-name>"}. Each cell is the first
  result of evaluating [function[<fn>]] with currentTiddler set to the row.

[<text>] +[forms-datauri[<mime-type>]]
  Wraps each input string as a data URI (for <a download> links).

\*/

"use strict";

function quoteAndEscape(value) {
	return "\"" + String(value === undefined || value === null ? "" : value).replace(/"/mg,"\"\"") + "\"";
}

exports["forms-csv"] = function(source,operator,options) {
	var columns = options.wiki.getTiddlerDataCached(operator.operand,[]),
		widget = options.widget,
		lines = [];
	if(!widget) {
		return [];
	}
	// Header row
	lines.push(columns.map(function(col) { return quoteAndEscape(col.header); }).join(","));
	// Data rows
	source(function(tiddler,title) {
		var rowWidget = widget.makeFakeWidgetWithVariables({currentTiddler: title}),
			cells = columns.map(function(col) {
				var result = options.wiki.filterTiddlers("[function[" + col.fn + "]]",rowWidget);
				return quoteAndEscape(result.length ? result[0] : "");
			});
		lines.push(cells.join(","));
	});
	// Leading BOM so Excel reads UTF-8 correctly (design decision D4)
	return [String.fromCharCode(0xFEFF) + lines.join("\r\n")];
};

exports["forms-datauri"] = function(source,operator,options) {
	var type = operator.operand || "text/plain",
		results = [];
	source(function(tiddler,title) {
		results.push($tw.utils.makeDataUri(title,type));
	});
	return results;
};
