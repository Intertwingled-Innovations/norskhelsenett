#!/usr/bin/env node
/*
Test runner for the NHN TiddlyWiki plugins.

	npm test              -- run everything
	npm test -- dates     -- run only tests whose suite or name matches "dates"

Exits non-zero when anything fails, so CI catches a broken filter rather than
shipping a wiki with silently empty columns.
*/

"use strict";

var fs = require("fs"),
	path = require("path"),
	harness = require("./harness.js");

var ESC = String.fromCharCode(27) + "[",
	colour = process.stdout.isTTY ?
		{pass: ESC + "32m", fail: ESC + "31m", dim: ESC + "90m", off: ESC + "0m"} :
		{pass: "", fail: "", dim: "", off: ""};

// Load every *.test.js in this directory, in name order
fs.readdirSync(__dirname)
	.filter(function(name) { return /\.test\.js$/.test(name); })
	.sort()
	.forEach(function(name) {
		harness.setFile(name);
		require(path.join(__dirname, name));
	});

var pattern = process.argv[2],
	selected = harness.tests.filter(function(t) {
		return !pattern ||
			(t.file + " " + t.suite + " " + t.name).toLowerCase().indexOf(pattern.toLowerCase()) !== -1;
	});

var failures = [],
	lastSuite = null,
	started = Date.now();

selected.forEach(function(t) {
	if(t.suite !== lastSuite) {
		console.log("\n" + t.suite);
		lastSuite = t.suite;
	}
	var began = Date.now();
	try {
		t.fn();
		// Surface slow tests: most run in single-digit milliseconds, so anything
		// noticeably slower is doing real rendering and worth knowing about
		var took = Date.now() - began,
			note = took >= 200 ? colour.dim + " (" + (took / 1000).toFixed(1) + "s)" + colour.off : "";
		console.log("  " + colour.pass + "✓" + colour.off + " " + t.name + note);
	} catch(err) {
		failures.push({test: t, err: err});
		console.log("  " + colour.fail + "✗" + colour.off + " " + t.name);
	}
});

failures.forEach(function(f) {
	console.log("\n" + colour.fail + "FAILED" + colour.off + " " + f.test.suite + " — " + f.test.name);
	var message = f.err && f.err.message ? f.err.message : String(f.err);
	console.log(message.split("\n").map(function(line) { return "  " + line; }).join("\n"));
	if(f.err && f.err.code !== "ERR_ASSERTION" && f.err.stack) {
		console.log(colour.dim + f.err.stack.split("\n").slice(1, 3).join("\n") + colour.off);
	}
});

var elapsed = ((Date.now() - started) / 1000).toFixed(1);
console.log("\n" + selected.length + " tests, " + failures.length + " failed " +
	colour.dim + "(" + elapsed + "s)" + colour.off);

if(pattern && selected.length === 0) {
	console.log(colour.fail + "No tests matched \"" + pattern + "\"" + colour.off);
	process.exit(1);
}
process.exit(failures.length ? 1 : 0);
