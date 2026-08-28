# The data model

How Divisjon Helsepersonell represents its management structure in TiddlyWiki. This is the most important thing to understand before changing anything: **there are no custom data types — everything is tags and fields on plain tiddlers, and the tags *are* the schema.**

Counts below are from the snapshot (~2,652 tiddlers, refreshed August 2026). Verify against [../NHN_TiddlyWiki.json](../NHN_TiddlyWiki.json) before relying on them.

## Where the data lives

The repo carries the live wiki's content in two redundant forms:

- [../NHN_TiddlyWiki.json](../NHN_TiddlyWiki.json) — every tiddler as a single JSON array. The easiest form for counts, tag audits and join analysis.
- [../wiki/tiddlers/](../wiki/tiddlers/) — the same content as individual `.tid` files (the Node.js on-disk form). Use this when reasoning about files on disk.

Filenames in `wiki/tiddlers/` are ASCII-folded (e.g. `maledata` for `måledata`); the JSON `title` and the `.tid` `title:` field keep the real Norwegian characters. **A filename is not a title.**

The live instance is at <https://tiddlywiki.plattform.nhn.no/>. NHN run the **Node.js** instantiation of TiddlyWiki in server mode, a vanilla install with no custom plugins — adding automation on top of that vanilla base is the whole point of the project.

## Three intertwined structures

### 1. Governance structure (Styringsstruktur)

A hierarchy: **NHN (`Norsk Helsenett SF`) → business unit (`Forretningsområde`, e.g. `Divisjon Helsepersonell`) → service (`Tjeneste`)**.

- The org and unit tiddlers are hub tiddlers that pull in their children by tag using `<<list-links>>`.
- Each **service** has a stable numeric **`TjenesteID`** field — the brief calls this "ServiceID" (e.g. `40031`, `40056`). 476 tiddlers carry it.
- A service's type *within governance* is expressed by a `Styring …` tag (see the taxonomy below).

### 2. Intentions / loose OKRs (Intensjon)

Set per year, at each level of the governance structure:

- **`Målsetting`** = Objective (287 tiddlers).
- **`Resultat`** = Key Result (419 tiddlers). A Resultat is linked to its Målsetting by **tagging the Målsetting's title**: `tags: … [[<Målsetting title>]] Resultat`. Målsetting bodies render their results with `<<list-links filter:"[tag[Resultat]tag<currentTiddler>]">>`.

### 3. Deliveries (Leveranse) and the monthly business review

- Work runs in 3-week sprints. Each delivery is a **`Leveranse`** tiddler (576), tagged with the year, the month, and the OKR or governance item it belongs to (again, by tagging that item's title).
- Each **month**, every service owner (`Tjenesteeier`) writes a short **business-review** tiddler for their service, summarising business change, economics and a severity flag of 1–3. These are titled `NN <Service> - hovedtrekk og endringer <month> <year>`, where `NN` (01–12) is the month number.

## Tag taxonomy

- **Time** — `2023`–`2026` (years) and Norwegian month names `Januar`…`Desember`. Both applied as tags.
- **Org** — `Divisjon Helsepersonell` (923), `Norsk Helsenett SF`, `Divisjon`, plus a per-service name tag on everything belonging to that service (e.g. `Kjernejournal`, `Reseptformidleren`).
- **Governance type (`Styring …`)** — `Styring Ekstern tjeneste` (486), `Styring Intern tjeneste` (114), `Styring Tiltak` (154), `Styring Relatert tjeneste` (16), `Styring Satsning for fart` (16). A bare `Styring` tag (124) also appears.
- **Service type** — the same five without the prefix: `Ekstern tjeneste`, `Intern tjeneste`, `Relatert tjeneste`, `Tiltak`, `Satsning for fart`. Used less consistently.
- **Business change severity** — `Forretningsmessig endring:1` (110, *ingen*/none), `:2` (11, *liten*/small), `:3` (3, *større*/larger).
- **OKR / delivery** — `Målsetting`, `Resultat`, `Leveranse`, `Levert`, `Oppgave`.
- **Templates** — `mal` (Norwegian for template), e.g. `01 MAL Tjenestenavn - hovedtrekk og endringer januar 2026`.

## Fields in use

`title`, `type` (`text/vnd.tiddlywiki`), `tags`, `text`, the TiddlyWeb bookkeeping fields (`created`/`modified`/`revision`/`bag`), and notably **`TjenesteID`** (476 tiddlers). A handful carry `color` (30 — these colour-code the structural and type tags in the UI), `draft.*`, `creator`/`modifier`.

## Joins, keys and markers

Resolved against the snapshot — these are the facts the plugins are built on:

- **Parent↔child links are made by tagging the parent tiddler's *title*.** Resultat→Målsetting, Leveranse→(OKR or governance item), and so on: all `tags: … [[<parent title>]]`, rendered with `<<list-links filter:"[tag[…]tag<currentTiddler>]">>`. This — not `TjenesteID` — is the reliable, idiomatic join. **Service membership** is the **service-name tag**.
- **`TjenesteID` is the "ServiceID" but is *not* a universal join key.** It is present on the 476 monthly service-review tiddlers, but sparsely elsewhere: Leveranse 64/576, Målsetting 95/287, Resultat 121/419. Don't use it to join deliveries or OKRs to services — use tags.
- **`Forretningsmessig endring:N` is a *tag*, not a field.** The severity projection reads it from tags.
- **The template marker is the `mal` tag.** There is currently one canonical template (`01 MAL Tjenestenavn - hovedtrekk og endringer januar 2026`) whose title also contains "MAL", but detection should use the tag, not title inference.
- **There is no `Division` field.** "Division" is the `Divisjon Helsepersonell` tag.
- **Service Owner (Tjenesteeier) is a new field the plugins add**, named by `nhn-owner-field` (default `tjenesteeier`) and edited on the service tiddler or in bulk on the **Tjenesteeiere** page. **No tiddler in the snapshot carries it yet**, so anything grouped or filtered by owner is currently empty.

## Naming conventions

- Business-review tiddlers: `NN <Service name> - hovedtrekk og endringer <month> <year>`, `NN` = 01–12. Both 2025 and 2026 sets exist.
- Leveranse: usually `MM/YY - <description>` or `NN Leveranse <month> <year>_ <description>`.

## Data quality

Expect dirty data, and validate against the JSON before asserting structure:

- **Casing and spelling drift in tags** — e.g. `Ekstern Tjeneste` (95) vs `Ekstern tjeneste` (22); months appear as both `Mars` and `mars`; `Resultat` (435) has a lowercase `resultat` (2), which quietly keeps two tiddlers out of the OKR set. Normalise casing on read. Five families drift in this snapshot, but do not work from a list of them: `nhn-tag-casing-drift` (in `validators.tid`) derives the families from the tags in use, because which ones drift changes with every refresh.
- **Reviews are frequently under-tagged.** Of the 781 monthly reviews, **84% carry no `Forretningsmessig endring` tag** and **22% carry no service-name tag**. Anything that treats those as mandatory — a validator, a required form input, a report column — will find most of the corpus non-conforming. Some also carry surprises instead, such as a bare `40031` tag where the severity should be.
- Templates left unfilled, and copies of last month's review passed off as this month's — the ToDo features have to detect both.
- Duplicate-looking titles.
- **The review template is tagged like a review** — governance tag, month and year — so any selector for reviews has to subtract the `mal` tag explicitly or it counts the template as content.
- **Some governance-tagged tiddlers carry no month**, so a set defined as "governance tag + month" is narrower than "governance tag". The extracts use the wider one.
- **The snapshot contains TiddlyWiki drafts** — 19 of them, the scratch copies the editor leaves behind when a tiddler is opened and not saved. Eight inherit the tags of what they draft, so they read as ordinary content: a draft of a `Leveranse` is tagged `Leveranse`. Any selector has to subtract them (`nhn-drafts`) or it double-counts the work. Eleven have lost their `draft.of` field and are recognisable only by the `Draft of '…'` title TiddlyWiki gave them.

This inconsistency is not incidental: it is exactly the data-quality problem the brief wants solved. Never assume the tags are clean.

## Norwegian glossary

| Norwegian | English |
|---|---|
| Styringsstruktur | governance structure |
| Forretningsområde | business unit |
| Tjeneste | service |
| Tjenesteeier | service owner |
| Intensjon | intention |
| Målsetting | objective |
| Resultat | key result |
| Leveranse | delivery |
| Forretningsmessig endring | business change |
| Mandater | mandates |
| MAL / mal | template |
