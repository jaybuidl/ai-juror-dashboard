# AI Juror Dashboard

The language of measuring how a small panel of AI agent jurors performs in a single Kleros v2 court.
This dashboard observes and reports; it never casts a vote, decides a choice, or holds a key.

Terms it shares with `kleros-juror-cli` are restated here rather than linked, because a cross-repo
pointer rots. Where a definition is narrowed or overridden, that is said explicitly.

## Language

### The subjects

**Agent juror**:
One of the AI agents in this experiment, each an independent build on a different stack, each
voting from its own address. `kleros-juror-cli` lists "agent" under _Avoid_ for **Juror**, because
there it is noise — a juror is an address and nothing else. This glossary deliberately overrides
that: here the fact that every juror is an agent is the whole subject, and the distinction between
an agent juror and a human juror is the measurement.
_Avoid_: AI juror (ambiguous — the court holds no others), bot, model

**Nickname**:
An agent juror's human-readable name, held on chain as an ENS subname of `agents.kleroslabs.eth`
and carrying an avatar. Written with a leading capital in the roster, which is the spelling shown
and the spelling the route is keyed on; the ENS subname's label is its lowercase form, which is
what `ensNameOf` builds.
_Avoid_: handle (a different thing here — see **Handle**), alias, label

**Handle**:
The account an agent juror posts from on X, written with its `@` and with the capitals the account
itself uses. Optional, and most of the roster has none — a count belongs here no more than the
roster's own length does — and always the **agent's own**
account, never an operator's, which is what keeps it inside the rule that agent jurors are named by
nickname and stack and not by whoever built them. Stored as the `@` form alone; `handleUrlOf` adds
the host, so the roster never holds a URL. Drawn on `/agent-jurors/:nickname` and nowhere else.
_Avoid_: nickname (that is the name this dashboard calls an agent juror by, and it routes),
username, social

**Stack**:
The agentic build behind one agent juror — its framework, model and harness. Known only from the
roster: nothing on chain reports it, and the one agent juror that mentions its own stack does so in
the prose of some justifications, which is not a source anything should parse.
_Avoid_: agent, framework, model (each names one part of a stack, not the whole)

**Roster**:
The dashboard's own list of the agent jurors, `src/roster/agent-jurors.ts`, which grows as builds
join the court. Authoritative here because it is the only place every one of them appears: an agent
juror that has never staked or been drawn has no on-chain presence at all, so the court cannot be
asked who is on the roster. How many there are is `ROSTER.length` and never a literal — the count
in any sentence in this repo is a claim about the day it was written.
_Avoid_: panel, juror list

**Panel**:
Everyone the court drew for one dispute — one per draw, however many vote IDs each holds. It varies
between disputes: dispute 155's panel was one juror holding all three votes, so its panel size is 1
and not 3.

A fact about the court, not about the roster. Every panel in court 34 so far has been agent jurors
and nothing else, and the court draws a handful of vote IDs at a time, so panel size has never
exceeded the roster — but the two are different quantities, moving for unrelated reasons: the roster
grows when a build joins, a panel when the court draws more votes for one dispute. Conflating them
makes the page assert something it has not measured. A panel of two holding one agent juror and one
other would otherwise be reported as "a panel of one", and with it the claim that a lone juror is
automatically the majority, which would then be false. The matrix has one column per agent juror
and counts its panels in everyone drawn.
_Avoid_: jury, roster, counting it in vote IDs, assuming a panel is all agent jurors

### The measures

**Draw**:
One agent juror's involvement in one dispute, however many vote IDs it holds. The unit everything
here is counted and measured in: an agent juror reasons once per dispute and acts once per period,
so two vote IDs are one draw, not two data points.
_Avoid_: vote (means a single vote ID), participation

**Off-roster draw**:
A draw belonging to a juror the roster does not hold. The roster is the column set, so such a draw
has no cell to sit in and falls out of every figure on the page except the panel size it is counted
in — silently, because a roster miss has no cell to be missing from. It is the one absence this
dashboard could not tell apart from a court that drew fewer jurors, and it is not hypothetical:
Grokleros was staked and drawn across three disputes before the roster knew it existed. Counted per
dispute on `MatrixRow.offRosterDraws` and court-wide on `CourtTotals.offRoster`, marked with § and
decoded in a footnote on both layouts.

**Always a count, never an identity.** The address is in hand below the seam and must not reach the
page: an off-roster juror is whoever the court drew, and that is the personal data this dashboard
does not hold. The flag has no subject the moment such an agent juror joins the roster, which is
what it is for — it is the tripwire that says the next one has gone live.
_Avoid_: unknown juror, stranger, naming the address, non-agent (it may well be an agent)

**Coherence**:
Having voted for the dispute's final ruling. Counted per draw. Only defined once the appeal period
has closed and a ruling exists; a round majority before then is a prediction, not coherence. Always
scoped to court 34 here.
_Avoid_: correctness, accuracy, agreement with the majority

**Commit latency**:
Seconds from the moment the commit period opened to the moment a draw's `castCommit` was mined.
Held in seconds, never as a fraction of the period: court 34's period durations changed midway
through the experiment, so a fraction means different things in different disputes.
_Avoid_: commit speed, commit time (ambiguous — could be the timestamp)

**Reveal latency**:
The same measure for `castVote`, from the moment the vote period opened.
_Avoid_: reveal speed, vote latency

**Participation**:
Having been drawn, and having acted on the draw. Distinct from coherence: an agent juror can
participate perfectly and be incoherent, or be coherent in every dispute it was drawn in while
being drawn rarely.
_Avoid_: activity, engagement

### The vote

**Choice**:
One of the `0..numberOfChoices` options a juror can vote for. `0` means refuse to arbitrate and is
always valid.
_Avoid_: ruling, answer, verdict, vote

**Ruling**:
The arbitrator's *output*: the winning choice `KlerosCore` reports through `currentRuling`. Jurors
supply choices; the dispute kit aggregates them into a winning choice, and only that becomes the
ruling. Coherence is defined against the ruling, never against a choice.
_Avoid_: using it for a single juror's choice

**Vote ID**:
The index of a single vote within a round. One drawn juror may hold several and votes them together
in one transaction — which is why the draw, not the vote ID, is this dashboard's unit.
_Avoid_: draw ID, ballot

**Justification**:
The prose an agent juror publishes with its reveal, explaining the choice it made. Carried in the
`VoteCast` event — in the log, not in contract storage — one per draw, sometimes absent, sometimes
Markdown, and not always in English.

Read from the core subgraph, which indexes that event: the text is `ClassicJustification.reference`,
beside the `timestamp` that dates every reveal latency on this dashboard. It is prose and never a
figure — nothing here counts, scores, summarises, translates or ranks a justification, and the
per-dispute view reproduces it verbatim in the language it was written in.

Three states that must not be collapsed into each other. **Published** is prose. **Published empty**
is a `reference` of `""` — a field somebody filled in with nothing, which dispute 156 holds today;
the vote is on chain and counts in full, and only the prose is absent. **Not published** is no
`ClassicJustification` at all. None of the three is a failed read, and none may be drawn in the
failure vocabulary.
_Avoid_: reasoning, rationale, opinion, treating an empty one as missing

### The chain

**Core dispute ID**:
The global dispute identifier in `KlerosCore.disputes[]`. Distinct from the kit-internal local
dispute ID.
_Avoid_: dispute ID (unqualified — the ambiguity is the trap)

**Period**:
One of `evidence`, `commit`, `vote`, `appeal`, `execution`. Latency is always measured from the
moment a period opened, which is an observed event, not a scheduled one.
_Avoid_: phase, stage

**Deadline**:
`lastPeriodChange + timesPerPeriod[period]`. An upper bound, never an entitlement — the commit and
vote periods end early once every juror has acted, and `passPeriod` is permissionless, so a period
can also run past its deadline before anyone closes it.

**Window**:
A period's *configured* duration — `timesPerPeriod` for that period, as it was in force for that
dispute rather than as the court holds it now. Shown beside how long that period actually ran, as
two absolute durations, and never divided into anything: court 34's durations changed between dispute 151 and dispute 152, so the
same fraction of a window means different things in different disputes. The deadline is the instant
a window would end; the window is only its length, and is no more of an entitlement. See ADR-0005.
_Avoid_: using it as a denominator, period duration (how long a period actually ran is a different
quantity), allowance

**Round index**:
The zero-based index of an appeal round within a dispute. Every dispute in this experiment so far
has exactly one round.

**Finalised**:
Said of a dispute the court has ruled on, and of nothing else. It is the line this dashboard draws
between the record and what is still happening: a finalised dispute's draws, latencies, coherence
and commitments are fixed for ever, so they may be cached, persisted and stopped being read. Its
complement is **live** — the word the matrix's corner count and its row flag use.

Keyed on the ruling and never on the period. A dispute in `appeal` has every vote in and no ruling,
and a dispute in `execution` still gains one when somebody executes it, so `execution` names
neither the end of the juror's involvement nor the end of the court's. Coherence is undefined until
a dispute is finalised, which is the same boundary seen from the measurement side.
_Avoid_: settled, closed, complete, resolved, treating `period === "execution"` as the test

### The display

**Matrix**:
The dispute matrix: one row per dispute, one column per agent juror, one cell per draw. Rows grow
without bound as disputes arrive; the columns grow with the roster, and neither has an upper bound
written down anywhere. One fixed column position per agent juror, reserved in every dispute whether
or not that agent juror was drawn — ADR-0008, which records what that costs as the roster grows and
what the deferred alternative is. Past a row or column count the grid compacts rather than widening
past the desktop it is read on (`density.ts`). It is sparse by nature — 34 of its 78 cells were blank across the first thirteen disputes, and a column stays
near-empty for as long as it takes the court to draw the agent juror it belongs to — and that
sparsity is the normal state, not missing data.
_Avoid_: grid where it implies every cell is filled, table, heatmap

**Marginal**:
A per-agent-juror summary computed down one column of the matrix — median latencies, coherence as a
count, draws, cumulative rewards. Marginals in the statistical sense: they summarise a margin of the
matrix and rank nobody. They live in the column header rather than a column of their own, because
agent jurors are the columns.
_Avoid_: summary column, leaderboard, score

**Reward shift**:
What the court paid one agent juror for one dispute: an ETH arbitration fee and a PNK amount that is
positive for a coherent draw and negative for a penalised one. Written when the court **executes** a
dispute, which is a later transaction than ruling it — so a ruled dispute may legitimately have no
shift yet, and cumulative rewards lag coherence rather than disagreeing with it. The ETH fee is paid
**per vote ID**, not per draw, so one draw's payout is often a fraction of `feeForJuror`. The PNK
side is a redistribution and nets to zero across the court, to within integer-division dust.
**Reward** is the accepted shorthand for the pair, signed — the ticket, the artboard and the code
(`Draw.reward`, `AgentJurorRewards`, `RewardCoverage`) all use it that way, and a negative one is a
penalty rather than a separate term.
_Avoid_: earnings where it implies income (PNK is redistributed, not issued), profit, score,
payout for the PNK side alone (nothing is paid out — it changes hands)

**Cell**:
One cell is one draw: one agent juror's involvement in one dispute, carrying two latencies, a
coherence state and the number of vote IDs it holds. Panel size is not among them — it lives on the
row, because coherence is meaningless without it and repeating it in every cell would cost more than
it tells. A blank cell means the agent juror was not drawn, and must never be readable as a failure
to act.
_Avoid_: tile, square (both name something drawn — a blank cell is still a cell), data point

**Density** (comfortable, compact):
How tightly the matrix is drawn. **Comfortable** is the two-line cell and the two-line row;
**compact** is what the matrix becomes past either of the grid's two axes — `COMPACT_FROM_ROWS`
rows, or `COMPACT_FROM_COLUMNS` agent jurors — and it drops the cell's commit line and halves it,
drops the row's second line, and keeps three of the column header's six figures and freezes them.
The row threshold is a heuristic about screen height; the column one is arithmetic, the count at
which a comfortable grid stops fitting an ordinary desktop. Either crossing is sufficient. Density is a legibility change and never
an edit to the record: no dispute leaves the page, no column moves, nothing is filtered, paginated,
collapsed or windowed away. It is a *desktop* word — below `breakpoints.narrow` there is no grid to
compact, and a phone shows cards at any row count.
_Avoid_: view, mode, zoom (all imply something the reader chose — there is no control for this),
truncation, pagination (both name things density explicitly does not do)

**No panel yet**:
A dispute that was read and for which the court has drawn nobody, because it is still in its
evidence period. Its positions are blank and they mean *the draw has not happened* rather than *this
agent juror was not selected* — a different fact from sparsity, and a different fact again from a
dispute whose draws were never read, which is **Unknown**. Panel size is `0` and must never be
printed: a zero there claims the court drew a panel of nobody.
_Avoid_: empty panel, Panel 0, unread (that is the third state and belongs to the read, not the
court), pending panel
