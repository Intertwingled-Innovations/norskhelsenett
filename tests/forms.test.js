/*
Guided creation (brief §3.2): the form engine and the six NHN form definitions.

A form's whole job is to produce a tiddler that matches the conventions in the
existing data — right title, right tags, right fields. So most of these tests
create something and compare it against what the wiki already contains, rather
than checking the form renders.
*/

"use strict";

var h = require("./harness.js"),
	assert = h.assert,
	NHN = "$:/plugins/intertwingled-innovations/nhn",
	FORM_TAG = "$:/tags/nhn/Form",
	REVIEW = NHN + "/forms/review";

function formDefs(wiki) {
	return wiki.filter("[all[shadows+tiddlers]tag[" + FORM_TAG + "]sort[title]]");
}

/* Fill a form's state tiddler, run the creation actions, return the new title. */
function create(wiki, def, values) {
	var state = "$:/state/test/form/" + def.split("/").pop();
	// The form stores values as indexes of a JSON data tiddler, so an input can be
	// called "title" without colliding with the state tiddler's own title
	wiki.addTiddler({title: state, type: "application/json", text: JSON.stringify(values)});
	wiki.invokeActions('<$transclude $variable="forms-create-actions" def="' + def +
		'" state="' + state + '"/>');
	return state;
}

function discard(wiki, title) {
	wiki.$tw.wiki.deleteTiddler(title);
}

h.suite("Form definitions");

h.test("every form definition parses and is complete", function() {
	var w = h.wiki(),
		defs = formDefs(w);
	assert.ok(defs.length >= 4, "expected several forms, found " + defs.length);
	defs.forEach(function(title) {
		var def = w.data(title);
		assert.ok(def, title + " is not valid JSON");
		assert.ok(def.caption, title + " has no caption");
		assert.ok(def.title, title + " names no title template");
		assert.ok(def.tags, title + " produces no tags");
		assert.ok(def.inputs && def.inputs.length > 0, title + " has no inputs");
	});
});

h.test("every template a definition points at exists", function() {
	var w = h.wiki();
	formDefs(w).forEach(function(title) {
		var def = w.data(title);
		assert.ok(w.exists(def.title), title + " names the title template \"" + def.title +
			"\", which does not exist — the form would produce a blank title");
		if(def.body) {
			assert.ok(w.exists(def.body), title + " seeds its body from \"" + def.body +
				"\", which does not exist");
		}
	});
});

h.test("every input is fully specified", function() {
	var w = h.wiki();
	formDefs(w).forEach(function(title) {
		w.data(title).inputs.forEach(function(input) {
			assert.ok(input.name, "an input in " + title + " has no name");
			assert.ok(input.label, input.name + " in " + title + " has no label");
			assert.ok(input.type, input.name + " in " + title + " has no type");
			if(input.type === "select") {
				assert.ok(input.options, input.name + " in " + title + " is a select with no options");
				assert.ok(w.filter(input.options).length > 0,
					input.name + " in " + title + " offers an empty list of options");
			}
		});
	});
});

/*
Both plugins ship a $:/config/forms/labels — English defaults in the engine, the
Norwegian override in the configuration layer. Which one wins is decided by
`plugin-priority`, and without it TiddlyWiki falls back to alphabetical order,
where "intertwingled-innovations" loses to "tiddlywiki". That would silently
revert the whole UI to English, so it is worth pinning.
*/
h.test("the configuration layer's shadows override the engine's", function() {
	var w = h.wiki(),
		labels = w.data("$:/config/forms/labels");
	assert.equal(w.$tw.wiki.getShadowSource("$:/config/forms/labels"), NHN,
		"the engine's default labels are winning over the nhn override — check plugin-priority");
	assert.equal(labels.create, "Opprett");
});

h.suite("Guided creation");

h.test("the review form reproduces the naming convention", function() {
	var w = h.fixtureWiki(),
		state = create(w, REVIEW, {service: "Autentisering og autorisasjon",
			year: "2026", month: "Juni", severity: "2"}),
		made = "06 Autentisering og autorisasjon - hovedtrekk og endringer juni 2026";
	try {
		assert.ok(w.exists(made), "the review was not created under the expected title");
		// Compare against a real review of the same service: same tags, bar the month
		var tags = w.filter("[<t>tags[]sort[]]", {t: made});
		assert.deepEqual(tags, ["2026", "Autentisering og autorisasjon", "Divisjon Helsepersonell",
			"Forretningsmessig endring:2", "Juni", "Styring", "Styring Ekstern tjeneste"].sort());
		assert.equal(w.$tw.wiki.getTiddler(made).fields.TjenesteID, "40031");
		assert.equal(w.$tw.wiki.getTiddler(made).fields.type, "text/vnd.tiddlywiki");
		assert.ok(!w.exists(state), "the form was not cleared after creating");
	} finally {
		discard(w, made);
	}
});

h.test("a created review is recognised by the rest of the system", function() {
	var w = h.fixtureWiki(),
		made = "09 Autentisering og autorisasjon - hovedtrekk og endringer september 2026";
	create(w, REVIEW, {service: "Autentisering og autorisasjon", year: "2026",
		month: "September", severity: "1"});
	try {
		// The point of guided creation: the result is indistinguishable from hand-made
		assert.deepEqual(w.project("nhn-kind", made), ["review"]);
		assert.ok(w.filter("[function[nhn-reviews]]").indexOf(made) !== -1,
			"the new review is not in nhn-reviews");
		assert.deepEqual(w.project("nhn-year", made), ["2026"]);
		assert.deepEqual(w.project("nhn-month", made), ["September"]);
		assert.deepEqual(w.project("nhn-servicename", made), ["Autentisering og autorisasjon"]);
		assert.deepEqual(w.project("nhn-governance-type", made), ["Styring Ekstern tjeneste"]);
		// And it would appear in Extract 1
		assert.ok(w.filter("[function[nhn-extract-governance-set]]",
			{"extract-year": "2026", "extract-month": "September"}).indexOf(made) !== -1,
			"the new review does not appear in the governance extract");
	} finally {
		discard(w, made);
	}
});

h.test("the body is seeded from the template", function() {
	var w = h.fixtureWiki(),
		made = "08 Autentisering og autorisasjon - hovedtrekk og endringer august 2026";
	create(w, REVIEW, {service: "Autentisering og autorisasjon", year: "2026",
		month: "August", severity: "1"});
	try {
		var text = w.$tw.wiki.getTiddlerText(made),
			template = w.$tw.wiki.getTiddlerText(w.data(REVIEW).body);
		assert.equal(text, template, "the new review did not start from the template");
		// but it must not inherit the template's `mal` tag, or it would look like a template
		assert.deepEqual(w.project("nhn-kind", made), ["review"]);
	} finally {
		discard(w, made);
	}
});

/*
`$action-createtiddler` silently uniquifies a clashing title, which would turn a
second attempt at March's review into a stray "… mars 2026 1". The engine refuses
instead. This is the guard that a three-run `:and` condition once let through.
*/
h.test("an existing tiddler is never overwritten or renamed", function() {
	var w = h.fixtureWiki(),
		made = "07 Autentisering og autorisasjon - hovedtrekk og endringer juli 2026";
	create(w, REVIEW, {service: "Autentisering og autorisasjon", year: "2026",
		month: "Juli", severity: "1"});
	try {
		assert.deepEqual(w.project("nhn-severity", made), ["Forretningsmessig endring:1"]);
		var before = w.$tw.wiki.getTiddler(made).fields.modified;
		// Same title, different severity
		var state = create(w, REVIEW, {service: "Autentisering og autorisasjon", year: "2026",
			month: "Juli", severity: "3"});
		assert.deepEqual(w.project("nhn-severity", made), ["Forretningsmessig endring:1"],
			"the second attempt overwrote the existing review");
		assert.equal(w.$tw.wiki.getTiddler(made).fields.modified, before);
		assert.ok(!w.exists(made + " 1"), "a uniquified duplicate was created");
		assert.ok(w.exists(state), "the form was cleared even though nothing was created");
	} finally {
		discard(w, made);
	}
});

h.test("nothing is created while a required input is missing", function() {
	var w = h.fixtureWiki(),
		before = w.filter("[function[nhn-reviews]count[]]")[0];
	// No month: the title would be malformed and the tiddler unfindable by period
	create(w, REVIEW, {service: "Autentisering og autorisasjon", year: "2026", severity: "1"});
	assert.equal(w.filter("[function[nhn-reviews]count[]]")[0], before,
		"a review was created despite a missing required input");
});

h.test("the period stamp records the period the tiddler is for", function() {
	var w = h.fixtureWiki(),
		review = "05 Autentisering og autorisasjon - hovedtrekk og endringer mai 2026",
		objective = "Testmålsetting for perioden";
	create(w, REVIEW, {service: "Autentisering og autorisasjon", year: "2026",
		month: "Mai", severity: "1"});
	create(w, NHN + "/forms/malsetting", {title: objective, year: "2026"});
	try {
		// D3: a monthly kind stamps YYYY-MM, a yearly one just YYYY
		assert.equal(w.$tw.wiki.getTiddler(review).fields.period, "2026-05");
		assert.equal(w.$tw.wiki.getTiddler(objective).fields.period, "2026");
	} finally {
		discard(w, review);
		discard(w, objective);
	}
});

h.test("a free-text form takes its title from the input", function() {
	var w = h.fixtureWiki(),
		parent = w.filter("[function[nhn-objectives]sort[title]first[]]")[0],
		made = "Testresultat fra skjemaet";
	create(w, NHN + "/forms/resultat", {title: made, objective: parent, year: "2026"});
	try {
		assert.ok(w.exists(made));
		// The parent link is the tag, which is how the rest of the model joins
		assert.deepEqual(w.project("nhn-objective-of", made), [parent]);
		assert.deepEqual(w.project("nhn-kind", made), ["resultat"]);
		assert.ok(w.filter("[function[nhn-results]]").indexOf(made) !== -1);
	} finally {
		discard(w, made);
	}
});

h.test("a created delivery lands in the summaries under its service", function() {
	var w = h.fixtureWiki(),
		made = "Testleveranse fra skjemaet";
	create(w, NHN + "/forms/leveranse", {title: made, service: "Autentisering og autorisasjon",
		year: "2026", month: "Februar"});
	try {
		assert.ok(w.filter("[function[nhn-deliveries]]").indexOf(made) !== -1,
			"the new delivery is not in nhn-deliveries");
		assert.deepEqual(w.project("nhn-service-group", made), ["Autentisering og autorisasjon"]);
		assert.deepEqual(w.project("nhn-month", made), ["Februar"]);
	} finally {
		discard(w, made);
	}
});

h.suite("Structured editing");

var LOAD = '<$transclude $variable="forms-load-actions" def=<<d>> target=<<t>> state=<<s>>/>',
	SAVE = '<$transclude $variable="forms-save-actions" def=<<d>> state=<<s>>/>',
	CANCEL = '<$transclude $variable="forms-cancel-actions" state=<<s>>/>';

/* Open a tiddler in its form. Titles go in as variables, never interpolated into
   the wikitext — several real titles contain the quote characters that would
   terminate an attribute. */
function open(wiki, def, target) {
	var state = wiki.filter("[function[forms-edit-state],<t>]", {t: target})[0],
		vars = {d: def, t: target, s: state};
	wiki.invokeActions(LOAD, vars);
	return {state: state, vars: vars,
		set: function(index, value) { wiki.$tw.wiki.setText(state, null, index, value); },
		save: function() { wiki.invokeActions(SAVE, vars); },
		cancel: function() { wiki.invokeActions(CANCEL, vars); }};
}

function tagsOf(wiki, title) {
	return wiki.filter("[<t>tags[]sort[]]", {t: title});
}

h.test("every input can be read back out of a tiddler", function() {
	var w = h.wiki();
	formDefs(w).forEach(function(title) {
		w.data(title).inputs.forEach(function(input) {
			assert.ok(input.from, input.name + " in " + title + " has no `from` filter, " +
				"so editing would silently blank it");
		});
	});
});

h.test("every kind that has a form points at a real one", function() {
	var w = h.wiki(),
		map = w.data(NHN + "/kind-forms"),
		forms = formDefs(w);
	Object.keys(map).forEach(function(kind) {
		assert.ok(forms.indexOf(map[kind]) !== -1,
			"kind \"" + kind + "\" maps to " + map[kind] + ", which is not a form definition");
	});
	// And the kinds themselves must be ones nhn-kind can actually produce
	var kinds = w.filter("[all[tiddlers]] :map:flat[function[nhn-kind]] +[!is[blank]unique[]]");
	Object.keys(map).forEach(function(kind) {
		assert.ok(kinds.indexOf(kind) !== -1, "kind-forms maps \"" + kind + "\", which nhn-kind never returns");
	});
});

h.test("the form reads an existing tiddler back accurately", function() {
	var w = h.fixtureWiki(),
		target = "03 Autentisering og autorisasjon - hovedtrekk og endringer mars 2026",
		form = open(w, REVIEW, target);
	try {
		var values = w.data(form.state);
		assert.equal(values.service, "Autentisering og autorisasjon");
		assert.equal(values.year, "2026");
		assert.equal(values.month, "Mars");
		assert.equal(values.severity, "1");
	} finally {
		form.cancel();
	}
});

/*
The safety property the whole feature rests on: opening a tiddler and saving it
unchanged must be a no-op. If any `from` filter loses information, this is where
it shows up — as a tag quietly disappearing.
*/
h.test("opening and saving without changes leaves the tiddler alone", function() {
	var w = h.fixtureWiki(),
		target = "03 Autentisering og autorisasjon - hovedtrekk og endringer mars 2026",
		before = tagsOf(w, target),
		fieldsBefore = JSON.stringify(w.$tw.wiki.getTiddler(target).fields.TjenesteID),
		form = open(w, REVIEW, target);
	form.save();
	assert.deepEqual(tagsOf(w, target), before, "a round trip through the form changed the tags");
	assert.equal(JSON.stringify(w.$tw.wiki.getTiddler(target).fields.TjenesteID), fieldsBefore);
	assert.ok(w.exists(target), "the tiddler was renamed by a no-op save");
});

h.test("tags the form knows nothing about are preserved", function() {
	var w = h.fixtureWiki(),
		target = 'Leveranse SFM: "Løse resepter" inkluderes automatisk i PLL/eMD',
		form = open(w, NHN + "/forms/leveranse", target);
	// This delivery carries a team tag that no input maps to
	assert.ok(tagsOf(w, target).indexOf("Team SFM") !== -1, "fixture no longer has the team tag");
	form.set("month", "April");
	form.save();
	var after = tagsOf(w, target);
	assert.ok(after.indexOf("Team SFM") !== -1,
		"editing discarded a tag the form does not manage");
	assert.ok(after.indexOf("April") !== -1 && after.indexOf("Mars") === -1,
		"the month tag was not replaced");
});

/* Build a review through the create path, so an editing test owns its target
   rather than mutating one of the snapshot's own tiddlers. Refuses to hand back a
   tiddler that already existed — silently editing real content would make the
   test's outcome depend on whatever that tiddler happens to contain. */
function reviewFor(wiki, month) {
	var made = wiki.filter("[<m>lowercase[]] :map[[" + NHN + "/months]getindex<currentTiddler>]",
			{m: month})[0] + " Autentisering og autorisasjon - hovedtrekk og endringer " +
			month.toLowerCase() + " 2026";
	assert.ok(!wiki.exists(made), "pick a month the snapshot does not already use: " + made);
	create(wiki, REVIEW, {service: "Autentisering og autorisasjon", year: "2026",
		month: month, severity: "1"});
	assert.ok(wiki.exists(made), "could not build the review this test needs: " + made);
	return made;
}

h.test("changing an input that feeds the title renames and relinks", function() {
	var w = h.fixtureWiki(),
		target = reviewFor(w, "Juli"),
		renamed = "10 Autentisering og autorisasjon - hovedtrekk og endringer oktober 2026";
	// Something that points at the review by tagging its title
	w.addTiddler({title: "Test Barn Av Gjennomgang", tags: "[[" + target + "]]", text: "child"});
	try {
		var form = open(w, REVIEW, target);
		form.set("month", "Oktober");
		form.save();
		assert.ok(w.exists(renamed), "the tiddler was not renamed to match its new month");
		assert.ok(!w.exists(target), "the old title survived the rename");
		// Parent-child links in this data are tags, so the rename must carry them
		assert.deepEqual(tagsOf(w, "Test Barn Av Gjennomgang"), [renamed],
			"the child was orphaned by the rename");
	} finally {
		discard(w, "Test Barn Av Gjennomgang");
		discard(w, target);
		discard(w, renamed);
	}
});

h.test("a rename onto an occupied title is refused", function() {
	var w = h.fixtureWiki(),
		target = reviewFor(w, "August"),
		occupied = reviewFor(w, "September"),
		occupiedTags = tagsOf(w, occupied),
		form = open(w, REVIEW, target);
	try {
		form.set("month", "September");
		form.save();
		assert.ok(w.exists(target), "the tiddler was renamed onto an existing one");
		assert.deepEqual(tagsOf(w, occupied), occupiedTags, "the occupied tiddler was modified");
		assert.ok(w.exists(form.state), "the form was cleared even though nothing was saved");
	} finally {
		form.cancel();
		discard(w, target);
		discard(w, occupied);
	}
});

h.test("editing updates the fields a form manages", function() {
	var w = h.fixtureWiki(),
		target = reviewFor(w, "November");
	try {
		var form = open(w, REVIEW, target);
		form.set("severity", "3");
		form.save();
		assert.deepEqual(w.project("nhn-severity", target), ["Forretningsmessig endring:3"]);
		// and the period stamp follows the inputs
		assert.equal(w.$tw.wiki.getTiddler(target).fields.period, "2026-11");
	} finally {
		discard(w, target);
	}
});

h.test("cancelling clears both halves of the form state", function() {
	var w = h.fixtureWiki(),
		target = "Autentisering og autorisasjon",
		form = open(w, NHN + "/forms/tjeneste", target);
	assert.ok(w.exists(form.state));
	assert.ok(w.exists(form.state + "/original"));
	form.cancel();
	assert.ok(!w.exists(form.state), "the form state survived a cancel");
	assert.ok(!w.exists(form.state + "/original"), "the original copy survived a cancel");
});

/*
84% of the reviews in the snapshot carry no `Forretningsmessig endring` tag, so
severity is deliberately optional — a required input that most of the real data
violates would block editing almost every existing review. The inputs that decide
the title stay required, because without them the title is malformed.
*/
h.test("editing is blocked while an input the title needs is missing", function() {
	var w = h.fixtureWiki(),
		// A review with no service tag: 22% of them are like this
		target = w.filter("[function[nhn-reviews]] :filter[<currentTiddler>function[nhn-servicename]count[]match[0]] +[sort[title]first[]]")[0];
	assert.ok(target, "no under-tagged review to test with");
	var before = tagsOf(w, target),
		form = open(w, REVIEW, target);
	try {
		assert.equal(w.data(form.state).service, "", "the fixture unexpectedly has a service");
		form.save();
		assert.deepEqual(tagsOf(w, target), before, "an incomplete review was saved anyway");
		assert.ok(w.exists(form.state), "the form was cleared without saving");
	} finally {
		form.cancel();
	}
});

h.test("an optional input left blank is simply not applied", function() {
	var w = h.fixtureWiki(),
		target = reviewFor(w, "Desember");
	try {
		var form = open(w, REVIEW, target);
		assert.deepEqual(w.project("nhn-severity", target), ["Forretningsmessig endring:1"]);
		form.set("severity", "");
		form.save();
		assert.deepEqual(w.project("nhn-severity", target), [],
			"clearing severity did not remove the tag");
		assert.ok(tagsOf(w, target).indexOf("2026") !== -1, "unrelated tags were disturbed");
	} finally {
		discard(w, target);
	}
});
