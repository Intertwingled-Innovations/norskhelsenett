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

var MONTHS = ["Januar", "Februar", "Mars", "April", "Mai", "Juni",
	"Juli", "August", "September", "Oktober", "November", "Desember"];

/*
Pick a month of `year` that `service` has no review for yet, and return the
title the review form should give it.

The snapshot is refreshed periodically, and every refresh brings months that
were free when a test was written. Creating over an existing title is refused —
correctly — so a test that names its own month starts failing on data grounds
rather than on behaviour. Asking for a free period keeps the assertion about the
naming convention instead of about which months NHN have filed. It also keeps
`discard` honest: a title that did not exist beforehand is safe to delete from
the shared fixture wiki afterwards.
*/
function freePeriod(wiki, service, year) {
	for(var i = 0; i < MONTHS.length; i++) {
		var period = {
			month: MONTHS[i],
			ord: String(i + 1).padStart(2, "0"),
			year: year
		};
		period.title = period.ord + " " + service + " - hovedtrekk og endringer " +
			period.month.toLowerCase() + " " + year;
		if(!wiki.exists(period.title)) {
			return period;
		}
	}
	throw new Error("every month of " + year + " already has a review for " + service +
		" — this test needs a service or year with a free month");
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
	var w = h.fixtureWiki(),
		state = "$:/state/test/form/body-check";
	// A body may depend on what was picked — the review's carries the chosen
	// service's Power BI link — so evaluate it as the form does, with a service chosen
	w.addTiddler({title: state, type: "application/json",
		text: JSON.stringify({service: "Autentisering og autorisasjon", year: "2026", month: "Mars"})});
	try {
		formDefs(w).forEach(function(title) {
			var def = w.data(title);
			assert.ok(w.exists(def.title), title + " names the title template \"" + def.title +
				"\", which does not exist — the form would produce a blank title");
			if(def.body) {
				// body is a filter producing the seed text, so a renamed template
				// cannot silently blank every new tiddler
				assert.ok(w.filter(def.body, {"forms-state": state}).join("").length > 0, title +
					" seeds its body from \"" + def.body + "\", a filter that produces no text");
			}
		});
	} finally {
		discard(w, state);
	}
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
		p = freePeriod(w, "Autentisering og autorisasjon", "2026"),
		state = create(w, REVIEW, {service: "Autentisering og autorisasjon",
			year: p.year, month: p.month, severity: "2"}),
		made = p.title;
	try {
		assert.ok(w.exists(made), "the review was not created under the expected title");
		// Compare against a real review of the same service: same tags, bar the month
		var tags = w.filter("[<t>tags[]sort[]]", {t: made});
		assert.deepEqual(tags, ["2026", "Autentisering og autorisasjon", "Divisjon Helsepersonell",
			"Forretningsmessig endring:2", p.month, "Styring", "Styring Ekstern tjeneste"].sort());
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
		p = freePeriod(w, "Autentisering og autorisasjon", "2026"),
		made = p.title;
	create(w, REVIEW, {service: "Autentisering og autorisasjon", year: p.year,
		month: p.month, severity: "1"});
	try {
		var text = w.$tw.wiki.getTiddlerText(made),
			// the definition finds the template by its `mal` tag, not by title,
			// so renaming the template cannot break seeding
			template = w.$tw.wiki.getTiddlerText(w.filter("[function[nhn-template-text]]")[0]);
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
		p = freePeriod(w, "Autentisering og autorisasjon", "2026"),
		review = p.title,
		objective = "Testmålsetting for perioden";
	create(w, REVIEW, {service: "Autentisering og autorisasjon", year: p.year,
		month: p.month, severity: "1"});
	create(w, NHN + "/forms/malsetting", {title: objective, year: "2026"});
	try {
		// D3: a monthly kind stamps YYYY-MM, a yearly one just YYYY
		assert.equal(w.$tw.wiki.getTiddler(review).fields.period, p.year + "-" + p.ord);
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

/*
The snapshot's real drift: reviews tagged a lowercase month where the canonical
tag is capitalised. The `from` filters read values back canonically, so an exact
old-tags subtraction misses the stored variant and a no-op save would add the
canonical tag alongside it — manufacturing the very anomaly the wiki flags.
Saving through the form must replace the drifted tag, not duplicate it.
*/
h.test("a no-op save normalises a drifted tag instead of duplicating it", function() {
	var w = h.fixtureWiki(),
		target = "11 Autentisering og autorisasjon - hovedtrekk og endringer november 2026";
	assert.ok(!w.exists(target), "the snapshot already has this review, pick another month");
	w.addTiddler({title: target,
		tags: "2026 november [[Styring Ekstern tjeneste]] [[Divisjon Helsepersonell]] [[Autentisering og autorisasjon]]",
		text: "Egen tekst for driftstesten."});
	try {
		var form = open(w, REVIEW, target);
		form.save();
		var after = tagsOf(w, target);
		assert.ok(after.indexOf("Mars") === -1, "a month the tiddler never had appeared");
		assert.ok(after.indexOf("November") !== -1, "the canonical month tag was not written");
		assert.ok(after.indexOf("november") === -1,
			"the drifted month tag survived alongside the canonical one");
	} finally {
		w.$tw.wiki.deleteTiddler(target);
	}
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
   test's outcome depend on whatever that tiddler happens to contain.

   The targets live in EDIT_YEAR, not the current year: every snapshot refresh
   brings the months NHN have filed since, and the September 2026 refresh took
   August and December. 2031 is also the fixtures' isolated year, so it is a
   year in use and the form offers it. */
var EDIT_YEAR = "2031";

function reviewFor(wiki, month) {
	var made = wiki.filter("[<m>lowercase[]] :map[[" + NHN + "/months]getindex<currentTiddler>]",
			{m: month})[0] + " Autentisering og autorisasjon - hovedtrekk og endringer " +
			month.toLowerCase() + " " + EDIT_YEAR;
	assert.ok(!wiki.exists(made), "pick a month the snapshot does not already use: " + made);
	create(wiki, REVIEW, {service: "Autentisering og autorisasjon", year: EDIT_YEAR,
		month: month, severity: "1"});
	assert.ok(wiki.exists(made), "could not build the review this test needs: " + made);
	return made;
}

h.test("changing an input that feeds the title renames and relinks", function() {
	var w = h.fixtureWiki(),
		target = reviewFor(w, "Juli"),
		renamed = "10 Autentisering og autorisasjon - hovedtrekk og endringer oktober " + EDIT_YEAR;
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
		assert.equal(w.$tw.wiki.getTiddler(target).fields.period, EDIT_YEAR + "-11");
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
		assert.ok(tagsOf(w, target).indexOf(EDIT_YEAR) !== -1, "unrelated tags were disturbed");
	} finally {
		discard(w, target);
	}
});

h.suite("Typing in a form");

/*
The title preview is produced by `$wikify`, and a $wikify whose text changes
re-renders its children. With the inputs inside it, every keystroke in a field
that feeds the title destroyed and rebuilt the input — the caret jumped out of
"Tjenestenavn" after each character. So the inputs live outside the $wikify,
and only the preview and the buttons are rebuilt.

A rebuilt input is invisible to a test that reads markup: the markup is
identical. This compares the widget and its DOM node across a refresh.
*/

/* The $edit-text widgets of a rendered form, in order, with their DOM nodes. */
function editInputs(widget) {
	var found = [];
	(function walk(node) {
		if(node.parseTreeNode && node.parseTreeNode.tag === "$edit-text" &&
				node.domNodes && node.domNodes.length) {
			found.push(node);
		}
		(node.children || []).forEach(walk);
	})(widget);
	return found;
}

/* Render `procedure`, type `typed` into index `index`, refresh as the browser would. */
function typeInto(wiki, procedure, def, values, index, typed) {
	var state = "$:/state/test/form/typing",
		changes = {};
	wiki.addTiddler({title: state, type: "application/json", text: JSON.stringify(values)});
	var root = wiki.widgetTree('<$transclude $variable="' + procedure + '" def=<<d>> state=<<s>>/>',
			{d: def, s: state}),
		before = editInputs(root);
	wiki.$tw.wiki.setText(state, null, index, typed);
	changes[state] = {modified: true};
	root.refresh(changes);
	return {before: before, after: editInputs(root), root: root, state: state};
}

/* The rendered text of the whole form, for reading the preview back. */
function textOf(widget) {
	var parts = [];
	(function walk(node) {
		(node.domNodes || []).forEach(function(dom) {
			if(dom.textContent) { parts.push(dom.textContent); }
		});
		(node.children || []).forEach(walk);
	})(widget);
	return parts.join(" ");
}

h.test("typing a service name keeps the input, and still updates the preview", function() {
	var w = h.fixtureWiki(),
		r = typeInto(w, "forms-form", NHN + "/forms/tjeneste",
			{title: "Testtjeneste N", type: "Ekstern tjeneste"}, "title", "Testtjeneste Ny");
	try {
		assert.equal(r.before.length, r.after.length, "the form lost or gained an input");
		assert.ok(r.before.length > 0, "the form rendered no text inputs");
		// identity, compared with assert.ok: a failing assert.equal on two widgets
		// builds a diff of the whole cyclic widget tree and exhausts the heap
		r.before.forEach(function(input, i) {
			assert.ok(r.after[i] === input, "input " + i + " was rebuilt, so the caret would jump out");
			assert.ok(r.after[i].domNodes[0] === input.domNodes[0], "input " + i + "'s DOM node was replaced");
		});
		assert.ok(textOf(r.root).indexOf("Testtjeneste Ny") !== -1,
			"the title preview did not follow what was typed: " + textOf(r.root));
	} finally {
		discard(w, r.state);
	}
});

h.test("editing an existing tiddler keeps the input too", function() {
	var w = h.fixtureWiki(),
		target = "Test Tjeneste Med Eier",
		values = {title: target, type: "Ekstern tjeneste"},
		r;
	w.addTiddler({title: "$:/state/test/form/typing", type: "application/json",
		text: JSON.stringify(values), "forms-target": target});
	r = typeInto(w, "forms-edit", NHN + "/forms/tjeneste", values, "title", target + " II");
	try {
		assert.ok(r.before.length > 0, "the edit form rendered no text inputs");
		r.before.forEach(function(input, i) {
			assert.ok(r.after[i] === input, "input " + i + " was rebuilt while editing");
			assert.ok(r.after[i].domNodes[0] === input.domNodes[0], "input " + i + "'s DOM node was replaced");
		});
	} finally {
		discard(w, r.state);
	}
});

h.suite("Governance tag on a review");

var TJENESTE = NHN + "/forms/tjeneste";

/* A fixture service with a given classification. `Test Divisjon` is what makes
   it a service; 2031 keeps it clear of the snapshot's own years. */
function classified(wiki, title, tags) {
	wiki.addTiddler({title: title, TjenesteID: "99200", text: "Fixture service",
		tags: wiki.$tw.utils.stringifyList(tags.concat(["Test Divisjon", EDIT_YEAR]))});
	return title;
}

function marchReview(service) {
	return "03 " + service + " - hovedtrekk og endringer mars " + EDIT_YEAR;
}

/*
NHN's rule, from their action items of 18 September 2026: the governance tag on a
review follows from the tags on its service. The rule table itself is checked in
rules.test.js; this is the form actually applying it to what it creates.
*/
h.test("a new review takes the governance tag its service's classification implies", function() {
	var w = h.fixtureWiki(),
		cases = [
			["Test Styring Intern", ["Intern tjeneste"], "Styring Intern tjeneste"],
			["Test Styring Relatert", ["Ekstern tjeneste", "Relatert tjeneste"], "Styring Relatert tjeneste"],
			["Test Styring Satsing", ["Ekstern tjeneste", "Satsing for fart"], "Styring Satsing for fart"],
			["Test Styring HOD", ["Oppgaver fra HOD", "Ekstern tjeneste"], "Styring Oppgaver fra HOD"],
			["Test Styring Ekstern", ["Ekstern tjeneste"], "Styring Ekstern tjeneste"]
		],
		made = [];
	try {
		cases.forEach(function(c) {
			var service = classified(w, c[0], c[1]),
				review = marchReview(service);
			made.push(service, review);
			create(w, REVIEW, {service: service, year: EDIT_YEAR, month: "Mars"});
			assert.ok(w.exists(review), "no review was created for " + service);
			assert.deepEqual(w.project("nhn-governance-type", review), [c[2]], service);
			assert.ok(w.filter("[function[nhn-reviews]]").indexOf(review) !== -1,
				"the review for " + service + " is not selected as a review");
		});
	} finally {
		made.forEach(function(t) { discard(w, t); });
	}
});

/*
A review with no governance tag is not merely mis-filed: every selector starts
from the governance tags, so it would be in no tree, no extract and no ToDo list.
The form therefore refuses, and says what to fix, rather than create it.
*/
h.test("no review is created for a service the rules cannot place, and the form says why", function() {
	var w = h.fixtureWiki(),
		unplaced = classified(w, "Test Styring Uplassert", ["Relatert tjeneste"]),
		placed = classified(w, "Test Styring Plassert", ["Ekstern tjeneste", "Relatert tjeneste"]),
		state = create(w, REVIEW, {service: unplaced, year: EDIT_YEAR, month: "Mars"}),
		form = '<$transclude $variable="forms-form" def="' + REVIEW + '" state="' + state + '"/>';
	try {
		assert.ok(!w.exists(marchReview(unplaced)), "a review with no governance tag was created");
		var html = w.render(form);
		assert.ok(html.indexOf("Sett tjenestetype") !== -1, "the form does not explain why it cannot create the review");
		assert.ok(html.indexOf("tc-btn-big-green") === -1, "the form still offers its create button");
		// The same form, pointed at a service the rules do place
		w.$tw.wiki.setText(state, null, "service", placed);
		html = w.render(form);
		assert.ok(html.indexOf("Styringstagg") !== -1 && html.indexOf("Styring Relatert tjeneste") !== -1,
			"the form does not show the governance tag it is about to apply");
		assert.ok(html.indexOf("tc-btn-big-green") !== -1, "the form offers no create button for a placeable service");
		assert.ok(html.indexOf("Sett tjenestetype") === -1, "the warning shows for a placeable service");
	} finally {
		[unplaced, placed, state, marchReview(unplaced), marchReview(placed)].forEach(function(t) { discard(w, t); });
	}
});

/*
Saving removes the tags the form would have produced when it loaded — but a
review written before its service was reclassified carries a tag the form no
longer produces, so without the definition's `owns` list a save would leave it
with two governance tags.
*/
h.test("reopening a review that carries a retired governance tag replaces it", function() {
	var w = h.fixtureWiki(),
		service = classified(w, "Test Styring Omklassifisert", ["Ekstern tjeneste", "Oppgaver fra HOD"]),
		target = marchReview(service);
	w.addTiddler({title: target, text: "Skrevet for lenge siden",
		tags: w.$tw.utils.stringifyList(["Styring", "Styring Tiltak", "Test Divisjon", EDIT_YEAR, "Mars", service, "Levert"])});
	try {
		var form = open(w, REVIEW, target);
		form.save();
		assert.ok(!w.exists(form.state), "the save was refused");
		var tags = tagsOf(w, target);
		assert.ok(tags.indexOf("Styring Oppgaver fra HOD") !== -1, "the review did not get its service's governance tag: " + tags.join(", "));
		assert.ok(tags.indexOf("Styring Tiltak") === -1, "the retired governance tag survived the save");
		assert.ok(tags.indexOf("Levert") !== -1, "a tag the form does not manage was dropped");
	} finally {
		discard(w, target);
		discard(w, service);
	}
});

/* The same refusal on the way back in: an edit must not strip a review's
   governance tag because its service has since lost its type. */
h.test("an edit is refused while the service gives no governance tag", function() {
	var w = h.fixtureWiki(),
		service = classified(w, "Test Styring Mistet Type", ["Relatert tjeneste"]),
		target = marchReview(service);
	w.addTiddler({title: target, text: "Skrevet",
		tags: w.$tw.utils.stringifyList(["Styring", "Styring Ekstern tjeneste", "Test Divisjon", EDIT_YEAR, "Mars", service])});
	var before = tagsOf(w, target),
		form = open(w, REVIEW, target);
	try {
		form.set("severity", "2");
		form.save();
		assert.deepEqual(tagsOf(w, target), before, "the review was saved without a governance tag to give it");
		assert.ok(w.exists(form.state), "the form was cleared even though nothing was saved");
		var html = w.render('<$transclude $variable="forms-edit" def="' + REVIEW + '" state="' + form.state + '"/>');
		assert.ok(html.indexOf("Sett tjenestetype") !== -1, "the edit form does not explain why it cannot save");
	} finally {
		form.cancel();
		discard(w, target);
		discard(w, service);
	}
});

h.suite("Service type and category");

h.test("the service form offers two types and three categories", function() {
	var w = h.wiki(),
		inputs = {};
	w.data(TJENESTE).inputs.forEach(function(input) { inputs[input.name] = input; });
	assert.deepEqual(w.filter(inputs.servicetype.options), ["Ekstern tjeneste", "Intern tjeneste"]);
	assert.deepEqual(w.filter(inputs.category.options), ["Relatert tjeneste", "Satsing for fart", "Oppgaver fra HOD"]);
	assert.equal(inputs.servicetype.required, "yes");
	assert.ok(!inputs.category.required, "the category must stay optional: most services have none");
});

h.test("a service is created with its type and its category", function() {
	var w = h.fixtureWiki(),
		made = "Test Tjeneste Fra Skjema";
	create(w, TJENESTE, {title: made, unit: "Test Divisjon", servicetype: "Ekstern tjeneste",
		category: "Satsing for fart", year: EDIT_YEAR});
	try {
		assert.deepEqual(tagsOf(w, made), [EDIT_YEAR, "Ekstern tjeneste", "Satsing for fart", "Test Divisjon"].sort());
		assert.deepEqual(w.filter("[function[nhn-governance-for],<s>]", {s: made}), ["Styring Satsing for fart"]);
	} finally {
		discard(w, made);
	}
});

/*
The form used to read "the first service-type tag" back as the type. With two
tags on a service that is whichever was stored first, so a service tagged
Relatert before Ekstern opened as type Relatert — not an option any more — and
saving it would have stripped a tag.
*/
h.test("editing reads type and category back whatever order the tags are in", function() {
	var w = h.fixtureWiki(),
		target = "Test Tjeneste Rekkefolge";
	w.addTiddler({title: target, text: "Fixture service",
		tags: "[[Relatert tjeneste]] [[Ekstern tjeneste]] [[Test Divisjon]] " + EDIT_YEAR + " [[Test Egen Tagg]]"});
	try {
		var before = tagsOf(w, target),
			form = open(w, TJENESTE, target);
		assert.equal(w.data(form.state).servicetype, "Ekstern tjeneste");
		assert.equal(w.data(form.state).category, "Relatert tjeneste");
		form.save();
		assert.deepEqual(tagsOf(w, target), before, "opening and saving unchanged altered the tags");
		// Clearing the category removes that tag and nothing else
		form = open(w, TJENESTE, target);
		form.set("category", "");
		form.save();
		assert.deepEqual(tagsOf(w, target), before.filter(function(t) { return t !== "Relatert tjeneste"; }));
	} finally {
		discard(w, target);
	}
});

h.test("saving a service through the form retires an old type tag", function() {
	var w = h.fixtureWiki(),
		target = "Test Tjeneste Gammel Type";
	w.addTiddler({title: target, text: "Fixture service",
		tags: "Tiltak [[Ekstern Tjeneste]] [[Test Divisjon]] " + EDIT_YEAR});
	try {
		var form = open(w, TJENESTE, target);
		assert.equal(w.data(form.state).servicetype, "Ekstern tjeneste", "the type was not read back in canonical casing");
		assert.equal(w.data(form.state).category, "");
		form.set("category", "Oppgaver fra HOD");
		form.save();
		assert.deepEqual(tagsOf(w, target), [EDIT_YEAR, "Ekstern tjeneste", "Oppgaver fra HOD", "Test Divisjon"].sort());
	} finally {
		discard(w, target);
	}
});
