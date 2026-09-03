# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This repo is **single-context**: one `CONTEXT.md` and one `docs/adr/` directory at the root.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root: the glossary of domain terms.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in.
- **`docs/knowledge/`**: the knowledge base — the full account of every trap this project has hit,
  one file per topic, indexed in its own `README.md`. `CLAUDE.md` § Tripwires is the one-line index
  over it; read the topic file before acting on a tripwire.

**Routing for anything new you learn:** a durable domain fact goes in the matching
`docs/knowledge/` file, plus a tripwire line in `CLAUDE.md` only if it prevents a mistake. Session
auto-memory is for user, feedback and tooling facts only — it is per-user, unversioned, and
subagents never see it.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-example-decision.md
│   └── 0002-another-decision.md
├── docs/knowledge/
│   ├── README.md
│   └── <topic>.md
└── src/
```

If this repo ever grows into a monorepo with genuinely separate contexts, switch to a root `CONTEXT-MAP.md` pointing at one `CONTEXT.md` per context (with context-scoped `src/<context>/docs/adr/`), and update this file.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
