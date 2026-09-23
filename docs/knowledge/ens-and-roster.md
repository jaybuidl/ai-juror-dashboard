# ENS identity and the roster

How the agent jurors are named and resolved, and why the roster nickname — not the resolved
one — is the key.

Each entry below cost real effort to discover and is easy to get wrong again.
They are facts about this codebase and the live court, verified against chain, subgraph
or a browser at the time noted. `CLAUDE.md` § Tripwires carries a one-line form of each;
this file is the full account.

- **ENS reverse records are mostly unset.** Three of the roster's addresses had one on 2026-08-25,
  because setting it requires each operator to act from the agent's own wallet — and an entry added
  since arrives without one. Resolve *forward* from the roster's subname; `getEnsName(address)`
  leaves most of the roster anonymous.
- **`getEnsAvatar` is a `connect-src` fetch, not just an image load.** viem sends a `HEAD` to the
  avatar URL before it ever reaches an `<img>`. Blocked, it fails *silently* — viem catches it and
  falls back to `new Image()`, so avatars still appear and the only symptom is a console violation
  on every load. This is why `euc.li` is in `connect-src` and not left to `img-src`.
- **The ENS nickname is a display name, not a key.** A `name` text record is a text record: the
  operator rewrites it from a wallet and what renders changes. Route, key and join on the roster
  nickname, never the resolved one. Two subnames carry such a record today — `blaise` and
  `grokleros` — and both read as the capitalised label, so the two sources happen to agree and
  the rule cannot be checked by looking at the page. It is a rule about the source.

- **The roster nickname is capitalised, and it is doing four jobs at once** (2026-09-04). It is
  the display name, the ENS subname's label, the screen-reader text in every matrix cell, and
  **the `/agent-jurors/:nickname` route key**. That last one is the one that bites: capitalising
  the roster silently changed every agent juror's URL, and `/agent-jurors/blaise` was already a
  public, linkable address. `AgentJurorPage`'s `entryNamedBy` folds case so old links still open,
  and it folds in exactly one place — the document title resolves through the same helper,
  because a fold applied to the view and not to the title is how the heading and the tab come to
  disagree on a legacy link. `buildAgentJurorReading` below the seam matches **exactly** and must
  stay that way: it is handed the roster entry the route already resolved, never a path segment.

- **`ensNameOf` lowercases the label, and the display nickname does not.** ENS folds case on
  resolution either way, so this is not about resolving — the full name is drawn on an agent
  juror's own page as an identifier to paste into an ENS app, and a capital there is a spelling
  no other tool shows. Anything building an ENS name goes through `ensNameOf` rather than
  interpolating the nickname, which is what `src/test/court.tsx` was doing.

- **A handle is the agent's account and never an operator's** (2026-09-04, ticket 26). It is the
  first field on `AgentJuror` that *could* carry a person, which is why the rule is written into
  the type's doc comment rather than only into the ticket: the next person adding one reads the
  type. A minority of entries carry one — deliberately not counted here, the same rule that keeps
  the roster's own length out of prose — it is stored as the `@` form with the host in `handleUrlOf`,
  and it is drawn only on the agent juror's own page — not on the index, not in the matrix, not in
  a column header. It links out like the Arbiscan link beside it and deliberately **without** the
  justification interstitial, because that interstitial exists for URLs the agents write and this
  one is hard-coded here and reviewed in a pull request.

- **`text-transform` hides a spelling from every test you can write.** The pill row is uppercased
  by the mono label convention, which is harmless for the ENS name and the address — case-folding
  identifiers whose text content is untouched — and wrong for a handle, whose capitals are the
  fact. `@BlaiseBuidl` shipped as `@BLAISEBUIDL` through a green suite: the DOM, the accessible
  name and every string assertion are identical either way. Found by looking at the page, and now
  pinned through `getComputedStyle`, which jsdom does resolve for styled-components.

- **The stack marks are vendored, and two of the four had to be recovered** (2026-09-04, ticket
  26). Claude, Grok Bot and OpenClaw are inline SVG on `currentColor`; Hermes has **no vector
  source** — lobehub's `static-svg` paths 404 in both light and dark — so it is a 24px raster
  monochromed by a theme-aware filter, which is the one mark that cannot follow the accent ink
  into the pill on the agent juror's page. They are the first image assets in the repo and they
  are vendored rather than hot-linked *by choice*, not by policy: `img-src` already allows
  arbitrary https hosts for ENS avatars. `src/roster/StackIcon.tsx` carries each source URL and
  the reasoning in full.

## The roster grows, and the court grows first

*Migrated from session memory, 2026-09-03; the seventh landed with ticket 24 on 2026-09-04.*

The roster held six for the whole of tickets 01 to 23, which is when most of this repo's prose was
written. It holds **seven as of 2026-09-04**: `grokleros`,
`0x93Aa2f8e5cE8288d57F8785F5a40A60A42fD925e`, stack `Grok Bot`,
`grokleros.agents.kleroslabs.eth`. It had been running in court 34 for days before anything here
knew it existed — 4 vote IDs across 3 disputes when ticket 24 read the chain — and the page reported
six of seven with no error and no caveat, because `performance.ts` maps a row's cells over the
roster and a juror the roster does not hold is dropped rather than counted. **A new agent juror
appears in the court first and in this file afterwards**, so the gap is the normal state and the
dashboard has to be honest inside it. Two more were expected within about a week of 2026-09-03,
with addresses not yet known, because each operator has to deploy and stake before there is anything
to add; up to about a dozen more after that. Ticket 25, the one that makes room for nine columns,
has to land before the two arrive, and their arrival is not under anyone's control here.

**The rule for joining:** an agent juror enters `src/roster/agent-jurors.ts` **only** when its
address is known and live. One that is announced but not yet running gets no placeholder entry and
no reserved column — so `AgentJuror.address` stays required and no new empty state is needed.

**The rule for ordering:** the columns the court has drawn come first and a new entry is appended to
the **right** of them, never inserted to the left of one, because the newest entry is always the
emptiest column and an empty column mid-grid reads as missing data rather than as the sparsity
random draws produce. That rule used to be written as a fact about `baskerville`, whose column was
empty end to end; the court has since drawn it 14 times across 8 disputes (`court-34.md`), and the
rule outlives its example.

**The rule for a count in prose:** do not write one. `ROSTER.length` is the number and the roster
file is the source. Ticket 24 swept the live ones out; the ones it deliberately left — closed
tickets, ADR evidence, the canvas's sample data — are dated records, so a "six" still standing in
this repo is either one of those or a miss.

## Reverse records are outstanding with the operators, not broken

*Migrated from session memory, 2026-09-03.*

As of 2026-08-25 only three of the six `*.agents.kleroslabs.eth` addresses then in the roster had an
ENS primary name set. (The roster has since gained a seventh, `grokleros`, whose reverse record has
not been read — see the section above.) The subnames were created and delegated here, but setting
a reverse record requires **each operator to act from that agent's own wallet**, so it is
outstanding with colleagues and may land at any time without warning.

Nothing in this dashboard depends on it — it resolves forward from the roster's subname, so it is
unaffected either way. The visible effect if they do complete it is that the Kleros Court app starts
rendering nicknames instead of addresses. **Reverse-resolution coverage changing is expected, not a
regression to investigate**, and nobody should "fix" the forward-resolution design in response to it.

## Who is staked in court 34, and whether the dashboard tracks them

*2026-09-23.*

**"Tracked" is an address test and nothing else.** `groupDraws` in `src/performance/performance.ts`
matches every draw to `ROSTER` by lowercased address. Nicknames, ENS names and reverse records only
change what is displayed, and no entry is gated at runtime. So a staked address is tracked if, and
only if, it is in `src/roster/agent-jurors.ts`. Nothing else is needed to answer the question.

**Read court-34 stakes per court, never from a ranking.** `kleros juror top --chain arbitrum-one
--court 34` (agentkit 0.3.0) does **not** filter to the court. It returned 44 jurors ranked by
root-court stake, and only 7 of them held any stake in court 34. The rest were human jurors staked
in courts 1, 9, 10, 31 and 32. Two sources agree with each other: the core subgraph's
`jurorTokensPerCourts(where: {court: "34", effectiveStake_gt: "0"})` and `kleros stake list
--address <addr> --chain arbitrum-one`. The address must be passed as `--address`, because a bare
positional address fails validation. The filter bug has been reported but not yet filed upstream.

**State on 2026-09-23:**
- Seven addresses were staked in court 34, and six of them were roster entries.
- The seventh, `0x136041c8f81a6c6BA2a45E43D898c9d219E6DBda`, had 11,593 PNK staked. It was drawn
  15 times across disputes 270–287 from 2026-09-18 onward, and it has no reverse ENS name. It was
  the one staked address the dashboard did not track, and its draws were counted as off-roster
  (§). **Tracked from 2026-09-24** as `Jonesy The First` — see the section below.
- Baskerville (`0x606D…48Bc`) is on the roster and staked **nowhere**. The court cannot draw it
  again until it restakes.
- `0xd66b90529427cb761e0f81633861c1dca04ebe41` was drawn 3 times in disputes 216–217 on
  2026-09-08, and it holds no stake now.

## An agent juror with no subname, no known stack and a spaced name

*2026-09-24.*

`Jonesy The First` joined the roster with none of the three things every earlier entry had. The
maintainer named it, but there is no subname under `agents.kleroslabs.eth` and none is planned, the
address has no reverse record, and its stack is not known. Each gap is a field on the entry, not a
placeholder value:

- **`ensSubname: false`.** `ensNameOf` returns `null`, `resolveAgentJurorIdentity` asks mainnet
  nothing, and the agent juror's page leaves the ENS-name pill out rather than showing a name
  nobody registered. Its avatar is initials whether ENS answered or not, so the "From roster"
  caveat is **not** raised for it: `isResolvedFromEns` is roster-wide and the other entries carry
  it. The live ENS integration test checks only entries with a subname, because mainnet has
  nothing to vouch for here. The address was checked against court-34 stakes and draws instead.
- **`pathSegment: "Jonesy"`.** A space cannot be an ENS label (ENSIP-15, so `normalize` throws), and
  in a path it becomes `%20`. The nickname stays the display string everywhere; the route is
  `/agent-jurors/Jonesy`. Every other entry routes on its nickname exactly as before, so no link
  moved. Links are built by `agentJurorPathOf`, never by interpolating a nickname.
- **`stack: null`.** Rendered as "Stack unknown" through `stackLabelOf`, with no mark.
  `StackIcon.test.tsx`'s every-stack-has-a-mark check skips it.

**The trap this exposed.** `normalize` used to run *outside* the `try` in
`resolveAgentJurorIdentity`. A nickname it rejects would have made the roster-wide `Promise.all`
reject, so every avatar fell back and the page blamed a mainnet that had answered. It now runs
inside, and `ens.test.ts` pins that one bad label costs only its own identity.

**If a subname is created later:** drop `ensSubname: false`. The nickname would then have to *be*
the label, which is a single word, so either the display name loses its spaces or the ENS label
gets its own field. `agent-jurors.test.ts` fails a spaced nickname that claims a subname.

**Measured in a browser on 2026-09-24.** The matrix header draws the nickname on one line with an
ellipsis. "Jonesy The First" needs 119px and gets 93px at 1440 wide and 88px at 1024, so it shows as
"Jonesy Th…". Every other nickname fits: Daemonhill is the widest, at 83px. The full name is in the
accessible name, on the index and on the agent juror's own page. "Stack unknown" wraps to two lines
in the header, where every recorded stack fits on one. With an eighth column the compact grid's
floor is 1272px, which puts its breakpoint at 1368px. A 1280px window now scrolls the table inside
its own box and loses the pinned header, where seven columns fit.
