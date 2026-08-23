/*
The keystone abstraction (docs/architecture.md): an export is `(set, columns)`,
where a column is a header plus the name of a projection function. The two
extracts the brief asks for differ only by selector and column list — there is
no second code path — and these tests are what hold that claim up.

Also covers design decision D4: CSV carries a UTF-8 BOM so Excel reads the
Norwegian characters correctly.
*/

"use strict";

var h = require("./harness.js"),
	assert = h.assert,
	NHN = "$:/plugins/intertwingled-innovations/nhn",
	GOVERNANCE_COLUMNS = NHN + "/extracts/governance-columns",
	SERVICE_COLUMNS = NHN + "/extracts/services-columns",
	REVIEW = "03 Autentisering og autorisasjon - hovedtrekk og endringer mars 2026",
	BOM = String.fromCharCode(0xFEFF);

/* Export a filter's results as CSV using a column spec, exactly as the UI does. */
function exportCsv(wiki, setFilter, columnsTitle, variables) {
	return wiki.filter(setFilter + " +[forms-csv[" + columnsTitle + "]]", variables)[0];
}

/* Parse the exporter's output back into rows. Every field it emits is quoted,
   with embedded quotes doubled. */
function parseCsv(text) {
	var rows = [], row = [], field = "", inQuotes = false, i = 0;
	if(text.charAt(0) === BOM) {
		text = text.slice(1);
	}
	while(i < text.length) {
		var c = text.charAt(i);
		if(inQuotes) {
			if(c === "\"" && text.charAt(i + 1) === "\"") {
				field += "\""; i += 2;
			} else if(c === "\"") {
				inQuotes = false; i++;
			} else {
				field += c; i++;
			}
		} else if(c === "\"") {
			inQuotes = true; i++;
		} else if(c === ",") {
			row.push(field); field = ""; i++;
		} else if(c === "\r" && text.charAt(i + 1) === "\n") {
			row.push(field); rows.push(row); row = []; field = ""; i += 2;
		} else {
			field += c; i++;
		}
	}
	if(field !== "" || row.length) {
		row.push(field); rows.push(row);
	}
	return rows;
}

h.suite("CSV export");

h.test("the header row comes from the column spec", function() {
	var w = h.wiki();
	[GOVERNANCE_COLUMNS, SERVICE_COLUMNS].forEach(function(spec) {
		var expected = w.data(spec).map(function(column) { return column.header; }),
			header = parseCsv(exportCsv(w, "[[" + REVIEW + "]]", spec))[0];
		assert.deepEqual(header, expected, spec);
	});
});

h.test("the output starts with a UTF-8 BOM", function() {
	var w = h.wiki(),
		csv = exportCsv(w, "[[" + REVIEW + "]]", GOVERNANCE_COLUMNS);
	// D4: without this Excel mangles å/ø/æ
	assert.equal(csv.charAt(0), BOM, "the CSV has no BOM, so Excel will mis-read it");
});

h.test("rows are separated by CRLF", function() {
	var w = h.wiki(),
		csv = exportCsv(w, "[[" + REVIEW + "]]", GOVERNANCE_COLUMNS);
	assert.ok(csv.indexOf("\r\n") !== -1, "no CRLF line endings in the CSV");
	assert.equal(csv.indexOf("\n\n"), -1, "blank line in the CSV output");
});

h.test("embedded quotes are doubled", function() {
	var w = h.fixtureWiki(),
		rows = parseCsv(exportCsv(w, "[[Test Sitat \"Anførselstegn\"]]", GOVERNANCE_COLUMNS));
	assert.equal(rows.length, 2);
	assert.equal(rows[1][0], "Test Sitat \"Anførselstegn\"");
});

h.test("cells agree with the projections they name", function() {
	var w = h.wiki(),
		columns = w.data(GOVERNANCE_COLUMNS),
		row = parseCsv(exportCsv(w, "[[" + REVIEW + "]]", GOVERNANCE_COLUMNS))[1];
	assert.equal(row.length, columns.length);
	columns.forEach(function(column, index) {
		var expected = column.fn === "forms-title" ? REVIEW : (w.project(column.fn, REVIEW)[0] || "");
		assert.equal(row[index], expected,
			"column \"" + column.header + "\" (" + column.fn + ")");
	});
});

h.test("every row has one cell per column", function() {
	var w = h.wiki(),
		columns = w.data(GOVERNANCE_COLUMNS).length,
		rows = parseCsv(exportCsv(w, "[function[nhn-extract-governance-set]limit[80]]",
			GOVERNANCE_COLUMNS, {"extract-year": "2026", "extract-month": "Mars"}));
	assert.ok(rows.length > 1, "the extract produced no data rows");
	rows.forEach(function(row, index) {
		assert.equal(row.length, columns, "row " + index + " has the wrong number of cells");
	});
});

h.test("an empty set exports headers and nothing else", function() {
	var w = h.wiki(),
		rows = parseCsv(exportCsv(w, "[[no such tiddler at all]tags[]]", GOVERNANCE_COLUMNS));
	assert.equal(rows.length, 1);
});

h.test("both extracts come from the one code path", function() {
	var w = h.wiki(),
		set = "[function[nhn-extract-governance-set]limit[20]]",
		variables = {"extract-year": "2026", "extract-month": "Mars"},
		governance = parseCsv(exportCsv(w, set, GOVERNANCE_COLUMNS, variables)),
		services = parseCsv(exportCsv(w, set, SERVICE_COLUMNS, variables));
	// Same operator, same input, two column specs: the shape follows the spec and
	// nothing else. If these ever diverge in row count, a second path has appeared.
	assert.equal(governance.length, services.length);
	assert.notDeepEqual(governance[0], services[0], "the two specs produced identical headers");
	assert.deepEqual(
		governance[0].filter(function(header) { return services[0].indexOf(header) !== -1; }),
		["Name", "ServiceID", "URL", "Division", "Service name", "Year"]);
});

h.test("forms-datauri wraps the CSV for the download link", function() {
	var w = h.wiki(),
		uri = w.first("[[" + REVIEW + "]] +[forms-csv[" + GOVERNANCE_COLUMNS + "]forms-datauri[text/csv]]");
	assert.ok(/^data:text\/csv[;,]/.test(uri), "not a text/csv data URI: " + uri.slice(0, 40));
	assert.ok(uri.length > 100, "the data URI looks empty");
});
