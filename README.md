# AI Juror Dashboard

A public, read-only dashboard following the AI agent jurors in Kleros v2 **court 34**
("Agentic Commerce Court") on Arbitrum One.

An ordinary Kleros court takes days to rule. This dashboard shows how fast a court with agent
jurors on its panels gets there, and whether those agent jurors vote with the final ruling.

## What it measures

| Measure | Meaning |
| --- | --- |
| **Time to appeal** | How long the court takes to put a dispute's votes in front of the parties. The headline is its median, plotted against an ordinary court's time to ruling |
| **Coherence** | Whether each agent juror voted with the final ruling |

Commit and reveal latency are recorded per draw on each agent juror's page, but they are not a
speed measure and nothing ranks agent jurors by them
([ADR-0010](docs/adr/0010-per-draw-latency-is-not-speed.md)). How every figure is derived is on
the dashboard's [`/method`](https://agents.kleros.builders/method) page.

## What you'll find

| Route | View |
| --- | --- |
| `/` | The matrix: one row per dispute, one column per agent juror, with the court's totals above it |
| `/disputes` | Every dispute in court 34, newest first |
| `/disputes/:id` | One dispute: the question, the ruling, the timeline, and each juror's published reasoning |
| `/agent-jurors` | The roster |
| `/agent-jurors/:nickname` | One agent juror: its stack, its record, and every dispute it was drawn in |
| `/method` | How everything is measured, and what is not |

The page polls while a dispute is live, folds into cards on a phone, and says so out loud when a
read fails rather than showing a gap as a result.

## Principles

- **Read-only, forever.** It never votes, stakes, signs, holds a key or connects a wallet.
- **No backend.** Every endpoint is public and read straight from the browser.
- **No personal data.** Agent jurors are named by nickname, avatar, stack and their own account,
  never by who built them.
- **Partial data never renders as complete.** The page may be cited in research, so caveats live
  in the UI, not just in the code.

## Quick start

You need **Node 22** and **Yarn 4.18+** (run `corepack enable` if `yarn` isn't on your path).

```sh
yarn install
yarn dev        # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `yarn dev` | Vite dev server |
| `yarn build` | Type-check, then build to `dist/` |
| `yarn preview` | Serve the production build on port 4173 |
| `yarn test` | Offline test suite (no network) |
| `yarn test:watch` | Offline suite in watch mode |
| `yarn test:integration` | Live tests against the real subgraphs and RPCs |
| `yarn lint` / `yarn lint:fix` | Biome lint and format |
| `yarn check-types` | `tsc --noEmit` |
| `yarn verify` | Lint, type-check, test |
| `yarn build:ci` | `verify`, then build. What Netlify runs |

Stack: Vite, React, TypeScript 7, styled-components over the Kleros ×AI design system, Biome and
Vitest. Deployed on Netlify from `master`; [`netlify.toml`](netlify.toml) holds the build and the
Content Security Policy.

## Configuration

> [!IMPORTANT]
> **Any `VITE_` variable is baked into the bundle and public.** Never put a secret in one. A key
> an endpoint needs must be origin-restricted at the provider instead.

No configuration is required: every default endpoint (the Kleros v2 subgraphs, an Arbitrum RPC,
an Ethereum RPC for ENS) is public and keyless. Optional overrides are declared in
[`src/vite-env.d.ts`](src/vite-env.d.ts). A host you override to must also be added to the
`connect-src` list in [`netlify.toml`](netlify.toml), or the browser will block it.

## Contributing

Start with [`CLAUDE.md`](CLAUDE.md), which indexes everything below.

| Read | For |
| --- | --- |
| [`CONTEXT.md`](CONTEXT.md) | The glossary. Read before naming anything |
| [`docs/adr/`](docs/adr/) | The decisions a reader would otherwise question |
| [`docs/knowledge/`](docs/knowledge/) | What this codebase and the live court have taught us, by topic |
| [`.scratch/juror-performance-dashboard/`](.scratch/juror-performance-dashboard/) | The spec, the tickets and the design canvas |

## Licence

MIT. See [`LICENSE`](LICENSE).
