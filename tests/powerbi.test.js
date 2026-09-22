/*
The business review's Power BI link (NHN's September 2026 template change).

Each service has one finance report in Power BI. The address lives on the
service tiddler, and a review created through the form carries a link to it
under the template's "Link til økonomirapport i powerbi" line.

Two things make this more than a text change. The ToDo list decides a review is
unwritten by comparing its text exactly with what it was seeded with, so the
link has to be part of that comparison or every untouched review of a service
with a link reads as written. And the addresses are collected from the reviews
that already contain them, which means reading them out of free text.
*/

"use strict";

var h = require("./harness.js"),
	assert = h.assert,
	NHN = "$:/plugins/intertwingled-innovations/nhn",
	REVIEW = NHN + "/forms/review",
	SERVICE = "Test Tjeneste Med Eier",
	OTHER = "Test Tjeneste Uten Eier",
	URL = "https://app.powerbi.com/groups/test/reports/test/ReportSection?experience=power-bi&bookmarkGuid=Bookmark0001";

/* Run `fn` with fields set on a fixture service, restoring it afterwards. */
function withFields(wiki, service, fields, fn) {
	var before = wiki.$tw.wiki.getTiddler(service);
	wiki.$tw.wiki.addTiddler(new wiki.$tw.Tiddler(before, fields));
	try {
		return fn();
	} finally {
		wiki.$tw.wiki.addTiddler(before);
	}
}

/* Create a review through the real form actions; returns its title. */
function createReview(wiki, service, year, month, ord) {
	var state = "$:/state/test/powerbi/form",
		title = ord + " " + service + " - hovedtrekk og endringer " + month.toLowerCase() + " " + year;
	wiki.addTiddler({title: state, type: "application/json",
		text: JSON.stringify({service: service, year: year, month: month})});
	wiki.invokeActions('<$transclude $variable="forms-create-actions" def=<<d>> state=<<s>>/>',
		{d: REVIEW, s: state});
	assert.ok(wiki.exists(title), "the review was not created: " + title);
	return title;
}

function templateText(wiki) {
	return wiki.$tw.wiki.getTiddlerText(wiki.filter("[function[nhn-template-text]]")[0]);
}

function anchor(url, caption) {
	return "<a href=\"" + url + "\">" + caption + "</a>";
}

h.suite("Business review template");

/*
The template is content, not plugin code, so nothing else notices if a refresh of
the snapshot brings the old one back. The wording is NHN's, from the Word file
they sent; pin the sections in order, and that the old questions are gone.
*/
h.test("the template is the one NHN specified", function() {
	var w = h.wiki(),
		text = templateText(w),
		expected = [
			"! Hovedtrekk og endringer",
			"Beskriv hovedtrekk og endringer på tjenesten",
			"''Forretningsmessig endring (1=ingen, 2=liten, 3=større)''",
			"Konsekvens av forretningsmessig endring:",
			"! Prognose på penger og ressurser",
			"* Finansieringskilde:",
			"* Ramme for året (disponible midler):",
			"* Budsjett for året:",
			"* Årsprognose:",
			"* Runrate for året: (forklar eventuelle avvik fra årsprognose)",
			"* Redegjør for status opp mot prognoser og økonomiske rammer for de oppgavene vi skal levere.",
			"* Status ressursbehov/kapasitet:",
			"* Andre opplysninger som bør nevnes:",
			"Link til økonomirapport i powerbi:"
		],
		at = -1;
	expected.forEach(function(line) {
		var next = text.indexOf(line, at + 1);
		assert.ok(next > at, "the template lacks, or misorders, \"" + line + "\"");
		at = next;
	});
	assert.equal(text.trim().split("\n").pop(), "Link til økonomirapport i powerbi:",
		"the link line must end the template, since the seeded link is appended after it");
	assert.ok(text.indexOf("Hvordan finansieres tjenesten?") === -1, "the old questions are still in the template");
});

h.suite("Power BI link in new reviews");

h.test("a new review carries its service's link under the template", function() {
	var w = h.fixtureWiki(), made;
	withFields(w, SERVICE, {powerbi: URL}, function() {
		made = createReview(w, SERVICE, "2031", "Juli", "07");
		try {
			assert.equal(w.$tw.wiki.getTiddlerText(made),
				templateText(w).trim() + "\n\n" + anchor(URL, "Oversikt " + SERVICE + " (Power BI)"));
			assert.ok(w.render("{{" + made + "}}").indexOf("href=\"" + URL.replace(/&/g, "&amp;") + "\"") !== -1,
				"the link does not render as a link");
		} finally {
			w.$tw.wiki.deleteTiddler(made);
		}
	});
});

h.test("the link text can be set, and is escaped into the markup", function() {
	var w = h.fixtureWiki();
	withFields(w, SERVICE, {powerbi: " " + URL + " ", "powerbi-tekst": "Oversikt <SFM> & co"}, function() {
		var seed = w.first("[function[nhn-review-seed],<s>]", {s: SERVICE});
		assert.ok(seed.endsWith("\n\n" + anchor(URL, "Oversikt &lt;SFM&gt; &amp; co")), seed.slice(-120));
	});
});

/*
The address goes into an HTML attribute. Anything but a Power BI address is
refused rather than linked, and so is one with a quote in it, which would break
the review's markup rather than just the link.
*/
h.test("an address that is not a Power BI report is not linked", function() {
	var w = h.fixtureWiki();
	["https://example.com/report", URL + "\"onmouseover=\"x", "", "   "].forEach(function(bad) {
		withFields(w, SERVICE, {powerbi: bad}, function() {
			assert.equal(w.first("[function[nhn-review-seed],<s>]", {s: SERVICE}), templateText(w),
				"seeded a link from " + JSON.stringify(bad));
		});
	});
});

h.suite("Power BI link and the review ToDo");

/* The period variables exactly as the review ToDo page binds them. */
function period(wiki, year, month, extra) {
	var items = wiki.filter("[function[nhn-reviews-all]] :filter[function[nhn-year]match<y>] :filter[function[nhn-month]match<m>]",
			{y: year, m: month}),
		vars = Object.assign({
			"todo-items": wiki.$tw.utils.stringifyList(items),
			"todo-prior-items": "",
			"todo-attribution": "nhn-review-service",
			"todo-template": wiki.filter("[function[nhn-template-text]]")[0],
			"todo-seed": "nhn-review-seed-of"
		}, extra || {});
	vars["todo-prior-text-hashes"] = "";
	["done", "copy", "template"].forEach(function(state) {
		vars["todo-set-" + state] = wiki.$tw.utils.stringifyList(
			wiki.filter("[function[forms-todo-" + state + "-set]]", vars));
	});
	return vars;
}

function statusOf(wiki, vars, member) {
	return wiki.first("[function[forms-todo-status]]", Object.assign({}, vars, {"todo-member": member}));
}

h.test("an untouched review seeded with a link still reads as unwritten", function() {
	var w = h.fixtureWiki(), made;
	withFields(w, SERVICE, {powerbi: URL}, function() {
		made = createReview(w, SERVICE, "2031", "August", "08");
		try {
			assert.equal(statusOf(w, period(w, "2031", "August"), SERVICE), "template");
			// without the seed the bare template no longer matches: this is what the seed is for
			assert.equal(statusOf(w, period(w, "2031", "August", {"todo-seed": ""}), SERVICE), "done",
				"the check passes without the seed, so it is not testing the seed");
			w.$tw.wiki.setText(made, "text", null, w.$tw.wiki.getTiddlerText(made) + "\n\nVi har skrevet noe.");
			assert.equal(statusOf(w, period(w, "2031", "August"), SERVICE), "done");
		} finally {
			w.$tw.wiki.deleteTiddler(made);
		}
	});
});

/* A review created before the service got its link is still the bare template. */
h.test("a review seeded before the service had a link still reads as unwritten", function() {
	var w = h.fixtureWiki(),
		made = createReview(w, SERVICE, "2031", "September", "09");
	try {
		withFields(w, SERVICE, {powerbi: URL}, function() {
			assert.equal(statusOf(w, period(w, "2031", "September"), SERVICE), "template");
		});
	} finally {
		w.$tw.wiki.deleteTiddler(made);
	}
});

/* The generic engine: a seed function works with no fixed template at all. */
h.test("the engine accepts a seed function without a template", function() {
	var w = h.fixtureWiki(), made;
	withFields(w, SERVICE, {powerbi: URL}, function() {
		made = createReview(w, SERVICE, "2031", "Oktober", "10");
		try {
			assert.equal(statusOf(w, period(w, "2031", "Oktober", {"todo-template": ""}), SERVICE), "template");
		} finally {
			w.$tw.wiki.deleteTiddler(made);
		}
	});
});

/*
`function` with an unknown name passes its input through, which for the first step
of a run is every tiddler. A blank seed must add nothing — and must not displace
the template text accumulated before it, which is what an inline `:then` did.
*/
h.test("a blank seed adds nothing to the template", function() {
	var w = h.wiki(),
		template = w.filter("[function[nhn-template-text]]")[0];
	assert.deepEqual(w.filter("[function[forms-todo-seed-texts]]", {"todo-template": template, "todo-seed": ""}),
		[templateText(w).trim()]);
	assert.deepEqual(w.filter("[function[forms-todo-seed-texts]]", {"todo-template": "", "todo-seed": ""}), []);
});

/*
The unit tests above bind `todo-seed` themselves. This renders the page, which is
the only place that proves the page binds it too.
*/
h.test("the ToDo page shows a link-seeded, untouched review as only the template", function() {
	var w = h.fixtureWiki(), made,
		states = {"$:/state/nhn/todo/year": "2031", "$:/state/nhn/todo/month": "November",
			"$:/state/nhn/todo/scope": "alle"};
	withFields(w, SERVICE, {powerbi: URL}, function() {
		made = createReview(w, SERVICE, "2031", "November", "11");
		Object.keys(states).forEach(function(t) { w.addTiddler({title: t, text: states[t]}); });
		try {
			var html = w.render("{{ToDo forretningsgjennomgang}}"),
				row = html.split("<tr").filter(function(r) { return r.indexOf(SERVICE) !== -1; })[0] || "";
			assert.ok(row, "no row for the fixture service");
			assert.ok(row.indexOf("Kun mal") !== -1, "the row does not read as only the template: " +
				row.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
		} finally {
			w.$tw.wiki.deleteTiddler(made);
			Object.keys(states).forEach(function(t) { w.$tw.wiki.deleteTiddler(t); });
		}
	});
});

h.suite("Power BI suggestions");

function periodKey(wiki, review) {
	var year = wiki.first("[function[nhn-year-raw]]", {currentTiddler: review}),
		month = wiki.first("[function[nhn-month-raw]]", {currentTiddler: review});
	return Number(year) * 100 + Number(wiki.first("[function[nhn-month-ord]]", {currentTiddler: month}));
}

h.test("the suggestion is the service's latest review with a link", function() {
	var w = h.wiki(),
		service = "Melde.no",
		reviews = w.filter("[function[nhn-reviews-all]]"),
		withLink = reviews.filter(function(r) {
			return w.first("[function[nhn-review-service]]", {currentTiddler: r}) === service &&
				/<a\s[^>]*href="https:\/\/app\.powerbi\.com\//.test(w.$tw.wiki.getTiddlerText(r) || "");
		});
	assert.ok(withLink.length > 1, "Melde.no has too few linked reviews for ordering to matter");
	var latest = withLink.reduce(function(a, b) { return periodKey(w, b) > periodKey(w, a) ? b : a; }),
		source = w.first("[function[nhn-powerbi-source],<s>,<r>]",
			{s: service, r: w.$tw.utils.stringifyList(reviews)});
	assert.equal(source, latest);
	var href = (w.$tw.wiki.getTiddlerText(latest).match(/<a\s[^>]*href="(https:\/\/app\.powerbi\.com\/[^"]*)"/) || [])[1];
	assert.equal(w.first("[function[nhn-powerbi-found-url]]", {currentTiddler: latest}), href);
	assert.equal(w.first("[function[nhn-powerbi-found-caption]]", {currentTiddler: latest}), "Oversikt Melde.no (Power BI)");
});

function addReview(wiki, title, service, text) {
	wiki.addTiddler({title: title, tags: "[[Styring Ekstern tjeneste]] 2031 Desember [[" + service + "]]", text: text});
	return title;
}

/*
Suggestions look at reviews whose title names the service as well as those tagged
with it, so a review that merely mentions a service in its title must not be
taken for that service's own.
*/
h.test("a review attributed to another service is not a source", function() {
	var w = h.fixtureWiki(),
		made = addReview(w, "12 " + OTHER + " og " + SERVICE + " - hovedtrekk og endringer desember 2031", OTHER,
			"Tekst\n\n" + anchor(URL, "<b>Oversikt</b> Annen"));
	try {
		var reviews = w.$tw.utils.stringifyList(w.filter("[function[nhn-reviews-all]]"));
		assert.equal(w.first("[function[nhn-powerbi-source],<s>,<r>]", {s: SERVICE, r: reviews}), "");
		assert.equal(w.first("[function[nhn-powerbi-source],<s>,<r>]", {s: OTHER, r: reviews}), made);
		assert.equal(w.first("[function[nhn-powerbi-found-caption]]", {currentTiddler: made}), "Oversikt Annen",
			"markup was not stripped from the caption");
	} finally {
		w.$tw.wiki.deleteTiddler(made);
	}
});

/* Link text typed by hand survives applying a newer address. */
h.test("applying a suggestion keeps link text the service already has", function() {
	var w = h.fixtureWiki(),
		made = addReview(w, "12 " + SERVICE + " - hovedtrekk og endringer desember 2031", SERVICE,
			"Tekst\n\n" + anchor(URL, "Oversikt Testrapport (Power BI)"));
	withFields(w, SERVICE, {powerbi: URL + "-gammel", "powerbi-tekst": "Min egen tekst"}, function() {
		try {
			w.invokeActions('<$transclude $variable="nhn-powerbi-apply-suggestions" services=<<services>> reviews=<<reviews>>/>',
				{services: w.$tw.utils.stringifyList([SERVICE]),
					reviews: w.$tw.utils.stringifyList(w.filter("[function[nhn-reviews-all]]"))});
			var svc = w.$tw.wiki.getTiddler(SERVICE);
			assert.equal(svc.fields.powerbi, URL, "the address was not updated");
			assert.equal(svc.fields["powerbi-tekst"], "Min egen tekst", "hand-set link text was overwritten");
		} finally {
			w.$tw.wiki.deleteTiddler(made);
		}
	});
});

/* Invokes the procedure the Tjenesteeiere buttons transclude, not a copy of it. */
h.test("applying suggestions stores the address and text, and skips services without one", function() {
	var w = h.fixtureWiki(),
		made = addReview(w, "12 " + SERVICE + " - hovedtrekk og endringer desember 2031", SERVICE,
			"Tekst\n\n" + anchor(URL, "Oversikt Testrapport (Power BI)") + "\n\n" + anchor(URL + "2", "En annen rapport")),
		before = {};
	[SERVICE, OTHER].forEach(function(s) { before[s] = w.$tw.wiki.getTiddler(s); });
	try {
		var reviews = w.$tw.utils.stringifyList(w.filter("[function[nhn-reviews-all]]"));
		assert.equal(w.first("[function[nhn-powerbi-suggestion-new],<s>,<r>]", {s: SERVICE, r: reviews}), URL);
		w.invokeActions('<$transclude $variable="nhn-powerbi-apply-suggestions" services=<<services>> reviews=<<reviews>>/>',
			{services: w.$tw.utils.stringifyList([SERVICE, OTHER]), reviews: reviews});
		var svc = w.$tw.wiki.getTiddler(SERVICE);
		assert.equal(svc.fields.powerbi, URL, "the first link in the review is the suggestion");
		assert.equal(svc.fields["powerbi-tekst"], "Oversikt Testrapport (Power BI)");
		assert.equal(w.first("[function[nhn-powerbi-suggestion-new],<s>,<r>]", {s: SERVICE, r: reviews}), "",
			"a suggestion already applied is still offered");
		assert.ok(!("powerbi" in w.$tw.wiki.getTiddler(OTHER).fields), "a service with no suggestion was written to");
	} finally {
		w.$tw.wiki.deleteTiddler(made);
		[SERVICE, OTHER].forEach(function(s) { w.$tw.wiki.addTiddler(before[s]); });
	}
});

/* The Power BI table's row for `service` on the rendered Tjenesteeiere page. */
function powerbiRow(wiki, service) {
	return wiki.render("{{Tjenesteeiere}}").split("<tr").filter(function(r) {
		return r.indexOf("nhn-powerbi-input") !== -1 && r.indexOf(service) !== -1;
	})[0] || "";
}

/*
The page finds each row's source review once and asks `nhn-powerbi-found-new`
about it, instead of calling `nhn-powerbi-suggestion-new`, which finds it again.
Rendering the page is the only way to see that the button still follows the
suggestion.
*/
h.test("Tjenesteeiere offers Bruk only while the suggestion differs from the stored address", function() {
	var w = h.fixtureWiki(),
		made = addReview(w, "12 " + SERVICE + " - hovedtrekk og endringer desember 2031", SERVICE,
			"Tekst\n\n" + anchor(URL, "Oversikt Testrapport (Power BI)")),
		before = w.$tw.wiki.getTiddler(SERVICE);
	try {
		var row = powerbiRow(w, SERVICE);
		assert.ok(row, "no Power BI row for the fixture service");
		assert.ok(/nhn-powerbi-use/.test(row), "a new suggestion is offered without a Bruk button");
		w.$tw.wiki.addTiddler(new w.$tw.Tiddler(before, {powerbi: URL}));
		assert.ok(!/nhn-powerbi-use/.test(powerbiRow(w, SERVICE)), "Bruk is offered for the address already stored");
		w.$tw.wiki.addTiddler(new w.$tw.Tiddler(before, {powerbi: URL + "-gammel"}));
		assert.ok(/nhn-powerbi-use/.test(powerbiRow(w, SERVICE)), "a changed address is not offered");
	} finally {
		w.$tw.wiki.deleteTiddler(made);
		w.$tw.wiki.addTiddler(before);
	}
});

h.suite("Power BI address warning");

h.test("an address that will not be linked is reported, a good or blank one is not", function() {
	var w = h.fixtureWiki();
	[["https://example.com/report", true], [URL + "\"x", true], ["http://app.powerbi.com/x", true],
		[URL, false], [" " + URL + " ", false], ["", false], ["   ", false]].forEach(function(c) {
		withFields(w, SERVICE, {powerbi: c[0]}, function() {
			assert.equal(w.first("[function[nhn-powerbi-invalid],<s>]", {s: SERVICE}) !== "", c[1],
				JSON.stringify(c[0]) + (c[1] ? " was not reported" : " was reported"));
		});
	});
});

h.test("the warning shows on the service and on Tjenesteeiere", function() {
	var w = h.fixtureWiki(),
		viewTemplate = '<$transclude $tiddler="' + NHN + '/ui/ViewTemplate/owner"/>';
	withFields(w, SERVICE, {powerbi: "https://example.com/report"}, function() {
		assert.ok(/nhn-powerbi-warning/.test(w.render(viewTemplate, {currentTiddler: SERVICE})),
			"the service's view template does not warn");
		assert.ok(/nhn-powerbi-warning/.test(powerbiRow(w, SERVICE)), "Tjenesteeiere does not warn");
	});
	withFields(w, SERVICE, {powerbi: URL}, function() {
		assert.ok(!/nhn-powerbi-warning/.test(w.render(viewTemplate, {currentTiddler: SERVICE})),
			"the view template warns about a good address");
		assert.ok(!/nhn-powerbi-warning/.test(powerbiRow(w, SERVICE)), "Tjenesteeiere warns about a good address");
	});
});

h.suite("Reviews still holding a retired template");

/*
Swapping the template makes an unwritten review created from the old wording read
as written, so Anomalier lists them — and with the old template still in place,
the same list is the check to run before swapping.
*/
h.test("a review that is only a retired template is listed, a written one is not", function() {
	var w = h.fixtureWiki(),
		retired = w.$tw.wiki.getTiddlerText(NHN + "/retired-templates/review-2026-01"),
		untouched = addReview(w, "12 " + SERVICE + " - hovedtrekk og endringer desember 2031", SERVICE, "\n" + retired + "\n"),
		written = addReview(w, "12 " + OTHER + " - hovedtrekk og endringer desember 2031", OTHER, retired + "\nVi har skrevet noe."),
		current = addReview(w, "11 " + SERVICE + " - hovedtrekk og endringer november 2031", SERVICE, templateText(w));
	try {
		assert.ok(retired && retired.indexOf("Hvordan finansieres tjenesten?") !== -1, "the retired template is not the old wording");
		assert.deepEqual(w.filter("[function[nhn-reviews-retired-template]]"), [untouched]);
		// the title turns up in other sections' lists too, so look only at this one's
		var html = w.render("{{Anomalier}}"),
			section = html.slice(html.indexOf("Gjennomganger som fortsatt er en tidligere mal"));
		assert.ok(section.indexOf(untouched) !== -1, "Anomalier does not list it");
		assert.ok(section.indexOf(written) === -1, "Anomalier lists a written review");
	} finally {
		[untouched, written, current].forEach(function(t) { w.$tw.wiki.deleteTiddler(t); });
	}
});

/* The claim the template swap rests on: the snapshot has no such review. */
h.test("no review in the snapshot is still the retired template", function() {
	assert.deepEqual(h.wiki().filter("[function[nhn-reviews-retired-template]]"), []);
});
