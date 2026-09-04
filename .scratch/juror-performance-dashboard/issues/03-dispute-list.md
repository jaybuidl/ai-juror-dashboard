---
status: done
blocked_by: ["01"]
---

# 03: List every dispute in the court

**What to build:** A visitor sees every dispute in court 34 as a row, newest first, showing its core
dispute ID, current period, and ruling where one exists.

**Design:** `../canvas/Main.dc.html:131-134` (newest first, and the axes),
`../canvas/Main.dc.html:156-173` (the dispute row header), `../canvas/README.md` for provenance

- [x] Disputes are read from the Kleros v2 core subgraph, scoped to court 34
- [x] Each dispute's round timeline — the observed moments each period opened — is fetched alongside it,
      since every later latency measurement depends on it
- [x] Each row is headed by two lines: the core dispute ID leads the first, with the title arriving
      beside it in ticket 04; everything else sits on the second
- [x] The second line carries the dispute's category, then its ruling, then the panel size. The
      category arrives with ticket 04 and the panel size with ticket 05, so this ticket builds the two
      slots in that order and leaves each for the ticket that fills it
- [x] The second line ends with one flag-pill slot, empty unless a flag applies. Ticket 05 builds the
      flag mechanism and its precedence; this ticket only reserves the position it occupies
- [x] A dispute with no ruling yet reads as pending where the ruling sits, never as a blank
- [x] The default subgraph endpoint requires no key, and is overridable by configuration
- [x] Disputes are ordered newest core dispute ID first, and that order is a property of the model
      rather than of the order the subgraph returned rows, so it does not shift between loads

## Comments

**Built 2026-08-25.** `src/disputes/` holds the reader (`court-subgraph.ts`), the pure model
(`disputes.ts`), the hook (`useDisputes.ts`) and the view (`DisputeList.tsx`). 25 offline tests,
4 live. Verified in system Chrome against the built bundle served under the real `netlify.toml`
CSP: 16 rows, no violation.

**The canvas was read back before building.** The published artboards at the URL in
`canvas/README.md` are byte-identical to the committed `.dc.html` files, so there was no browser
edit to reconcile. Worth repeating rather than assuming next time.

**Decisions:**

- **No period is rendered.** The What-to-build line names the current period, but the row header at
  `Main.dc.html:156-173` has no slot for one and the criteria list none. The canvas wins, so
  `period` is modelled and left unrendered — a live dispute surfaces it through ticket 05's flag
  pill (`⋯ Live · commit 3m 12s` on the artboard). "Pending" in the ruling slot already tells a
  visitor the dispute is not final, which is what the partial-data invariant needs.
- **Choice 0 reads "Refuse to arbitrate".** Dispute 154 really is `currentRuling: "0"` with
  `ruled: true`. The canvas samples only `Ruling 1`/`Ruling 2`/`Pending`, so it gave no wording for
  it. Rendering "Ruling 0" would be wrong — 0 is a decision, not an index — and a truthiness test on
  `currentRuling` would have reported a decided dispute as pending.
- **Pending is `ruled === false`**, not `period !== "execution"`. The two agree on all 16 disputes
  today; `ruled` is the direct signal, and the subgraph reports a `currentRuling` for a dispute
  still in appeal, which is a prediction rather than a ruling.
- **Ordering lives in `toDisputes`, not in the query**, so it is a property of the model as the
  criterion requires. Sorted numerically: dispute 100 is newer than 99, which string ordering on
  `id` denies.
- **The slots are optional props on the row**, and an absent one takes its separator with it. Ticket
  04 passes `title`/`category`, ticket 05 `panel`/`flag`, and nothing moves.

**Traps found:**

- **`Round.timeline` writes `0` for a period that has not opened**, which is a real instant in 1970.
  It is parsed to `null` here so it can never reach a subtraction in ticket 05 or 07.
- **Round ids are `<disputeID>-<n>` and The Graph sorts them lexicographically**, so `151-10` comes
  above `151-9`. The index is read from the id suffix rather than trusted from array position.
  Costless now — every dispute has one round — and wrong the first time one does not.
- **Ordering by `period` is rejected outright** by The Graph on the `Dispute` type. Recorded in
  agentkit's readers; re-recorded here because the natural query to write is the broken one.
- **`api.goldsky.com` was already in `connect-src`**, so no CSP edit was needed. The guard-rail
  comment in `netlify.toml` still only covers `connect-src` — unchanged by this ticket.

**Incidental:** `Dashboard`'s "Nothing measured yet" card claimed no dispute had been read, which
this ticket made false. Narrowed to the metrics, which is the part that must stay true; a test now
pins the wording. `README.md`'s line naming ENS as the only live reader was updated too.

**Review (`/code-review high`), four findings, all resolved:**

- **The empty state asserted an empty court.** A 200 with zero rows — a resyncing subgraph, an
  override pointed at a still-indexing deployment — rendered "No disputes in this court yet", which
  is a claim the read does not support. Reworded to report the read rather than the court.
- **The slot guards tested only `undefined`.** These are `ReactNode`s fed from subgraph fields,
  where absence arrives as `null` or `""` just as often; either would have rendered an empty label
  and its separator, which is the dangling middot the layout exists to avoid. Now `isFilled`.
- **The two lines were aligned by two different `3ch`.** The id is monospace and the second line is
  not, so the indent never matched the column, and a four-digit core dispute ID — they are global
  across every court, and the global counter is already at 167 — would have widened one and not the
  other. The row is a two-column grid now, so the width is declared once.
- **An offline visitor sees "Reading the court…" forever.** react-query pauses rather than fails
  when the browser is offline, so no error reaches the notice. Left as-is deliberately and recorded
  on ticket 13, which owns the designed failure state.
