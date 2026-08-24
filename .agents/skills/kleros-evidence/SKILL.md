---
name: kleros-evidence
description: Query evidence submissions for Kleros disputes, including IPFS-resolved metadata. Run `kleros evidence --help` for usage details.
requires_bin: kleros
command: kleros evidence
---

# kleros evidence list

List all evidence submitted for a dispute, including resolved IPFS metadata (title, description, file). Use during the Evidence or Voting period to review what parties submitted.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--chain` | `string` |  | Target chain (ethereum, gnosis, arbitrum-sepolia, arbitrum-one) |
| `--dispute` | `string` |  | Dispute ID |
| `--limit` | `number` |  | Max results (default 50, max 1000) |
| `--cursor` | `string` |  | Pagination cursor — the last-seen creationTime/timestamp value from this command's own previous response. Cursors from other list commands are rejected. Known limitation: these timestamps have one-second resolution and evidence is routinely submitted in bursts, so entries sharing the exact cursor timestamp can be skipped at a page boundary. A compound tie-break is not possible — the upstream orderBy argument accepts a single field on both endpoints. |
| `--orderDirection` | `string` |  | Sort direction: asc or desc (default: asc) |
