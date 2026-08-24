---
name: kleros-dispute
description: Query Kleros disputes — list, get details, and inspect state across chains. Run `kleros dispute --help` for usage details.
requires_bin: kleros
command: kleros dispute
---

# kleros dispute brief

Fetch a composite dispute snapshot in a single call: policy URIs, evidence with IPFS hints, ruling labels, parties, appeal state, and arbitrable classification. Use --depth 0 for subgraph metadata only, --depth 1 (default) for resolved URIs, --depth 2 for full IPFS content with extractionHints. Works across the supported chains: ethereum, gnosis, arbitrum-sepolia, arbitrum-one. On second-generation chains the policy section resolves via the DisputeTemplate registry and metaEvidenceUri is null there.

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | yes | Dispute ID |

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--chain` | `string` |  | Target chain (ethereum, gnosis, arbitrum-sepolia, arbitrum-one) |
| `--depth` | `number` | `1` | Token-cost depth: 0=metadata-only, 1=+resolved URIs (default), 2=+full IPFS content |

---

# kleros dispute get

Fetch full details for a specific Kleros dispute: period, juror count, ruling, deadlines, and arbitrated contract. Use when you have a dispute ID and need its current state to determine next actions.

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | yes | Dispute ID |

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--chain` | `string` |  | Target chain (ethereum, gnosis, arbitrum-sepolia, arbitrum-one) |

---

# kleros dispute list

List Kleros disputes, optionally filtered by court, status, or chain. Use when an agent needs to enumerate active or historical cases, or to discover dispute IDs for follow-up queries.

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--chain` | `string` |  | Target chain (ethereum, gnosis, arbitrum-sepolia, arbitrum-one) |
| `--court` | `string` |  | Filter by court ID |
| `--status` | `string` |  | Filter by period (Evidence, Commit, Vote, Appeal, Executed) |
| `--limit` | `number` |  | Max results (default 50, max 1000) |
| `--cursor` | `string` |  | Pagination cursor — an opaque page token copied verbatim from a previous response's nextCursor (may carry a chain prefix, e.g. ethereum:c1.createdAt.25665922). A token records the sort order it was minted under and is rejected if replayed under a different --order-by. |
| `--orderBy` | `string` |  | Sort field: disputeID (default), lastPeriodChange, createdAt |
| `--orderDirection` | `string` |  | Sort direction: asc or desc (default: desc) |

---

# kleros dispute policy

Fetch the dispute-specific policy document from IPFS. Resolves via the Meta-Evidence chain on first-generation chains and via the DisputeTemplate registry, with DataMapping rendering, on second-generation chains. Returns metaEvidenceUri, policyUri, courtPolicyUri, templatePolicyUri, templateId, and enrichment data. Supported chains: ethereum, gnosis, arbitrum-sepolia, arbitrum-one. On second-generation chains the court policy and the dispute template policy are two independent documents — fetch both; neither is derived from the other.

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | yes | Dispute ID |

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--chain` | `string` |  | Target chain (ethereum, gnosis, arbitrum-sepolia, arbitrum-one) |
