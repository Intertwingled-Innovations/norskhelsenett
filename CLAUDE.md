# CLAUDE.md

Orientation for LLMs/agents working in this repo. Read this first.

## What this repo is

This is a **working repo for a TiddlyWiki simplification project for Norsk Helsenett SF (NHN)**, specifically its business unit **Divisjon Helsepersonell** ("Helsepersonell"). NHN is the Norwegian state enterprise that runs the national infrastructure for sharing health data and workflow in the Norwegian healthcare sector.

It is **not** a TiddlyWiki source-code repo. It contains:

1. **The client brief** — `2026 Simplification of Tiddlywiki for use in Divisjon Helsepersonell.pdf`. This is the spec for the work to be done. Read it in full before proposing solutions; section 3 lists the concrete deliverables.
2. **A snapshot of NHN's live TiddlyWiki** in two redundant forms:
   - `NHN_TiddlyWiki.json` — all 2,479 tiddlers as a single JSON array (easiest to query/analyze programmatically).
   - `wiki/tiddlers/*.tid` — the same content as individual `.tid` files (this is the Node.js on-disk form).
3. `wiki/tiddlywiki.info` — the wiki's plugin/theme config.

The live instance is served at `https://tiddlywiki.plattform.nhn.no/` (referenced by the brief). The content is overwhelmingly in **Norwegian** — domain terms below are glossed so you can navigate it.

## How NHN runs TiddlyWiki

They use the **Node.js instantiation** of TiddlyWiki (server mode), not a single-file HTML wiki. Currently a **vanilla** install — no custom plugins beyond the standard set. The whole point of the brief is to add simplification/automation on top of this vanilla base.

`wiki/tiddlywiki.info`:
- Plugins: `tiddlywiki/tiddlyweb` (client-server sync) + `tiddlywiki/filesystem` (each tiddler ↔ a `.tid` file on disk).
- Themes: `tiddlywiki/vanilla` + `tiddlywiki/snowwhite`.
- A `build` target rendering `index.html` via `$:/core/save/all`.

To run locally you need TiddlyWiki installed (`npm install -g tiddlywiki`), then from `wiki/`:
```
tiddlywiki . --listen
```
There is **no `package.json` or `node_modules` in this repo** — it is a data + brief snapshot, not a runnable app checkout. Don't assume a build system exists; if you need one, set it up explicitly. The TiddlyWiki5 source is available in a sibling working dir (`../TiddlyWiki5`) if you need to reference core behaviour.

## The data model (this is the important part)

Helsepersonell models its management structure entirely with **tags and fields on plain tiddlers** — there are no custom data types. Three intertwined structures:

### 1. Governance structure (Styringsstruktur)
A hierarchy: **NHN (`Norsk Helsenett SF`) → Business unit (`Forretningsområde`, e.g. `Divisjon Helsepersonell`) → Service (`Tjeneste`)**.
- The org/unit tiddlers (e.g. `Norsk Helsenett SF`, `Divisjon Helsepersonell`) are hub tiddlers that use `<<list-links>>` macros to pull in their children by tag.
- Each **service** has a stable numeric **`TjenesteID`** field (the brief calls this "ServiceID", e.g. `40031`, `40056`). 476 tiddlers carry `TjenesteID`.
- A service's "type" within governance is expressed by a `Styring …` tag (see taxonomy below).

### 2. Intentions / loose OKRs (Intensjon)
Per year, at each governance level:
- **`Målsetting`** = Objective (287 tiddlers).
- **`Resultat`** = Key Result (419). A Resultat is linked to its Målsetting by **tagging the Målsetting's title** (`tags: … [[<Målsetting title>]] Resultat`). Målsetting bodies render their results via `<<list-links filter:"[tag[Resultat]tag<currentTiddler>]">>`.

### 3. Deliveries (Leveranse) and monthly business review
- 3-week sprints; each delivery is a **`Leveranse`** tiddler (576), tagged with the year + month + the OKR or governance item it belongs to (linked by tagging that item's title).
- Each **month**, every service owner (`Tjenesteeier`) writes a small **business-review** tiddler for their service summarising business change, economics, and a severity flag 1–3. These are the `NN <Service> - hovedtrekk og endringer <month> <year>` tiddlers (filename prefix `01`–`12` = the month).

### Tag taxonomy (verify counts with the JSON before relying on them)
- **Time:** `2023`–`2026` (years) and Norwegian months `Januar`…`Desember`. Both applied as tags.
- **Org:** `Divisjon Helsepersonell` (923), `Norsk Helsenett SF`, `Divisjon`, plus per-service name tags (e.g. `Kjernejournal`, `Reseptformidleren`).
- **Governance type (`Styring …`):** `Styring Ekstern tjeneste` (486), `Styring Intern tjeneste` (114), `Styring Tiltak` (154), `Styring Relatert tjeneste` (16), `Styring Satsning for fart` (16). A bare `Styring` tag (124) also appears.
- **Service type (shorter variants, used less consistently):** `Ekstern tjeneste`, `Intern tjeneste`, `Relatert tjeneste`, `Tiltak`, `Satsning for fart`. Note the data also has casing drift, e.g. `Ekstern Tjeneste` (87) vs `Ekstern tjeneste` (15) — **the inconsistency is exactly the data-quality problem the brief wants solved; don't assume tags are clean.**
- **Business change severity:** `Forretningsmessig endring:1` (110, =ingen/none), `:2` (11, liten/small), `:3` (3, større/larger).
- **OKR/delivery:** `Målsetting`, `Resultat`, `Leveranse`, `Levert`, `Oppgave`.
- **Templates:** `mal` ("MAL" = Norwegian for template; e.g. `01 MAL Tjenestenavn - hovedtrekk og endringer januar 2026`). The brief's automation must distinguish a real entry from an untouched template copy.

### Tiddler fields in use
`title`, `type` (`text/vnd.tiddlywiki`), `tags`, `text`, `created`/`modified`/`revision`/`bag` (TiddlyWeb), and notably `TjenesteID` (476). A handful have `color` (30 — these color-code the structural/type tags in the UI), `draft.*`, `creator`/`modifier`.

### Joins, keys & markers (resolved against the snapshot)
- **Parent↔child links are by tagging the parent tiddler's *title*.** Resultat→Målsetting, Leveranse→(OKR or governance item), Resultat/Leveranse under a Målsetting — all done with `tags: … [[<parent title>]]` and rendered with `<<list-links filter:"[tag[Resultat]tag<currentTiddler>]">>`. This (not `TjenesteID`) is the reliable, idiomatic join. **Service membership** is the **service-name tag** (e.g. `Kjernejournal`, `Reseptformidleren`).
- **`TjenesteID` is the "ServiceID" but is NOT a universal join key.** It's present on the 476 monthly service-review tiddlers, but sparsely elsewhere: Leveranse 64/576, Målsetting 95/287, Resultat 121/419. Don't rely on it to join deliveries/OKRs to services — use tags.
- **`Forretningsmessig endring:N` is a *tag*, not a field** (severity 1/2/3). The `severity` projection reads it from tags.
- **Template marker = the `mal` tag** (currently one canonical template, `01 MAL Tjenestenavn - hovedtrekk og endringer januar 2026`; title also contains "MAL"). Use the tag, not title inference.
- **No `Division` or owner field exists.** "Division" is the `Divisjon Helsepersonell` tag. **Service Owner (Tjenesteeier) is not yet captured anywhere** — the brief (§3.5/3.6) asks for it to be added as a field on the service tiddler; treat it as new.

### Naming conventions
- Business-review/service tiddlers: `NN <Service name> - hovedtrekk og endringer <month> <year>` where `NN` (01–12) is the month number. Both 2025 and 2026 sets exist.
- Leveranse: often `MM/YY - <description>` or `NN Leveranse <month> <year>_ <description>`.

## What the brief asks for (deliverables, brief §3)

All of these are **automation/UX layers over the existing tag model** — no schema migration is implied unless you propose one.

1. **§3.1 Simplified navigation** — a right-side menu reflecting: governance structure + intentions; business review by year→month; deliveries summarised by year/month; services grouped by business unit and service owner. **✓ Done** — a sub-tabbed *NHN* sidebar tab (Styringsstruktur · Forretningsgjennomgang · Leveranser · Tjenester) built on the `forms-tree` relation tree + `forms-group` group-by engine.
2. **§3.2 Guided tiddler creation** — let users pick a tiddler *type* and be guided so the result follows the correct structure (correct tags/fields). Optional: same for editing.
3. **§3.3 Two Excel/URL extracts:**
   - *Extract 1:* tiddlers tagged with any `Styring …` governance tag → columns: tiddler name, ServiceID, URL, Division, Service name, Year, Month, Business change, Governance type. Filterable by year **and** month.
   - *Extract 2:* tiddlers tagged with a service-type tag (`Ekstern tjeneste` etc.) → columns: name, ServiceID, URL, Division, Service name, Year, Service type. Filterable by year.
4. **§3.4 Delivery/OKR summaries** — groupable overviews of `Leveranse`, `Målsetting`, `Resultat` by year/month/service in several orderings.
5. **§3.5 ToDo for business review** — per month, per service, list services whose owner has *not* yet written this month's review tiddler — and detect that the tiddler isn't just the template or a copy of last month. One-click create from the list. Service owner is/should be a field on the service tiddler.
6. **§3.6 ToDo for OKRs** — same idea, per year.
7. **§3.7 Periodisation & archiving** — periodise by year, archive prior years to reduce clutter.
8. **§3.8 Access control (optional)** — separate editors from readers; NHN uses Microsoft AD.

## Build order & status (recommended)

§3.1 and §3.3 are **done**. Recommended order for the rest, by dependency and reuse — **not** strict §-number order (this supersedes the build order in [docs/operations.md](docs/operations.md)):

1. **§3.3 Extracts** — ✓ **Done**. Realized the keystone `export = (set, columns)`: a JS CSV engine ([forms/csv.js](wiki/plugins/forms/csv.js): `forms-csv` builds BOM'd CSV invoking projection fns per row, `forms-datauri` for `<a download>`), the **projection catalogue** ([nhn/projections.tid](wiki/plugins/nhn/projections.tid): `nhn-serviceid`, `nhn-url`, `nhn-division`, `nhn-servicename`, `nhn-severity`, `nhn-governance-type`, `nhn-service-type`; `nhn-year`/`nhn-month` from review.tid), column specs as JSON data tiddlers, a generic `forms-export` (preview table + download), and the **Eksport** UI (year/month filters) linked from the NHN toolbar. The two extracts differ only by selector + column list. These projections are reused by 3.4/3.5/3.6.
2. **§3.4 Summaries** — reuse `forms-group` + the projection catalogue; add a `service` group level (delivery/OKR → service via the **service-name tag**) and a `Målsetting` level (`results-of`). The brief's alternative orderings are just a reordered group `path`.
3. **§3.2 Guided creation** — the form engine (config-driven forms, the tag→kind table, per-kind field/tag templates). *Before the ToDos because:* it is the vehicle for the ToDo "one-click create", for capturing the new **Service Owner** field, and for stamping `period`/`reviewed` (D3) so staleness becomes a field check rather than brittle text diffing.
4. **§3.5 ToDo — business review** — validators (`has-valid-review`, `missing-reviews`, `is-stale`), per month × service. *Depends on* §3.2 (create + period stamp) **and** the Service Owner field.
5. **§3.6 ToDo — OKRs** — the same machinery, per year.
6. **§3.7 Periodisation & archiving** — year-tag grouping + moving prior-year tiddlers out of the active set.
7. **§3.8 Access control** — server-side (AD / auth proxy); out of plugin scope (D5) — a deployment note, not a plugin task.

**Cross-cutting prerequisite — Service Owner field.** It does not exist in the snapshot yet. §3.4's owner grouping is already built but empty, and §3.5/§3.6 are meaningless without it. Add it as a (configurable) field on service tiddlers, captured via §3.2 — so it lands naturally in step 3. (Tempting to do §3.5/§3.6 next, but they sit *downstream* of §3.2 and the owner field, hence steps 4–5.)

## The solution: two plugins

The work delivers **two TiddlyWiki plugins** that replace the manual all-by-hand-tagging workflow:

- **`forms`** (`$:/plugins/forms/…`) — a **generic, configuration-driven** plugin: guided form-based tiddler creation/editing, structured selection / projection / grouping, CSV export, normalised search. **Contains zero NHN/Norwegian specifics.**
- **`nhn`** (`$:/plugins/nhn/…`) — an NHN-specific plugin that is almost entirely **configuration**: tag sets, field-name bindings, month map, form definitions, export column lists, group-by paths, base URL, fold-map additions, the tag→kind table. It layers onto `forms` as shadow tiddlers.

Both live as auto-loaded plugin folders under `wiki/plugins/forms/` and `wiki/plugins/nhn/` — TiddlyWiki packs each folder into a plugin tiddler at boot ([boot.js](../TiddlyWiki5/boot/boot.js) "Load any plugins within the wiki folder"), so their constituent tiddlers become shadows with no `tiddlywiki.info` edit. Definitions are shared globally by tagging their tiddlers `$:/tags/Global`.

> **Local dev/test:** `$:/tags/Global` definitions are only in scope inside the real `PageTemplate`, so a bare `tiddlywiki wiki --rendertiddler X` won't see them. To test a snippet headlessly, give the test tiddler `\import [subfilter{$:/core/config/GlobalImportFilter}]` first. Note `function`/relation funcs read `<currentTiddler>` from scope, so set it (e.g. `<$tiddler tiddler="…">`) — piping a title in via `[[X]function[f]]` does *not* set it. Filter run-prefixes (`:filter`, `:map`, …) operate on the **accumulated** result of all prior runs, not just the previous run — compute independent sets in separate functions and union them. To get "tiddlers tagged X" use **`[<X>tagging[]]`, not `[tag<X>]`**: the `tag` operator filters its *input* and only enumerates all-tagged-X when the source carries a `byTag` index (true for the live wiki source, **false inside `:map`/filtered-transclusion**, where `[tag<X>]` silently returns blanks). `tagging[]` is source-independent.

### Architecture — the core principle (non-negotiable)

**Three layers, all via shadow tiddlers:**
1. `forms` ships mechanism + empty/sensible config slots as shadows.
2. `nhn` ships configuration as shadows that populate/override those slots.
3. The user overrides anything above with ordinary tiddlers.

Because plugin tiddlers are **shadows**, a user tiddler with the same title overrides one, and **deleting that user tiddler reverts to the shadow default**. "Reset to defaults" = "delete the overriding tiddlers." This constrains everything:
- Config and defaults **must ship as shadow tiddlers**, never as state the plugin mutates in place.
- The plugin **must not write to its own config/shadow tiddlers at runtime** — user edits create *override* tiddlers; the shadow stays pristine underneath. Mutating a shadow breaks reset-by-deletion.
- **No NHN/Norwegian string, tag, field name, URL, or month name may appear in `forms`.** A hardcoded `Leveranse`, `Styring …`, `mars`, `ServiceID`, or `tiddlywiki.plattform.nhn.no` in the engine is a bug — it belongs in an `nhn` config shadow the engine reads.
- **Config-by-data:** forms, columns, group-by paths, tag sets, kind tables are *data tiddlers*, so `nhn` supplies them and users can override them.

### The keystone abstraction — build this first

**An operation is a named TW function from a tiddler to a value or list.** Projections, export columns, and group keys are the *same thing*: a function name. This collapses many features into one mechanism:
- An **export** is `(set, columns)` where `columns` is an ordered list of `(header, projection-function-name)`. **The two NHN extracts differ only by selector + column list — no code difference.**
- A **grouped overview** is `(set, path)` where `path` is an ordered list of projection-function-names. NHN's "group by Year→Month→Service *or* Service→Year→Month" is the same operation with a reordered `path`.

Get the dynamic "invoke a projection function by name, threading the current tiddler" pattern working and **validated against the real build before** building on top — it's load-bearing and the most likely place for version-specific semantics to bite.

The full operation catalogue, the requirement→operations mapping, and the build order live in [docs/operations.md](docs/operations.md).

### Design decisions

**D1 — Date model.** Dates are **two tags**: a 4-digit year (`2026`) + a Norwegian month name (`mars`). Keep this (reads well in the UI); derive a sortable key:
```
\function fold-year()  [tags[]regexp[^\d{4}$]first[]]      %% \d not [0-9] so ] doesn't close the operand
\function month-ord()  [tags[]lowercase[]] :map[[<months data tiddler>]getindex<currentTiddler>] +[!is[blank]first[]]
\function datekey()    [fold-year[]] [month-ord[]else[00]] +[join[-]]   %% "YYYY-MM"; lexical order == chronological
```
- Month map = an `nhn` JSON data tiddler (`januar`→`01` … `desember`→`12`).
- **Normalise month casing on read** (`lowercase`): data mixes `Mars` and `mars`.
- **Year-only tiddlers** (`Målsetting`) pad to `YYYY-00` (sorts to start of year). Decide whether "unspecified" must ever differ from "January".
- `date-cmp` = `compare:string` over two datekeys; `prev-month`/`prev-year` feed the staleness validators.

**D2 — Normalised search (fold).** *(Not in the PDF — added later by NHN.)* NHN want typing `o` to match `ø`. The standard "NFD then strip combining marks" trick is **insufficient** and silently half-works on NHN's data: `å` decomposes and folds fine (`måledata`→`maledata`), but `ø` (U+00F8) and `æ` (U+00E6) are **precomposed with no canonical decomposition**, so NFD leaves them unchanged and `o` misses `Støtte og hjelpe leverandører`. Correct fold = **NFD-strip *plus* an explicit replacement map** for the non-decomposing letters (`æ ø å` + uppercase; broaden cautiously). Principles: fold index and query through the **same** function (symmetry); use `æ→a` (1:1) for search, reserve `æ→ae` for slugs; fold case in the same pass; keep the map narrow to avoid collisions. Recommended: a **custom JS filter operator** (`s.normalize('NFD').replace(/\p{Mn}/gu,'')` + the small map). Wikitext-only (`lowercase` + chained `search-replace:g`) works at NHN scale but is slower; escalate to a precomputed `folded` field only if laggy. `fold` lives in `forms`; the map additions are `nhn` config.

**D3 — Validation / "not a stale copy".** §3.5/3.6 need: exists, **not the template**, **not just last period's copy**. Free-text diffing is brittle. **Prefer** stamping a `period` field (e.g. `2026-03`) and/or a `reviewed` flag during guided creation → "valid for this period" becomes a field check and `is-stale` collapses to nothing. Make this the default; offer content-comparison only as a soft warning.

**D4 — Export format.** CSV satisfies "Excel extract", but **prepend a UTF-8 BOM** or Excel mangles `å/ø/æ`. Build real `.xlsx` only if they need workbook formatting (heavier, separate task).

**D5 — Access control (§3.8, optional).** Read-vs-write against Microsoft AD is **server-side** (auth proxy / Node.js TW server auth), not a plugin concern. Out of scope for both plugins; note it for the deployment story.

### Verify against the installed TW (5.4.x / 5.5.0) — don't trust training data
- Dynamic invocation of a projection function **by name** threading `currentTiddler` (the keystone).
- The `:sort` / distinct-keys run-prefix flavour used by `group-by`.
- Whether the current `search` operator already exposes a normalisation flag (could shorten D2).
- The current surface for **registering a JS filter operator**.
- The save-hook API, if D2 escalates to a precomputed `folded` field.

## Working notes for agents

- **Prefer `NHN_TiddlyWiki.json` for analysis** (counts, tag audits, joins). Use `wiki/tiddlers/*.tid` when reasoning about the on-disk Node.js form or proposing file-level changes.
- Filenames in `wiki/tiddlers/` are ASCII-folded (e.g. `maledata` for `måledata`); the JSON `title` and the `.tid` `title:` field keep the real Norwegian characters. Don't treat the filename as the title.
- **Tags are the schema.** When proposing automation, build on TiddlyWiki **filter expressions** over these tags/fields rather than introducing a parallel data model — that matches both the existing wiki and the brief's intent.
- Expect dirty data (casing/spelling drift in tags, templates left unfilled, duplicate-looking titles). Validate against the JSON before asserting structure.
- Norwegian glossary: Styringsstruktur=governance structure, Forretningsområde=business unit, Tjeneste=service, Tjenesteeier=service owner, Intensjon=intention, Målsetting=objective, Resultat=key result, Leveranse=delivery, Forretningsmessig endring=business change, Mandater=mandates, MAL/mal=template.
- The wiki content is internal NHN management data. Keep it in-repo; don't push it to external services.
