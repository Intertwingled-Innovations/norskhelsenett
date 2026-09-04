# Plan for the remaining work

An execution plan: phases, concrete work items, the decisions each phase forces, and the risks. [requirements.md](requirements.md) says *what* the brief asks for and *what is done*; this says *how* to build the rest and *in what order*.

Sizes are relative (S / M / L), not estimates in days.

## Where we are

**Every deliverable in the brief is built except the optional §3.8**, which is a deployment concern rather than a plugin task. Two things NHN added after the brief — normalised search (D2) and the Leveranserapport — are built too. What remains is mostly not code: cleanup that needs NHN's approval, a deployment write-up, the owner data only NHN can supply, and three follow-ups from the September demo.

The snapshot refreshed on 3 September holds **867 reviews, 637 deliveries, 285 objectives, 433 results and 60 services** (2209 periodic tiddlers in all). Counts quoted inside the phase write-ups below are as measured when that phase was built and have not been chased; where a number still governs a decision it is restated in [What is left](#what-is-left) or in the phase's own section.

**The `forms` engine** — generic, no domain strings, enforced by a test:

| Mechanism | Where | What it does |
|---|---|---|
| `forms-tree` | [tree.tid](../wiki/plugins/forms/tree.tid) | Cycle-safe collapsible tree over a relation function |
| `forms-group` | [group.tid](../wiki/plugins/forms/group.tid) | Group-by tree over projection functions plus parallel sort keys |
| `forms-grouped-view` | [grouped-view.tid](../wiki/plugins/forms/grouped-view.tid) | Set picker + ordering picker over a JSON catalogue of views |
| `forms-form` / `forms-create-actions` | [form.tid](../wiki/plugins/forms/form.tid) | Guided creation from a JSON definition; creation exposed separately so a to-do row can trigger it |
| `forms-edit` / `forms-load-actions` / `forms-save-actions` | [edit.tid](../wiki/plugins/forms/edit.tid) | Structured editing: the same definition run backwards, preserving unmanaged tags, renaming with relink |
| `forms-todo-*` | [todo.tid](../wiki/plugins/forms/todo.tid) | "Who still owes a thing this period, and is it real" — items, attribution by function name, four states |
| `forms-export` | [export.tid](../wiki/plugins/forms/export.tid) | Preview table plus download link for `(set, columns)` |
| `forms-merge-tags` | [merge.tid](../wiki/plugins/forms/merge.tid) | Merges a set of tags into one through the core's relinker, renaming a tag's own tiddler but never deleting one |
| `forms-csv` / `forms-datauri` | [csv.js](../wiki/plugins/forms/csv.js) | BOM'd CSV built by invoking a projection per cell |
| `forms-htmldoc` | [html.js](../wiki/plugins/forms/html.js) | Wraps rendered HTML in a complete standalone document, for HTML downloads |
| `fold` / `forms-search` | [fold.js](../wiki/plugins/forms/fold.js) | Diacritic-insensitive folding and search |

**`nhn` supplies configuration**: selectors, the projection catalogue, six form definitions, the view and column catalogues, month and governance-tag maps, the kind table and its colours, the scope and archive rules, and the UI — a sidebar with four navigation tabs plus nine pages (Ny, Sammendrag, ToDo forretningsgjennomgang, ToDo målsettinger, Tjenesteeiere, Eksport, Leveranserapport, Arkiv, Anomalier).

## What is left

Reviewed 4 September 2026, after the second client demo. Three lists, because they are blocked on different things.

### Ours to build

| Item | Size | Where |
|---|---|---|
| Bulk actions for the remaining mechanical anomaly classes — self-tags (87 tiddlers), service-type tags on monthly reviews (2), lists glued to the paragraph above (31) | M | Phase 7 |
| Compute the classes that are still prose only: results with several parents (class 5) and duplicate year-versioned tiddlers (class 6) | S | Phase 7 |
| `docs/deployment.md` — the auth-proxy pattern, the reader/editor split, and how the build and Pages deploy work | S | Phase 8 |
| Popup state qualifiers for tag pills rendered through `forms-tag-or-link` — Sammendrag renders 336 pills sharing 81 states, Anomalier 104 sharing 103 | S | Phase 10 |
| Follow the objective hop when a delivery has no service tag, **if** NHN want it — it places 8 of the 12 unlinked deliveries without touching their data | S | Phase 10 |
| Deliveries titled `ÅÅ/MM` are prefixed a second time by the report (4 in one service) | S | Phase 10 |
| A native Norwegian speaker's pass over the UI text, which is mine | S | Phase 0 |

### Blocked on NHN

All eleven live in **Spørsmål til NHN** in the wiki, which is the single list to walk in a meeting; this is what each one blocks.

| Question | Blocks |
|---|---|
| 1 Owner data | Both ToDo lists and the owner grouping are empty until it arrives. 0 of 60 services carry `tjenesteeier`. |
| 2 Data cleanup — casing, and the other classes | Phase 7. The casing tool is built and waiting on a decision per family; the other classes wait on approval per class. |
| 3 Archiving semantics | Whether Phase 5's reversible tag is the whole answer. |
| 4 Business-review rules | Whether near-copies should be flagged, and whether severity should be required. |
| 5 Which services should report | Whether the ToDo population stays "reported at least once this year" (43 of 60). |
| 6 Permalink base | Every URL column and every link in the standalone report. |
| 7 Authorisation | §3.8, and therefore Phase 8's shape. |
| 8 Deliveries with no service link | Whether Phase 10 changes the report or NHN change the tags. |
| 9 Reporting period, and their script's output | Item-by-item parity, and whether ranges must cross a year boundary. |
| 10 Backfill `period` | Nothing carries the field yet — 0 of 2209 periodic tiddlers — so every period filter still reads tags. |
| 11 Deployment | Who operates the wiki, which decides what Phase 8 documents. |

### Not blocked, not worth doing yet

- **Lazy children in `forms-group`.** Sammendrag renders in ~730ms and 612KB, the report in ~1s and 879KB. Acceptable, and both are already the fast path; revisit if the corpus grows by half again.
- **Cross-year reporting ranges.** Cheap to add, no known use (question 9).

## Sequencing

```
Phase 0  Housekeeping + test harness    ✓ done
Phase 1  §3.4 Summaries                 ✓ done
Phase 2  §3.2 Form engine + guided creation   ✓ done, incl. structured editing
Phase 3  §3.5 ToDo: business review      ✓ done
Phase 4  §3.6 ToDo: OKRs                 ✓ done
Phase 5  §3.7 Periodisation & archiving  ✓ done
Phase 6  D2 Normalised search            ✓ done
Phase 7  Data-quality cleanup           ◐ 2 of 10 classes fixed, rest needs sign-off
Phase 8  §3.8 Access control            ─ documentation, not code
Phase 9  Leveranserapport (post-brief)   ✓ done
Phase 10 Demo follow-ups (post-brief)    ─ three small items, one needs an answer
```

Phases 6–8 are independent of the 1→5 spine and can be interleaved when the spine is blocked on client input.

---

## Phase 0 — Housekeeping and a test harness (S) — ✓ done

- **Test harness.** `npm test` boots the `wiki` folder in-process and evaluates filter expressions against it, with the plugins' `$:/tags/Global` definitions in scope. 51 tests in ~0.5s, no dependencies beyond TiddlyWiki itself. See [testing.md](testing.md) for the layout and how to add cases. Tests gate the Pages deploy and run on every branch and pull request.
- **Readme tiddlers.** Both plugins now ship the `readme` tab their `plugin.info` declares, describing what the plugin provides and how to configure it. A test asserts that every declared tab has a tiddler behind it.
- **Naming.** The misspelled `Anomolies` page is now `Anomalier`, and its body — previously English prose under a Norwegian heading — is Norwegian throughout, like the rest of the user-facing UI. Every filter on the page was carried across unchanged. **The Norwegian is mine and would benefit from a native speaker's eye** before NHN see it.

Two reference-integrity tests were added alongside: every internal `$link` target in the plugins must exist, and every navigation tab the sidebar lists must exist. The first catches exactly the kind of dangling link a rename like this can leave behind.

### Known wrinkle surfaced by the tests — resolved in Phase 1

The **Year column of Extract 2 disagreed with the year the user filtered on**: a service tagged `2024 2025 2026` exported as plain `2024`, because the exporter takes only the first result of a projection. Resolved by listing every value instead — see Phase 1 below.

---

## Phase 1 — §3.4 Delivery and OKR summaries (M) — ✓ done

Groupable overviews of `Leveranse`, `Målsetting` and `Resultat` by year, month and service, in several orderings. `forms-group` already did the hard part, so this was new projections plus a picker.

**New in `forms`** — [grouped-view.tid](../wiki/plugins/forms/grouped-view.tid):
- `forms-grouped-view(views, state, setlabel, orderlabel, rowlabel)` — a data-driven browser over grouped sets: one picker chooses *what* to look at, a second chooses *how* it is grouped, then it delegates to `forms-group`. The catalogue is a JSON data tiddler passed in, so adding an ordering is an edit to data. Labels are parameters, keeping the engine free of domain strings. An ordering index left over from a set with more orderings is clamped back to the first, so switching sets can never land on a missing ordering.

**New in `nhn`** — [summaries.tid](../wiki/plugins/nhn/summaries.tid), [summary-views.tid](../wiki/plugins/nhn/summary-views.tid):
- `nhn-objectives` / `nhn-results` — the two OKR sets.
- `nhn-service-group` — the service a delivery or OKR belongs to, via the service-name tag, falling back to `(Uten tjeneste)`.
- `nhn-objective-of` — for a `Resultat`, the `Målsetting` it is tagged under, falling back to `(Uten målsetting)`.
- Sort keys pushing both fallback buckets last, following the existing `nhn-bu-sortkey` convention.
- `summary-views` — the catalogue: three sets, three orderings each.
- A **Sammendrag** page, linked from the NHN sidebar.

**How well the data supports it:** deliveries resolve to a service 76% of the time, objectives 83%, results 67%; 90% of results resolve to a parent objective. The fallback buckets are therefore real and sizeable, not edge cases — which is why they sort last rather than being hidden.

**Multi-homing is visible:** 33 deliveries carry more than one service tag, so the deliveries tree renders 663 leaves for a set of 575. The page says so in plain Norwegian rather than leaving the arithmetic looking broken.

### The Year and Month columns

The exporter takes only the first result of a projection, so the group projections could not be reused as export columns without misreporting multi-valued tiddlers. Added `nhn-years` and `nhn-months`, which fold every value into one cell, and pointed both extracts at them. They deduplicate first — the data contains a review tagged both `april` and `April`, which would otherwise have exported as "April, April".

Seven service rows carry several years; the grouped trees still place those tiddlers under each year individually, which is what grouping should do.

### Render cost

The Sammendrag page renders its whole tree eagerly: ~440ms and 462KB of HTML for the 575 deliveries under a three-level grouping. That is in the same range as the navigation tabs already shipping (governance 240ms/384KB), so it is not a new problem — but switching pickers re-renders the lot, and any further growth in the content will be felt here first. If it becomes uncomfortable, the fix is lazy children in `forms-group`: render a group's contents when its `<details>` opens rather than up front.

---

## Phase 2 — §3.2 Guided creation (L) — ✓ done

The largest piece, and the one §3.5/§3.6 depend on. `forms` now writes tiddlers.

**New in `forms`:**
- `forms/form.tid` — `forms-form(def, state, presets)`: renders an input per field from a JSON form definition. Field types are engine concerns (`text`, `textarea`, `number`, `select`, `tag-picker`); the option *lists* are config (a filter in the definition).
- `forms/create.tid` — the create action: derive the title, apply tags and fields, seed the body from a template tiddler, then navigate to the result.
- `forms/validate.tid` — required-field checks that disable submit and explain what is missing.

**New in `nhn`:** one form definition per kind — review, leveranse, målsetting, resultat, service, oppgave — as JSON data tiddlers, plus a **Ny** page listing the available forms. The definitions carry the naming conventions (`NN <Service> - hovedtrekk og endringer <month> <year>`), the tag sets to apply (kind tag, year, month, parent title, service name), and the field stamps.

**How the decisions went:**

1. **Title generation** — neither a placeholder language nor a raw filter, in the end: a definition names a **wikitext template tiddler**, which the engine renders with `$wikify` and trims. Building `03 <Service> - hovedtrekk og endringer mars 2026` out of filter operators alone is painful, and a join-based filter is quietly wrong anyway, because filter runs deduplicate. A template tiddler is readable, has the full expressive power of wikitext, and stays overridable like any other shadow.
2. **Body seeding** — each definition names a tiddler whose text seeds the new one. The review form points at the existing `mal` template, so a new review starts from exactly the skeleton NHN already use. The `mal` tag is *not* inherited, so a new review is never mistaken for a template.
3. **Period stamping** — done: `2026-03` for the monthly kinds, `2026` for the yearly ones, from one `nhn-form-period` function. **`reviewed` was deliberately not stamped.** Setting it at creation would mark an empty tiddler as reviewed, which is precisely the false positive §3.5 exists to catch. Whether a review is *finished* is a separate question, and the ToDo workflow that asks it belongs to Phase 3.
4. **Editing** — **done** as Phase 2b, below. It was not a small addition, as expected: it needed the reverse mapping, a rename path, and a way to avoid destroying tags the form does not manage.

**What was built:**

- [form.tid](../wiki/plugins/forms/form.tid) — `forms-form(def,state)` renders the form; `forms-create-actions(def,state)` is the creation itself, as bare action widgets, so Phase 3's to-do rows can trigger the identical logic. Required inputs block creation, and the title is previewed live as it assembles.
- [labels.tid](../wiki/plugins/forms/labels.tid) — `$:/config/forms/labels`, the engine's English defaults, overridden wholesale by the `nhn` layer. Definitions no longer each repeat their UI strings.
- [form-functions.tid](../wiki/plugins/nhn/form-functions.tid) — what the forms *derive* rather than ask for. Choosing a service settles its `TjenesteID`, its division tag and its `Styring …` tag; the last goes through a lookup table rather than string concatenation, because a service is tagged `Ekstern Tjeneste` while its reviews are tagged `Styring Ekstern tjeneste`.
- Six definitions — review, leveranse, målsetting, resultat, oppgave, tjeneste — and a **Ny** page in the sidebar.

### Three things that went wrong, and what they cost

**`:and` is not logical AND.** The duplicate-tiddler guard read `[<t>!is[blank]] :and[<t>!is[tiddler]] :and[…missing…]`. `:and` pipes the accumulator into the next run rather than intersecting, so the third run — which starts with `function[…]` and ignores its input — turned the already-false condition back to true. The guard passed every isolated test and silently overwrote an existing review. Fixed by chaining within one run and using `:filter`. Now in the gotcha list in [architecture.md](architecture.md).

**The layering model needed `plugin-priority`.** The engine ships default labels and `nhn` overrides them by shipping the same title — the three-layer model's core move. It did not work: TiddlyWiki unpacks plugins in title order absent an explicit priority, and `intertwingled-innovations` sorts before `tiddlywiki`, so the engine's English defaults won. `nhn` now declares `"plugin-priority": 2`. Nothing had relied on this before because the two plugins had never shared a title, so the architecture had been claiming a capability it did not have.

**Form state is held as indexes, not fields.** Storing each input in a field named after it looked natural until an input called `title` renamed the state tiddler mid-edit. The state is a JSON data tiddler now, so an input may be called anything.

**Done:** a service owner picks a service, year and month, and gets a correctly titled, correctly tagged review seeded from the template — with `TjenesteID` and `period` filled in, and no way to silently duplicate an existing one.

---

## Phase 2b — Structured editing — ✓ done

A **Rediger strukturert** button on any tiddler whose kind has a form ([kind-forms.tid](../wiki/plugins/nhn/kind-forms.tid) maps the two) reopens it in the form that would have created it. [edit.tid](../wiki/plugins/forms/edit.tid) adds `forms-load-actions`, `forms-edit` and `forms-save-actions`.

**Reading a tiddler back in.** Creation maps inputs → tiddler; editing needs the reverse, so every input gained a `from` filter evaluated against the tiddler being edited. A test asserts that no input lacks one, because a missing `from` would silently blank that value on the next save.

**Not destroying what the form does not manage.** Regenerating the tag list from the form alone would discard `Team SFM`, `Levert`, and every other tag someone added by hand. So loading stores an untouched copy of the values, and saving computes

> new tags = (the tiddler's tags − the tags the form would have produced when it loaded) + the tags it produces now

The subtraction is case-insensitive: the `from` filters read values back in canonical casing, so an exact subtraction would miss a drifted variant of the same tag and a no-op save would add the canonical tag alongside it. Removing case variants means saving through the form replaces the drifted tag instead.

replacing only what the form is responsible for. Fields outside the definition are untouched, and a filter that comes out blank leaves the existing value alone.

**Renaming.** Changing an input that feeds the title — the month of a monthly review — renames via `tm-rename-tiddler`, which relinks tags and lists. That is essential here: parent↔child links are made by tagging the parent's *title*, so a plain retitle would orphan every child. A rename onto an occupied title is refused rather than merging two tiddlers.

### What the corpus said about "required"

Opening a real review immediately exposed a data fact: **84% of the 781 reviews carry no `Forretningsmessig endring` tag**, and 22% carry no service tag. With severity marked required, the editor refused to save almost every existing review until the user invented a severity.

Severity is therefore optional now. The inputs that determine the *title* — service, year, month — stay required, because without them the title is malformed and the tiddler unfindable by period. A required input that most of the real data violates is a bad rule, not a strict one. Editing an under-tagged review still surfaces the gap; it just does not hold the save hostage to it.

---

## Phase 3 — §3.5 ToDo: business review (M) — ✓ done

**ToDo forretningsgjennomgang**, in the sidebar: year and month pickers defaulting to the current period, a table of service · owner · status, and a per-row button that opens the Phase 2 form pre-filled. [validators.tid](../wiki/plugins/nhn/validators.tid) holds the logic.

### Attribution turned out to be the whole problem

Not the arithmetic — deciding *which service a review is about*, in a corpus where a fifth of them do not say:

- 607 of 781 reviews carry a service tag that resolves.
- 174 do not. For **14** of those the title names a service that plainly exists; without a fallback each would be reported missing every month it exists, which is the fastest way to make people stop believing a ToDo list. So `nhn-review-service` falls back to the name parsed out of `NN <Tjeneste> - hovedtrekk og endringer …`, **but only when it exactly matches a known service**. No fuzzy matching: a wrong attribution is worse than none.
- The remaining 160 name services that have no tiddler at all — `Kjernejournal` is a tag, not a tiddler. They are attributed to nobody and appear on no row. Fixing them means tagging them properly, which is Phase 7's job, not something to paper over with guesswork.

A test asserts every attribution resolves to a real service, so a future loosening of the parse cannot quietly start inventing them.

### What counts as done

`mangler` · `mal` (exists, but its text is still the template's) · `kopi` (identical to the previous period) · `ok`.

The `mal` state matters more than it looks: guided creation seeds a review *from* the template, so every review starts life there. Without that state the ToDo list would fall silent the moment somebody clicked "create" and wrote nothing — which is exactly the false positive §3.5 exists to prevent, arriving through our own front door.

Comparison is exact, never fuzzy. A near-copy with one word changed reads as `ok`: the cost of nagging someone who did the work is higher than the cost of missing someone who almost didn't.

### Decisions

**Legacy validity** — the two-track rule turned out to be unnecessary. No tiddler in the snapshot has a `period` field, and the tag signal (service + year + month, not `mal`) is what the data actually supports, so status is computed from tags alone. `period` is still stamped on everything the forms create, so a future validator can prefer it; nothing needs backfilling for this feature to work.

**Scope** — 15 of the 60 services have never filed a review, and listing them every month would be noise. The page defaults to *services that reported at least once in the selected year* (43 for 2026) and offers "Alle tjenester" as a toggle, rather than silently picking one population.

### Owner data

The paste-in importer is built, on the Tjenesteeiere page: two columns, tab or semicolon separated, straight out of a spreadsheet. It previews how many names match before applying, lists the ones that do not, and touches nothing else. NHN still have to supply the data — but it is now a paste rather than 60 clicks.

**Done:** picking a month lists which services still owe a review and which have only a template sitting there, and each row leads to a correct tiddler in one click. Rendering costs ~300ms for 43 services.

---

## Phase 4 — §3.6 ToDo: OKRs (S) — ✓ done

**ToDo målsettinger** in the sidebar: services with no objective for the selected year, with a key-result count beside each one that has.

Phase 3's validators were *not* written parameterised, so the first job was hoisting them into the engine. [forms/todo.tid](../wiki/plugins/forms/todo.tid) now owns the whole shape — "which members of a population still owe a thing for this period, and is the thing they filed real" — and takes the item set, the preceding period, an optional template, and **the name of an attribution function, invoked dynamically**. That last part is the keystone abstraction doing exactly what it was meant to: the engine maps items to members without knowing what a service is. The review page kept its numbers through the migration.

What is left in `nhn` is genuinely just configuration: `nhn-review-service` for one list, `nhn-servicename` for the other, and a label map from the engine's state identifiers to Norwegian.

### The population question, answered from the data

The plan flagged "at which governance levels is a missing objective a real gap?" as an open question for NHN. The data mostly settles it: of the 165 objectives for 2026, all but one attach to a **service**; exactly one is division-level, and only two divisions exist. So the list is per service, and division-level OKRs are rare enough not to model.

Scope defaults to *active* services — those with either a review or an objective in the selected year — with an "Alle tjenester" toggle. Defining active by review activity alone would have been circular for a yearly list, since having an objective is the very thing being checked.

### A service can hold several objectives

Reviews are one per service per month; objectives are not — 165 across 44 services for 2026. So a member's status is the **best** of its items (`done` > `copy` > `template` > `missing`): one real objective covers the year whatever the other three look like. The roll-up subtracts higher-precedence sets so a service holding one written objective and one copied from last year lands in exactly one bucket. Without that the summary exceeded its own population.

### Performance

The naive form — deriving each row's status from scratch — is quadratic: 48 services against 165 objectives, each comparing its text against every objective from the year before. That took **1.5s**. Reducing the period into three membership sets once, and having rows look up membership, brings it to **~370ms**. The review list improved from 320ms to ~210ms on the way through.

### A gap the tests had

The precedence subtraction lives in the page, but the unit tests replicated it in JavaScript — so they were checking a reimplementation, and mutating the real page changed nothing. Added two tests that render the actual pages and assert the summary counts partition the population; mutating the page's subtraction now fails them. Worth remembering wherever a test helper mirrors production logic rather than calling it.

---

## Phase 5 — §3.7 Periodisation and archiving (M) — ✓ done

Two mechanisms, kept deliberately separate because they fail differently. [scope.tid](../wiki/plugins/nhn/scope.tid) holds both.

**Archiving** — the non-destructive form, as planned. An `Arkiv` tag applied in bulk from the new **Arkiv** page, and a `-[function[nhn-archived]]` chokepoint in every base selector. Untagging restores; nothing is deleted and no second wiki is needed. Archiving up to 2024 takes the wiki from 784 reviews to 497, 576 deliveries to 380, and leaves services untouched.

**Period scope** — a year selector in the NHN sidebar that narrows the **navigation trees only**. Under 2026 the deliveries tree drops from 615 leaves to 179 and the governance tree from 564 to 371, while the services tab is unchanged. The extracts, ToDo lists and summaries all have their own period controls and are deliberately left alone: a second, invisible filter quietly narrowing an export is a trap, not a convenience. A test pins that.

### Two rules that stop tidying becoming losing

**Undated content is always in scope.** 25 deliveries, 15 objectives and 57 results carry no year tag. A scope that hid them would make them unreachable through navigation with nothing to show they existed.

**A tiddler also tagged a later year is never archived.** `nhn-archivable` takes the *latest* year tag, so "archive up to and including 2024" spares the 7 objectives that are also tagged 2026. Without that, tidying would hide current work.

### Two bugs the tests found

**The template was being counted as a review.** `01 MAL Tjenestenavn …` carries a governance tag, a month and a year, so `nhn-reviews` included it — inflating counts, showing it in the navigation tree, and putting it in Extract 1. Every content selector now subtracts `mal`, which also aligns them with `nhn-kind`, where `template` already takes priority.

**Content could be exported but never archived.** `nhn-reviews` requires a month tag; the extracts only require a governance tag. `Filoverføringstjenesten - hovedtrekk og endringer april` has no month tag, so it appeared in the 2024 export and survived archiving. `nhn-periodic` is therefore wider than `nhn-reviews` — a hole in a mechanism meant to hide things is worth closing.

### Cost

Archiving 597 tiddlers takes ~45ms in memory; on the server that is 597 file writes, so the page states the count and warns before the button. Per-year granularity keeps any single run modest.

### Still open for NHN

Whether hiding behind a tag is enough, or prior years should leave the live wiki entirely (question 3). Everything here is reversible, so it can be adopted before that is settled.

---

## Phase 6 — D2 Normalised search (S–M) — ✓ done

NHN's later addition: typing `o` should find `ø`.

[fold.js](../wiki/plugins/forms/fold.js) provides `fold[]` and `forms-search:<fields>[<query>]`, with the map in `$:/config/forms/fold-map` for a configuration layer to extend. D2's prediction held exactly — `å`, `é` and `ü` decompose and strip to ASCII; `ø`, `æ`, `ß`, `ð` and `þ` are atomic code points NFD leaves alone — so the map carries what normalisation cannot.

**It is the default search.** Result tabs are data-driven, so the `nhn` layer ships one whose filters call `forms-search` and transcludes the core renderer, then points `$:/config/SearchResults/Default` at it. Searching `stotte` returns 183 titles where core search returns none. Reverting is a config change, not a code change.

**No precomputed field needed.** Titles fold in ~2ms and the entire corpus, bodies included, in ~14ms, so D2's escalation path stays unused and there is no save hook to maintain.

### Symmetry, and the test that nearly missed it

D2 says to test symmetry explicitly, and the first attempt did not. Folding the stored text but *not* the query passes every ASCII-query test — `stotte` is already folded, so it still matches — and fails only when the query itself carries an accent. Norwegian users will type `Støtte` at least as often as `stotte`. The property worth asserting is that a query and its folded form return the **same set**, and mutating the code to fold one side now fails it.

Three other mutations are covered: dropping the map entirely (the NFD-only trap), dropping `ø` from it, and changing the map at run time, which must change the folding and so proves it is configuration.

---

## Phase 7 — Data-quality cleanup (M, 2 of 10 classes fixed)

The Anomalier page diagnoses ten classes of problem and fixes two. What is left, with the counts in the current snapshot:

| Class | Count | Mechanical? |
|---|---|---|
| 1 Self-tagging and tag cycles | 87 | Yes — remove the tiddler's own title from its tags |
| 3 Service-type tags on monthly reviews | 2 | Yes — strip the service-type tag |
| 4 `Tiltak` / `Satsning for fart` tagged straight onto NHN | 2 | A judgement: they flood the root, but the tagging may be intended |
| 5 Results with several parents | not computed | Diagnosis first; it is inherent in the data model |
| 6 Duplicate year-versioned tiddlers | not computed | A judgement per pair |
| 7 Inconsistent `Domene` level | 4 domains | A modelling decision, not a fix |
| 8 Tagged both `Målsetting` and `Resultat` | 3 | A judgement per tiddler |
| 9 Lists glued to the paragraph above | 31 | Yes — insert a blank line; the safest to automate |

Classes 1, 3 and 9 are the ones worth a button, and 9 is the most valuable: the bullets currently render as literal `*` text in NHN's own wiki. Classes 5 and 6 do not even have a computed list yet, which is the smaller job of the two and worth doing before asking NHN about them.

**Class 2 (tag casing) is done** — diagnosed *and* fixable from the page. Each drifting family gets its own control: every spelling with its tiddler count, a radio choosing which to keep (the most-used one preselected), the number of tiddlers a click rewrites, and a button that merges the rest onto the chosen spelling. Ten variants across five families in this snapshot. The mechanism is generic and lives in the engine ([merge.tid](../wiki/plugins/forms/merge.tid)); D7 in [architecture.md](architecture.md) records why it delegates to the core's `tm-relink-tiddler` and why it renames but never deletes. What is still NHN's to say is *whether* to run it, and on which families — question 2.

Class 10 (leftover drafts) is the other one fixed rather than only diagnosed: drafts now fall under `nhn-excluded`, so they no longer inflate the summaries, the extracts or the OKR ToDo list, and the page now offers to delete the tiddlers as well. It deletes only what is safe to lose — 18 of the 19 here, being drafts that are empty or whose original still holds the text. The nineteenth drafts `New Tiddler 10`, which was never saved, so its text exists nowhere else; the button holds it back and lists it. Pressing the button is still NHN's call, and is part of question 2.

This class is deliberately **not** patched in the renderer: a custom parser rule would make our build render differently from NHN's live wiki and hide the problem from the people writing the text.

The payoff is not only cleaner data — it deletes complexity from the config. `nhn-tjeneste-types` and `nhn-extract-service-types` currently enumerate both casings of every tag purely to work around the drift.

**This is NHN's data, not ours.** Propose the changes, show the affected tiddlers, and let them approve each class before anything is rewritten.

---

## Phase 8 — §3.8 Access control (S, documentation)

Per D5 this is server-side and out of plugin scope. Deliverable: a `docs/deployment.md` covering the auth-proxy pattern in front of the Node.js server, AD/OIDC integration, and the reader/editor split — alongside how the current build and GitHub Pages deploy work.

It is the only brief deliverable not yet delivered, and it is a day's writing rather than a build. What it cannot decide for itself is who operates the wiki: a Node.js server for editors, the single-file build for readers, or both (questions 7 and 11). The document should describe both shapes and mark the one NHN choose.

---

## Phase 9 — Leveranserapport (M, post-brief) — ✓ done

NHN asked (August 2026) for a **board delivery report**: every delivery in a month range within a year, grouped by service, as a standalone shareable HTML file. They prototyped it themselves — a Python script over a `tiddlers.json` export — and its selection rules turned out to be this repo's selectors reimplemented: service = division + service-type tag minus the governance/OKR kinds (= `nhn-services`), delivery-in-period = `Leveranse` + year + month tags case-insensitively (= `nhn-deliveries` + fold), delivery→service = tag matching a service title. Useful external validation of the data model; what was genuinely new was the month **range**, the `MM/ÅÅ` display prefix, inline descriptions, and the standalone artefact.

**New in `forms`** — [html.js](../wiki/plugins/forms/html.js): `forms-htmldoc` wraps an already-rendered HTML string in a complete document (doctype, charset, `<title>`, inline CSS from a named tiddler, optional `lang`), ready for `forms-datauri[text/html]` behind an `<a download>` — the CSV export pattern, retargeted at HTML. Title, styles and language are all operands, so the engine stays domain-free.

**New in `nhn`** — [rapport-functions.tid](../wiki/plugins/nhn/rapport-functions.tid), the **Leveranserapport** page, the [rapport/html-body](../wiki/plugins/nhn/rapport-html.tid) export template and its [CSS](../wiki/plugins/nhn/rapport-css.tid). The page renders collapsible per-service sections with rendered descriptions and tag pills, and a loud warning block for deliveries linked to no service. The download wikifies the export template and pipes it through `forms-htmldoc`.

**Month defaults follow the data.** The pickers open at the span of the selected year's deliveries — first to last month that actually carry data (`nhn-report-months-with-data`), so a year in progress opens January–August and a finished year January–December — and changing the year fires `nhn-rapport-reset-months`, resetting the range to the new year's span (whole calendar year if it has no dated deliveries). Without the reset, a range picked for one year would silently narrow the next. An earlier version defaulted to the current tertial; NHN preferred the data span.

### Decisions

- **The service join is deliberately stricter than Sammendrag's.** `nhn-report-service-of` intersects a delivery's tags with `nhn-services` (service-type tag *and* a business unit), where `nhn-servicename` accepts any tiddler carrying a service-type tag. Without this, "Forenkling og opprydding i dagens løsning (RF)" — a workstream tiddler mis-tagged `Ekstern Tjeneste` — showed up as a service section. The client's own generator required the division too. A mutation test pins the strictness.
- **The `MM/ÅÅ` prefix takes the *latest* month tag.** The Python took whichever month tag it happened to see last — order-dependent. Latest-by-ordinal is deterministic and matches how a multi-month delivery (tagged April+Mai+Juni) reads: it *finished* in June. The prefix is all-or-nothing: a tiddler missing month or year gets the bare title, never a fragment. Titles already carrying their prefix are not double-prefixed.
- **Descriptions are rendered wikitext, not escaped source.** The prototype showed literal `!Beskrivelse` and `*` bullets; a board deserves the rendered form. Internal links inside descriptions become **live permalinks into the NHN wiki** via `tv-wikilink-template` set to the permalink prefix — every link in the standalone file resolves against the live wiki, so the file cannot go stale silently.
- **Every summary count is derived from the same sets the sections render**, and a test asserts the counts printed in the HTML agree with the sets — the counts cannot drift from the content.
- **Ranges do not cross a year boundary.** Reporting periods here never do; cheap to add if NHN ever asks.

### Parity check against NHN's own run

Re-run against the refreshed snapshot, the two agree. The report finds **75 deliveries for mai–august 2026** across 19 services, 12 of them linked to no service; NHN's own script found **73** in a dataset of 636, ours now holds 637, and their unlinked count was twelve as well. The gap that mattered was the stale export, not the selection rules.

What is left is comparing the two lists item by item rather than count by count, which needs their output alongside ours. The unlinked deliveries are the Phase 7 cleanup case seen from the report end: several carry tags like `Støtte og hjelp til leverandør` that name no service tiddler.

### Cost

A full-year default range initially took **14s** to render: the tag→service join re-evaluated `nhn-services` (~4ms) once per delivery per service, twice over (page + the `$wikify` of the export document). The join now reads a `report-known-services` title-list the page and template bind once, with a fall-back to computing it so an unbound call is slow but never wrong — **~0.5s warm** for 116 deliveries. A test pins the binding, and a mutation test pins the fall-back. On the refreshed snapshot the default range holds 171 deliveries and the page renders in ~1s / 879KB, which is the same cost per delivery.

## Phase 10 — Follow-ups from the September demo (S each, post-brief)

Three things the 4 September demo and the review behind it turned up. None is urgent; the middle one needs an answer before it can be built.

**Tag pills outside the report still share popup state.** `<<qualify>>` hashes the chain of `transclusion` variables, and `$:/core/ui/TagTemplate` sets that to the tag title, so two pills for the *same* tag are one popup: clicking either opens both. [Leveranserapport](../wiki/plugins/nhn/rapport.tid) now folds the section and the delivery into `transclusion` and is clean, but everything rendered through `forms-tag-or-link` still collides — Sammendrag renders 336 pills sharing 81 states, Anomalier 104 sharing 103. The fix belongs in `forms-tag-or-link` itself, which needs something unique from its caller; the trees already carry `forms-tree-path`, which is exactly that. See the mechanics note in [architecture.md](architecture.md).

**The objective hop.** 12 deliveries in the mai–august range link to no service, and 8 of them are tagged a `Målsetting` that is *itself* tagged the service. `nhn-report-service-of` could follow that one hop and place them without anyone touching the data. Whether it should is a modelling question — a delivery attributed through its objective is a slightly weaker claim than one tagged the service directly — so it is question 8, not a bug. The remaining 4 belong to national `Tiltak` / `Satsning for fart` initiatives that no service owns; those want a decision about whether a board report carries an initiatives section.

**`ÅÅ/MM` titles get dated twice.** The report prepends `MM/ÅÅ` unless the title already starts with it. Four deliveries under *Helsenettet.no og Medlemstjenesten* are titled the other way round (`26/04-02 …`), so the check misses and they render as `04/26 26/04-02 …`. One of them is tagged Mai while its title says 06, so the two dates disagree as well. Either widen the match to accept `ÅÅ/MM`, or treat the titles as a cleanup class — the second is more honest, since the wiki now holds two title conventions and only one of them is intended.

## Open questions for NHN

The list lives in **Spørsmål til NHN** in the wiki — eleven questions, written for NHN to answer in the tiddler itself, and the thing to walk in a meeting. [What is left](#what-is-left) above maps each one to the work it blocks.

Two questions this file used to carry are settled and are not in that list: **OKR levels** ("at which governance levels is a missing objective a real gap") was answered from the data in Phase 4 — of the 165 objectives for 2026 all but one attach to a service — and the **`Ekstern tjeneste` spelling** is now part of question 2 rather than a question of its own, because the tool that acts on the answer exists.
