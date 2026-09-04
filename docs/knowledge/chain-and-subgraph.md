# Reading the chain and the subgraphs

What the Goldsky deployments, the DRT subgraph and the Arbitrum RPC actually return — including
the four places where a field is present, correctly typed, and wrong.

Each entry below cost real effort to discover and is easy to get wrong again.
They are facts about this codebase and the live court, verified against chain, subgraph
or a browser at the time noted. `CLAUDE.md` § Tripwires carries a one-line form of each;
this file is the full account.

- **Commit timestamps do not exist in the subgraph.** `ClassicVote.commited` is a boolean. They come
  from `CommitCast` logs (ADR-0004). Reveal timestamps *are* in the subgraph, on the justification.
  Re-confirmed by introspection on 2026-08-25: `ClassicVote` is `id, coreDispute, localRound, juror,
  draw, commit, commited, choice, voted, justification` and carries no moment at all.
- **`eth_getLogs` on arb1 returns `blockTimestamp: "0x0"` on every log.** The field is not in the
  JSON-RPC spec, the endpoint sends it anyway, it is always zero, and viem dutifully formats it to a
  well-typed `0n`. It is the perfect trap: present, correctly typed, and wrong. A reader that trusted
  it would date every commitment to 1970, and because a commitment predating its own commit period is
  dropped rather than shown, the whole court would render as an unread shortfall — no error, no
  console warning, just a page saying nothing was found. The moment comes from `eth_getBlockByNumber`,
  which is the only source that has it. `commit-logs.ts` carries the warning and a test pins it.
- **The Arbitrum endpoint rate-limits per RPC call, and counts a batch as its size.** Reading one
  block per commitment is 56 calls today; 62 blocks read three times over inside a second returns
  HTTP 429 with a `text/plain` body, which viem surfaces as `UnknownRpcError: Cannot read properties
  of undefined (reading 'error')` rather than as a rate limit. One page load is far from the ceiling
  and react-query's minute of staleness keeps it that way, but it arrives with roughly 200 more
  disputes, and a *live test suite* hits it immediately — which is why `commit-logs.integration.test.ts`
  reads once in `beforeAll` and shares the result rather than reading per test. **Ticket 12 landed
  the fix for a repeat scan**: `src/performance/block-times.ts` remembers block timestamps in
  `localStorage` and `blockTimestamps` in `arbitrum.ts` consults it, so a second scan costs one
  `eth_getLogs` plus only the blocks never seen before — one or two rather than 57. It is safe
  because a mined block's timestamp cannot change, which makes it the only cache here with no
  staleness to reason about. ADR-0004's preferred fix is still to put the timestamp in the
  subgraph. The cache also outlives a *test*: `commit-logs.test.ts` clears `localStorage` in a
  `beforeEach`, because without it an assertion about which blocks were read passes or fails on
  the order the cases happen to run in.
  **The cache does not rescue the live suite, and the budget belongs to the whole suite rather
  than to one file.** Vitest runs test files in parallel and gives each its own `localStorage`, so
  nothing carries between them and every file that scans pays full price. Measured on ticket 08:
  one whole `yarn test:integration` is ~130 Arbitrum calls and passes, **two back to back inside a
  minute do not** — the second run's `draws-subgraph` suite 429s. So a red live suite is worth
  re-running once after a pause before believing it. And a new suite that reads this chain must
  justify its calls: ticket 08 dropped a fourth read from `draws-subgraph.integration.test.ts`
  rather than add ~63 calls for something `court-parameters.integration.test.ts` already covers,
  and ticket 12 added a third scanning file, went red with `UnknownRpcError` while each file
  passed alone, and fixed it by not scanning — liveness is read from the ruling and the round
  timeline, so it never needed the commitments. Before adding a commit scan to a live test, ask
  whether the test actually needs a moment, and run the whole suite rather than the one file.
- **`TokenAndETHShift.isNativeCurrency` is `false` on a court that pays in native ETH.** All 44 of
  court 34's payouts carry it — a payout per *executed* draw, so fewer than the 56 draws — with
  `feeToken: null` and `feeTokenAmount: "0"`, while `ethAmount` carries the full `feeForJuror` —
  and the raw `TokenAndETHShift` logs decode to
  `_feeToken = address(0)`, which *is* native ETH. The v0.17.2 mapping is simply wrong about it.
  This is the `blockTimestamp: "0x0"` trap in another entity: present, correctly typed, and wrong.
  A reader that believed it would take the fee-token branch, find `0`, and report that every agent
  juror has earned nothing — no error, no console warning, six columns of `0.0000`. The guard is
  that `rewards-subgraph.ts` **does not select the field at all**, and says why: a field absent
  from the query cannot be reached for by someone who has not read this. `feeTokenAmount` is
  selected as the one usable half and is a *partial* guard — the deployment that mislabels the flag
  gives no assurance about which field it would fill if court 34 were switched to the WETH fee
  token it already has registered and unused.
- **The deployed `TokenAndETHShift` signature is not written down in `src/`**, because the payouts
  are read over GraphQL and no `parseAbiItem` for it exists. It is
  `TokenAndETHShift(address indexed _account, uint256 indexed _disputeID, uint256 indexed
  _roundID, uint256 _degreeOfCoherency, int256 _pnkAmount, int256 _feeAmount, address
  _feeToken)`, on KlerosCore, written by `execute()`. Anyone moving this read from the subgraph
  to a log scan needs it, and the `_eligibility` trap above applies: take the deployed shape from
  `contracts/deployments/arbitrum`, never from the contract sources.
- Dispute titles come from the **DRT subgraph** as plain JSON — no IPFS, no Kleros SDK. Using the SDK
  would drag the Node-only path into the bundle. The join is the core dispute's `templateId`, and it
  is **neither the dispute id nor a constant offset from it**: 151→161, 152→163. It is nullable on
  the subgraph's own type, so a dispute can have no title at all. `templateData` is a JSON *string*
  holding `title` and `category`; nothing validates it before publication, so treat every field as
  possibly missing, blank or not a string. Dispute 159's category is `""` today — the live example
  of the empty slot.
- **The DRT subgraph sorts `id` lexicographically too**, and the same trap bites harder there because
  template ids are small: `id_gte: "161"` returns templates 2 and 17–28 as well. Ask for templates by
  exact `id_in`, never by range. An id with no template is not an error — it simply does not come
  back, which is the tolerance the row rendering assumes.
- **A subgraph read that comes back short throws nothing.** A reindexing Goldsky deployment answers
  HTTP 200 with `[]` and no GraphQL error; a lagging one returns some of the ids it was asked for and
  not the rest. Both slip past every `response.ok` and `body.errors` check, and both render as an
  absence that is indistinguishable from a fact — a dispute with no title, a juror never drawn, a
  round with no votes. Where a read draws a **known set** of ids, compare what came back against what
  was asked for and report the shortfall as a count, not as an error: `src/disputes/useDisputes.ts`
  carries `{expected, resolved, isLoading}` and `DisputeList` names the number. A thrown error is then
  just the case where the count is zero. This bit every ticket that fetches by id — 05, 07, 08 — and
  ticket 10 met a version of it with no known set to compare against: its read asks for "every payout
  in court 34" rather than for named ids, so the guard there is arithmetic instead ([`court-34.md`](court-34.md), the
  per-vote-ID fee), which is what a *sum* needs and a count does not.
- **`Round.timeline` writes `0` for a period that has not opened yet** — and `0` is a real instant in
  1970, one subtraction away from a latency of fifty-six years. Every dispute still in `appeal` has
  it in the execution slot today. Parse it to null at the edge, as `src/disputes/disputes.ts` does,
  rather than guarding at each use.
- **Round ids are `<disputeID>-<n>` and The Graph orders `id` lexicographically**, so `151-10` sorts
  above `151-9`. Read the index from the id suffix, never from the position a `rounds` selection
  arrived in. Costless while every dispute has one round, and silently wrong the first time one does
  not. The same string ordering is why dispute lists order on `disputeID` and not on `id`, and why
  ordering happens in the model rather than the query — **ordering by `period` is rejected outright**
  by The Graph on the `Dispute` type, so the obvious query is the broken one.
- **The deployed subgraph carries no link from a dispute to its evidence.** `Dispute` has no
  `evidenceCount` and `ClassicEvidence` has no `dispute` — only an `evidenceGroup`, whose id is
  whatever the arbitrable passed as `_evidenceGroupID`. The mapping in `kleros-v2/subgraph` today
  *does* put `evidenceCount` on the dispute and `dispute` on the evidence; that is a later version
  than the v0.17.2 deployment answering the query, which is the same shape as the `_eligibility`
  trap — **the source in the monorepo is not what is answering**. So ticket 09's evidence count
  rests on an assumption: that court 34's one arbitrable
  (`0xb5526d022962a1fff6ed32c93e8b714c901f4323`) uses the core dispute id as its evidence group id.
  Verified across all 31 disputes on 2026-08-25 — every one has a group, and all 33 submissions
  fall inside their own dispute's evidence period — and guarded at runtime by comparing
  `externalDisputeId` against `disputeID`, so a mismatch renders "Submissions not read" rather than
  somebody else's count. `dispute-detail.integration.test.ts` re-checks both live. Also:
  `nextEvidenceIndex` **is** the submission count despite its name, and is read in preference to
  counting the entities because a counter cannot come back short and a paged list can.
- **A dispute id is global across every court on the core subgraph.** `dispute(id: "50")` answers
  for a dispute in some other court, so `/disputes/50` is a read that *succeeds* and finds
  something this dashboard will never hold a row for. Two consequences ticket 09 met. The view
  has to say "this is not court 34's" rather than falling through to "has not been read yet",
  which would state an unread condition as a permanent fact about a read that worked. And the
  per-dispute model runs on **whatever comes back**, before anything checks the court — so a
  field like `numberOfChoices`, which is a `BigInt` from an arbitrable nobody here controls, is
  attacker-influenced input in a way the court-wide reads are not. It is capped at
  `MAX_CHOICES` for exactly that reason: filling a ballot from 0 to an eighty-digit number
  hangs the tab with no error and nothing on screen.
