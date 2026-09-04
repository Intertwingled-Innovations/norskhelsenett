# Demo script

One script per demo, newest first. Earlier scripts are kept as a record of what was actually shown and are **not** updated as the plugins change — the counts in them are the counts of the snapshot on the day.

## 2026-09-04 — what is new since 2026-08-24 (~16 min)

Cue cards, not prose. Follow-up to 2026-08-24; only what is new.

### Vocabulary — glance here when a word goes

| Norwegian | English | Where it shows up today |
|---|---|---|
| leveranse / leveranser | delivery / deliveries | the whole report; the `Leveranse` tag |
| tjeneste / tjenester | service / services | the section headings in the report |
| tjenesteeier | service owner | still empty — question 1 |
| forretningsområde | business unit | *Divisjon Helsepersonell*; half of what makes a service a service |
| forretningsgjennomgang | monthly business review | the other ToDo list, not shown today |
| målsetting | objective | what 8 of the 12 unplaced deliveries are tagged |
| resultat | key result | one of the casing families (`Resultat`/`resultat`) |
| tiltak / satsning for fart | initiative / drive for speed | national, above the divisions — Parek and DHG |
| utkast | draft | section 10 of Anomalier, the delete button |
| skrivemåte | spelling | section 2, *avvik i skrivemåte* = casing drift |
| anomalier | anomalies | the page itself |
| uten tjenestekobling | with no service link | the block at the foot of the report |

**On the buttons:** *Behold* keep · *Slå sammen* merge · *Slett* delete · *Last ned* download · *Fra / Til måned* from / to month · *(ingen tekst)* no text.

**Setup:** `npm test` green · `npm run build` fresh · open `build/index.html`, not the server — a reload resets everything · *NHN* tab · search empty · nothing archived · *Alle år* · open both pages once to warm them.

### 1. Recap — 1 min

- Last time: **Anomalier** listed the problems, fixed none. Question 2 was who presses the button.
- New since: it now fixes two of them — casing drift, leftover drafts. Plus the board report NHN asked for.

### 2. Anomalier, now with two fixes — 7 min  ·  question 2

**Anomalier → section 2.** Heading: *5 begreper — 10 tagger*.

- Used to be a typed table. Now computed from the tags in use — which is how `Resultat`/`resultat` and `MyHealth@EU`/`Myhealth@EU` surfaced.
- One control per concept: *Behold* [keep] radio · spellings · counts. Most-used preselected.

**Small one, for the mechanics.** `MyHealth@EU` 3 vs `Myhealth@EU` 1.

- Warning: *flytter taggen på 1 tiddler*.
- Click **Slå sammen til «MyHealth@EU»** → control gone, heading *4 — 8 tagger*. Nothing deleted.

**Big one, for the decision.** `Ekstern Tjeneste` 95 vs `Ekstern tjeneste` 22.

- Preselects the capital T. Moves 22.
- But the taxonomy is lower case: the `Styring …` tags, the Tjeneste form's dropdown.
- **Click the other radio.** Warning rewrites itself: 95 tiddlers, **and** renames the tiddler «Ekstern Tjeneste» → «Ekstern tjeneste».
- Question 2 is not "shall we clean up". It is "which spelling", family by family.

**Three points:**

- Core relink machinery — `list` fields follow, config never rewritten.
- Never deletes. Two real tiddlers → moves the tag, says so, leaves the merge to a person.
- One file write per tiddler on a server. No undo.

**Second button, same page — section 10.** *Utkast som ligger igjen* [leftover drafts]: 19 in the wiki.

- TiddlyWiki's scratch copies, left behind when an edit is never saved. Already out of every count; the tiddlers are still there.
- Button reads **Slett 18 utkast** — not 19. One drafts `New Tiddler 10`, which was never saved, so its text exists nowhere else. Held back and listed for a person to read.
- Same rule as the merge, and worth saying: never delete the only copy of something somebody wrote.
- Click it. 18 gone, the one survives.

**Reload** before section 3.

### 3. Leveranserapport — 7 min  ·  questions 8, 9

- Their own prototype, back: a Python script over an export. Its rules were already here — service = business unit + service type, delivery = `Leveranse` + year + month.
- **Sidebar → Rapport.** Pickers *År* · *Fra måned* · *Til måned*. Opens 2026, **Januar–November** — the data's span, not the calendar's.
- Summary: **24** tjenester · **171** leveranser · **142** koblet · **29** uten kobling · **637** totalt. All counted from the sets below.
- **Second section down — *Felles europeisk helsedataområde (EHDS)*** (1 delivery, so nothing to hunt for). It reads `03/26 Leveranse EHDS: Oversikt over "hvem gjør hva når" v1.0` — the `03/26` is the report's, built from the delivery's Mars + 2026 tags. Below it: two rendered `!!` headings, the body text, a live link, six tag pills. The script could only print that as source. (*Kjernejournal Pasientens felter*, three entries with `! Mål` / `! Levert`, if you want a longer one.)
- Not every section shows a prefix. Four services already type it into the title — *Forvaltning av Helsenettet*, *Selvbetjening*, *Autentisering og autorisasjon*, *Personvern og tilgangsstyring* — and the report leaves those alone rather than dating them twice. Say that if someone asks.
- Under *Autentisering og autorisasjon*, one reads *(ingen tekst)*. Gap shown, not hidden.
- **Mai–August:** 75 deliveries, 19 services. Their script: 73 of 636. Ours: 637. Two apart — their export is older.
- **År → 2025:** range resets to Januar–Desember. 184 deliveries, 17 services. Without the reset, one year's range silently narrows the next.
- **Bottom of page — *Leveranser som mangler kobling til tjeneste*:** 29 default, 12 for mai–august — their script found twelve too. Question 8: 8 of those 12 are tagged an objective that *is* tagged the service, so the fix may be ours (follow the hop), not theirs. The other 4 are Parek and DHG — national `Tiltak` / `Satsning for fart`, owned by no service.
- **Last ned HTML** → `leveranserapport-2026-05-08.html`. Standalone: TOC · section per service · same counts · every link a permalink into the live wiki. Open it.
- If time: the report's join is stricter than the summaries' — business unit **and** service type. Keeps a mis-tagged workstream out of a board report.

### 4. Close — 1 min

- Two decisions: the correct spelling per family (q2); what to do with the deliveries no service owns (q8) — follow the hop, retag, or a section for initiatives.
- Everything else outstanding is in **Spørsmål til NHN**, now eleven questions. Walk it if there is time.
- Reload before handing the laptop over.

## 2026-08-24 — full walkthrough (~30 min)

Script for the NHN client demo (2026-08-24). ~30 minutes. Run `npm run build` beforehand and open `build/index.html` in the browser — the story river opens on **Spørsmål til NHN**, which is the closing slide. Use the static build, not the server: every feature works in-memory, nothing is written to `wiki/tiddlers/`, and a reload resets to the pristine snapshot. The "unsaved changes" indicator will light up after the first edit — say that this is single-file mode and the server saves automatically.

**Before you start:** `npm test` is green and the build is fresh (`npm run build` after the last commit); search box empty; sidebar on the *NHN* tab; period selector on *Alle år* [all years]; nothing archived (check **Arkiv**); **Tjenesteeiere** [service owners] shows *0 / 60* — owners must be **empty** at the start (the incompleteness is part of the story); have the paste snippet from section 6 ready in a text editor.

### 1. Framing (2 min)

- We track the following types:
  - Business Review
  - Delivery
  - Objective
  - Task
  - Result
  - Service
- Nothing in the original data model is changed; everything is a layer over what exists
- Two plugins: a generic *forms* engine and an *nhn* configuration layer. Configuration can be reset by deleting the override.

### 2. Navigation — §3.1 (4 min)

- Sidebar *NHN* tab: **Styringsstruktur** [governance structure] (NHN → forretningsområde [business unit] → tjeneste [service] → intentions), **Forretningsgjennomgang** [business review] (year → month), **Leveranser** [deliveries] (year → month), **Tjenester** [services] (by business unit and by service owner).
- Period selector: pick *2026* — trees narrow (deliveries 615 → 179 leaves). Point out it narrows navigation only, never exports or ToDo lists.
- Search: type `stotte` — finds *Støtte* [support]. Diacritic-insensitive search is the default.

### 3. Guided creation and editing — §3.2 (6 min)

- Open **Ny** [new]. Pick *Forretningsgjennomgang* [business review], choose a service, year, month. Show the live title preview and that TjenesteID, division and the `Styring …` tag are derived, not typed.
- Create it: lands on a correctly titled, tagged tiddler seeded from the template. Try creating the same one again — it refuses rather than overwriting.
- Open an existing review, click **Rediger strukturert** [structured edit]: same form, pre-filled; unmanaged tags survive; changing service/month renames the tiddler.
- Mention: *Forretningsmessig endring* [business change — the 1–3 severity rating tag] is optional in the form because 84% of existing reviews lack it (question 4).

### 4. Summaries — §3.4 (3 min)

- **Sammendrag** [summary]: set picker (leveranser [deliveries] / målsettinger [objectives] / resultater [key results]) × ordering picker (year→month, service→year, objective→…). Expand a group.
- Adding an ordering is an edit to a JSON catalogue, not code.

### 5. Extracts — §3.3 (4 min)

- **Eksport** [export]: Extract 1 (governance tiddlers, year + month filter) and Extract 2 (services by type, year filter). Preview table, then **Last ned CSV** [download CSV] — open in Excel, show BOM'd UTF-8 keeps æøå intact.
- Point out the URL column and ask question 6 (permalink base).

### 6. ToDo lists — §3.5 / §3.6 (5 min)

- **ToDo forretningsgjennomgang** [business-review to-do]: pick a month; statuses *mangler* [missing] / *mal* [template] / *kopi* [copy] / *ok*. Explain *mal* (created but still the template) and *kopi* (identical to last month) — the two false positives the brief asked to catch. Click **Opprett** [create] on a missing row → straight into the pre-filled form.
- **ToDo målsettinger** [objectives to-do]: the same per year, with key-result counts. Default scope = services active this year; toggle *Alle tjenester* [all services].
- **The incompleteness.** Point at the blank *Tjenesteeier* [service owner] column in both ToDo lists, then open **Tjenesteeiere**: the counter reads *0 / 60* and the whole *Tjenesteeier* column is empty boxes. This is not a bug — the snapshot carries no owner data at all, and the field is new. It is question 1. Everything downstream (the owner column, the *Tjenester* tree, where every business unit holds one big *(Ingen tjenesteeier)* [no service owner] group) waits on it.
- **Update, way 1 — one at a time.** Still on the **Tjenesteeiere** page, scroll past the paste box to the second heading, *Alle tjenester* [all services]: a table of all 60 services with columns Tjeneste · ServiceID · Forretningsområde [business unit] · Tjenesteeier. The last column is a text box per row. Find the *Fjernhjelp* row, type a name in its box and tab out. The counter at the top of the page ticks to *1 / 60*. Then click the *Fjernhjelp* pill to open the service tiddler itself: the same value appears just below its tags as *Tjenesteeier:* and is editable there too — it is one field stored on the service tiddler, not a separate register.
- **Update, way 2 — in bulk.** Paste the snippet below into *Lim inn fra regneark* [paste from spreadsheet]. The preview says *4 av 5 navn treffer en tjeneste* [4 of 5 names match a service] and lists `Fjernhjelpen` as unmatched (deliberate typo: nothing is guessed, unmatched lines are skipped). Click **Sett tjenesteeiere** [set service owners]. Counter: *5 / 60*.

  ```
  Autentisering og autorisasjon	Kari Nordmann
  Etterkontroll	Ola Hansen
  Forskrivningsmodulen	Kari Nordmann
  Helsenettet.no og Medlemstjenesten	Per Olsen
  Fjernhjelpen	Anne Berg
  ```

- **Show it landed.** Back to **ToDo forretningsgjennomgang**: the owner column is filled for those services. Sidebar *Tjenester* tab: under *Divisjon Helsepersonell*, Kari Nordmann now has her own group with two services. Close with: a real spreadsheet of 60 rows is the same paste.

### 7. Archiving and data quality — §3.7 (4 min)

- **Arkiv** [archive]. Set the stage first so the change is visible: in the sidebar open the *Forretningsgjennomgang* [business review] tree with the period selector on *Alle år* — it shows a branch per year with a count in brackets (2023, 2024, 2025, 2026). Keep that in view.
  - On **Arkiv**, pick *Til og med år* [up to and including] = 2024. The page shows a table of what would be archived per kind (Forretningsgjennomganger, Leveranser, Målsettinger, Resultater) and a total — 598 tiddlers — with the warning that it writes to that many tiddlers. Nothing has happened yet.
  - Click **Arkiver 598 tiddlere**. The audience watches the sidebar: the 2023 and 2024 branches vanish from the tree and the 2025/2026 counts are unchanged. The page's *Arkivert nå* [archived now] section now reads *598 tiddlere er arkivert* with a per-year breakdown.
  - Say: nothing deleted — it is one `Arkiv` tag, subtracted by every list and export. Undated content, and anything also tagged a later year, is never hidden. Question 3.
  - Click **Hent fram alt igjen** [bring everything back]: the year branches reappear. (Or leave it archived if they prefer the tidier look.)
- **Anomalier** [anomalies]: nine classes of drift, counts and affected tiddlers. Show class 9 — open *02 Styringsrapport DHP februar 2025* and point at the `* Internregnskapet …` line rendered as text — as the concrete example of why. Nothing is fixed automatically — question 2.

### 8. Close (2 min)

- §3.8 access control is server-side (question 7); deployment (question 8).
- Walk through **Spørsmål til NHN** [questions for NHN] top to bottom and capture answers in the tiddler.

**Things not to skip:** title preview in the form; the duplicate refusal; the *mal* / *kopi* distinction; that the period selector doesn't touch exports; that everything is reversible and data-driven.
