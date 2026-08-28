# Operation catalogue

What the two plugins actually define, and which requirement each piece serves. Read [data-model.md](data-model.md) first for the domain, and [architecture.md](architecture.md) for the layering and the design decisions.

Every report, export and validation is one pipeline: **select → filter → project → group → emit**. Filtering by year or month is nearly free, because both are tags.

The naming convention is strict: `forms-*` is mechanism and carries no domain knowledge; `nhn-*` is configuration and carries all of it. A `\define` is a constant, a `\function` is an operation.

## Engine — `forms`

### Rendering

| Operation | Shape |
|---|---|
| `forms-tree(roots, children)` | Collapsible tree over a relation function; prunes repeated ancestors, so self- and mutual-tagging cannot loop |
| `forms-group(set, groups, sorts)` | Group-by tree; `groups` is an ordered list of projection names, `sorts` the parallel sort keys |
| `forms-grouped-view(views, state, …)` | Set picker plus ordering picker over a JSON catalogue, delegating to `forms-group` |
| `forms-export(set, columns, …)` | Download link plus preview table |

### Creating and editing

| Operation | Shape |
|---|---|
| `forms-form(def, state)` | Renders a form from a JSON definition |
| `forms-create-actions(def, state)` | The creation itself, as action widgets, so a to-do row can trigger it |
| `forms-edit(def, state)` | Renders the same definition against an existing tiddler |
| `forms-load-actions(def, target, state)` / `forms-save-actions(def, state)` / `forms-cancel-actions(state)` | Read a tiddler into a form, write it back, discard |
| `forms-edit-state(target)` | The conventional state title for editing a tiddler |
| `forms-input-names` / `forms-required-names` / `forms-missing-names` / `forms-label(key)` | Definition introspection, used by the form UI |

### To-do lists

Bound by the caller: `todo-items`, `todo-prior-items`, `todo-member`, `todo-attribution` (a function *name*, invoked dynamically), `todo-template`, and the rolled-up `todo-set-done` / `todo-set-copy` / `todo-set-template`.

| Operation | Yields |
|---|---|
| `forms-todo-items` / `forms-todo-item` | The items belonging to the current member |
| `forms-todo-state` | One item's state: `template`, `copy` or `done` — empty text reads as `template`, never `done` |
| `forms-todo-status` | A member's status, best-first: `done` > `copy` > `template` > `missing` |
| `forms-todo-with-state(state)` | Members holding an item in that state — one pass over the period |
| `forms-todo-covered` / `forms-todo-covered-in(items)` | Members with any item, for the period or for any given list |

### Filter operators (JavaScript)

| Operator | Shape |
|---|---|
| `[<set>] +[forms-csv[<column-spec>]]` | CSV with a leading UTF-8 BOM (D4) |
| `[<text>] +[forms-datauri[<mime>]]` | Wraps a string for an `<a download>` link |
| `[<string>fold[]]` | Lower-case, map, NFD-strip (D2) |
| `[<titles>forms-search:<fields>[<query>]]` | Diacritic-insensitive search; `!` inverts |

## Configuration — `nhn`

### Constants

`nhn-governance-tags` · `nhn-tjeneste-types` · `nhn-extract-service-types` · `nhn-month-keys` · `nhn-gov-root-filter` · `nhn-permalink-prefix` · `nhn-owner-field` · `nhn-archive-tag`

### Selectors

| Operation | Yields |
|---|---|
| `nhn-services` | Service entities: a service-type tag plus a business unit, excluding month-prefixed reviews |
| `nhn-reviews` | Monthly business reviews: a governance tag plus a month tag |
| `nhn-deliveries` / `nhn-objectives` / `nhn-results` | `Leveranse` / `Målsetting` / `Resultat` |
| `nhn-extract-governance-set` / `nhn-extract-services-set` | The two §3.3 extracts, narrowed by `extract-year` / `extract-month` |
| `nhn-periodic` / `nhn-archivable` | What may be archived, and what a given year's archiving would take |

Every one of these subtracts `nhn-excluded` — archived content, the `mal` template and TiddlyWiki drafts — through that single function in `scope.tid`, never by carrying its own copy of the exclusion. **The template carries a governance tag, a month and a year**, so a selector that forgets to exclude it counts it as content; that is why the exclusion is one chokepoint rather than a per-selector convention.

### Projections

`nhn-serviceid` · `nhn-url` · `nhn-division` · `nhn-servicename` · `nhn-severity` · `nhn-governance-type` · `nhn-service-type` · `nhn-owner` · `nhn-business-unit` · `nhn-result-count`

Dates come in two flavours, and mixing them up is a real bug: `nhn-year` / `nhn-month` (with `(Uten år)` / `(Uten måned)` fallbacks) are **group keys** and may return several values, while `nhn-years` / `nhn-months` fold every value into **one cell** for export, because the CSV writer takes only the first result. `nhn-year-raw` / `nhn-month-raw` are the unadorned versions the others build on.

Sort keys: `nhn-year-sortkey` (newest first) · `nhn-month-ord` · `nhn-bu-sortkey` · `nhn-owner-sortkey` · `nhn-service-sortkey` · `nhn-objective-sortkey`. Each pushes its "(Uten …)" bucket last.

### Classification and relations

| Operation | Yields |
|---|---|
| `nhn-kind` | One kind per tiddler by first match: `template`, `resultat`, `malsetting`, `leveranse`, `review`, `service`, `oppgave`, `structure` |
| `nhn-is-service` / `nhn-is-division` / `nhn-is-structure` | The kind tests those dispatch on |
| `nhn-gov-children` | The governance tree: sub-units, services, then objectives and results beneath them |
| `nhn-objective-of` / `nhn-service-group` | A result's parent objective; the service an item belongs to — both with fallback buckets |
| `nhn-review-service` | Which service a review is about: the service tag, else an **exact** title match against a known service |

### Attribution, scope and forms

- `nhn-in-year-scope` — the navigation period filter. True for `alle`, for the active year, **and for anything undated**.
- `nhn-max-year` — the latest year tag, which is what stops archiving hiding something still current.
- `nhn-form-*` — what the guided forms derive rather than ask for: a chosen service settles `TjenesteID`, the division tag and the `Styring …` tag (through a lookup table, because the two families disagree on casing).
- `nhn-template-text` — the `mal` tiddler, which the review to-do list passes as `todo-template`.

## Requirement → operations

| Requirement | Composition |
|---|---|
| **3.1** Navigation | ✓ `forms-tree` over `nhn-gov-children`, and `forms-group` over reviews, deliveries and services |
| **3.2** Guided creation | ✓ `forms-form` over a JSON definition per kind; `forms-edit` runs the same definition backwards via a `from` filter per input |
| **3.3 / Extract 1** | ✓ `nhn-extract-governance-set` → `forms-csv` with the governance column spec |
| **3.3 / Extract 2** | ✓ `nhn-extract-services-set` → `forms-csv` with the services column spec |
| **3.4** Summaries | ✓ `forms-grouped-view` over a catalogue of sets and group paths |
| **3.5** ToDo review | ✓ `forms-todo-status` per service per period, attributed by `nhn-review-service` |
| **3.6** ToDo OKRs | ✓ the same engine per year, attributed by `nhn-servicename`, with no template |
| **3.7** Periodisation | ✓ `nhn-in-year-scope` for navigation; `nhn-excluded` (archived + `mal` + drafts) subtracted everywhere, applied from the Arkiv page |
| **3.8** Access control | Server-side, not a plugin concern — see D5 in [architecture.md](architecture.md) |
| **D2** Normalised search | ✓ `fold` and `forms-search`, wired in as the default search results tab |

## Tests

Run with `npm test`; see [testing.md](testing.md). The suite covers date ordering, both extracts from one code path, folding symmetry, attribution, and the invariants that stop archiving or grouping losing tiddlers.

## Scope notes

- Normalised search (D2) was **not** in the NHN PDF — added later by NHN.
- The bilingual/translated version of the PDF is handled separately and is **not** part of this work.
