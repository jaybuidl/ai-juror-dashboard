---
name: kleros-juror
description: Query juror profiles including PNK balances, active disputes, and coherence scores. Run `kleros juror --help` for usage details.
requires_bin: kleros
command: kleros juror
---

# kleros juror info

Fetch a juror's full profile: PNK balance breakdown (staked, locked, available), active dispute count, total disputes, coherence score, and per-court stake positions. Use to assess juror eligibility or performance.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--chain` | `string` |  | Target chain (ethereum, gnosis, arbitrum-sepolia, arbitrum-one) |
| `--address` | `string` |  | Juror address (0x...) |

---

# kleros juror top

Rank jurors by total staked PNK. Queries root-court stake (= total PNK on the arbitrator). Without --chain, merges every default fan-out chain, summing stake per address; courtCount counts court positions per chain, so the same court ID on two chains counts twice. Use --court to filter by court subtree (requires --chain).

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--chain` | `string` |  | Target chain (ethereum, gnosis, arbitrum-sepolia, arbitrum-one) |
| `--court` | `string` |  | Filter by court ID and descendants (requires --chain) |
| `--limit` | `number` |  | Max results (default 50, max 1000) |
| `--cursor` | `string` |  | Pagination cursor — a rank offset copied verbatim from a previous response's nextCursor. A canonical non-negative integer string; tokens minted by other list commands are rejected. |
