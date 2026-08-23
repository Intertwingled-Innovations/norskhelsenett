/*
The projection catalogue — the shared column/group-key vocabulary that the
extracts (§3.3) and every future report (§3.4-3.6) are built from. A projection
that quietly stops resolving produces blank cells rather than an error, so these
pin each one against known tiddlers.
*/

"use strict";

var h = require("./harness.js"),
	assert = h.assert,
	// A monthly business review carrying every field the governance extract reads
	REVIEW = "03 Autentisering og autorisasjon - hovedtrekk og endringer mars 2026",
	SERVICE = "Autentisering og autorisasjon",
	TEMPLATE = "01 MAL Tjenestenavn - hovedtrekk og endringer januar 2026";

h.suite("Projections");

h.test("the review fixture is still in the snapshot", function() {
	var w = h.wiki();
	// Everything below depends on these two; fail loudly rather than obscurely
	assert.ok(w.$tw.wiki.tiddlerExists(REVIEW), REVIEW + " is missing");
	assert.ok(w.$tw.wiki.tiddlerExists(SERVICE), SERVICE + " is missing");
});

h.test("every governance-extract projection resolves for a review", function() {
	var w = h.wiki();
	assert.deepEqual(w.project("nhn-serviceid", REVIEW), ["40031"]);
	assert.deepEqual(w.project("nhn-division", REVIEW), ["Divisjon Helsepersonell"]);
	assert.deepEqual(w.project("nhn-servicename", REVIEW), [SERVICE]);
	assert.deepEqual(w.project("nhn-severity", REVIEW), ["Forretningsmessig endring:1"]);
	assert.deepEqual(w.project("nhn-governance-type", REVIEW), ["Styring Ekstern tjeneste"]);
	assert.deepEqual(w.project("nhn-year-raw", REVIEW), ["2026"]);
	assert.deepEqual(w.project("nhn-month-raw", REVIEW), ["Mars"]);
});

h.test("nhn-url builds a percent-encoded permalink", function() {
	var w = h.wiki();
	assert.deepEqual(w.project("nhn-url", REVIEW),
		["https://tiddlywiki.plattform.nhn.no/#03%20Autentisering%20og%20autorisasjon" +
			"%20-%20hovedtrekk%20og%20endringer%20mars%202026"]);
	// Norwegian characters must survive the round trip into Excel and back
	assert.deepEqual(w.project("nhn-url", "Måledata"),
		["https://tiddlywiki.plattform.nhn.no/#M%C3%A5ledata"]);
});

h.test("nhn-servicename returns a service's own title", function() {
	var w = h.wiki();
	// A review is *about* a service; a service is its own service name
	assert.deepEqual(w.project("nhn-servicename", SERVICE), [SERVICE]);
});

h.test("nhn-division ignores Domene tags", function() {
	var w = h.wiki(),
		domains = w.filter("[tag[Domene]]");
	assert.ok(domains.length > 0, "no Domene tiddlers to test against");
	// One domain is also tagged Divisjon, so the projection must exclude Domene explicitly
	w.filter("[function[nhn-services]]").forEach(function(service) {
		w.project("nhn-division", service).forEach(function(division) {
			assert.ok(domains.indexOf(division) === -1,
				service + " resolved to the domain \"" + division + "\" as its division");
		});
	});
});

h.test("nhn-owner reads the configured field, with a fallback", function() {
	var w = h.fixtureWiki();
	assert.deepEqual(w.project("nhn-owner", "Test Tjeneste Med Eier"), ["Kari Nordmann"]);
	assert.deepEqual(w.project("nhn-owner", "Test Tjeneste Uten Eier"), ["(Ingen tjenesteeier)"]);
});

h.suite("Kind classification");

h.test("nhn-kind classifies the main kinds", function() {
	var w = h.wiki();
	assert.deepEqual(w.project("nhn-kind", REVIEW), ["review"]);
	assert.deepEqual(w.project("nhn-kind", SERVICE), ["service"]);
	assert.deepEqual(w.project("nhn-kind", TEMPLATE), ["template"]);
	assert.deepEqual(w.project("nhn-kind", "Norsk Helsenett SF"), ["structure"]);
});

h.test("the template marker wins over other kinds", function() {
	var w = h.fixtureWiki();
	// The brief's automation must never mistake an untouched template for real content,
	// so `mal` has to beat every other tag it might carry
	assert.deepEqual(w.project("nhn-kind", "Test Mal Som Ogsa Er Leveranse"), ["template"]);
});

h.test("nhn-kind returns nothing for an unclassified tiddler", function() {
	var w = h.wiki();
	assert.deepEqual(w.project("nhn-kind", "$:/StoryList"), []);
});

h.test("nhn-kind returns at most one kind per tiddler", function() {
	var w = h.wiki();
	// The type-bar and every future per-kind form assume a single classification
	w.filter("[all[tiddlers]limit[400]]").forEach(function(title) {
		assert.ok(w.project("nhn-kind", title).length <= 1,
			title + " classified as more than one kind");
	});
});
