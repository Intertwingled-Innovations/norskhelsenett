/*
Leftover edit drafts — the Anomalier page's second destructive action.

Drafts are already kept out of every count (`nhn-excluded`); what is tested here
is deleting the tiddlers themselves. The whole risk lives in one distinction: a
draft whose text survives elsewhere may be deleted, and one whose text does not
must not be. `nhn-drafts-disposable` and `nhn-drafts-unsaved` draw that line, and
the page's button must act on the first set only.

The page test clicks the real button in a scratch wiki, because a delete cannot
be undone and a test that reimplemented the button's filter would not notice the
page pointing it at `nhn-drafts`.
*/

"use strict";

var h = require("./harness.js"),
	assert = h.assert;

function drop(w, titles) {
	titles.forEach(function(t) { w.$tw.wiki.deleteTiddler(t); });
}

h.suite("Leftover drafts");

h.test("a draft with no text is disposable, whatever it drafts", function() {
	var w = h.fixtureWiki(),
		made = ["Draft of 'Test Utkast Tomt'"];
	w.addTiddler({title: made[0], text: "", "draft.of": "Test Utkast Som Er Borte"});
	try {
		assert.ok(w.filter("[function[nhn-drafts-disposable]]").indexOf(made[0]) !== -1,
			"an empty draft has nothing to lose and should be disposable");
	} finally {
		drop(w, made);
	}
});

h.test("a draft is disposable when the tiddler it drafts still exists", function() {
	var w = h.fixtureWiki(),
		made = ["Test Utkast Original", "Draft of 'Test Utkast Original'"];
	w.addTiddler({title: made[0], text: "originalen"});
	w.addTiddler({title: made[1], text: "endret tekst", "draft.of": made[0]});
	try {
		assert.ok(w.filter("[function[nhn-drafts-disposable]]").indexOf(made[1]) !== -1,
			"the text survives in the tiddler being drafted, so the draft is disposable");
		assert.deepEqual(w.filter("[function[nhn-drafts-unsaved]]").filter(function(t) {
			return t === made[1];
		}), [], "a draft with a live original was reported as unsaved");
	} finally {
		drop(w, made);
	}
});

/* The one case that must never be deleted: a draft of a tiddler that was never
   saved. Its text exists nowhere else, so deleting it destroys the only copy. */
h.test("a draft with text is never disposable when its tiddler is gone", function() {
	var w = h.fixtureWiki(),
		made = ["Draft of 'Test Utkast Aldri Lagret'"];
	w.addTiddler({title: made[0], text: "noe noen skrev", "draft.of": "Test Utkast Aldri Lagret"});
	try {
		assert.deepEqual(w.filter("[function[nhn-drafts-disposable]]").filter(function(t) {
			return t === made[0];
		}), [], "a draft holding the only copy of its text must not be disposable");
		assert.ok(w.filter("[function[nhn-drafts-unsaved]]").indexOf(made[0]) !== -1,
			"an unsaved draft should be listed for a person to read");
	} finally {
		drop(w, made);
	}
});

h.test("every draft is either disposable or unsaved, never both", function() {
	var w = h.wiki(),
		drafts = w.filter("[function[nhn-drafts]]"),
		disposable = w.filter("[function[nhn-drafts-disposable]]"),
		unsaved = w.filter("[function[nhn-drafts-unsaved]]");
	assert.ok(drafts.length > 0, "the snapshot has no drafts, so this proves nothing");
	assert.equal(disposable.length + unsaved.length, drafts.length,
		"the two sets do not partition the drafts");
	disposable.forEach(function(title) {
		assert.ok(unsaved.indexOf(title) === -1, title + " is in both sets");
	});
});

/* A property of the snapshot rather than a count: whatever the data holds, an
   unsaved draft is one with text and no surviving original. */
h.test("what is held back has text and nothing behind it", function() {
	var w = h.wiki();
	w.filter("[function[nhn-drafts-unsaved]]").forEach(function(title) {
		assert.ok(w.filter("[<t>has[text]]", {t: title}).length === 1,
			title + " has no text, so it should have been disposable");
		var origin = w.first("[<t>get[draft.of]]", {t: title});
		assert.ok(!origin || !w.exists(origin),
			title + " drafts " + origin + ", which exists, so it should have been disposable");
	});
});

/*
The wiring: the filters can agree and the button still delete the wrong set.
Clicking the page's own button in a private wiki is the only thing that notices
the page passing `nhn-drafts` where it means `nhn-drafts-disposable`.
*/
h.test("clicking the page's button deletes the disposable drafts and no others", function() {
	var w = h.scratchWiki(),
		disposable = w.filter("[function[nhn-drafts-disposable]]"),
		unsaved = w.filter("[function[nhn-drafts-unsaved]]"),
		origins = disposable.map(function(title) {
			return w.first("[<t>get[draft.of]]", {t: title});
		}).filter(function(origin) { return origin && w.exists(origin); });

	assert.ok(disposable.length > 0, "the snapshot has no disposable drafts, so this proves nothing");
	assert.ok(unsaved.length > 0, "the snapshot has no unsaved draft, so the held-back half is untested");
	assert.ok(origins.length > 0, "no disposable draft has a live original, so nothing pins them surviving");

	var clicked = w.clickButtons("{{Anomalier}}", "Slett");
	assert.equal(clicked, 1, "expected one delete button, clicked " + clicked);

	disposable.forEach(function(title) {
		assert.ok(!w.exists(title), title + " should have been deleted");
	});
	unsaved.forEach(function(title) {
		assert.ok(w.exists(title), title + " holds the only copy of its text and must survive");
	});
	origins.forEach(function(title) {
		assert.ok(w.exists(title), title + " was drafted, not deleted, and must survive");
	});
	assert.deepEqual(w.filter("[function[nhn-drafts-disposable]]"), [],
		"the page's own button left disposable drafts behind");
});

/* The button says how many it will delete; a label that disagrees with the
   action is how a bulk delete surprises somebody. */
h.test("the button's count is the number it deletes", function() {
	var w = h.wiki(),
		html = w.render("{{Anomalier}}"),
		n = w.filter("[function[nhn-drafts-disposable]]").length,
		label = html.match(/Slett\s+(\d+)\s+utkast/);
	assert.ok(label, "the page renders no delete-drafts button");
	assert.equal(Number(label[1]), n,
		"the button offers to delete " + label[1] + " drafts but the filter finds " + n);
});
