# Architecture

How the solution is built: three plugins, one layering principle, one keystone abstraction. Read [data-model.md](data-model.md) first — the architecture exists to serve that data model without changing it.

## The three plugins

The work delivers TiddlyWiki plugins that replace the manual, all-by-hand-tagging workflow.

| Plugin | Title | Folder | What it is |
|---|---|---|---|
| **`forms`** | `$:/plugins/tiddlywiki/forms/…` | [../wiki/plugins/forms/](../wiki/plugins/forms/) | A **generic, configuration-driven** engine: guided form-based tiddler creation and editing, structured selection / projection / grouping, CSV export, normalised search. Contains **zero** NHN or Norwegian specifics. |
| **`nhn`** | `$:/plugins/intertwingled-innovations/nhn/…` | [../wiki/plugins/nhn/](../wiki/plugins/nhn/) | The NHN-specific layer, almost entirely **configuration**: tag sets, field-name bindings, the month map, form definitions, export column lists, group-by paths, the base URL, fold-map additions, the tag→kind table. It layers onto `forms` as shadow tiddlers. |
| **`nhn-theme`** | `$:/plugins/intertwingled-innovations/nhn-theme` | [../wiki/plugins/nhn-theme/](../wiki/plugins/nhn-theme/) | A **theme-type plugin** (`plugin-type: theme`, `dependents: [snowwhite]`) carrying the NHN visual identity: the green palette, the font, and a stylesheet layered on Vanilla/Snow White. |

The plugin *titles* are namespaced as above; the *folder* names stay `forms` and `nhn`. Engine function names (`forms-tree`, `forms-group`, `forms-csv`, … and the `nhn-*` projections) are unaffected by the title namespace.

`nhn-theme` is *activated* by `$:/theme` and `$:/palette` pointers that live in the **`nhn` config plugin**, not in the theme itself: theme-plugin shadows are only unpacked when the theme is active, so the activator cannot live inside the theme it activates.

Both `forms` and `nhn` are **auto-loaded plugin folders** under `wiki/plugins/`. TiddlyWiki packs each folder into a plugin tiddler at boot ("Load any plugins within the wiki folder" in `boot.js`), so their constituent tiddlers become shadows with no `tiddlywiki.info` edit needed. Definitions are shared globally by tagging their tiddlers `$:/tags/Global`.

## The core principle: three layers of shadows (non-negotiable)

1. **`forms`** ships mechanism plus empty or sensible config slots, as shadows.
2. **`nhn`** ships configuration as shadows that populate or override those slots.
3. **The user** overrides anything above with ordinary tiddlers.

Because plugin tiddlers are **shadows**, a user tiddler with the same title overrides one, and **deleting that user tiddler reverts to the shadow default**. "Reset to defaults" therefore means "delete the overriding tiddlers". This single fact constrains everything:

- Config and defaults **must ship as shadow tiddlers**, never as state the plugin mutates in place.
- The plugin **must not write to its own config or shadow tiddlers at runtime**. User edits create *override* tiddlers and the shadow stays pristine underneath; mutating a shadow breaks reset-by-deletion.
- **No NHN or Norwegian string, tag, field name, URL or month name may appear in `forms`.** A hardcoded `Leveranse`, `Styring …`, `mars`, `ServiceID` or `tiddlywiki.plattform.nhn.no` in the engine is a bug — it belongs in an `nhn` config shadow that the engine reads.
- **Config-by-data:** forms, columns, group-by paths, tag sets and kind tables are *data tiddlers*, so `nhn` can supply them and users can override them.

**One layer overrides another only if it is unpacked later.** TiddlyWiki sorts plugins by the `plugin-priority` field (default 1) and falls back to alphabetical order by title, unpacking each in turn so the last one wins. `$:/plugins/intertwingled-innovations/nhn` sorts *before* `$:/plugins/tiddlywiki/forms`, so without an explicit priority the engine's defaults quietly beat the configuration meant to override them. `nhn` therefore declares `"plugin-priority": 2`. Any future configuration layer must do the same, and a test pins the behaviour.

## Where things live

Both plugins are flat folders of small tiddlers. Nothing is generated; every file below is source.

### `forms` — the engine

| File | Holds |
|---|---|
| `tree.tid` | `forms-tree`: cycle-safe collapsible tree over a relation function; `forms-tag-or-link`: the one way to display a tag (see D6) |
| `group.tid` | `forms-group`: group-by tree over projection functions and parallel sort keys |
| `grouped-view.tid` | `forms-grouped-view`: set picker plus ordering picker over a JSON catalogue |
| `form.tid` | `forms-form` and `forms-create-actions`: guided creation from a definition |
| `edit.tid` | `forms-edit`, `forms-load-actions`, `forms-save-actions`: the definition run backwards |
| `todo.tid` | `forms-todo-*`: who owes what this period, and whether it is real |
| `export.tid` | `forms-export`: preview table and download link |
| `csv.js` | `forms-csv`, `forms-datauri`: CSV with a UTF-8 BOM (D4) |
| `fold.js` | `fold`, `forms-search`: diacritic-insensitive folding and search (D2) |
| `merge.tid` | `forms-merge-tags`: merge a set of tags into one, renaming the tag's own tiddler where that completes the merge |
| `labels.tid` | `$:/config/forms/labels` — neutral UI captions, meant to be overridden |
| `fold-map.tid` | `$:/config/forms/fold-map` — letters normalisation cannot fold |
| `styles.tid`, `readme.tid`, `plugin.info` | Stylesheet, plugin documentation, manifest |

### `nhn` — the configuration

| Files | Hold |
|---|---|
| `governance.tid`, `services.tid`, `review.tid`, `deliveries.tid`, `summaries.tid` | The selectors and relations: what counts as a service, a review, a delivery, an objective, a result |
| `projections.tid` | The shared column and group-key vocabulary |
| `kinds.tid`, `kind-colours.tid`, `kind-forms.tid` | Tag→kind classification, its colours, and which kind opens which form |
| `months.tid`, `month-names.tid`, `governance-tags.tid` | Lookup tables, including the one that maps a service type to its `Styring …` tag despite the casing drift |
| `form-*.tid` | Six form definitions, the values they derive (`form-functions.tid`), the title templates, and the Norwegian label overrides |
| `extracts.tid`, `extract-columns-*.tid`, `eksport.tid` | The two §3.3 extracts: selectors, column specs, UI |
| `summary-views.tid`, `sammendrag.tid` | The §3.4 view catalogue and its page |
| `validators.tid`, `todo-review.tid`, `todo-okr.tid`, `todo-status.tid` | To-do attribution and the data-quality detectors (glued lists, tag casing drift and the families a merge acts on); the two to-do pages and the status labels |
| `scope.tid`, `arkiv.tid` | §3.7 archiving, the period scope and `nhn-excluded` (the one definition of "not content": templates, archived tiddlers, drafts), which drafts may be deleted (`nhn-drafts-disposable` / `nhn-drafts-unsaved`), and the page that applies the archiving |
| `search-results.tid`, `search-default.tid` | The folded search tab, and making it the default |
| `sidebar.tid`, `navtab.tid`, `nav-*.tid` | The NHN sidebar: period control, page links, four navigation trees |
| `powerbi.tid` | Each service's Power BI report: the fields, the warning for an address that will not be linked, the link a new review is seeded with (`nhn-review-seed`, shared by the review form and the review ToDo), and the suggestions read out of earlier reviews |
| `retired-template-review-2026-01.tid` | The review template's wording before September 2026, verbatim, tagged `$:/tags/nhn/RetiredTemplate` so Anomalier can list unwritten reviews still holding it |
| `ui-powerbi.tid` | The Power BI link under a service's title: the stored link, or failing that the latest review's link marked as a suggestion, with *Bruk* to store it |
| `ui-owner.tid`, `ui-edit.tid`, `ui-typebar.tid`, `manage-owners.tid` | View-template additions (owner and Power BI fields on a service) and the Tjenesteeiere page, which also sets the Power BI links |
| `datamodell.tid`, `datamodell-strings.tid` | The schema diagram: an inline SVG of the tag/field model whose nodes are `$link` widgets, so every tag pill opens its tag. Kind colours are read from `kind-colours.tid` and a chip is dashed when no tiddler backs the tag. The geometry is generated and language-independent — every label is a key looked up in the strings tiddler, which a radio switches between Norwegian and English. The pills are never translated: they are the literal tags |
| `anomalier.tid`, `ny.tid` | The data-quality page — including the per-family control that merges the tag casing variants it reports, and the button that deletes the leftover drafts — and the guided-creation page |
| `sitetitle.tid`, `sitesubtitle.tid`, `theme-default.tid`, `palette-default.tid`, `default-sidebar-tab.tid` | Branding and the pointers that activate the theme |
| `styles.tid`, `readme.tid`, `plugin.info` | Stylesheet, plugin documentation, manifest |

### Outside the plugins

`tests/` holds the suite ([testing.md](testing.md)); `wiki/tiddlers/` holds the content snapshot; `wiki-server/` is the editable server edition described in [../README.md](../README.md).

## The keystone abstraction

**An operation is a named TiddlyWiki function from a tiddler to a value or a list.** Projections, export columns and group keys are the *same thing*: a function name. That collapses a long feature list into one mechanism:

- An **export** is `(set, columns)`, where `columns` is an ordered list of `(header, projection-function-name)` pairs. The brief's two extracts differ only by selector and column list — **no code difference**.
- A **grouped overview** is `(set, path)`, where `path` is an ordered list of projection-function-names. "Group by Year→Month→Service" *or* "Service→Year→Month" is the same operation with a reordered `path`.

The dynamic "invoke a projection function by name, threading the current tiddler" pattern is load-bearing, and the most likely place for version-specific TiddlyWiki semantics to bite. It should be validated against the real build before anything is built on top of it.

The full operation catalogue and the requirement→operations mapping are in [operations.md](operations.md).

## Design decisions

### D1 — Date model

Dates are **two tags**: a 4-digit year (`2026`) plus a Norwegian month name (`mars`). Keep this — it reads well in the UI — and derive a sortable key:

```
\function fold-year()  [tags[]regexp[^\d{4}$]first[]]      %% \d not [0-9] so ] doesn't close the operand
\function month-ord()  [tags[]lowercase[]] :map[[<months data tiddler>]getindex<currentTiddler>] +[!is[blank]first[]]
\function datekey()    [fold-year[]] [month-ord[]else[00]] +[join[-]]   %% "YYYY-MM"; lexical order == chronological
```

- The month map is an `nhn` JSON data tiddler (`januar`→`01` … `desember`→`12`).
- **Normalise month casing on read** (`lowercase`) — the data mixes `Mars` and `mars`.
- **Year-only tiddlers** (`Målsetting`) pad to `YYYY-00`, sorting to the start of the year. Decide whether "unspecified" ever needs to differ from January.
- `date-cmp` is `compare:string` over two datekeys; `prev-month` and `prev-year` feed the staleness validators.

### D2 — Normalised search (fold)

*Not in the brief PDF — added later by NHN.* They want typing `o` to match `ø`.

The standard "NFD then strip combining marks" trick is **insufficient**, and silently half-works on this data: `å` decomposes and folds fine (`måledata`→`maledata`), but `ø` (U+00F8) and `æ` (U+00E6) are **precomposed with no canonical decomposition**, so NFD leaves them untouched and `o` fails to match `Støtte og hjelpe leverandører`.

A correct fold is **NFD-strip *plus* an explicit replacement map** for the non-decomposing letters (`æ ø å` and their uppercase forms; broaden cautiously). Principles:

- Fold the index and the query through the **same** function — symmetry matters more than the exact mapping.
- Use `æ→a` (1:1) for search; reserve `æ→ae` for slugs.
- Fold case in the same pass.
- Keep the map narrow to avoid collisions.

Recommended implementation: a **custom JS filter operator** (`s.normalize('NFD').replace(/\p{Mn}/gu,'')` plus the small map). A wikitext-only version (`lowercase` plus chained `search-replace:g`) works at NHN's scale but is slower; escalate to a precomputed `folded` field only if it becomes laggy. `fold` lives in `forms`; the map additions are `nhn` config.

### D3 — Validation, and "not a stale copy"

The two ToDo features need to know that a review or OKR exists, **is not the template**, and **is not just last period's copy**. Free-text diffing is brittle.

**Prefer** stamping a `period` field (e.g. `2026-03`) and/or a `reviewed` flag during guided creation. "Valid for this period" then becomes a field check and staleness detection collapses to nothing. Make that the default; offer content comparison only as a soft warning.

### D4 — Export format

CSV satisfies the brief's "Excel extract", but must **prepend a UTF-8 BOM** or Excel mangles `å`, `ø` and `æ`. Build real `.xlsx` only if NHN need workbook formatting — that is heavier and a separate task.

### D5 — Access control

Read-vs-write against Microsoft AD is **server-side** (an auth proxy, or Node.js TiddlyWiki server auth), not a plugin concern. Out of scope for both plugins; it belongs in the deployment story.

### D6 — Tags are always shown as the core tag pill

Anywhere the UI displays a tag, or a link to something that acts as a tag — tree nodes, group headers, the service column of the ToDo lists, the Anomalier listings — it goes through `forms-tag-or-link` (in `tree.tid`), which transcludes `$:/core/ui/TagTemplate` when anything is tagged with the title and falls back to a `$link` otherwise. Never a bare `$link` or a hand-rolled pill: users get the same colour, icon and dropdown of tagged tiddlers they know from the core UI. A smoke test renders every page and fails if no pill appears.

### D7 — Bulk data-quality fixes propose first, and never delete content

[[Anomalier]] reports ten classes of problem; the mechanical ones it also offers to fix — the tag casing drift (class 2) and the leftover edit drafts (class 10). Three rules hold for any such action.

**Propose, don't decide.** The page shows the whole family — every spelling, how many tiddlers carry each, which one would be kept — and the count of writes a click costs, before there is anything to click. The kept spelling is a *choice* with the most-used variant preselected, not a verdict: `Ekstern Tjeneste` outnumbers `Ekstern tjeneste` more than four to one, while the `Styring …` tags and the rest of the taxonomy spell it in lower case. A merge that always trusted the count would normalise the corpus onto the spelling NHN's own vocabulary disagrees with. The data is NHN's, so the direction is theirs.

**Never delete content.** A merge moves tags. Where a drifted spelling exists only as a tag stub and the kept spelling has no tiddler, that stub is renamed — it is the same tiddler, spelled correctly. Where both spellings have a tiddler, the tag moves and both tiddlers stay, listed as needing a human: merging two bodies of text is a judgement, not a bulk action.

**What may be deleted is what is not content.** Class 10 is the action that does delete tiddlers, and the rule survives it: a draft is the editor's scratch copy, and it is *disposable* only when its text exists somewhere else — the draft is empty, or the tiddler it drafts still exists (`nhn-draft-recoverable`). Everything else is `nhn-drafts-unsaved`: in this snapshot one draft of `New Tiddler 10`, a tiddler that was never saved, whose 208 characters exist nowhere but the draft. The button deletes the first set and lists the second for a person to read. The rule is not "never delete a tiddler" — it is never delete the only copy of something somebody wrote.

**Use the core's own bulk operation.** `forms-merge-tags` sends `tm-relink-tiddler` rather than looping `$action-listops` over the tagged tiddlers. The core relinker rewrites `tags` *and* `list` fields, drops an existing target tag before substituting so nothing ends up tagged twice, and iterates real tiddlers only — which is what makes it impossible for a merge to write an override over a configuration shadow. See [merge.tid](../wiki/plugins/forms/merge.tid) for the mechanism and the one-rename-at-most guard.

## TiddlyWiki mechanics worth knowing

Gotchas that have already cost time in this project:

- **`$:/tags/Global` definitions are only in scope inside the real `PageTemplate`**, so a bare `tiddlywiki wiki --rendertiddler X` won't see them. To test a snippet headlessly, start the test tiddler with `\import [subfilter{$:/core/config/GlobalImportFilter}]`.
- **`function`/relation functions read `<currentTiddler>` from scope**, so set it (e.g. `<$tiddler tiddler="…">`). Piping a title in via `[[X]function[f]]` does *not* set it.
- **Filter run-prefixes (`:filter`, `:map`, …) operate on the *accumulated* result of all prior runs**, not just the previous run. Compute independent sets in separate functions and union them.
- **`<<qualify>>` hashes the chain of `transclusion` variables above the widget, and nothing else.** A popup keyed by `<<qualify "$:/state/popup/tag">>` is therefore shared by every instance whose chain hashes the same. `$:/core/ui/TagTemplate` sets `transclusion` to the tag title, which separates *different* tags but not repeats of the *same* tag: on [[Leveranserapport]] one `Leveranse` pill and the other 176 were one popup, so opening one opened them all. Where a page can render the same tag twice, wrap the pill in a `$let` that folds the row's own identity into `transclusion` — the report uses the service section plus the delivery. The qualifier never appears in the rendered HTML, so only a widget-level test sees it.
- **To get "tiddlers tagged X" use `[<X>tagging[]]`, not `[tag<X>]`.** The `tag` operator filters its *input*, and only enumerates everything tagged X when the source carries a `byTag` index — true for the live wiki source, **false inside `:map` or a filtered transclusion**, where `[tag<X>]` silently returns blanks. `tagging[]` is source-independent.
- **A `$button`'s actions do not propagate.** `invokeActions` walks a widget tree firing the action widgets it finds, but `ButtonWidget.allowActionPropagation()` returns false, so it never descends into a button — the button fires its own actions on click. A headless test therefore cannot exercise a page's button by rendering the page and invoking it; it has to find the button widget and invoke *that*. `harness.clickButtons()` does this, and is the difference between testing the shipped page and testing a copy of the wikitext behind it.
- **`:and` is not logical AND.** It pipes the accumulated results into the next run and replaces them with that run's output. A run that ignores its input — one starting with a constant, or with `function[…]` — therefore *resurrects* an empty accumulator, turning a false condition true. Chain conditions inside a single run (`[<x>!is[blank]!is[tiddler]]`) or use `:filter`, which really does keep only what survives. This bug reached the duplicate-tiddler guard in the form engine and was caught by a test, not by reading the code.

The TiddlyWiki5 source is available in a sibling working directory (`../TiddlyWiki5`) for checking core behaviour.

## Questions resolved against the installed TiddlyWiki (5.4.0)

These were version-specific unknowns. All have now been answered by building on them:

- **Dynamic invocation of a projection function by name** — works, both as `[function[name]]` and with the name in a variable, `[function<var>]`. The latter is what lets the generic to-do engine map items to members without knowing what a service is.
- **The `:sort` run-prefix used by grouping** — works, sorting the accumulated results by a named key function.
- **A normalisation flag on `search`** — there is none. Its flags are `casesensitive`, `literal`, `regexp` and `words`, hence the custom operator in D2.
- **Registering a JS filter operator** — a `module-type: filteroperator` tiddler exporting one function per operator, each receiving `(source, operator, options)`. Used by [csv.js](../wiki/plugins/forms/csv.js) and [fold.js](../wiki/plugins/forms/fold.js).
- **The save-hook API** — not needed. Folding the entire corpus live costs about 14ms, so D2's precomputed-field escalation stays unused.

Two further semantics, learned the hard way and listed with the gotchas above: `:and` is not logical AND, and shadow precedence depends on `plugin-priority`.
