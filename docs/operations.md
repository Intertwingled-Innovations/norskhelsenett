# Operation catalogue & requirement mapping

Detailed design for the `<engine>` + `nhn` plugins. Read [../CLAUDE.md](../CLAUDE.md) first for the domain, data model, architecture principles (shadow model, no-NHN-in-engine), the keystone abstraction, and the design decisions (D1–D5). This document is the catalogue those principles produce.

Every report/export/validation is **one pipeline: select → filter → project → group → emit** (validation = project + predicate). Filtering by year/month is *free* because they are tags (`… +[tag<year>] +[tag<month>]`).

Signatures read as "input → output"; input is the current tiddler unless named. Suggested namespace: generic ops in the `<engine>` namespace, NHN-specific config under `nhn.*`.

## A. Selectors — gather a set
| Operation | Yields |
|---|---|
| `tagged-any(set)` | tiddlers carrying ≥1 tag in `set` *(foundation of both extracts and every overview)* |
| `services` | `tagged-any` over the **service-type** set |
| `reviews` | `tagged-any` over the **governance** ("Styring …") set |
| `deliveries` / `objectives` / `results` | `[tag[Leveranse]]` / `[tag[Målsetting]]` / `[tag[Resultat]]` |

Two named tag sets (NHN config):
- **service-type** = `Ekstern tjeneste, Intern tjeneste, Relatert tjeneste, Tiltak, Satsning for fart`
- **governance** = the same five prefixed with `Styring ` (`Styring Ekstern tjeneste`, …)

> Note (from the data, see CLAUDE.md): tag spelling/casing drifts in the live wiki (e.g. `Ekstern Tjeneste` vs `Ekstern tjeneste`). Selectors should match against the configured set, and tag-cleanup is part of the value the plugins add.

## B. Projections — tiddler → a value (the column/key vocabulary)
`title`, `serviceid`, `division`, `servicename`, `owner`, `url` (permalink), `year`, `month`, `month-ord`, `datekey`, `severity` (from the `Forretningsmessig endring:N` **tag**), `governance-type`, `service-type`.

Field/tag bindings are NHN config. Per the resolved data facts in CLAUDE.md:
- `serviceid` ← the `TjenesteID` **field** (present on service-review tiddlers; sparse elsewhere — do not use it to join).
- `division` ← the `Divisjon Helsepersonell` **tag** (no Division field exists).
- `servicename` ← the service-name **tag**.
- `owner` ← a Service-Owner field **to be added** on the service tiddler (does not exist yet).
- `severity` ← the `Forretningsmessig endring:N` tag.

## C. Classifiers — tiddler → kind/label
`kind` → `service` / `review` / `delivery` / `objective` / `result` / `template` / `other`; `is-template`. Same machinery as projections; the tag→kind table is NHN config. `template` is detected by the **`mal` tag** (the dedicated marker).

## D. Relations — tiddler → related tiddlers
`unit-of`, `services-of`, `service-of`, `owner-of`, `reviews-of`, `okrs-of`, `deliveries-of`, `results-of` (Målsetting 1:M Resultat).

**Join mechanism (resolved, Q1):** parent↔child links are by **tagging the parent tiddler's *title*** (`tags: … [[<parent title>]]`, rendered via `<<list-links filter:"[tag[Resultat]tag<currentTiddler>]">>`). Service membership is the **service-name tag**. `TjenesteID` is *not* a reliable cross-kind join key. Build family D on tags, not on `TjenesteID`.

## E. Temporal
`datekey` (sortable `YYYY-MM`), `date-cmp(a,b)` → −1/0/1, `prev-month(y,m)`, `prev-year(y)`. See D1 in CLAUDE.md for the `fold-year`/`month-ord`/`datekey` functions and year-only `YYYY-00` padding.

## F. Grouping — the one structural primitive
`group-by(path)` — recursively nest by an ordered list of projection names. Drives both the sidebar (3.1) and every overview (3.4); **reordering `path` is the only difference between grouping variants.**

## G. Validators — project + predicate over a period
`has-valid-review(service,y,m)`, `has-valid-okr(service,y)`, `is-stale(tiddler,prior)`, `missing-reviews(y,m)` → ToDo list, `missing-okrs(y)` → ToDo list. See D3 in CLAUDE.md — prefer a stamped `period`/`reviewed` field over free-text diffing, which collapses `is-stale` to a field check.

## H. Emitters — set → output
`csv(set,columns)`, `download` (UTF-8 **BOM** — see D4), `tree(set,path)` (renders `group-by` as sidebar nav).

## Generic vs NHN-config split
- **Generic (`<engine>`):** `tagged-any`, all projections (parameterised), `group-by`, `csv`, `download`, `tree`, `fold`, the form engine, validation primitives.
- **NHN config (`nhn`):** tag sets, field bindings, month→ordinal map, base URL, fold-map additions, form/column/path definitions, the tag→kind table.

## Requirement → operations (brief §3)
| Requirement | Composition |
|---|---|
| **3.1** Navigation | `tree` over `services`/`reviews`/`deliveries` with several `group-by` paths |
| **3.2** Guided creation | form engine + `kind` + `is-template` + per-kind field/tag templates (data-driven) |
| **3.3 / Extract 1** | `reviews` → filter year, month → `csv` cols: title, serviceid, url, division, servicename, year, month, severity, governance-type |
| **3.3 / Extract 2** | `services` → filter year → `csv` cols: title, serviceid, url, division, servicename, year, service-type |
| **3.4** Summaries | `deliveries`/`objectives`/`results` → `group-by(path)`; results path ends in Målsetting via `results-of` |
| **3.5 / 3.6** ToDo lists | `missing-reviews(y,m)` / `missing-okrs(y)` → list with a create-from-template action per row |
| **3.7** Periodisation | year is a tag → `group-by[year]`; archive = move prior-year tiddlers out of the active set |
| **3.8** Access control | server-side, not a plugin concern — see D5 in CLAUDE.md |

## Build order
> **Superseded** by the dependency-ordered "Build order & status" in [../CLAUDE.md](../CLAUDE.md), which reflects current progress (§3.1 done; remaining order 3.3 → 3.4 → 3.2 → 3.5 → 3.6 → 3.7 → 3.8). The mechanism-level sequence below is kept for reference.

1. Tag sets + selectors + projections → extracts possible.
2. `csv` + `download` → both extracts ship.
3. `group-by` + `tree` → navigation + overviews.
4. `fold` (JS operator) → normalised search.
5. Temporal + relations → validator prerequisites.
6. Validators → the two ToDo lists.
7. Form engine + guided creation (3.2); periodisation/archiving (3.7) reuse the above.

## Tests to add
- `datekey` ordering including year-only `YYYY-00` padding.
- `fold` on `ø/æ/å` and the `o`→`ø` query case (symmetry of index and query).
- The columns-as-functions exporter producing **both** extracts from one code path.

## Scope notes
- Normalised search (D2) was **not** in the NHN PDF — added later by NHN.
- The bilingual/translated version of the PDF is handled separately and is **not** part of this work.
