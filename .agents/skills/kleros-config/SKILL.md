---
name: kleros-config
description: Manage persistent configuration defaults (chain, etc.) for the kleros CLI. Run `kleros config --help` for usage details.
requires_bin: kleros
command: kleros config
---

# kleros config get

Read a single configuration key: the persisted value plus the EFFECTIVE value actually in force and where it was resolved from. The two differ whenever an environment variable overrides the persisted value, or a runtime resolver refuses it. Use to verify what chain or setting is currently active before running queries.

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `key` | `string` | yes | Config key |

---

# kleros config list

List all supported configuration keys with effective value, resolution source, allowed values, and description. Use to inspect current defaults (chain, etc.) before running protocol queries.

---

# kleros config set

Persist a configuration default (e.g., chain) so subsequent commands inherit it without needing flags. Call once during setup to avoid passing --chain on every command.

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `key` | `string` | yes | Config key |
| `value` | `string` | yes | Config value |

---

# kleros config unset

Remove a persisted configuration key. No-op if the key is not currently set. Useful to revert to environment variable or flag resolution.

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `key` | `string` | yes | Config key to remove |
