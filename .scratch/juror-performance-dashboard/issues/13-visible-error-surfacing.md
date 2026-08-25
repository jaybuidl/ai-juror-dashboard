# 13: Fail loudly rather than showing a half-true dashboard

**What to build:** When a data source cannot be reached, a visitor sees a prominent, unmissable
error saying so. Nobody should ever read a partly-loaded dashboard as fact — least of all on a
public deployment whose numbers may be cited.

`Errors.dc.html` is the specification for what "prominent" means here, and it carries one thing this
ticket did not have: **Unknown is its own cell state**, a sixth alongside the five ticket 05 builds. A
dispute whose data could not be read is a gap, and a gap must never be readable as "not drawn" or as
"failed to act" — the two states the cell design already exists to keep apart.

**Blocked by:** 04, 05, 07

**Design:** `../canvas/Errors.dc.html:43-162` (failure states), `../canvas/README.md` for provenance

**Status:** ready-for-agent

- [ ] A failure that changes a number is loud and blocking; a failure that changes only a label is
      quiet and local
- [ ] By that rule the core subgraph, the template subgraph and the Arbitrum endpoint are loud; the
      Ethereum mainnet endpoint carries only ENS names and avatars and is the one documented exception
- [ ] Every read that fails says so twice: in the place where the missing figure would have been, and
      once in a banner at the top of the page
- [ ] The banner heading — "Part of this page could not be read. Do not cite these figures." — tells
      the reader what to do, and sits beside an "Incomplete" pill in a banner spanning the full width
- [ ] The banner names the failing source, the status it returned, and how long ago the last complete
      read was, and offers both a retry and an explanation of what a partial read means
- [ ] An aggregate computed while a read has failed is labelled as partial everywhere it appears, and
      what could not be read counts as unknown — never as zero and never as absent
- [ ] A dispute whose data could not be read renders as Unknown across its whole row: a `?` glyph and
      the words "not read" in every slot where a figure belongs
- [ ] The row header of an Unknown dispute carries a not-read badge and says the row is unavailable
- [ ] Unknown shares its rose with "failed to act" and is told apart from it by glyph and word alone —
      `?` against `∅`, "not read" against `NO VOTE` — per ADR-0006, which records rose as carrying
      exactly these two meanings. It shares nothing at all with "not drawn"
- [ ] A reader can name which rows are evidence and which are a gap without consulting a legend, since
      the words are in the cells
- [ ] A failure of ENS resolution alone raises no banner: nicknames fall back to the roster and avatars
      to initials, in a degraded-not-broken card rather than a blocking banner
- [ ] The ENS fallback shows on the elements it affects — a "from roster" label beside the fallen-back
      nickname and a dashed avatar — and says that no measurement depends on ENS, so no figure on the
      page is partial
- [ ] The commit cross-check discrepancy from ticket 07 surfaces through this same channel, and loudly,
      because it changes a number
- [ ] Recovery needs no full page reload: retrying from the banner clears it once the source answers

## Comments

### From ticket 14, 2026-08-25 — a degraded panel already exists

The ENS-unreachable notice in `src/roster/Roster.tsx` is now built against
`../canvas/Errors.dc.html:142` — the amber panel (`--line-amber` hairline, `--wash-amber` fill,
`◇` glyph, mono label "Degraded, not broken"). Ticket 14 first built it in no state colour at all,
per its own criterion, and that was wrong twice over: it came out quieter than the prose it
interrupts, which `CLAUDE.md` forbids of a caveat, and the canvas draws that exact block in amber.
The canvas won. Recorded in ticket 14's Comments under "The one criterion not met as written".

Two things this ticket inherits:

- **The two tiers are already distinguished on that artboard, and they are not a colour choice.**
  Amber at `:142` is *degraded, not broken* — something could not be read and no figure depends on
  it. Rose at `:45` is the blocking banner, "Part of this page could not be read. Do not cite these
  figures", for a read that actually cost a figure. This ticket owns the rose tier; the amber one is
  built and can be lifted rather than re-invented.
- **`Errors.dc.html:45` has a known defect** — it badges the blocking banner with `∅`, which
  `Cell.dc.html:140` reserves for a draw that failed to act and says is "used nowhere else". The
  unread *cell* correctly uses `?`. See `../canvas/README.md` § Known defects; do not copy the
  banner's glyph as drawn.
