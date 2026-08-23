# Requirements, build order and status

What the client brief asks for, what is built, and what to build next. The authoritative spec is the PDF at the repo root — `2026 Simplification of Tiddlywiki for use in Divisjon Helsepersonell.pdf`, whose section 3 lists the deliverables. This page summarises it and records progress.

All the deliverables are **automation and UX layers over the existing tag model** ([data-model.md](data-model.md)). No schema migration is implied.

## Deliverables (brief §3)

| § | Deliverable | Status |
|---|---|---|
| 3.1 | **Simplified navigation** — a right-side menu reflecting the governance structure and intentions; business review by year→month; deliveries summarised by year/month; services grouped by business unit and service owner. | ✓ Done |
| 3.2 | **Guided tiddler creation** — let users pick a tiddler *type* and be guided so the result follows the correct structure (correct tags and fields). Optionally the same for editing. | ✓ Done, including the optional structured editing |
| 3.3 | **Two Excel/URL extracts** (see below). | ✓ Done |
| 3.4 | **Delivery/OKR summaries** — groupable overviews of `Leveranse`, `Målsetting` and `Resultat` by year, month and service, in several orderings. | ✓ Done |
| 3.5 | **ToDo for business review** — per month, per service, list the services whose owner has not yet written this month's review tiddler, detecting that the tiddler isn't merely the template or a copy of last month. One-click create from the list. | ✓ Done |
| 3.6 | **ToDo for OKRs** — the same idea, per year. | ✓ Done |
| 3.7 | **Periodisation and archiving** — periodise by year; archive prior years to reduce clutter. | ✓ Done |
| 3.8 | **Access control** (optional) — separate editors from readers; NHN use Microsoft AD. | Out of plugin scope |

### §3.3 in detail — the two extracts

- **Extract 1** — tiddlers tagged with any `Styring …` governance tag. Columns: tiddler name, ServiceID, URL, Division, Service name, Year, Month, Business change, Governance type. Filterable by year **and** month.
- **Extract 2** — tiddlers tagged with a service-type tag (`Ekstern tjeneste` etc.). Columns: name, ServiceID, URL, Division, Service name, Year, Service type. Filterable by year.

They differ only by selector and column list — which is precisely the keystone abstraction in [architecture.md](architecture.md).

## What's built

**Normalised search (D2)** — a diacritic-insensitive `forms-search` operator, wired in as the default search results tab, so typing `stotte` finds `Støtte`. Not in the brief; NHN added it later.

**§3.1 Navigation** — a sub-tabbed *NHN* sidebar tab (Styringsstruktur · Forretningsgjennomgang · Leveranser · Tjenester), built on the `forms-tree` relation tree and the `forms-group` group-by engine.

**§3.2 Guided creation and editing** — the **Ny** page and six form definitions over a new `forms-form` engine, plus a **Rediger strukturert** button that reopens any tiddler in the form that would have created it. A definition is data: which inputs to ask for, a wikitext template for the title, a filter for the tags, a filter per field, and a tiddler to seed the body from. Picking a service settles its `TjenesteID`, division and `Styring …` tag automatically, and creation stamps `period` (D3). An existing title is never overwritten or silently uniquified. Editing preserves tags the form does not manage, and renames through `tm-rename-tiddler` so tag-based parent links follow.

**§3.4 Summaries** — the **Sammendrag** page, built on a new generic `forms-grouped-view` (set picker + ordering picker over a JSON view catalogue) plus four new `nhn` projections for grouping by service and by parent objective.

**§3.3 Extracts** — this realised the keystone `export = (set, columns)`:

- A JS CSV engine — [../wiki/plugins/forms/csv.js](../wiki/plugins/forms/csv.js): `forms-csv` builds BOM'd CSV, invoking projection functions per row; `forms-datauri` backs the `<a download>`.
- The **projection catalogue** — [../wiki/plugins/nhn/projections.tid](../wiki/plugins/nhn/projections.tid): `nhn-serviceid`, `nhn-url`, `nhn-division`, `nhn-servicename`, `nhn-severity`, `nhn-governance-type`, `nhn-service-type`, plus `nhn-year`/`nhn-month` from `review.tid`.
- Column specs as JSON data tiddlers, a generic `forms-export` (preview table plus download), and the **Eksport** UI with year/month filters, linked from the NHN toolbar.

Those projections are reused by §3.4, §3.5 and §3.6.

## Build order (recommended)

Ordered by dependency and reuse, **not** by § number. This supersedes the mechanism-level build order in [operations.md](operations.md). The phase-by-phase execution plan — work items, decisions and risks — is in [plan.md](plan.md).

1. **§3.3 Extracts** — ✓ done (above).
2. **§3.4 Summaries** — ✓ done. The **Sammendrag** page: `forms-grouped-view` renders a set picker and an ordering picker over a JSON catalogue, then delegates to `forms-group`. Three sets (deliveries, objectives, results) with three orderings each; adding another is an edit to `summary-views`, not to code.
3. **§3.2 Guided creation** — ✓ done. `forms-create-actions` is exposed separately from the form UI precisely so the ToDo lists can trigger identical creation from a row. `period` is stamped; `reviewed` deliberately is not, since marking an empty tiddler as reviewed is the false positive §3.5 exists to catch.
4. **§3.5 ToDo — business review** — ✓ done. Status is `mangler`/`mal`/`kopi`/`ok` per service per month; attribution falls back from the service tag to an exact title match. A paste-in importer on Tjenesteeiere fills the owner column.
5. **§3.6 ToDo — OKRs** — ✓ done. The status machinery was hoisted into a generic `forms-todo` engine that both lists share; the OKR list is configuration over it. Objectives attach to services, not divisions, so the population is per service.
6. **§3.7 Periodisation and archiving** — ✓ done. A reversible `Arkiv` tag subtracted by every selector, plus a navigation-only period scope. Undated content and anything also tagged a later year are deliberately never hidden.
7. **§3.8 Access control** — server-side (AD / auth proxy); out of plugin scope per D5. A deployment note, not a plugin task.

## Cross-cutting prerequisite: the Service Owner field

Service Owner (Tjenesteeier) is captured by a configurable field on service tiddlers (`nhn-owner-field`, default `tjenesteeier`), edited inline on any service tiddler or in bulk on the **Tjenesteeiere** page. That much is built, ahead of its phase.

**No service carries the field yet** — the snapshot has no owner data at all. §3.1's owner grouping therefore renders one `(Ingen tjenesteeier)` bucket, and §3.5/§3.6 are meaningless until NHN populate it. Getting that data in is the real prerequisite, not more code.

It is tempting to do §3.5/§3.6 next since they are the most visible remaining features, but they sit *downstream* of §3.2's guided creation. Hence steps 4–5.
