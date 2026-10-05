/*
Reviews carrying a retired governance tag — Anomalier's third bulk action.

NHN reclassified their services in September 2026 and left the reviews already
written under `Styring Tiltak` and `Styring Satsning for fart`. The page proposes
the tag each would get today and moves them a year at a time. As with the other
bulk actions, the risk is in the wiring, so the page's own buttons are clicked in
a private wiki.
*/

"use strict";

var h = require("./harness.js"),
	assert = h.assert;

/* A service the rules place under `Styring Oppgaver fra HOD`, two reviews of it
   under a retired tag — one linked by tag, one only by its title — and a review
   of nothing recognisable. 2031 keeps them clear of the snapshot. */
var SERVICE = "Test Retag Tjeneste",
	BY_TAG = "04 Test Retag Tjeneste - hovedtrekk og endringer april 2031",
	BY_TITLE = "05 Test Retag Tjeneste - hovedtrekk og endringer mai 2031",
	UNKNOWN = "06 Test Retag Ukjent - hovedtrekk og endringer juni 2031",
	DRAFT = "Draft of '" + BY_TAG + "'";

function install(w) {
	w.addTiddler({title: SERVICE, text: "Fixture service",
		tags: "[[Ekstern tjeneste]] [[Oppgaver fra HOD]] [[Test Divisjon]] 2031"});
	w.addTiddler({title: BY_TAG, text: "Skrevet",
		tags: "Styring [[Styring Tiltak]] 2031 April [[" + SERVICE + "]] [[Test Egen Tagg]]"});
	w.addTiddler({title: BY_TITLE, text: "Skrevet",
		tags: "[[Styring Satsning for fart]] 2031 Mai"});
	w.addTiddler({title: UNKNOWN, text: "Skrevet",
		tags: "[[Styring Tiltak]] 2031 Juni"});
	w.addTiddler({title: DRAFT, text: "Utkast", "draft.of": BY_TAG, "draft.title": BY_TAG,
		tags: "[[Styring Tiltak]] 2031 April [[" + SERVICE + "]]"});
	if(!w.exists("Test Divisjon")) {
		w.addTiddler({title: "Test Divisjon", tags: "Divisjon", text: "Fixture business unit"});
	}
	return [SERVICE, BY_TAG, BY_TITLE, UNKNOWN, DRAFT];
}

function tagsOf(w, title) {
	return w.filter("[<t>tags[]sort[]]", {t: title});
}

function expected(w, title) {
	return w.filter("[<t>] :map:flat[function[nhn-review-governance-expected]] +[!is[blank]]", {t: title});
}

h.suite("Retired governance tags");

h.test("a review is offered the tag its service implies today", function() {
	var w = h.fixtureWiki(),
		made = install(w);
	try {
		var can = w.filter("[function[nhn-reviews-retaggable]]"),
			cannot = w.filter("[function[nhn-reviews-unretaggable]]");
		[BY_TAG, BY_TITLE].forEach(function(review) {
			assert.ok(can.indexOf(review) !== -1, review + " is not offered a new tag");
			assert.deepEqual(expected(w, review), ["Styring Oppgaver fra HOD"], review);
		});
		assert.ok(cannot.indexOf(UNKNOWN) !== -1 && can.indexOf(UNKNOWN) === -1,
			"a review of no known service must be listed as unplaceable, not offered a guess");
		assert.deepEqual(expected(w, UNKNOWN), []);
		[can, cannot].forEach(function(list) {
			assert.ok(list.indexOf(DRAFT) === -1, "a draft is listed for retagging");
		});
		// every review is in exactly one half
		can.forEach(function(review) {
			assert.ok(cannot.indexOf(review) === -1, review + " is in both lists");
		});
	} finally {
		made.forEach(function(t) { w.$tw.wiki.deleteTiddler(t); });
	}
});

h.test("clicking the page's buttons moves each listed review to its new tag, and changes nothing else", function() {
	var w = h.scratchWiki();
	install(w);
	var retired = w.filter("[enlist<nhn-retired-governance-tags>]"),
		plan = w.filter("[function[nhn-reviews-retaggable]]").map(function(review) {
			return {title: review, to: expected(w, review)[0], before: tagsOf(w, review)};
		}),
		untouched = w.filter("[function[nhn-reviews-unretaggable]] [[" + DRAFT + "]]").map(function(review) {
			return {title: review, before: tagsOf(w, review)};
		}),
		years = w.filter("[function[nhn-reviews-retaggable]] :map:flat[function[nhn-year]] +[unique[]]"),
		reviewsBefore = w.filter("[function[nhn-reviews-all]count[]]")[0];
	assert.ok(plan.length >= 2 && untouched.length >= 2, "the fixtures were not picked up");
	plan.forEach(function(p) { assert.ok(p.to, p.title + " is listed with no tag to move to"); });

	var clicked = w.clickButtons("{{Anomalier}}", "Oppdater styringstagg");
	assert.equal(clicked, years.length, "expected one button per year (" + years.join(", ") + "), clicked " + clicked);

	plan.forEach(function(p) {
		var want = p.before.filter(function(t) { return retired.indexOf(t) === -1; }).concat([p.to])
			.filter(function(t, i, all) { return all.indexOf(t) === i; }).sort();
		assert.deepEqual(tagsOf(w, p.title), want, p.title);
	});
	untouched.forEach(function(u) {
		assert.deepEqual(tagsOf(w, u.title), u.before, u.title + " was not offered a tag but was changed");
	});
	assert.deepEqual(w.filter("[function[nhn-reviews-retaggable]]"), [],
		"the page's own buttons left reviews it had offered to move");
	assert.equal(w.filter("[function[nhn-reviews-all]count[]]")[0], reviewsBefore,
		"retagging changed how many reviews there are");
});

/*
One button per year, so a year can be looked over and moved on its own. Clicking
one must leave the other years exactly as they were.
*/
h.test("a year's button moves that year's reviews and no other year's", function() {
	var w = h.scratchWiki(),
		other = "04 Test Retag Tjeneste - hovedtrekk og endringer april 2032";
	install(w);
	w.addTiddler({title: other, text: "Skrevet", tags: "[[Styring Tiltak]] 2032 April [[" + SERVICE + "]]"});
	var before = tagsOf(w, other);

	assert.equal(w.clickButtons("{{Anomalier}}", "(2031)"), 1, "expected exactly one button for 2031");

	assert.ok(tagsOf(w, BY_TAG).indexOf("Styring Oppgaver fra HOD") !== -1, "the 2031 review was not moved");
	assert.deepEqual(tagsOf(w, other), before, "the 2031 button also moved a 2032 review");
	assert.ok(w.filter("[function[nhn-reviews-retaggable]]").indexOf(other) !== -1,
		"the 2032 review is no longer offered");
});

h.test("Anomalier shows each proposed change before its button", function() {
	var w = h.fixtureWiki(),
		made = install(w);
	try {
		var html = w.render("{{Anomalier}}"),
			section = html.slice(html.indexOf("Gjennomganger med utgått styringstagg"), html.indexOf("Tjenester uten årstagg"));
		[BY_TAG, BY_TITLE].forEach(function(review) {
			assert.ok(section.indexOf(review) !== -1, review + " is not listed");
		});
		assert.ok(section.indexOf("Styring Oppgaver fra HOD") !== -1, "the tag a review would get is not shown");
		assert.ok(section.indexOf("Kan ikke plasseres automatisk") < section.indexOf(UNKNOWN),
			"the unplaceable review is not listed apart from the ones a button moves");
	} finally {
		made.forEach(function(t) { w.$tw.wiki.deleteTiddler(t); });
	}
});

h.suite("Undated services");

h.test("a service with no year tag is listed, a dated one is not", function() {
	var w = h.fixtureWiki(),
		made = ["Test Udatert Tjeneste", "Test Datert Tjeneste"];
	w.addTiddler({title: made[0], tags: "[[Intern tjeneste]] [[Test Divisjon]]", text: "Fixture service"});
	w.addTiddler({title: made[1], tags: "[[Intern tjeneste]] [[Test Divisjon]] 2031", text: "Fixture service"});
	try {
		var undated = w.filter("[function[nhn-services-undated]]");
		assert.ok(undated.indexOf(made[0]) !== -1, "the undated service is not listed");
		assert.ok(undated.indexOf(made[1]) === -1, "a dated service is listed as undated");
		var html = w.render("{{Anomalier}}");
		assert.ok(html.slice(html.indexOf("Tjenester uten årstagg")).indexOf(made[0]) !== -1,
			"Anomalier does not list the undated service");
	} finally {
		made.forEach(function(t) { w.$tw.wiki.deleteTiddler(t); });
	}
});
