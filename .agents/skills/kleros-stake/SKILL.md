---
name: kleros-stake
description: Query PNK token stakes for juror addresses across Kleros courts. Run `kleros stake --help` for usage details.
requires_bin: kleros
command: kleros stake
---

# kleros stake list

List all PNK token stakes held by a juror address across Kleros courts. Use to understand a juror's exposure before querying their active disputes.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--chain` | `string` |  | Target chain (ethereum, gnosis, arbitrum-sepolia, arbitrum-one) |
| `--address` | `string` |  | Juror address (0x...) |
| `--limit` | `number` |  | Max results (default 50, max 1000) |
| `--cursor` | `string` |  | Pagination cursor — the last-seen courtId (numeric string) from this command's own previous response. Cursors from other list commands are rejected. |
