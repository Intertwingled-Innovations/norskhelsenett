# NHN TiddlyWiki Simplification

A TiddlyWiki simplification project for **Norsk Helsenett SF (NHN)**, specifically its business unit **Divisjon Helsepersonell**. NHN runs the national infrastructure for sharing health data in the Norwegian healthcare sector; Helsepersonell uses a TiddlyWiki (served at <https://tiddlywiki.plattform.nhn.no/>) to manage its governance structure, OKRs, deliveries and monthly business reviews.

This repo contains a snapshot of that wiki plus the deliverable: two TiddlyWiki plugins (`forms` and `nhn`, plus a theme) that add simplified navigation, guided creation and editing, grouped summaries, Excel/CSV extracts, to-do lists for the monthly reviews and yearly OKRs, reversible archiving, diacritic-insensitive search, a board delivery report that downloads as a standalone HTML file, and a data-quality page that proposes bulk fixes and applies the ones NHN approve — all on top of the existing tag-based data model, without changing it. The client brief (see the PDF below) defines the requirements; the last three came after it — the search and the report at NHN's request, the data-quality page out of the work itself.

The wiki content is internal NHN management data, mostly in Norwegian. Keep it in this repo; do not push it to external services.

## Building and running

Requires Node.js. TiddlyWiki is installed as a dev dependency.

```sh
npm install    # install tiddlywiki

npm run serve  # editable server at http://127.0.0.1:8080
               # edits save back into wiki/tiddlers/

npm run build  # static single-file wiki → build/index.html (no sync plugins)
               # + importable plugin JSONs → build/plugins/{forms,nhn,nhn-theme}.json

npm test       # run the plugin test suite (248 tests, ~30s)
               # npm test -- <pattern> selects by file, suite or name
```

The GitHub Pages deploy ([.github/workflows/deploy.yaml](.github/workflows/deploy.yaml)) runs `npm ci` → `npm test` → `npm run build` and publishes `./build`; a failing test blocks the deploy. Branches and pull requests run the suite via [.github/workflows/test.yaml](.github/workflows/test.yaml).

The build also publishes the three plugins as standalone JSON files, `plugins/forms.json`, `plugins/nhn.json` and `plugins/nhn-theme.json` (a `plugins` build target in [wiki/tiddlywiki.info](wiki/tiddlywiki.info), rendered through the core `JsonFile` exporter). Each is TiddlyWiki's drag-and-drop import format: drop the file into any wiki — including plain tiddlywiki.com — import, save and reload, and the plugin is installed. On the Pages site they live at:

- [https://intertwingled-innovations.github.io/norskhelsenett/plugins/forms.json](https://intertwingled-innovations.github.io/norskhelsenett/plugins/forms.json)
- [https://intertwingled-innovations.github.io/norskhelsenett/plugins/nhn.json](https://intertwingled-innovations.github.io/norskhelsenett/plugins/nhn.json)
- [https://intertwingled-innovations.github.io/norskhelsenett/plugins/nhn-theme.json](https://intertwingled-innovations.github.io/norskhelsenett/plugins/nhn-theme.json)

The theme is only switched on by the `$:/theme` and `$:/palette` pointers in `nhn`, so install it alongside `nhn`; imported on its own it sits inert.

There are two wiki folders because of a client/server split:

- **`wiki/`** — the *client* wiki: content, plugins, themes, and the static `index` build target. It carries no sync plugins, so the single-file build doesn't attempt (and fail) to sync.
- **`wiki-server/`** — the *server* edition: includes `wiki/` via `includeWikis` and adds the `tiddlyweb` + `filesystem` sync plugins, so `npm run serve` is editable and writes changes back to `wiki/tiddlers/`.

## Key files and folders

### Specification and documentation

| Path | Purpose |
|---|---|
| `2026 Simplification of Tiddlywiki….pdf` | The client brief — the spec for the work. Section 3 lists the deliverables. |
| [docs/data-model.md](docs/data-model.md) | How NHN represents governance, OKRs and reviews in tags and fields: the taxonomy, the joins and keys, the data-quality traps, and a Norwegian glossary. **Read this first.** |
| [docs/architecture.md](docs/architecture.md) | The three plugins, the shadow-tiddler layering principle, the keystone abstraction, design decisions D1–D7, and TiddlyWiki gotchas. |
| [docs/requirements.md](docs/requirements.md) | The brief's deliverables, what is built, and the recommended build order for the rest. |
| [docs/plan.md](docs/plan.md) | The execution plan: phases, work items, the decisions each forces, and risks. Its **What is left** section is the current review of remaining work. |
| [docs/operations.md](docs/operations.md) | The operation catalogue (selectors, projections, grouping, export) and the mapping from requirements to operations. |
| [docs/testing.md](docs/testing.md) | How the test suite works, how to run it, and how to add cases. |
| [docs/demo.md](docs/demo.md) | Scripts for the client demos, newest first — what to show, in what order, with the figures to quote. |
| [nhn-tiddlywiki-simplification-bilingual.html](nhn-tiddlywiki-simplification-bilingual.html) | Bilingual (English/Norwegian) presentation of the project. |
| [CLAUDE.md](CLAUDE.md) | A map for LLM agents: pointers into the docs above, plus a restatement of the hard constraints. Nothing in it is written for a human reader. |

### Wiki content (snapshot of the live NHN wiki)

| Path | Purpose |
|---|---|
| [NHN_TiddlyWiki.json](NHN_TiddlyWiki.json) | All ~2,652 tiddlers as one JSON array — the easiest form to query and analyse programmatically. |
| [wiki/tiddlers/](wiki/tiddlers/) | The same content as individual `.tid` files (the Node.js on-disk form). Filenames are ASCII-folded; the `title:` field keeps the real Norwegian characters. |
| [DefaultTiddlers.json](DefaultTiddlers.json) | The wiki's default open tiddlers (`$:/DefaultTiddlers`). |

**Refreshing the snapshot.** `wiki/tiddlers/` is regenerated from `NHN_TiddlyWiki.json` by loading the JSON into a bare wiki and running TiddlyWiki's own `--savewikifolder`, which produces exactly the filenames and `.tid`/`.meta` pairs the filesystem adaptor writes. Three things in that folder are **not** in the JSON export and must survive the regeneration:

- `DefaultTiddlers.json` — `$:/DefaultTiddlers`, which the export omits along with every other `$:/` tiddler.
- `Spørsmål til NHN` — the open questions for the client, written here, not by them.
- `Investigation` — working notes, likewise.

The last two are ordinary content tiddlers with no marker distinguishing them from NHN's own, so a wholesale replace deletes them silently. Check the deletions in `git status` against the titles the JSON actually dropped before committing a refresh.

### The plugins (the deliverable)

Auto-loaded from `wiki/plugins/`; TiddlyWiki packs each folder into a plugin at boot, so their tiddlers become shadows. Three layers: `forms` ships mechanism, `nhn` ships NHN-specific configuration as shadow overrides, and users can override anything with ordinary tiddlers (deleting the override reverts to the default).

| Path | Purpose |
|---|---|
| [wiki/plugins/forms/](wiki/plugins/forms/) | **`forms`** — generic, configuration-driven engine: relation trees (`tree.tid`), group-by overviews (`group.tid`, `grouped-view.tid`), guided creation and structured editing (`form.tid`, `edit.tid`), to-do lists (`todo.tid`), CSV export with UTF-8 BOM (`csv.js`, `export.tid`), standalone HTML documents (`html.js`), tag merging through the core relinker (`merge.tid`), diacritic-insensitive search (`fold.js`). Contains zero NHN/Norwegian specifics by design. |
| [wiki/plugins/nhn/](wiki/plugins/nhn/) | **`nhn`** — NHN-specific layer, almost entirely configuration: the projection catalogue (`projections.tid`), the sub-tabbed *NHN* sidebar (`sidebar.tid`, `nav-*.tid`), the Excel extracts UI and column specs (`eksport.tid`, `extract-columns-*.tid`), month maps, tiddler-kind table and colours, the guided-creation form definitions (`form-*.tid`), service-owner capture, the board delivery report and its export template (`rapport*.tid`), the data-quality page and its bulk fixes (`anomalier.tid`), and the theme/palette activators. |
| [wiki/plugins/nhn-theme/](wiki/plugins/nhn-theme/) | **`nhn-theme`** — theme plugin carrying the NHN visual identity: green palette, font, stylesheet layered on Vanilla/Snow White. Activated by pointers in the `nhn` plugin. |

### Configuration and build

| Path | Purpose |
|---|---|
| [package.json](package.json) | npm scripts (`serve`, `build`, `test`) and the `tiddlywiki` dependency. |
| [tests/](tests/) | The test suite: a dependency-free harness that boots the wiki in-process and asserts against real filter evaluation. See [docs/testing.md](docs/testing.md). |
| [wiki/tiddlywiki.info](wiki/tiddlywiki.info) | Client wiki config: themes and the `index` build target. |
| [wiki-server/tiddlywiki.info](wiki-server/tiddlywiki.info) | Server edition config: includes `wiki/`, adds sync plugins, saves new tiddlers into `wiki/tiddlers/`. |
| `build/` | Output of `npm run build` (not source). |

## Status

Of the brief's deliverables: **§3.1 simplified navigation**, **§3.2 guided creation and editing**, **§3.3 Excel/URL extracts**, **§3.4 delivery/OKR summaries**, **§3.5/§3.6 the review and OKR to-do lists** and **§3.7 periodisation and archiving** are done — every deliverable except the optional §3.8. Two things NHN added after the brief are done too: **normalised search** (D2) and the **Leveranserapport**, a board delivery report that downloads as a standalone HTML file.

Remaining, in short: §3.8 access control and the deployment write-up (server-side, a document rather than a plugin task); bulk fixes for the data-quality classes still only diagnosed — two of the ten on the **Anomalier** page can now be fixed from it, the rest wait on NHN approving each class; and the service-owner data, which no service carries yet. Eleven questions are open with the client, listed in the *Spørsmål til NHN* tiddler in the wiki.

See [docs/plan.md](docs/plan.md) — its **What is left** section reviews all of it, split by what each item waits on — and [docs/requirements.md](docs/requirements.md) for the deliverables and the reasoning behind the build order.
