# Testing

```sh
npm test              # run everything (246 tests, ~30s)
npm test -- export    # run only tests matching "export" (file, suite or test name)
```

The suite has no dependencies beyond TiddlyWiki itself. It boots the `wiki` folder in-process and evaluates filter expressions against it, so tests exercise the same code the browser runs — real plugin tiddlers, real content, real filter semantics.

Filter-level tests run in single-digit milliseconds; almost all of the wall clock is the handful of tests that render a whole grouped tree or a whole page, and the runner prints a duration next to any test taking over 200ms. For a fast inner loop, pass a pattern.

Tests gate the GitHub Pages deploy ([../.github/workflows/deploy.yaml](../.github/workflows/deploy.yaml)) and run on every branch and pull request ([../.github/workflows/test.yaml](../.github/workflows/test.yaml)).

## Why this exists

The plugins are built almost entirely from TiddlyWiki filter expressions, which **fail silently**. A projection whose name no longer resolves doesn't raise an error — it returns nothing, and the column exports as blank. A selector that stops matching produces an empty tree, not a stack trace. Nothing in the wiki tells you; the CSV just quietly loses a column.

So the suite leans towards the failure modes that are invisible at runtime: does every projection named in a column spec actually exist, does every kind have a colour, does the CSV still carry its BOM, has an NHN string crept into the generic engine.

## Layout

| File | Covers |
|---|---|
| [../tests/harness.js](../tests/harness.js) | Booting, filter evaluation, the test registry |
| [../tests/fixtures.js](../tests/fixtures.js) | Synthetic tiddlers for cases the real content can't pin down |
| [../tests/run.js](../tests/run.js) | The runner |
| `tests/config.test.js` | Plugin packaging, JSON config integrity, reference integrity (links, tabs), the `forms` purity rule |
| `tests/dates.test.js` | The date model (D1): month ordinals, sort keys, undated buckets |
| `tests/projections.test.js` | The projection catalogue and kind classification |
| `tests/selectors.test.js` | The sets behind the trees and extracts, and extract filtering |
| `tests/export.test.js` | The keystone: `(set, columns)` → CSV, and D4's UTF-8 BOM |
| `tests/summaries.test.js` | The §3.4 view catalogue, its projections, and the grouped-view picker |
| `tests/forms.test.js` | The §3.2 form definitions, and creation and editing driven end to end |
| `tests/todo.test.js` | §3.5/§3.6 attribution, status, both ToDo populations, and the owner importer |
| `tests/powerbi.test.js` | The business-review template's wording, the Power BI link a new review is seeded with, the ToDo list still recognising such a review as unwritten, the suggestions read out of earlier reviews, the link on the service tiddler, the warning for a bad address, and the Anomalier list of reviews still holding the retired template |
| `tests/scope.test.js` | §3.7 archiving, its reversibility, and what the period scope must never hide |
| `tests/search.test.js` | D2 folding, the symmetry of query and text, and the search tab wiring |
| `tests/merge.test.js` | Merging tag casing variants: the generic action, the family and target functions, and the Anomalier buttons that drive them |
| `tests/drafts.test.js` | Which leftover drafts may be deleted, and the Anomalier button that deletes them |

## Writing a test

```js
var h = require("./harness.js"),
    assert = h.assert;

h.suite("Projections");

h.test("nhn-serviceid reads the TjenesteID field", function() {
    var w = h.wiki();
    assert.deepEqual(w.project("nhn-serviceid", "03 Kjernejournal - …"), ["40031"]);
});
```

The wiki helper offers:

- `w.filter(filterString, variables)` — evaluate a filter, returning an array of strings.
- `w.first(filterString, variables)` — its first result, or `""`.
- `w.project(fnName, title)` — apply a projection or relation function to a tiddler.
- `w.isFunction(name)` — is this defined as a `\function` by one of the plugins?
- `w.data(title)` — the parsed contents of a JSON data tiddler.
- `w.pluginTiddlers(pluginTitle)` — a plugin's constituent tiddlers.
- `w.addTiddler(fields)` — add or replace a tiddler, for building a case's own fixtures.
- `w.exists(title)` — does this tiddler exist, including tiddlers shipped inside a plugin?
- `w.render(wikitext, variables)` — render wikitext to HTML with the globals in scope. Use it only for end-to-end checks of a UI procedure; it costs hundreds of milliseconds against real content, so assert at the filter level wherever you can.
- `w.invokeActions(wikitext, variables)` — execute action widgets, as clicking a button would. This is how the creation tests drive a form to completion instead of inspecting markup.
- `w.clickButtons(wikitext, match, variables)` — render wikitext and click every `$button` whose markup contains `match`, returning how many were clicked. `invokeActions` cannot reach a button's actions (see the mechanics note in [architecture.md](architecture.md)), so this is the only way to exercise a page's own button rather than a copy of the wikitext behind it.
- `w.widgetTree(wikitext, variables)` / `w.findWidgets(wikitext, test, variables)` — render wikitext and inspect the **widgets** rather than the HTML, for the things that never reach the markup. Popup state qualifiers are the case that forced it: `<<qualify>>` hashes the chain of `transclusion` variables and stores the result on the widget, so the only way to prove two tag pills have separate state is to read it off them.

Two wikis are available, each booted once and shared:

- **`h.wiki()`** — the wiki as it ships. Use it for anything about the real NHN content.
- **`h.fixtureWiki()`** — the same plus the synthetic tiddlers in `tests/fixtures.js`. Use it when you need a case the snapshot can't provide reliably: an owner that is actually set, a lowercase month tag, a title containing a quote. Kept separate so fixtures can never skew assertions about real content.

A third, `h.scratchWiki()`, boots a **fresh, unshared** wiki every call. It is for the few tests that must mutate real content destructively and cannot put it back — clicking the Anomalier merge buttons rewrites a hundred-odd tiddlers and renames some of them. It costs a boot (~450ms), so reach for `fixtureWiki()` and a `finally` first.

## Conventions

- **Assert invariants, not counts.** The snapshot will be refreshed. "No service is titled `NN …`" survives that; "there are 60 services" does not. Where an exact value is needed, pin it to a named tiddler and add a test that fails loudly if that tiddler disappears.
- **A named period is a count in disguise.** The August 2026 refresh broke three tests this way: one expected a tiddler to be tagged exactly `April, Mai`, and two created a review for a month NHN had since filed, so creation was correctly refused and the test failed on data rather than on behaviour. Creation tests now ask `freePeriod` (in `forms.test.js`) for a month the snapshot does not cover; ordering and multi-value cases moved to fixtures, which the snapshot cannot move under.
- **Set `currentTiddler` through the helper.** Functions read it from the widget scope; piping a title in via `[[X]function[f]]` does *not* set it. `w.project()` handles this.
- **Say what broke in the message.** `assert.ok(cond, "…")` costs one line and saves reading the filter back.
- **Own your fixtures.** A test that edits a snapshot tiddler depends on whatever that tiddler happens to contain, and leaves it changed for whatever runs next. Build what you need through the real creation path, and restore or discard it in a `finally`.
- **Test the shipped thing, not a copy of it.** Where a page performs logic — the to-do roll-up, say — a helper that reimplements that logic in JavaScript tests the helper. Render the page and assert on what it produced.

## Two mechanics worth knowing

Both are consequences of TiddlyWiki's design rather than anything specific to this project, and both are handled inside `harness.js`:

1. **Globals need an `importvariables` scope.** `$:/tags/Global` definitions — every `nhn-*` and `forms-*` function — are only in scope beneath an `importvariables` widget. A bare `wiki.filterTiddlers(f)` sees none of them. The harness builds a widget tree that imports the global filter once and evaluates everything against a descendant of it.

2. **TiddlyWiki runs in its own vm context.** Arrays it returns have a different `Array.prototype`, so Node's `assert.deepStrictEqual` rejects them as "same structure but not reference-equal". The harness copies results into native arrays at the boundary.

## Adding coverage as the plugins grow

Each phase in [plan.md](plan.md) should land with its own cases. The ones worth writing early:

- ~~Phase 1 (summaries)~~ — done: the catalogue's function names all resolve, every group projection is total over its set (so nothing silently vanishes from a tree), and reordering the group levels changes the nesting but not the leaf count.
- ~~Phase 2 (guided creation)~~ — done: forms produce tiddlers the rest of the system recognises, creating over an existing title is refused rather than silently uniquified, and a round trip through the editor leaves a tiddler byte-identical.
- ~~Phase 3-4 (ToDo lists)~~ — done: attribution never invents a service, a freshly created review reads as unwritten rather than done, and both pages' summary counts partition their population.

One lesson from Phase 4 is worth generalising: a helper that *reimplements* production logic tests the helper. The roll-up the pages perform was mirrored in JavaScript here, and mutating the real page changed no test — until two tests were added that render the pages and read their summaries.
- ~~Phase 7 (tag casing merge)~~ — done: the merge moves `list` fields as well as tags (which is what separates the core relink from a hand-rolled retag loop), it renames at most one tiddler and destroys none, and clicking the page's own buttons clears the drift the page reported onto the spelling the buttons advertised. Every one of those was written by breaking the code first and checking a test noticed.
- ~~Phase 6 (normalised search)~~ — done, and it took two attempts to test properly: folding the text but not the query passes every ASCII-query test. The assertion that catches it is that a query and its folded form return the *same set*.
