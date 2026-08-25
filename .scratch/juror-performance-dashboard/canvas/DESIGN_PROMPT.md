# UI design brief: AI Juror Performance Dashboard

You are designing the UI for a public web dashboard. This brief gives you the domain, the users, the
information architecture, and — most importantly — the **real data**, with its real awkward shapes.
Design against the data described here, not against an idealised version of it.

Everything below is established fact from the live system. Nothing is hypothetical.

---

## 1. The domain, in sixty seconds

**Kleros** is a decentralised arbitration protocol. When two parties dispute something (a freelance
delivery, a marketplace order), the case goes to a **court**, and a panel of **jurors** is randomly
drawn from people who have staked tokens. Jurors read the evidence and vote. Whichever option wins
becomes the **ruling**.

Voting happens in **two transactions**, because votes are hidden until everyone has voted:

1. **Commit** — during the commit period, a juror publishes a hash of their vote. Nobody can see it.
2. **Reveal** — during the vote period, the juror publishes the actual vote, proving it matches.

A dispute moves through periods in order: `evidence → commit → vote → appeal → execution`. Each
period has a configured maximum duration, but **it can close early** once every juror has acted.

Two terms you must use precisely:

- A **choice** is what one juror votes for. A **ruling** is the final outcome the court produces.
  Jurors cast choices; only the aggregate becomes a ruling.
- **Coherence** means a juror voted for the final ruling. It is the protocol's own measure of whether
  a juror was "right". Jurors are financially rewarded for coherence and penalised for incoherence.

**Scale matters for this design.** In ordinary Kleros courts, these periods run for **days**. That
context is the entire point of what follows.

## 2. What this experiment is

Kleros is running six **AI agent jurors** — autonomous agents, each built by a different team member
on a different agentic stack (different frameworks, models, harnesses). Each votes from its own
address, in one dedicated court. They read the evidence, decide, and vote entirely without humans.

So far: **13 disputes, 44 draws, 6 agent jurors** (5 of which have actually been drawn).

They act in **seconds**. Where a human court takes days, the median agent juror reveals its vote
**85 seconds** after the period opens. The fastest did it in **7 seconds**.

**Making that contrast legible is the single most important job of this UI.** A visitor who knows
Kleros should feel the difference immediately.

## 3. Who uses this, and why

**Primary — the Kleros team member (internal, recurring).**
Five colleagues run these agents. They come back repeatedly, often while a dispute is *live*, to see
how their agent is doing against the others. They want to spot: did my agent commit late? did it
vote with the pack? did it reason differently? They paste links to specific disputes into Slack, so
every view needs its own URL.

**Secondary — the Kleros community member (public, one-time).**
Arrives from a link or a research article with no context. Needs to grasp what the experiment is and
why the numbers are impressive within about fifteen seconds, without reading documentation.

**Tertiary — the researcher.**
May cite these figures in a written article. Needs the methodology to be legible and the caveats
(see §6) to be visible rather than buried, so nothing gets misquoted.

Note: agents are identified by **nickname and avatar**, never by the person who built them. There is
deliberately no personal data in this product.

## 4. The two dimensions being measured

**Speed** — two numbers per draw:
- **Commit latency**: seconds from the commit period opening to that agent's commit being recorded.
- **Reveal latency**: the same, for the reveal.

**Coherence** — did this agent vote for the final ruling? A binary per draw.

Supporting context, not ranked: cumulative **ETH** rewards (paid for participating) and **PNK**
rewards (redistributed from incoherent jurors to coherent ones).

**This is explicitly not a competition or a leaderboard.** Nobody is ranked. The interesting question
is per-dispute behaviour and how different stacks compare, not who wins.

## 5. Information architecture

Three routes.

### `/` — The dispute matrix (landing view)

A matrix: **rows are disputes, columns are agent jurors.** Each cell is one *draw* — one agent's
involvement in one dispute — showing both latencies and coloured by coherence.

Rows carry a real dispute title, e.g. *"Alleged Plagiarism in an Original Commissioned Article"* or
*"Wrong Artistic Style in AI-Generated Painting"*, plus a category and the dispute ID.

A **summary column** in the margin gives each agent: median latency, coherence as a count (`12/12`),
draw count, and cumulative ETH + PNK.

Rows are disputes because **disputes grow without bound while agents stay at six**. Design for 13
rows today and 100+ later.

### `/dispute/:id` — One dispute

The dispute's title, question and ruling, then **every panel member's justification side by side**.

A **justification** is the prose an agent publishes with its reveal, explaining its reasoning. Reading
five different agentic stacks reason about identical evidence is the most compelling content in the
entire product. Give it room.

### `/juror/:nickname` — One agent juror

Its nickname, avatar, address, and **stack** (e.g. "Hermes", "OpenClaw"), its own metrics, and the
disputes it was drawn in.

## 6. The real data — design against this

**The matrix is mostly empty.** 44 draws in 78 possible cells. **34 cells are blank.** One agent
(`baskerville`) has never been drawn, so its **entire column is empty**. This sparsity is permanent
and normal — jurors are randomly drawn. A design that assumes a full grid will look broken.

Actual current occupancy (`█` drawn, `·` not drawn):

```
          007  daem  alet  colu  blai  bask
  151      ·    █     ·     █     ·     ·
  152      █    █     █     █     █     ·
  153      █    ·     █     █     █     ·
  154      ·    █     █     █     █     ·
  155      ·    ·     ·     █     ·     ·
  156      █    █     ·     █     █     ·
  157      ·    ·     █     ·     █     ·
  158      ·    █     █     ·     █     ·
  159      █    ·     █     █     █     ·
  160      █    █     █     ·     ·     ·
  161      █    ·     █     █     ·     ·
  162      █    █     █     ·     █     ·
  163      █    █     █     █     █     ·
```

**Panel sizes vary from 1 to 5.** And one case needs care:

> **Dispute 155 was decided by a single agent juror.** Coherence there is *tautological* — a lone
> juror is automatically the majority and cannot be incoherent. Panel size must be visible wherever
> coherence is shown, or the number lies.

**Latencies span three orders of magnitude.** Reveal latency across all 44 draws: min **7s**,
median **85s**, max **552s**. Commit latency ranges from **126s** to **3,236s** (54 minutes). Your
treatment must make 7 seconds and 54 minutes both readable and comparable. The product formats short
values in seconds and long values in minutes.

**One dispute ran under different rules.** The court's period durations were changed partway through
the experiment: dispute 151 had an **8-hour** commit window, disputes 152–163 have **45 minutes**.
So "how much of the window did it use" is not comparable between them. Dispute 151 must be **visibly
marked**, with the reason reachable. This is a correctness-of-record requirement, not a nicety —
these numbers may be cited.

**Justifications are long and varied.** 44 of them. Longest is **4,869 characters**. Some are plain
paragraphs; some use Markdown headings, bold and numbered structure. **One is empty.** **One is
written in Spanish**, citing Argentine consumer law. Multiple languages must render as first-class,
not as a fallback.

A real (abbreviated) justification, so you can see the texture:

> ## Vote: **1 — Refund the buyer**
> ### Justification
> **1. Originality was an express, material term.**
> The buyer required "your own original writing," expressly barred copying or close paraphrase of
> existing articles…

**Disputes can be live.** The dashboard refreshes every 5 seconds while a dispute is unfinalised.
A live dispute mid-commit-period has agents that have acted and agents that haven't *yet* — which is
a different state from "didn't act at all".

## 7. States that must never be confused

This is the sharpest visual requirement in the product. Five distinct states per cell:

| State | Meaning | Currently in data |
| --- | --- | --- |
| **Not drawn** | This agent wasn't selected for this dispute | 34 of 78 cells |
| **Drawn, acted, coherent** | Voted with the final ruling | most draws |
| **Drawn, acted, incoherent** | Voted against the final ruling | a handful |
| **Drawn, failed to act** | Missed the commit or reveal — a real failure | **none yet** |
| **Drawn, still acting** | Live dispute, period still open | none yet (all finalised) |

"Not drawn" and "failed to act" must be **unmistakably** different. Confusing them attributes a
failure to an agent that did nothing wrong. Note that the last two states have no examples in the
data yet, so you are designing them blind — but they will happen.

**Errors must be loud.** If a data source can't be reached, the visitor must not be able to mistake a
partly-loaded dashboard for a complete one. Silent partial data is the worst possible outcome for a
public page whose numbers get quoted.

## 8. Constraints

- **Web, responsive.** Desktop is the primary context (a dense matrix), but it will be opened on
  phones from Slack links.
- **Built in React with styled-components.** Deliver whatever form suits you — the visual system and
  component behaviour matter more than production markup.
- **Kleros brand.** The existing Kleros Court app uses a dark purple palette with light text, and
  represents jurors with pixel-art avatars. Treat that as reference, not a cage — propose what serves
  the data. Agent avatars come from ENS and are square images you don't control.
- **Accessibility**: coherence must never be encoded by colour alone.
- Numbers must be scannable in a dense grid. Typography carries a lot of weight here.

## 9. Explicitly out of scope

- Any ranking, scoring, podium or competition framing
- Appeal rounds (every dispute has exactly one round today)
- Token usage, model names, or reasoning-effort metrics (a later milestone)
- Any view spanning more than this one court
- Any interface for voting, staking, or transacting — this dashboard is strictly read-only
- Wallet connection of any kind

## 10. What to deliver

1. **The matrix view** at both 13 rows and ~60 rows, showing every cell state including the empty
   column, and both a finalised and a live dispute.
2. **The dispute view**, with five justifications side by side — including the empty one and the
   Spanish one — at realistic length (assume ~3,000 characters each).
3. **The juror view**, including the empty state for the agent never drawn.
4. **The cell** in detail — it carries two latencies, a coherence state, a panel-size signal and a
   vote count, and it has to stay scannable in a dense grid. This is the hardest single element.
5. **The error state**, and the dispute-151 marker.

Where you make a call that the data forced (sparsity, the latency range, the tautological-coherence
case), say so briefly — the team needs to understand which constraints drove which decisions.
