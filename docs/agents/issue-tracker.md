# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- **`ls` the issues directory before choosing a number.** The `grep -L '^status: done'` in `CLAUDE.md` lists only the *open* tickets, so it says nothing about the highest number in use — on 2026-09-04 a ticket was written as `27` against an existing, finished `27` and `28`, and renumbering it meant editing twenty-odd references while leaving five pre-existing mentions of the real ticket 27 alone, in the same files
- Triage state and dependencies are **YAML frontmatter**, the first four lines of every issue file: `status:` (see `triage-labels.md` for the role strings) and `blocked_by:`, a list of zero-padded ticket numbers, `[]` when nothing blocks it. They were body lines until 2026-09-04, positioned only by the convention "near the top" — which nothing enforces, so they drifted with the prose above them, reaching line 85 of 105 on ticket 26. Frontmatter is structural: line 2, whatever the ticket grows into
- A ticket's frontmatter is the **only** record of its state. Do not add a status index or state file: it becomes a second truth that drifts, and it is a merge conflict on every ticket completion when agents run as parallel worktrees. The aggregate view is derived — `yq --front-matter=extract '.status' <file>`, or the `grep` above
- Where a ticket has a design referent, a `**Design:**` line stays in the **body**, naming the artboard and the line range it must be built against, or — where the referent is not an artboard, as for a design system — naming that instead. Added because the design canvas landed after the tickets were written: a criterion reading "renders distinctly" is unbuildable without one
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
