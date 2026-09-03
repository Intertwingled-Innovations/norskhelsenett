/*
Merging tag casing variants — the Anomalier page's one destructive action.

The mechanism is generic and lives in `forms` ($:/plugins/tiddlywiki/forms/merge);
`nhn` decides which variants form a family and which of them to keep. Both halves
are covered here, plus the page that wires them together.

Everything here builds its own "Test …" fixtures and removes them again: a merge
renames and retags real tiddlers, so a test that leaned on the snapshot would
rewrite NHN content for whatever ran next.
*/

"use strict";

var h = require("./harness.js"),
	assert = h.assert;

/* Run the shipped merge action, exactly as the page's button does. */
function merge(w, losers, keep) {
	w.invokeActions('<$transclude $variable="forms-merge-tags" from=<<from>> to=<<to>>/>',
		{from: losers, to: keep});
}

function tagsOf(w, title) {
	var tiddler = w.$tw.wiki.getTiddler(title);
	return tiddler ? Array.from(tiddler.fields.tags || []) : null;
}

function drop(w, titles) {
	titles.forEach(function(t) { w.$tw.wiki.deleteTiddler(t); });
}

h.suite("Tag merging");

h.test("forms-merge-tags moves every tiddler onto the kept spelling", function() {
	var w = h.fixtureWiki(),
		made = ["Test Flytt A", "Test Flytt B"];
	w.addTiddler({title: made[0], tags: "[[Test Flytt]] [[Test Urørt]]"});
	w.addTiddler({title: made[1], tags: "[[Test flytt]]"});
	try {
		merge(w, "[[Test flytt]]", "Test Flytt");
		assert.deepEqual(tagsOf(w, made[1]), ["Test Flytt"], "the drifted tag was not moved");
		assert.deepEqual(tagsOf(w, made[0]), ["Test Flytt", "Test Urørt"],
			"a tiddler already on the kept spelling was disturbed");
	} finally {
		drop(w, made);
	}
});

/*
A tiddler carrying both spellings is the case a naive retag loop gets wrong:
adding the kept tag before removing the drifted one leaves it tagged twice, and
nothing downstream complains — it just counts once per tag in every grouped view.
*/
h.test("a tiddler tagged both spellings ends up with one tag, not two", function() {
	var w = h.fixtureWiki(),
		title = "Test Dobbel";
	w.addTiddler({title: title, tags: "[[Test Dobbelt]] [[Test dobbelt]]"});
	try {
		merge(w, "[[Test dobbelt]]", "Test Dobbelt");
		assert.deepEqual(tagsOf(w, title), ["Test Dobbelt"], "the merge left a duplicate tag");
	} finally {
		drop(w, [title]);
	}
});

/*
Why the action sends tm-relink-tiddler rather than looping $action-listops over
[all[tiddlers]tag<from>]: a tag is also a title, and titles appear in `list`
fields, where they order a tiddler's children. A retag loop passes this file's
other tests and still leaves every ordering pointing at a tag that no longer
exists — silently, because a `list` entry for a missing tiddler is simply ignored.
*/
h.test("merging rewrites list fields too, not only tags", function() {
	var w = h.fixtureWiki(),
		made = ["Test Liste Eier", "Test Liste Bruker"];
	w.addTiddler({title: made[0], list: "[[Test liste]] [[Test Annet]]"});
	w.addTiddler({title: made[1], tags: "[[Test liste]]"});
	try {
		merge(w, "[[Test liste]]", "Test Liste");
		assert.deepEqual(Array.from(w.$tw.wiki.getTiddler(made[0]).fields.list),
			["Test Liste", "Test Annet"], "the list field still points at the drifted spelling");
	} finally {
		drop(w, made);
	}
});

h.test("the drifted spelling's own tiddler is renamed when the kept spelling has none", function() {
	var w = h.fixtureWiki(),
		made = ["Test Stubbe", "Test stubbe", "Test Stubbe Bruker"];
	w.addTiddler({title: "Test Stubbe", text: "Teksten på taggens egen tiddler"});
	w.addTiddler({title: "Test Stubbe Bruker", tags: "[[Test Stubbe]]"});
	try {
		merge(w, "[[Test Stubbe]]", "Test stubbe");
		assert.ok(!w.$tw.wiki.tiddlerExists("Test Stubbe"),
			"the misspelt tag tiddler was left behind as well as merged");
		assert.equal(w.$tw.wiki.getTiddler("Test stubbe").fields.text,
			"Teksten på taggens egen tiddler", "the renamed tiddler lost its text");
		assert.deepEqual(tagsOf(w, "Test Stubbe Bruker"), ["Test stubbe"]);
	} finally {
		drop(w, made);
	}
});

/*
The other direction must not delete anything. Two tiddlers with real text cannot
be merged by an action — that is a judgement about content — so the tag moves and
the tiddler stays, for [[Anomalier]] to list as needing a human.
*/
h.test("the drifted spelling's tiddler survives when the kept spelling has one too", function() {
	var w = h.fixtureWiki(),
		made = ["Test Begge", "Test begge", "Test Begge Bruker"];
	w.addTiddler({title: "Test Begge", text: "Beholdt"});
	w.addTiddler({title: "Test begge", text: "Skrivefeil, men med tekst"});
	w.addTiddler({title: "Test Begge Bruker", tags: "[[Test begge]]"});
	try {
		merge(w, "[[Test begge]]", "Test Begge");
		assert.equal(w.$tw.wiki.getTiddler("Test begge").fields.text, "Skrivefeil, men med tekst",
			"a tiddler with text was destroyed by a tag merge");
		assert.deepEqual(tagsOf(w, "Test Begge Bruker"), ["Test Begge"]);
	} finally {
		drop(w, made);
	}
});

/*
The rename/relink branch is decided when the button renders, not when it fires.
So if two drifted spellings both had tiddlers and the kept spelling had none,
an unguarded action would rename both to the same title and the second would
overwrite the first. forms-merge-renamed picks at most one.
*/
h.test("at most one tiddler is renamed, whatever the family looks like", function() {
	var w = h.fixtureWiki(),
		made = ["Test Tvilling", "Test tvilling", "TEST TVILLING", "Test Tvilling Bruker"];
	w.addTiddler({title: "Test Tvilling", text: "første"});
	w.addTiddler({title: "Test tvilling", text: "andre"});
	w.addTiddler({title: "Test Tvilling Bruker", tags: "[[Test Tvilling]] [[Test tvilling]]"});
	try {
		var picked = w.filter("[function[forms-merge-renamed],<from>,<to>]",
			{from: "[[Test Tvilling]] [[Test tvilling]]", to: "TEST TVILLING"});
		assert.equal(picked.length, 1, "forms-merge-renamed picked " + picked.length + " tiddlers to rename");
		merge(w, "[[Test Tvilling]] [[Test tvilling]]", "TEST TVILLING");
		var survivors = ["Test Tvilling", "Test tvilling"].filter(function(t) {
			return w.$tw.wiki.tiddlerExists(t);
		});
		assert.equal(survivors.length, 1,
			"expected one tiddler renamed and one left intact, got survivors: " + survivors);
		assert.equal(w.$tw.wiki.getTiddler("TEST TVILLING").fields.text,
			picked[0] === "Test Tvilling" ? "første" : "andre",
			"the second rename overwrote the first");
		assert.deepEqual(tagsOf(w, "Test Tvilling Bruker"), ["TEST TVILLING"]);
	} finally {
		drop(w, made);
	}
});

/*
The count under the table is the only warning of how much a click writes — on a
server, one file per tiddler. It has to count what the action actually changes.
*/
h.test("forms-merge-count counts exactly the tiddlers the merge changes", function() {
	var w = h.fixtureWiki(),
		made = ["Test Tell A", "Test Tell B", "Test Tell C", "Test Tell D"];
	w.addTiddler({title: made[0], tags: "[[Test tell]]"});
	w.addTiddler({title: made[1], tags: "[[Test TELL]]"});
	w.addTiddler({title: made[2], tags: "[[Test tell]] [[Test Tell]]"});
	w.addTiddler({title: made[3], tags: "[[Test Tell]]"});
	try {
		var from = "[[Test tell]] [[Test TELL]] [[Test Tell]]",
			predicted = Number(w.first("[function[forms-merge-count],<from>,<to>]",
				{from: from, to: "Test Tell"})),
			before = made.map(function(t) { return String(tagsOf(w, t)); });
		merge(w, from, "Test Tell");
		var changed = made.filter(function(t, i) { return String(tagsOf(w, t)) !== before[i]; });
		assert.equal(predicted, 3, "expected the three tiddlers on a drifted spelling, got " + predicted);
		assert.deepEqual(changed.sort(), ["Test Tell A", "Test Tell B", "Test Tell C"],
			"the merge changed a different set than it counted");
	} finally {
		drop(w, made);
	}
});

/*
The hard constraint: configuration ships as plugin shadows and must never be
written at run time. The core relinkers iterate real tiddlers only, so a merge
cannot shadow a config tiddler with an override — but "cannot" is exactly the
kind of claim that stops being true when somebody swaps the implementation for
a hand-rolled loop over [all[tiddlers]] or [all[shadows]].
*/
h.test("merging writes nothing outside the tiddlers carrying the tag", function() {
	var w = h.fixtureWiki(),
		made = ["Test Omfang A", "Test Omfang B"];
	w.addTiddler({title: made[0], tags: "[[Test omfang]]"});
	w.addTiddler({title: made[1], tags: "[[Test Omfang]]"});
	var census = {};
	w.$tw.wiki.each(function(tiddler, title) { census[title] = tiddler.fields.revision + "|" + tiddler.getFieldStringBlock(); });
	try {
		merge(w, "[[Test omfang]]", "Test Omfang");
		var touched = [];
		w.$tw.wiki.each(function(tiddler, title) {
			if(census[title] !== tiddler.fields.revision + "|" + tiddler.getFieldStringBlock()) {
				touched.push(title);
			}
		});
		assert.deepEqual(touched, ["Test Omfang A"],
			"the merge wrote to tiddlers it had no business touching: " + touched.join(", "));
	} finally {
		drop(w, made);
	}
});

h.suite("Tag merging: choosing what to keep");

/*
nhn-tag-casing-families collapses the flat list of drifting variants into one
control per concept. Reporting is per variant; fixing is per family.
*/
h.test("nhn-tag-casing-families gives one entry per family, not per variant", function() {
	var w = h.fixtureWiki(),
		made = ["Test Fam 1", "Test Fam 2", "Test Fam 3", "Test Fam 4"];
	// Two on the capitalised spelling, so the representative is not a coin toss
	w.addTiddler({title: made[0], tags: "[[Test Familie]]"});
	w.addTiddler({title: made[1], tags: "[[Test Familie]]"});
	w.addTiddler({title: made[2], tags: "[[Test familie]]"});
	w.addTiddler({title: made[3], tags: "[[Test FAMILIE]]"});
	try {
		var drift = w.filter("[function[nhn-tag-casing-drift]]").filter(isOurs),
			families = w.filter("[function[nhn-tag-casing-families]]").filter(isOurs);
		assert.equal(drift.length, 3, "the detector did not see all three spellings");
		assert.deepEqual(families, ["Test Familie"],
			"expected one family represented by the most-used spelling, got " + families);
	} finally {
		drop(w, made);
	}
	function isOurs(t) { return /^Test (Familie|familie|FAMILIE)$/.test(t); }
});

/*
The `drift` parameter exists so [[Anomalier]] can run the half-second scan once
instead of twice. An implementation that accepts it and computes its own anyway
answers identically and saves nothing, so the test has to hand it a list that
differs from the real one and check the answer follows it.
*/
h.test("nhn-tag-casing-families computes from the drift list it is given", function() {
	var w = h.fixtureWiki(),
		drift = w.filter("[function[nhn-tag-casing-drift]]");
	assert.ok(drift.length > 2, "the wiki has too little drift for this to distinguish anything");
	assert.deepEqual(w.filter("[function[nhn-tag-casing-families],<drift>]", {drift: bracket(drift[0])}),
		w.project("nhn-tag-casing-canonical", drift[0]),
		"the drift list passed in was ignored, so the page's single-scan saving does nothing");
	// Called with nothing it must still stand alone, which is what every other
	// caller — and every test above — relies on
	assert.deepEqual(w.filter("[function[nhn-tag-casing-families]]"),
		w.filter("[function[nhn-tag-casing-families],<drift>]", {drift: drift.map(bracket).join(" ")}));
	function bracket(t) { return "[[" + t + "]]"; }
});

/*
Most-used is a heuristic, and here it is the wrong one: `Ekstern Tjeneste`
outnumbers `Ekstern tjeneste` four to one while the rest of the taxonomy spells
it in lower case. So the page lets the target be chosen, and the choice has to
win over the proposal.
*/
h.test("a chosen target overrides the most-used proposal", function() {
	var w = h.fixtureWiki(),
		made = ["Test Valg 1", "Test Valg 2", "Test Valg 3"],
		state = "$:/state/nhn/anomalier/behold/Test Valg";
	w.addTiddler({title: made[0], tags: "[[Test Valg]]"});
	w.addTiddler({title: made[1], tags: "[[Test Valg]]"});
	w.addTiddler({title: made[2], tags: "[[Test valg]]"});
	try {
		assert.deepEqual(w.project("nhn-tag-merge-target", "Test Valg"), ["Test Valg"],
			"the default target is not the most-used spelling");
		w.addTiddler({title: state, text: "Test valg"});
		assert.deepEqual(w.project("nhn-tag-merge-target", "Test Valg"), ["Test valg"],
			"the chosen target was ignored");
		assert.deepEqual(w.project("nhn-tag-merge-losers", "Test Valg"), ["Test Valg"],
			"the losers were not recomputed against the chosen target");
		// A choice left over from a family that has since been merged must not
		// be merged onto: it would recreate the spelling somebody just removed.
		w.addTiddler({title: state, text: "Test VALG som ikke finnes"});
		assert.deepEqual(w.project("nhn-tag-merge-target", "Test Valg"), ["Test Valg"],
			"a stale choice was used instead of falling back to the proposal");
	} finally {
		drop(w, made.concat([state]));
	}
});

/* End to end: what the detector reports, the merge makes go away. */
h.test("merging a family clears it from the drift report", function() {
	var w = h.fixtureWiki(),
		made = ["Test Slutt 1", "Test Slutt 2"];
	w.addTiddler({title: made[0], tags: "[[Test Slutt]]"});
	w.addTiddler({title: made[1], tags: "[[Test slutt]]"});
	try {
		assert.ok(w.filter("[function[nhn-tag-casing-drift]]").indexOf("Test slutt") !== -1,
			"the fixture family is not reported as drifting to begin with");
		merge(w, w.project("nhn-tag-merge-losers", "Test Slutt").map(function(t) {
			return "[[" + t + "]]";
		}).join(" "), w.first("[function[nhn-tag-merge-target]]", {currentTiddler: "Test Slutt"}));
		var after = w.filter("[function[nhn-tag-casing-drift]]");
		assert.ok(after.indexOf("Test slutt") === -1 && after.indexOf("Test Slutt") === -1,
			"the family is still reported after being merged");
	} finally {
		drop(w, made);
	}
});

/*
The filters above can all be right while the page wires them together wrongly —
a button per variant instead of per family, or one that names the loser as the
tag to keep. Rendering is the only thing that notices.
*/
h.test("Anomalier offers one merge button per family, naming the target", function() {
	var w = h.wiki(),
		html = w.render("{{Anomalier}}"),
		families = w.filter("[function[nhn-tag-casing-families]]"),
		buttons = html.match(/Slå sammen til «[^»]*»/g) || [];
	assert.ok(families.length > 0, "the snapshot has no casing drift, so this proves nothing");
	assert.equal(buttons.length, families.length,
		"expected one merge button per family, got " + buttons.length + " for " + families.length);
	families.forEach(function(family) {
		assert.ok(buttons.indexOf("Slå sammen til «" + family + "»") !== -1,
			"no button proposes keeping " + family + "; buttons were " + buttons.join(", "));
	});
});

/*
The last thing that can be wrong is the wiring: the filters agree, the button is
labelled correctly, and it merges the wrong way round. Nothing short of clicking
the page's own button notices, so this test clicks all five of them in a private
wiki and checks the tiddlers ended up on the spelling the labels advertised.
*/
h.test("clicking the page's buttons merges onto the advertised spelling", function() {
	var w = h.scratchWiki(),
		plan = w.filter("[function[nhn-tag-casing-families]]").map(function(family) {
			var losers = w.filter("[function[nhn-tag-merge-losers]]", {currentTiddler: family});
			return {
				keep: w.first("[function[nhn-tag-merge-target]]", {currentTiddler: family}),
				losers: losers,
				victims: losers.reduce(function(all, loser) {
					return all.concat(w.filter("[all[tiddlers]tag<loser>]", {loser: loser}));
				}, [])
			};
		});
	assert.ok(plan.length > 0 && plan[0].victims.length > 0,
		"the snapshot has no casing drift, so this proves nothing");

	var clicked = w.clickButtons("{{Anomalier}}", "Slå sammen til");
	assert.equal(clicked, plan.length,
		"clicked " + clicked + " merge buttons for " + plan.length + " families");
	assert.deepEqual(w.filter("[function[nhn-tag-casing-drift]]"), [],
		"the page's own buttons did not clear the drift they reported");

	plan.forEach(function(family) {
		family.victims.forEach(function(victim) {
			var tags = Array.from(w.$tw.wiki.getTiddler(victim).fields.tags || []);
			assert.ok(tags.indexOf(family.keep) !== -1,
				victim + " should now be tagged " + family.keep + ", but is tagged " + tags.join(", "));
			family.losers.forEach(function(loser) {
				assert.ok(tags.indexOf(loser) === -1,
					victim + " is still tagged the drifted spelling " + loser);
			});
		});
	});
});
