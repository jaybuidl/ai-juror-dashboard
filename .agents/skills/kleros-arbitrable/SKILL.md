---
name: kleros-arbitrable
description: Classify Kleros arbitrable contracts — Tier 1 type lookup via curated registry and Meta-Evidence. The curated registry lookup is chain-agnostic; the Meta-Evidence category fallback behind it runs only on chains running Kleros v1. Run `kleros arbitrable --help` for usage details.
requires_bin: kleros
command: kleros arbitrable
---

# kleros arbitrable classify

Classify an arbitrable contract address as a known Kleros type (curated registry hit) or free-text category (Meta-Evidence fallback — callers must not branch on category value). Requires --chain (arbitrable addresses are chain-specific).

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `address` | `string` | yes | Arbitrable contract address (checksummed or lowercase 0x...) |

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--chain` | `string` |  | Target chain (ethereum, gnosis, arbitrum-sepolia, arbitrum-one) — curated registry only on chains running Kleros v2 |
