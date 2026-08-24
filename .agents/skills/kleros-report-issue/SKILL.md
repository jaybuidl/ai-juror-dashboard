---
name: kleros-report-issue
description: "File a feedback report about an MCP gap, unexpected behavior, or unknown dynamic-script CID. Default destination: local file at ~/.kleros/reports/. Use --submit to post to GitHub Issues (requires $GITHUB_TOKEN). Rate-limited: 3 reports per 60 seconds. Run `kleros report-issue --help` for usage details."
requires_bin: kleros
command: kleros report-issue
---

# kleros report-issue create

Create a feedback report. Writes a local .md file by default; use --submit to post to GitHub Issues (requires GITHUB_TOKEN).

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--type` | `string` |  | Report type: unknown-script-cid | mcp-gap | unexpected-behavior | other |
| `--cid` | `string` |  | IPFS CID — for unknown-script-cid reports |
| `--description` | `string` |  | Free-text description of the issue (D-11: not auto-injected) |
| `--disputeId` | `string` |  | Dispute ID for context (optional) |
| `--disputeChain` | `string` |  | Chain for dispute context (optional) |
| `--arbitrableAddress` | `string` |  | Arbitrable contract address for context (optional) |
| `--submit` | `boolean` | `false` | Post to GitHub Issues via REST API. Requires GITHUB_TOKEN env var. Never auto-submits (D-12). |
| `--repo` | `string` | `kleros/kleros-skills` | Target GitHub repo in owner/repo format (default: kleros/kleros-skills, D-05 -- kleros/agentkit is private and rejects non-collaborator submissions) |
