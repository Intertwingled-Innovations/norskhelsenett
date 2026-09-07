# CLAUDE.md

Orientation for LLMs/agents. **The substance lives in the human-readable docs** — this file is a map plus the constraints you must not violate. Humans should read [README.md](README.md) and [docs/](docs/) instead; nothing here is written for them.

## What this repo is

A working repo for a **TiddlyWiki simplification project for Norsk Helsenett SF (NHN)**, business unit **Divisjon Helsepersonell**. It is **not** a TiddlyWiki source-code repo: it holds the client brief, a snapshot of NHN's live wiki, and the plugins being built (`forms`, `nhn`, `nhn-theme`). Content is overwhelmingly **Norwegian**. See [README.md](README.md) for the repo tour and the build/run commands.

## Read before you act

| Before you… | Read |
|---|---|
| touch anything | [README.md](README.md) — repo layout, `npm run serve` / `npm run build`, the `wiki/` vs `wiki-server/` split |
| query, count or reason about content | [docs/data-model.md](docs/data-model.md) — tags-are-the-schema, the taxonomy, joins/keys, dirty-data warnings, Norwegian glossary |
| write or change plugin code | [docs/architecture.md](docs/architecture.md) — a file-by-file inventory of both plugins, the three-layer shadow model, the keystone abstraction, design decisions D1–D5, TiddlyWiki gotchas |
| pick up the next piece of work | [docs/plan.md](docs/plan.md) — the phased execution plan; [docs/requirements.md](docs/requirements.md) for the brief's deliverables and current status |
| implement a report, export or validator | [docs/operations.md](docs/operations.md) — the operation catalogue and requirement→operations mapping |
| propose a solution to a brief requirement | the PDF at the repo root, in full — it is the spec |

## Hard constraints

Non-negotiable; violating one is a bug even if the code works. Details in [docs/architecture.md](docs/architecture.md).

- **No NHN/Norwegian string, tag, field name, URL or month name may appear in `forms`.** A hardcoded `Leveranse`, `Styring …`, `mars`, `ServiceID` or `tiddlywiki.plattform.nhn.no` in the engine belongs in an `nhn` config shadow the engine reads.
- **Never write to the plugins' own config/shadow tiddlers at runtime.** Config ships as shadows; user edits create overrides; "reset to defaults" = delete the override. Mutating a shadow breaks that.
- **Config-by-data:** forms, columns, group-by paths, tag sets and kind tables are data tiddlers, not code.
- **Tags are the schema.** Build on TiddlyWiki filter expressions over the existing tags/fields; do not introduce a parallel data model.
- **Don't assume tags are clean.** Casing and spelling drift is pervasive and is itself the problem the brief wants solved. Validate against the JSON before asserting structure.
- **The wiki content is internal NHN management data.** Keep it in-repo; never push it to external services.

## Working notes

- **Prefer [NHN_TiddlyWiki.json](NHN_TiddlyWiki.json) for analysis** (counts, tag audits, joins). Use [wiki/tiddlers/](wiki/tiddlers/) when reasoning about the on-disk Node.js form or proposing file-level changes. Filenames there are ASCII-folded — a filename is not a title.
- **Verify TiddlyWiki semantics against the installed build (5.4.0), not training data.** The gotchas that have actually cost time are listed in [docs/architecture.md](docs/architecture.md): headless `$:/tags/Global` testing, `currentTiddler` scope, run-prefix accumulation, `tagging[]` vs `tag<>`, **`:and` is not logical AND**, and shadow precedence depending on `plugin-priority`. The TiddlyWiki5 source is in a sibling working dir (`../TiddlyWiki5`).
- **Run `npm test` after touching plugin code** (218 tests, ~30s, no deps beyond TiddlyWiki; `npm test -- <pattern>` is sub-second for the filter-level suites and a few seconds for the ones that render a page). Filters fail *silently* — a renamed projection exports a blank column rather than erroring — so the suite is the only thing that notices. Add cases with the behaviour you change; see [docs/testing.md](docs/testing.md).
- **Mutation-test anything load-bearing.** Several bugs here passed a green suite — a guard that never fired, a page whose logic the test reimplemented. Break the code deliberately and check a test fails. Use `cp` for the backup, never `git checkout`: it silently does nothing on an untracked file and silently reverts your work on a tracked one.
- **Keep the docs current.** When you change behaviour, status or a design decision, update the relevant file in [docs/](docs/) — not this one. This file should only change when the *map* changes.
