# ai-juror-dashboard

A public, read-only dashboard measuring the AI agent jurors in Kleros v2 court 34 on Arbitrum One
on two dimensions: **speed** (commit and reveal latency) and **coherence** (voting with the final
ruling). Vite + React + TypeScript, yarn 4, Biome, Vitest. `README.md` covers the toolchain, scripts,
test split and CSP; `netlify.toml` owns the deploy; this file covers the domain.

## Status

Live at <https://kleros-ai-jurors.netlify.app>. Seven views under one shell: the matrix and court
totals at `/`, a dispute index, `/disputes/:id`, `/agent-jurors`, `/agent-jurors/:nickname`,
`/method`, and a 404. Eight ADRs.

Ticket state is YAML frontmatter on each ticket, never here: `grep -L '^status: done'
.scratch/juror-performance-dashboard/issues/*.md`. History is `project-history.md`, not current truth.

## Start here

| Read | For |
| --- | --- |
| `CONTEXT.md` | The glossary. Read before naming anything |
| `docs/knowledge/` | The domain knowledge base, indexed in its own `README.md` |
| `docs/adr/0001`–`0008` | The decisions a reader would otherwise question |
| `.scratch/juror-performance-dashboard/spec.md` | The spec, plus a Further Notes section of hard-won facts |
| `.scratch/juror-performance-dashboard/issues/` | The tickets, blockers-first, `01` upward |
| `.scratch/juror-performance-dashboard/canvas/README.md` | The design canvas: eight artboards, and which figures on them are real |
| `docs/contrast.md` | Every contrast ratio, both themes, the two exemptions. Read before changing a colour |
| `docs/accessibility.md` | Ticket 18's sweep: what was checked, what is left, and what the sweep missed |

Start by reading. Every ticket from `03` up names the artboard it is built against on a `**Design:**` line.

## Where knowledge goes

This file is an index, **budgeted at 155 lines**: past that, a line leaves before one arrives and
the commit says which. It reached 87 KB once by admitting every fact worth knowing — the cure was
placement, not brevity. One test admits a line here:

> **Does it warn about a mistake made in a file that does not exist yet?**

- The file exists → the comment goes **in that file**, read at the moment it applies. Not here.
- A durable fact, or the full account of a trap → **`docs/knowledge/`**, matching topic file.
- User, session or tooling → auto-memory, which never holds a domain fact: subagents never see it.

## Invariants

- **Read-only, forever.** This dashboard never votes, stakes, holds a key, or connects a wallet.
- **No backend.** Every endpoint is public and keyless. Any `VITE_` config is baked into the bundle
  and is public by construction — never put a secret there.
- **No personal data.** Agent jurors are named by nickname, avatar, stack and the **agent's own**
  account — never by who built them, and an operator's account is the one that must never arrive.
- **Public deployment**, possibly cited in research. Partial data must never render as complete, and
  caveats must be visible in the UI, not just handled correctly in code.
- **Every derivation lives below the seam** — `src/performance/`, pure, no network, no clock. A
  metric computed in a component is the mistake that seam exists to prevent (`architecture.md`).
- **The visual system is Kleros ×AI**, vendored verbatim under `src/styles/kleros-ai/` from
  `../kleros-design-system/`; `theme.ts` is `var(--token)` aliases holding no value of its own.
  Never re-derive a palette from `kleros-v2/web` — that repo is the reference for markdown and
  react-query patterns, not for how this looks.
- **Where the canvas and a ticket disagree, the canvas wins** (ruled 2026-08-25) — but only if the
  artboard you are reading draws *that element in that place* (`architecture.md` § The design canvas).
- Use `CONTEXT.md` vocabulary. It deliberately **overrides** `kleros-juror-cli`'s glossary on one
  point: "agent" is an avoided term there, and the central term here.
- **CI (`.github/workflows/ci.yml`) is toolchain upkeep, not a ticket.** Do not propose it.
- **The roster grows, so its length is `ROSTER.length` and never a literal.** A hard-coded six drops
  a column or a slot in silence. Not every six is the roster: the six *figures* stay six.

## Tripwires

Each entry warns about a mistake made where no comment can wait for you — in a file not yet written,
in a sentence on a page the change never opened, or at a terminal. **Everything else this project has
learned is carried as a comment at its site, and in full in `docs/knowledge/`**: court-34,
chain-and-subgraph, measurement-rules, react-query-and-persistence, layout-and-css, contrast-and-theme,
a11y-and-focus, prose-and-caveats, testing, build-deploy-and-tooling, merging-and-branches,
ens-and-roster, architecture, project-history. Read the topic file before working in its area.

### Reads that come back short

- **A subgraph read that comes back short throws nothing** — HTTP 200, `[]`, no error, rendering as
  an absence indistinguishable from a fact. Where a read draws a **known set** of ids, compare
  returned against asked-for and report the shortfall as a count.
- **A flag that is false while a read is in flight is not a flag that the read failed.** An absence
  becomes a failure only once there has been an answer to fall short of. Every emptiness test needs
  its own gate, tested **both** ways. Four instances so far, three of them reintroductions.
- **The Arbitrum endpoint rate-limits per RPC *call*, counting a batch as its size**, and surfaces
  it as `UnknownRpcError`. Before adding a chain read to a live test, ask if it needs a moment.

### The file you are about to write

- **The breakpoint is one number and it has to stay one.** A new `@media` with a literal is a
  regression; a new width must answer a question `styles/breakpoints.ts` does not.
- **A backtick inside a CSS comment ends the styled-components template**, and **an interpolation
  inside one is still evaluated**. Name tokens in prose, without backticks.
- **Any declared width needs a browser to confirm it was honoured.** `getComputedStyle` reports what
  was *asked*, `getBoundingClientRect` what was *given*, and the gap is silent — `table-layout: auto`
  crushed the matrix's row header for three tickets.
- **A link you put inside a sentence is marked by colour alone until you say otherwise.** The
  vendored `base.css` un-underlines every anchor and the accent is 1.22:1 on body ink, so a new
  prose link ships a WCAG 1.4.1 violation. Underline it permanently, on the prose container.
- **`title` is never the sole carrier of a fact** — `aria-hidden` on the abbreviation, a
  `VisuallyHidden` beside it. One that duplicates visible text is fine. Put the separating space
  in a **text node**, not inside the hidden element: a name trims each element's own contribution.
- **`Thing.ts` and `Thing.tsx` differing only in case is a hard macOS TypeScript error** (`TS1149`).
  Only `yarn check-types` says so.

### The sentence on the page you did not open

- **Narrowing a set changes every sentence quantified over it**, including on views the ticket never
  opened. The compiler finds the figures; only reading finds the sentences. The tell is a number in
  prose with a noun after it.
- **A green axe run is not an accessibility sweep — axe does not check target size at all.** Naming
  the criteria a tool does *not* test is part of reporting it.

### At the terminal

- **The offline suite goes red under CPU contention and looks like a bug you just introduced.** The
  tell is the **duration**, not the failure count. Same advice for a red *live* suite, different
  reason (rate limits). A red `court-parameters` suite is usually the court being reconfigured for
  a demo — read the history off chain first.
- **`yarn preview` silently moves port when one is in use**, and another worktree may be serving a
  different branch there. Use `--strictPort`; if a server is already up, look before killing — a
  vite **dev** server pointed at this checkout is already compiling your edits.

### Merging parallel branches

- **Never machine-resolve a conflict hunk by concatenating both sides** — git splits hunks inside
  prose doc comments, and the technique can swallow a `/**`, a `});` or a type field. If a script is
  unavoidable, diff the result against **both** parents.
- **When integrating, re-read every sentence that counts what is done**, and every helper both
  branches touched — then look for what the merge newly connects that neither parent could test.

## Verified constants

Every address, endpoint and court constant is **defined in `src/`**, and that is the source of
truth: `disputes/court-subgraph.ts` (court id, core subgraph), `disputes/drt-subgraph.ts`,
`performance/commit-logs.ts` (DisputeKitClassic), `performance/court-parameters.ts` (KlerosCore),
`performance/arbitrum.ts` (arb1 RPC), `roster/ens.ts` (mainnet), `roster/agent-jurors.ts`. Parameter
history, economics and event shapes are in `court-34.md` and `chain-and-subgraph.md`; none needs a key.
**Three configurations, but only one superseded a *measured* window** — the third moved the
evidence period alone. Never make one count into the other; `court-34.md` says which is which.

## Related repos

`../agentkit` (the `kleros` CLI) and `../kleros-juror-cli` (the voting CLI, and the glossary this one
extends). Metric logic is built here first, shaped for later extraction into agentkit (ADR-0003).

## Agent skills

| Skill | Where |
| --- | --- |
| Issue tracker — markdown files under `.scratch/<feature>/` | `docs/agents/issue-tracker.md` |
| Triage labels — the `Status:` values, plus a local `done` | `docs/agents/triage-labels.md` |
| Domain docs — `CONTEXT.md`, `docs/adr/`, `docs/knowledge/` | `docs/agents/domain.md` |
