# AI Juror Dashboard

The language of measuring how a small panel of AI agent jurors performs in a single Kleros v2 court.
This dashboard observes and reports; it never casts a vote, decides a choice, or holds a key.

Terms it shares with `kleros-juror-cli` are restated here rather than linked, because a cross-repo
pointer rots. Where a definition is narrowed or overridden, that is said explicitly.

## Language

### The subjects

**Agent juror**:
One of the six AI agents in this experiment, each an independent build on a different stack, each
voting from its own address. `kleros-juror-cli` lists "agent" under _Avoid_ for **Juror**, because
there it is noise — a juror is an address and nothing else. This glossary deliberately overrides
that: here the fact that every juror is an agent is the whole subject, and the distinction between
an agent juror and a human juror is the measurement.
_Avoid_: AI juror (ambiguous — the court holds no others), bot, model

**Nickname**:
An agent juror's human-readable name, held on chain as an ENS subname of `agents.kleroslabs.eth`
and carrying an avatar.
_Avoid_: handle, alias, label

**Stack**:
The agentic build behind one agent juror — its framework, model and harness. Known only from the
roster: nothing on chain reports it, and the one agent juror that mentions its own stack does so in
the prose of some justifications, which is not a source anything should parse.
_Avoid_: agent, framework, model (each names one part of a stack, not the whole)

**Roster**:
The dashboard's own list of the six agent jurors. Authoritative here because it is the only place
all six appear: an agent juror that has never staked or been drawn has no on-chain presence at all.
_Avoid_: panel, juror list

**Panel**:
The agent jurors drawn for one dispute — one per draw, however many vote IDs each holds.
At most the size of the roster, and varies between disputes: dispute 155's panel was one agent juror
holding all three votes, so its panel size is 1 and not 3.
_Avoid_: jury, roster, counting it in vote IDs

### The measures

**Draw**:
One agent juror's involvement in one dispute, however many vote IDs it holds. The unit everything
here is counted and measured in: an agent juror reasons once per dispute and acts once per period,
so two vote IDs are one draw, not two data points.
_Avoid_: vote (means a single vote ID), participation

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
_Avoid_: reasoning, rationale, opinion

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

### The display

**Matrix**:
The dispute matrix: one row per dispute, one column per agent juror, one cell per draw. Rows grow
without bound as disputes arrive; the columns stay at six, because the roster does. It is sparse by
nature — 34 of its 78 cells were blank across the first thirteen disputes, and one agent juror's
column is empty end to end — and that sparsity is the normal state, not missing data.
_Avoid_: grid where it implies every cell is filled, table, heatmap

**Marginal**:
A per-agent-juror summary computed down one column of the matrix — median latencies, coherence as a
count, draws, cumulative rewards. Marginals in the statistical sense: they summarise a margin of the
matrix and rank nobody. They live in the column header rather than a column of their own, because
agent jurors are the columns.
_Avoid_: summary column, leaderboard, score

**Cell**:
One cell is one draw: one agent juror's involvement in one dispute, carrying two latencies, a
coherence state and the number of vote IDs it holds. Panel size is not among them — it lives on the
row, because coherence is meaningless without it and repeating it in every cell would cost more than
it tells. A blank cell means the agent juror was not drawn, and must never be readable as a failure
to act.
_Avoid_: tile, square (both name something drawn — a blank cell is still a cell), data point
