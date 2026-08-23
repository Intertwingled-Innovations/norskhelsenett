/*
The business-review ToDo list (brief §3.5) — validators that answer "who still
owes this month's review".

The hard part is not the arithmetic, it is attribution: deciding which service a
review belongs to in a corpus where a fifth of them do not say. A wrong answer
here is worse than no feature, because a list that reports work as missing when
it was done is a list nobody trusts twice.
*/

"use strict";

var h = require("./harness.js"),
	assert = h.assert,
	NHN = "$:/plugins/intertwingled-innovations/nhn";

/* The contract the generic to-do engine expects a page to have bound. */
function period(wiki, year, month, priorTitles) {
	var reviews = wiki.filter("[function[nhn-reviews-all]] :filter[function[nhn-year]match<y>] :filter[function[nhn-month]match<m>]",
			{y: year, m: month}),
		yearReviews = wiki.filter("[function[nhn-reviews-all]] :filter[function[nhn-year]match<y>]", {y: year});
	return rollUp(wiki, {
		"todo-items": reviews.map(list).join(" "),
		"todo-year-items": yearReviews.map(list).join(" "),
		"todo-prior-items": (priorTitles || []).map(list).join(" "),
		"todo-attribution": "nhn-review-service",
		"todo-template": wiki.filter("[function[nhn-template-text]]")[0]
	});
}

/* Reduce the period into the three membership sets, exactly as a page does —
   by calling the same engine functions the pages call, so the precedence
   subtraction lives in one place (forms/todo.tid) rather than being pinned a
   second time here. */
function rollUp(wiki, vars) {
	["done-set", "copy-set", "template-set"].forEach(function(fn) {
		var state = fn.split("-")[0];
		vars["todo-set-" + state] = wiki.filter("[function[forms-todo-" + fn + "]]", vars).map(list).join(" ");
	});
	return vars;
}

function list(title) {
	return /[\s\[\]]/.test(title) ? "[[" + title + "]]" : title;
}

function statusOf(wiki, vars, member) {
	return wiki.filter("[function[forms-todo-status]]",
		Object.assign({}, vars, {"todo-member": member}))[0];
}

h.suite("Review attribution");

h.test("a review is attributed by its service tag", function() {
	var w = h.wiki();
	assert.deepEqual(
		w.project("nhn-review-service", "03 Autentisering og autorisasjon - hovedtrekk og endringer mars 2026"),
		["Autentisering og autorisasjon"]);
});

/*
14 reviews name a real service in the title but carry no service tag. Without the
fallback each would be reported missing every month it exists.
*/
h.test("a review with no service tag falls back to its title", function() {
	var w = h.wiki(),
		target = "03 DHP-Satsninger - hovedtrekk og endringer mars 2026";
	assert.deepEqual(w.project("nhn-servicename", target), [], "fixture now has a service tag");
	assert.deepEqual(w.project("nhn-review-service", target), ["DHP-Satsninger"]);
});

h.test("attribution never invents a service", function() {
	var w = h.wiki(),
		// `Kjernejournal` is a tag with no tiddler behind it, so it is not a service
		target = "01 Kjernejournal - hovedtrekk og endringer januar 2025";
	assert.ok(w.exists(target), "fixture is missing");
	assert.deepEqual(w.project("nhn-review-service", target), [],
		"a name with no service tiddler behind it was accepted as a service");
});

h.test("every attribution resolves to a real service", function() {
	var w = h.wiki(),
		services = {};
	w.filter("[function[nhn-services]]").forEach(function(s) { services[s] = true; });
	w.filter("[function[nhn-reviews]]").forEach(function(t) {
		w.project("nhn-review-service", t).forEach(function(s) {
			assert.ok(services[s], t + " was attributed to \"" + s + "\", which is not a service");
		});
	});
});

h.suite("Review status");

h.test("a service with no review this period is missing", function() {
	var w = h.wiki(),
		vars = period(w, "2026", "Mars");
	// A service that exists but filed nothing in March
	var without = w.filter("[function[nhn-services]] -[function[forms-todo-covered]] +[first[]]", vars)[0];
	assert.ok(without, "every service filed in March, pick another period");
	assert.equal(statusOf(w, vars, without), "missing");
});

h.test("a service with a written review is done", function() {
	var w = h.wiki(),
		vars = period(w, "2026", "Mars");
	assert.equal(statusOf(w, vars, "Autentisering og autorisasjon"), "done");
});

/*
Guided creation seeds a new review from the template, so every review begins as
an untouched copy of it. Recognising that state is what stops the ToDo list
going quiet the moment somebody clicks "create" without writing anything.
*/
h.test("a review that is still the template counts as unwritten", function() {
	var w = h.fixtureWiki(),
		state = "$:/state/test/todo/review",
		made = "07 Autentisering og autorisasjon - hovedtrekk og endringer juli 2026";
	w.addTiddler({title: state, type: "application/json", text: JSON.stringify({
		service: "Autentisering og autorisasjon", year: "2026", month: "Juli"})});
	w.invokeActions('<$transclude $variable="forms-create-actions" def=<<d>> state=<<s>>/>',
		{d: NHN + "/forms/review", s: state});
	try {
		assert.ok(w.exists(made), "the review was not created");
		var vars = period(w, "2026", "Juli");
		assert.equal(statusOf(w, vars, "Autentisering og autorisasjon"), "template",
			"a freshly created review should read as unwritten, not done");
		// ...and writing something moves it on. The sets are rolled up per period,
		// so they have to be recomputed after the content changes.
		w.$tw.wiki.setText(made, "text", null, "Vi har gjort en del i juli.");
		assert.equal(statusOf(w, period(w, "2026", "Juli"), "Autentisering og autorisasjon"), "done");
	} finally {
		w.$tw.wiki.deleteTiddler(made);
	}
});

h.test("a review copied from the previous period is caught", function() {
	var w = h.fixtureWiki(),
		prior = "01 Autentisering og autorisasjon - hovedtrekk og endringer januar 2026",
		made = "08 Autentisering og autorisasjon - hovedtrekk og endringer august 2026";
	assert.ok(w.exists(prior), "fixture is missing");
	w.addTiddler({title: made, tags: "Styring [[Styring Ekstern tjeneste]] [[Divisjon Helsepersonell]] " +
		"2026 August [[Autentisering og autorisasjon]]",
		text: w.$tw.wiki.getTiddlerText(prior)});
	try {
		var vars = period(w, "2026", "August", [prior]);
		assert.equal(statusOf(w, vars, "Autentisering og autorisasjon"), "copy",
			"text identical to the previous period was accepted as new work");
	} finally {
		w.$tw.wiki.deleteTiddler(made);
	}
});

/*
Archiving hides content from navigation, extracts and summaries, but the ToDo
lists answer "was the work done" — a question archiving must not be able to lie
about. Both nhn-reviews-all and nhn-objectives-all keep archived items, and the
ToDo pages read those, not the archived-subtracting base selectors.
*/
h.test("archiving a review does not turn its status back to missing", function() {
	var w = h.fixtureWiki(),
		made = "09 Autentisering og autorisasjon - hovedtrekk og endringer september 2026";
	w.addTiddler({title: made, tags: "Styring [[Styring Ekstern tjeneste]] [[Divisjon Helsepersonell]] " +
		"2026 September [[Autentisering og autorisasjon]] Arkiv",
		text: "Arkivert innhold."});
	try {
		var vars = period(w, "2026", "September");
		assert.equal(statusOf(w, vars, "Autentisering og autorisasjon"), "done",
			"an archived review was reported as missing");
	} finally {
		w.$tw.wiki.deleteTiddler(made);
	}
});

h.test("archiving the prior period does not blind copy detection", function() {
	var w = h.fixtureWiki(),
		prior = "01 Autentisering og autorisasjon - hovedtrekk og endringer januar 2026",
		made = "10 Autentisering og autorisasjon - hovedtrekk og endringer oktober 2026";
	assert.ok(w.exists(prior), "fixture is missing");
	w.addTiddler({title: made, tags: "Styring [[Styring Ekstern tjeneste]] [[Divisjon Helsepersonell]] " +
		"2026 Oktober [[Autentisering og autorisasjon]]",
		text: w.$tw.wiki.getTiddlerText(prior)});
	var priorTags = w.$tw.wiki.getTiddler(prior).fields.tags;
	w.$tw.wiki.setText(prior, "tags", null, priorTags.concat(["Arkiv"]));
	try {
		var vars = period(w, "2026", "Oktober", [prior]);
		assert.equal(statusOf(w, vars, "Autentisering og autorisasjon"), "copy",
			"an archived prior review no longer counted as a copy source");
	} finally {
		w.$tw.wiki.deleteTiddler(made);
		w.$tw.wiki.setText(prior, "tags", null, priorTags);
	}
});

h.suite("ToDo population");

h.test("the reporting services are a subset of the services", function() {
	var w = h.wiki(),
		vars = period(w, "2026", "Mars"),
		all = w.filter("[function[nhn-services]]"),
		reporting = w.filter("[function[nhn-services]] :intersection[function[forms-todo-covered-in],<todo-year-items>]", vars);
	assert.ok(reporting.length > 0, "no service reported in 2026");
	assert.ok(reporting.length < all.length,
		"every service reports, so the scope toggle would be pointless");
	reporting.forEach(function(s) {
		assert.ok(all.indexOf(s) !== -1, s + " reports but is not a service");
	});
});

/*
The summary counts each come from their own filter, so nothing stops them
double-counting or losing a service unless something checks they still partition.
*/
h.test("the summary counts account for every service exactly once", function() {
	var w = h.wiki(),
		vars = period(w, "2026", "Mars"),
		services = w.filter("[function[nhn-services]] :intersection[function[forms-todo-covered-in],<todo-year-items>]", vars),
		buckets = ["done", "copy", "template"].map(function(state) {
			return w.filter("[function[nhn-services]] :intersection[function[forms-todo-covered-in],<todo-year-items>] " +
				":intersection[enlist<set>]", Object.assign({set: vars["todo-set-" + state]}, vars));
		}),
		missing = w.filter("[function[nhn-services]] :intersection[function[forms-todo-covered-in],<todo-year-items>] " +
			"-[function[forms-todo-covered]]", vars),
		total = buckets.reduce(function(n, b) { return n + b.length; }, 0) + missing.length;
	assert.equal(total, services.length,
		"the buckets add up to " + total + " but there are " + services.length + " services");
	// and no service appears in two buckets
	var seen = {};
	buckets.concat([missing]).forEach(function(b) {
		b.forEach(function(s) {
			assert.ok(!seen[s], s + " is counted in more than one status");
			seen[s] = true;
		});
	});
});

h.suite("Owner import");

/*
Invokes the page's own nhn-owner-apply-lines procedure — the button on
Tjenesteeiere transcludes the same procedure — so a change to the separator
regexp or the self-name guard on the page is exactly what this test exercises,
rather than a hand-copied reimplementation of it.
*/
h.test("pasted owners are applied to known services and unknown names skipped", function() {
	var w = h.fixtureWiki(),
		apply = '<$let known={{{ [enlist<names>] :intersection[function[nhn-services]] +[format:titlelist[]join[ ]] }}}>' +
			'<$transclude $variable="nhn-owner-apply-lines" lines=<<lines>> known=<<known>>/></$let>',
		lines = "[[Etterkontroll;Ola Hansen]] [[Finnes Ikke;Per Berg]]",
		names = "Etterkontroll [[Finnes Ikke]]";
	// Restore rather than delete: Etterkontroll is a real service in the snapshot
	var before = w.$tw.wiki.getTiddler("Etterkontroll");
	try {
		w.invokeActions(apply, {lines: lines, names: names});
		assert.deepEqual(w.project("nhn-owner", "Etterkontroll"), ["Ola Hansen"]);
		assert.ok(!w.exists("Finnes Ikke"), "an unknown name was turned into a tiddler");
	} finally {
		w.$tw.wiki.addTiddler(before);
	}
});

h.suite("OKR ToDo");

/* The OKR list is the same engine with a different period, item set and
   attribution — no template, because objectives are not seeded from one. */
function okrPeriod(wiki, year) {
	var items = wiki.filter("[function[nhn-objectives-all]] :filter[function[nhn-year]match<y>]", {y: year}),
		prior = wiki.filter("[function[nhn-objectives-all]] :filter[function[nhn-year]match<y>]",
			{y: String(Number(year) - 1)});
	return rollUp(wiki, {
		"todo-items": items.map(list).join(" "),
		"todo-prior-items": prior.map(list).join(" "),
		"todo-attribution": "nhn-servicename",
		"todo-template": ""
	});
}

h.test("a service with an objective for the year is done", function() {
	var w = h.wiki(),
		vars = okrPeriod(w, "2026"),
		covered = w.filter("[function[nhn-services]] :intersection[function[forms-todo-covered]]", vars);
	assert.ok(covered.length > 0, "no service has an objective for 2026");
	assert.equal(statusOf(w, vars, covered[0]), "done");
});

h.test("an active service with no objective is missing", function() {
	var w = h.wiki(),
		vars = okrPeriod(w, "2026"),
		without = w.filter("[function[nhn-services]] -[function[forms-todo-covered]] +[first[]]", vars)[0];
	assert.ok(without, "every service has an objective, pick another year");
	assert.equal(statusOf(w, vars, without), "missing");
});

h.test("with no template configured only an empty item reads as unwritten", function() {
	var w = h.wiki(),
		vars = okrPeriod(w, "2026"),
		// todo-template is blank for OKRs, so `template` can only mean "text is empty"
		blank = w.filter("[enlist<todo-items>] :filter[get[text]trim[]!is[blank]count[]match[0]] :map:flat[function[nhn-servicename]] +[unique[]sort[]]", vars);
	assert.deepEqual(w.filter("[function[forms-todo-with-state],[template]] +[sort[]]", vars), blank);
});

/*
An item whose text is blank is not written work. Without an explicit guard the
state derivation falls through to `done` — the template and copy checks both
require non-blank text — so someone who created an objective and deleted the
seeded text would silence the ToDo list.
*/
h.test("an empty item is unwritten, not done", function() {
	var w = h.fixtureWiki(),
		service = "Autentisering og autorisasjon",
		title = "Test målsetting uten innhold";
	assert.deepEqual(w.filter("[function[nhn-objectives]] :filter[function[nhn-year]match[2031]]"), [],
		"2031 already has objectives, pick another year");
	w.addTiddler({title: title, tags: "Målsetting 2031 [[" + service + "]]", text: ""});
	try {
		var vars = okrPeriod(w, "2031");
		assert.equal(statusOf(w, vars, service), "template",
			"a blank objective was read as written work");
	} finally {
		w.$tw.wiki.deleteTiddler(title);
	}
});

/*
A service files one review a month but may hold several objectives in a year.
The status is the best of them, and the roll-up must not count the service twice.
*/
h.test("a service with several objectives counts once, at its best state", function() {
	var w = h.fixtureWiki(),
		service = "Autentisering og autorisasjon",
		prior = w.filter("[function[nhn-objectives]] :filter[function[nhn-year]match[2025]] +[first[]]")[0],
		copied = "Test målsetting kopiert",
		fresh = "Test målsetting med eget innhold";
	assert.ok(prior, "no 2025 objective to copy from");
	w.addTiddler({title: copied, tags: "Målsetting 2026 [[" + service + "]]",
		text: w.$tw.wiki.getTiddlerText(prior)});
	w.addTiddler({title: fresh, tags: "Målsetting 2026 [[" + service + "]]",
		text: "Noe helt eget for 2026."});
	try {
		var vars = okrPeriod(w, "2026");
		assert.equal(statusOf(w, vars, service), "done",
			"one real objective should cover the year even alongside a copied one");
		// and the service appears in exactly one bucket
		var inDone = w.filter("[<m>] :intersection[enlist<todo-set-done>]", Object.assign({m: service}, vars)),
			inCopy = w.filter("[<m>] :intersection[enlist<todo-set-copy>]", Object.assign({m: service}, vars));
		assert.equal(inDone.length, 1);
		assert.equal(inCopy.length, 0, "the service was counted as both done and copied");
	} finally {
		w.$tw.wiki.deleteTiddler(copied);
		w.$tw.wiki.deleteTiddler(fresh);
	}
});

h.test("the OKR summary counts partition the population", function() {
	var w = h.wiki(),
		vars = okrPeriod(w, "2026"),
		population = w.filter("[function[nhn-services]]"),
		buckets = ["done", "copy", "template"].map(function(state) {
			return w.filter("[function[nhn-services]] :intersection[enlist<set>]",
				Object.assign({set: vars["todo-set-" + state]}, vars));
		}),
		missing = w.filter("[function[nhn-services]] -[function[forms-todo-covered]]", vars),
		total = buckets.reduce(function(n, b) { return n + b.length; }, 0) + missing.length;
	assert.equal(total, population.length,
		"the buckets add up to " + total + " but there are " + population.length + " services");
});

h.suite("ToDo pages");

/* Pull the four counts out of a rendered summary line. The unit tests above
   reduce the period the way a page is supposed to; these check the page
   actually does it, which is where the precedence subtraction really lives. */
function summaryOf(wiki, page) {
	var html = wiki.render("{{" + page + "}}"),
		line = (html.match(/nhn-todo-summary[\s\S]*?<\/div>/) || [""])[0]
			.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
	var numbers = line.match(/\d+/g) || [];
	assert.ok(numbers.length >= 4, "could not read the summary from " + page + ": " + line);
	return {line: line, total: +numbers[0], rest: numbers.slice(1).map(Number)};
}

/*
Archiving is reachable only through the rendered page (todo-year-items/
todo-items are bound there, not by the generic engine tests above), so this is
the only test that would catch the page reverting to the archived-subtracting
selector.
*/
h.test("archiving a reported service does not make the review page overshoot", function() {
	var w = h.fixtureWiki(),
		made = "11 Autentisering og autorisasjon - hovedtrekk og endringer november 2026";
	w.addTiddler({title: made, tags: "Styring [[Styring Ekstern tjeneste]] [[Divisjon Helsepersonell]] " +
		"2026 November [[Autentisering og autorisasjon]] Arkiv",
		text: "Arkivert innhold."});
	try {
		w.$tw.wiki.setText("$:/state/nhn/todo/year", "text", null, "2026");
		w.$tw.wiki.setText("$:/state/nhn/todo/month", "text", null, "November");
		w.$tw.wiki.setText("$:/state/nhn/todo/scope", "text", null, "aktive");
		var s = summaryOf(w, "ToDo forretningsgjennomgang"),
			sum = s.rest.reduce(function(a, b) { return a + b; }, 0);
		assert.equal(sum, s.total, "the statuses add up to " + sum + " of " + s.total + ": " + s.line);
		var html = w.render("{{ToDo forretningsgjennomgang}}"),
			row = (html.match(/<tr>(?:(?!<\/tr>)[\s\S])*Autentisering og autorisasjon[\s\S]*?<\/tr>/) || [""])[0];
		assert.ok(/nhn-status-ok/.test(row),
			"the service with an archived review did not read as done: " + row);
	} finally {
		w.$tw.wiki.deleteTiddler(made);
	}
});

h.test("the review page's counts partition its population", function() {
	var w = h.wiki();
	w.$tw.wiki.setText("$:/state/nhn/todo/year", "text", null, "2026");
	w.$tw.wiki.setText("$:/state/nhn/todo/month", "text", null, "Mars");
	w.$tw.wiki.setText("$:/state/nhn/todo/scope", "text", null, "aktive");
	var s = summaryOf(w, "ToDo forretningsgjennomgang"),
		sum = s.rest.reduce(function(a, b) { return a + b; }, 0);
	assert.ok(s.total > 0, "the page listed no services");
	assert.equal(sum, s.total, "the statuses add up to " + sum + " of " + s.total + ": " + s.line);
});

/*
This is the case the review list cannot produce: a service holding both a written
objective and one copied from last year. If the page stopped subtracting the
higher-precedence sets it would count that service twice and overshoot.
*/
h.test("the OKR page's counts partition its population", function() {
	var w = h.fixtureWiki(),
		service = "Autentisering og autorisasjon",
		prior = w.filter("[function[nhn-objectives]] :filter[function[nhn-year]match[2025]] +[first[]]")[0],
		copied = "Test sidemålsetting kopiert",
		fresh = "Test sidemålsetting egen";
	w.addTiddler({title: copied, tags: "Målsetting 2026 [[" + service + "]]",
		text: w.$tw.wiki.getTiddlerText(prior)});
	w.addTiddler({title: fresh, tags: "Målsetting 2026 [[" + service + "]]", text: "Eget innhold."});
	w.$tw.wiki.setText("$:/state/nhn/todo/okr-year", "text", null, "2026");
	w.$tw.wiki.setText("$:/state/nhn/todo/okr-scope", "text", null, "alle");
	try {
		var s = summaryOf(w, "ToDo målsettinger"),
			sum = s.rest.reduce(function(a, b) { return a + b; }, 0);
		assert.ok(s.total > 0, "the page listed no services");
		assert.equal(sum, s.total, "the statuses add up to " + sum + " of " + s.total + ": " + s.line);
	} finally {
		w.$tw.wiki.deleteTiddler(copied);
		w.$tw.wiki.deleteTiddler(fresh);
	}
});
