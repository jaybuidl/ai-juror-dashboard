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
