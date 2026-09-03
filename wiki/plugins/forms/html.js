/*\
title: $:/plugins/tiddlywiki/forms/html.js
type: application/javascript
module-type: filteroperator

Generic standalone-HTML export operator for the forms engine.

[<body-html>] +[forms-htmldoc<doc-title>,<css-tiddler>,<lang>]
  Wraps each input string (already-rendered HTML for the document body) in a
  complete self-contained HTML document: doctype, charset, viewport, <title>,
  and an inline <style> block. The result is ready for forms-datauri[text/html]
  behind an <a download> link.

  - First operand: the document title (HTML-encoded).
  - Second operand (optional): title of a tiddler whose text is inlined
    verbatim as CSS.
  - Third operand (optional): value for the <html lang> attribute.

The engine carries no domain strings: title, styles and language all come from
the caller.

\*/

"use strict";

exports["forms-htmldoc"] = function(source,operator,options) {
	var encode = $tw.utils.htmlEncode,
		docTitle = operator.operands[0] || "",
		cssTitle = operator.operands[1] || "",
		lang = operator.operands[2] || "",
		css = cssTitle ? (options.wiki.getTiddlerText(cssTitle) || "") : "",
		results = [];
	source(function(tiddler,title) {
		results.push(
			"<!DOCTYPE html>\n" +
			"<html" + (lang ? " lang=\"" + encode(lang) + "\"" : "") + ">\n" +
			"<head>\n" +
			"<meta charset=\"utf-8\">\n" +
			"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
			"<title>" + encode(docTitle) + "</title>\n" +
			"<style>\n" + css + "\n</style>\n" +
			"</head>\n" +
			"<body>\n" + title + "\n</body>\n" +
			"</html>");
	});
	return results;
};
