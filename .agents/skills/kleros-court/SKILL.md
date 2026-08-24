---
name: kleros-court
description: Query Kleros arbitration courts — list, get parameters, and fetch court policies. Run `kleros court --help` for usage details.
requires_bin: kleros
command: kleros court
---

# kleros court get

Fetch detailed parameters for a specific court: timing periods, fee per juror, min stake, parent court, and hidden votes flag. Use before staking or when evaluating appeal feasibility.

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | yes | Court ID |

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--chain` | `string` |  | Target chain (ethereum, gnosis, arbitrum-sepolia, arbitrum-one) |

---

# kleros court list

List all Kleros arbitration courts with stake requirements and fee structure. Use to identify which court governs a dispute or to find courts with active cases.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--chain` | `string` |  | Target chain (ethereum, gnosis, arbitrum-sepolia, arbitrum-one) |
| `--limit` | `number` |  | Max results (default 50, max 1000) |
| `--cursor` | `string` |  | Pagination cursor — the last court id from this command's own previous response (its nextCursor). Courts are returned in numeric court-id order, so paging resumes at the next court above (or below, with --order-direction desc) that id. Cursors from other list commands are rejected. |
| `--orderBy` | `string` |  | Sort field (default: id) |
| `--orderDirection` | `string` |  | Sort direction: asc or desc (default: asc) |

---

# kleros court policy

Retrieve the arbitration policy document for a court from IPFS. Use to understand the rules jurors must apply when ruling on disputes in that court.

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | yes | Court ID |

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--chain` | `string` |  | Target chain (ethereum, gnosis, arbitrum-sepolia, arbitrum-one) |
