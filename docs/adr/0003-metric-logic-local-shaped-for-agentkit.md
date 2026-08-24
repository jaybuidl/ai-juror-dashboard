# Metric logic lives in this repo, shaped for later extraction into agentkit

The performance metrics could have been built into `@kleros/agentkit` first, with this dashboard as
a thin renderer. Instead they live here, in a self-contained module with pure computation behind
thin I/O readers, returning agentkit's `KlerosResult<T>` envelope so the eventual move is mechanical.

## Considered Options

Building in agentkit was genuinely attractive: a juror-performance query is squarely its domain, and
it would give the team the same numbers from the CLI. It was rejected because it would couple a v1
dashboard to an agentkit release cycle while the metric definitions are still moving.

Reusing agentkit as a library was investigated and turned out to be thinner than expected. Its
`getJurorInfoV2` returns per-vote coherence aggregated across every court — precisely the number
ADR-0002 rejects — and it has no vote-level reads, no log scanning, and no historical court
parameters. `src/index.ts` does not export the domain readers at all, and `getSubgraphUrl` reads
`process.env`. The genuine overlap is chain configuration and subgraph URLs.

## Consequences

Some duplication of endpoint configuration is accepted for now. The seam is the constraint that
keeps extraction cheap: I/O at the edges, metric computation pure and network-free. Promotion to
agentkit as a `kleros juror performance` command should happen once the metric definitions stop
changing.
