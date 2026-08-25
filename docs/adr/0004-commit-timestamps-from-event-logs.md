# Commit timestamps come from `eth_getLogs`, not the subgraph

The Kleros v2 core subgraph records `ClassicVote.commited` as a boolean. Nothing anywhere in the
schema records *when* a commitment was published, so half the speed dimension has no subgraph
source. We recover it by reading `CommitCast` logs from an Arbitrum RPC and taking the block
timestamp.

`CommitCast(uint256 indexed _coreDisputeID, address indexed _juror, uint256[] _voteIDs, bytes32 _commit)`
indexes both the dispute and the juror, so the filter is narrow.

Reveal timestamps need none of this: `ClassicJustification.timestamp` already carries them.

## Considered Options

Adding the timestamp to the kleros-v2 subgraph upstream is cleaner and would remove the RPC
dependency entirely. It was rejected on schedule grounds — an upstream change plus a reindex — not
on merit, and is worth revisiting. A block-explorer API was rejected as a third data source
requiring its own key.

## Consequences

The dashboard needs an Arbitrum RPC alongside the subgraph. Scans are unchunked, which the free
public endpoint supports (verified to 8,000,000 blocks) and which a production endpoint is expected
to support; many commercial providers cap `eth_getLogs` at ~10,000 blocks, so swapping in such an
endpoint breaks this.

Because a provider that silently truncates results would produce a *missing* commit rather than an
error — rendering as a "missed commit" for a juror that committed on time — every draw the subgraph
reports as `commited: true` is cross-checked against a matching log, and any discrepancy is surfaced
as a visible error rather than absorbed.

## Measured when this was implemented, 2026-08-25 (ticket 07)

Three things this decision turned out to imply, none of which were visible when it was taken.

**The range is not the constraint; the call count is.** `arb1.arbitrum.io` answers `fromBlock: 0`
to `latest` for this topic-filtered query in ~230ms, so the 8,000,000-block figure above understated
it and no start block need be maintained. What does bind is that the endpoint rate-limits per RPC
*call* and counts a JSON-RPC batch as its size. The log read is one call; dating the commitments is
one `eth_getBlockByNumber` per commitment, because `eth_getLogs` carries no timestamp. 62 blocks
read three times over inside a second returns HTTP 429. One page load is far from that, but the
ceiling arrives at roughly 200 more disputes — at which point the upstream subgraph change rejected
above on schedule grounds becomes the fix on merit as well as on cleanliness.

**The endpoint offers a `blockTimestamp` on each log, and it is always `"0x0"`.** Not in the
JSON-RPC spec, sent anyway, and formatted by viem into a well-typed `0n`. It looks exactly like the
optimisation that would remove the per-commitment block read. Taking it dates every commitment to
1970 and renders the entire court as an unread shortfall, silently. The block is the only source.

**The cross-check is a count, not a thrown error.** "Surfaced as a visible error" above is honoured
by `CourtPerformance.commitCoverage` — `{read, expected, resolved}` — which the page states in
words. Failing the model instead would blank every reveal latency and coherence figure in the
matrix, all of which are read from the subgraph and unaffected by anything the RPC does. The `read`
flag exists because an unfinished read is not an empty one: the matrix does not wait on the chain,
so without it the page announces a total failure for the first second of every load.
