# AI Juror Dashboard

A public, read-only dashboard measuring six AI agent jurors in Kleros v2 **court 34**
("Agentic Commerce Court") on Arbitrum One, on two dimensions: **speed** (commit and reveal
latency) and **coherence** (voting with the final ruling).

In an ordinary Kleros court, a voting period runs for days. These agent jurors act in seconds —
the median reveal lands 85 seconds after the period opens. Making that contrast legible is the
dashboard's job.

## Status

**The matrix is live, and it now has a dashboard around it.** This repository contains the
application shell, the deployment pipeline, the Kleros ×AI visual system, and five routes under one
piece of chrome: the matrix at `/` — one row per dispute, headed by what that dispute is actually
about, one column per agent juror, each cell carrying that draw's commit latency, its reveal latency
and whether it voted with the dispute's final ruling — plus the court's totals and latency
distribution above it, a dispute index at `/disputes`, the six agent jurors at `/agent-jurors`, how
everything is measured at `/method`, and a 404 view behind them. Every view carries the same nav,
the same read-only statement and a footer stating the provenance of what is above it. Three
measures, and no more — per-agent-juror summaries and rewards are still unread. Each page names its
own gaps outright, because a public page whose figures may be cited must never let "not built" look
like "no results".

Commit latency is the one figure not read from a subgraph: it comes from `CommitCast` logs on an
Arbitrum RPC, because the subgraph records only *whether* a juror committed and never *when*. Every
draw the subgraph calls committed is cross-checked against a matching log, and any shortfall is
stated on the page as a count — an endpoint that silently returns fewer logs must never render as
an agent juror that failed to commit.

Court 34's period durations changed partway through the experiment, so the windows each dispute ran
under are read from the court's own `CourtCreated` and `CourtModified` events rather than from what
it is configured with now. Dispute 151 ran an 8-hour commit window against the 45 minutes configured
from dispute 152 onward, and it carries a marker wherever its figures are counted. No latency
anywhere is divided by a window — see [ADR-0005](docs/adr/0005-latency-is-never-shown-as-a-fraction-of-a-window.md).

Read [`CLAUDE.md`](CLAUDE.md) before writing code — in particular its **Traps** section, which
records the things that cost real time to discover. The design that this scaffold serves lives in:

| Document | Contents |
| --- | --- |
| [`CONTEXT.md`](CONTEXT.md) | The glossary. Read before naming anything |
| [`docs/adr/`](docs/adr/) | Six decisions a reader would otherwise question |
| [`.scratch/juror-performance-dashboard/spec.md`](.scratch/juror-performance-dashboard/spec.md) | The spec, plus a Further Notes section of hard-won facts |
| [`.scratch/juror-performance-dashboard/issues/`](.scratch/juror-performance-dashboard/issues/) | Eighteen tickets, blockers first |
| [`DESIGN_PROMPT.md`](DESIGN_PROMPT.md) | The UI brief. Answered — read the canvas rather than re-deriving it |
| [`.scratch/juror-performance-dashboard/canvas/README.md`](.scratch/juror-performance-dashboard/canvas/README.md) | The design canvas: eight artboards, and which figures on them are real |

## Quick start

Requires **Node 22** (pinned in `.nvmrc`, and in the `volta` key of `package.json`) and
**Yarn 4.18+** (pinned in both `packageManager` and `volta`; run `corepack enable` if `yarn` is
not already on your path). See "Known toolchain constraints" for why the yarn floor is not
negotiable.

```sh
yarn install
yarn dev        # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `yarn dev` | Vite dev server with fast refresh |
| `yarn build` | Type-checks, then builds to `dist/` |
| `yarn preview` | Serves the production build locally |
| `yarn test` | Runs the offline test suite once |
| `yarn test:watch` | Runs the offline test suite in watch mode |
| `yarn test:integration` | Runs the live tests, which do hit the network |
| `yarn lint` | Biome check — lint and format, read-only |
| `yarn lint:fix` | Biome check with fixes applied |
| `yarn check-types` | `tsc --noEmit` |
| `yarn verify` | Lint, then type-check, then test |
| `yarn build:ci` | `yarn verify` and then build. What Netlify runs |

`yarn build` type-checks first on purpose: Vite strips types without checking them and Biome does
no type checking at all, so nothing else in the pipeline would catch a type error. Netlify runs
`build:ci` rather than `build`, which additionally lints and runs the tests — that deploy is the
last gate between a change and a public page, and it stays a full one even though CI now runs the
same checks earlier.

Type-checking is two programs, not one. `tsconfig.json` covers `src/` and sets `"types": []`, so
`process`, `Buffer` and `__dirname` are **errors** in browser code; `tsconfig.node.json` covers
the Vite and Vitest configs and does load the Node globals. Without that split a stray
`process.env` type-checks, bundles, and then throws on a public page — which is a live hazard
here, because agentkit's `getSubgraphUrl` reads `process.env` and ADR-0003 has metric code moving
between the two repos in both directions.

### Continuous integration

`.github/workflows/ci.yml` holds two jobs. **`ci`** gates pull requests and pushes to `master`,
running lint, type-check, tests and build as four separate steps so a failure names its own stage.
**`live`** runs `yarn test:integration`, which is every `*.integration.test.ts` under `src/` — a
suite joins by filename, so nothing here has to count them. They are the drift checks a fixture
cannot perform: that each roster address still answers to the subname it claims, that the core
subgraph still returns the court's disputes and its draws in the shape the model parses, that the
template subgraph still resolves what those disputes are about, that Arbitrum still emits the
`CommitCast` event this dashboard reads commit latency from — with the cross-check that every
committed draw has a matching log run against the live reads rather than a snapshot of them — and
that court 34 still reports the two period configurations `/method` describes in prose, so a third
one fails in CI before anybody reads a stale account of the second. It runs on a daily cron and on
`workflow_dispatch` only, and never gates a pull request: its failure mode there would be network
flake, and a red that means nothing teaches people to ignore red.

One constraint in that file resists being tidied. Yarn 4 is not vendored here, so `corepack enable`
must run *after* `actions/setup-node` and *before* anything invokes `yarn`; Ubuntu runners ship Yarn
1.22 on `PATH`, and without that step `yarn` silently is Yarn 1. This is also why the workflow
resolves the cache directory itself rather than using `cache: yarn` on `setup-node`, which asks Yarn
1 where its cache lives and then caches a directory Yarn 4 never writes to — a cache that never
errors and never hits.

## Configuration

> [!IMPORTANT]
> **Any `VITE_`-prefixed variable is baked into the JavaScript bundle at build time and is public
> by construction.** It is served to every visitor and readable by anyone who opens the page or
> the deploy's source. It is not hidden, not obscured, and not removable after the fact.
>
> Nothing secret may ever be placed in a `VITE_` variable. If an endpoint requires a key, that key
> must be **origin-restricted at the provider** — scoped so that it only works when requested from
> this dashboard's domain — rather than treated as a secret. An endpoint that can only be secured
> by keeping its key private cannot be used by this dashboard at all.

This holds because the dashboard has **no backend**. Every endpoint it reads is public and keyless
by default: the Kleros v2 core and DRT subgraphs, an Arbitrum RPC, and an Ethereum mainnet RPC for
ENS. `VITE_` variables exist only to override those defaults, not to authenticate to them.

Overrides are declared in [`src/vite-env.d.ts`](src/vite-env.d.ts) as they are introduced. A host
substituted through an override must also be added to the `connect-src` allowlist in
[`netlify.toml`](netlify.toml), or the browser will block the request.

## Conventions

**TypeScript** is 7.x — the native compiler — run strict, with `noUncheckedIndexedAccess` and
`verbatimModuleSyntax` on. `tsc --noEmit` is the only place TypeScript is invoked; nothing here
consumes its API. See "Known toolchain constraints" for why that distinction matters.

**Biome** handles both lint and format: two-space indent, 100-column lines, double quotes,
imports organised on write. The 100-column width matches `@kleros/agentkit`, so that the metric
logic this repo builds reformats to a zero-line diff when it is eventually extracted there
(ADR-0003).

**Tests** are Vitest with jsdom, colocated as `*.test.ts` / `*.test.tsx` beside the code they
cover. A good test here asserts external behaviour — given raw fetched data, what does the model
say — and never reaches into which helper computed a value.

Two kinds of test, split by filename:

- `*.test.ts` — offline. The pure core is tested against fixtures captured from the real court,
  with no network and no mocks. `yarn test` runs these.
- `*.integration.test.ts` — live. The I/O readers are tested against Goldsky and a public RPC
  directly, via `yarn test:integration` and `vitest.integration.config.ts`. Held out of the
  default run so `yarn test` never depends on the network. This split is deliberate: the pure
  core gets fixtures, the fetchers get the real endpoint, and nothing in between is stubbed.
  Those readers are ENS in `src/roster/`, and the Kleros v2 core subgraph in `src/disputes/`
  (disputes and rounds) and `src/performance/` (draws, votes and justifications).

**Components take what they render as props.** `App` is the composition root — providers, the
router, and the one place a hook reaches the network — while the route table and every view below
it are given their data. That is what lets the whole dashboard be exercised offline against
hand-built data, and is why `yarn test` needs no mock and no network to render it. The reads happen
above the routes rather than inside them, so one court read feeds the matrix, the dispute index and
the totals, and moving between views re-reads nothing.

**Routing** is react-router in its declarative mode, mounted as a `BrowserRouter` because these are
real URLs: every view is reachable by link, survives a reload and moves under the browser's back
and forward buttons. [`src/routes.tsx`](src/routes.tsx) is the whole table, and every route renders
inside one layout route so no view can lose the chrome. The SPA fallback in `netlify.toml` is what
makes a pasted link resolve in production — which also means the app is the only thing that can
tell a visitor a URL is wrong, hence the 404 view. Tests render through
[`src/test/court.tsx`](src/test/court.tsx)'s `renderAt(path)`, over a `MemoryRouter`, so the nav
and footer are exercised as part of whatever the route renders.

**Lint runs at end of turn.** `.claude/settings.json` registers a Stop hook,
[`.claude/hooks/lint-check.sh`](.claude/hooks/lint-check.sh), that runs `yarn lint` when an
agent finishes and refuses the stop — feeding Biome's output back — if it fails. Silent on
success. The Netlify build is the only other gate and it runs at deploy time, which is too late
to be useful and long after the turn that caused the problem lost its context.

**Styling** is styled-components over the Kleros ×AI design system. The system's eight token files
are vendored verbatim under [`src/styles/kleros-ai/`](src/styles/kleros-ai/) and entered through its
own `styles.css`; [`src/styles/theme.ts`](src/styles/theme.ts) is nothing but `var(--token)` aliases
over them, so a value can only be edited in one place. Two consequences worth knowing before
touching either:

- **The vendored directory is excluded from Biome**, the way `.scratch` is, because its formatter
  rewrites the files — it prints `rgba(18, 10, 47, 0.10)` as `0.1` and explodes the gradients. The
  exclusion is what keeps re-copying the system a whitespace diff instead of a merge.
- **`tokens/base.css` is the reset and owns the page**: `box-sizing`, the `body` background, colour,
  font and smoothing, `h1`–`h4`, `p`, `a`, `button`, `code, kbd, samp, pre`, `:focus-visible` and
  `::selection`. [`src/styles/global.ts`](src/styles/global.ts) declares only what the system has no
  opinion on. Restating a rule there would win on load order today and go on winning silently the
  day the system changed its mind.

Values in the system are matched by eye from screenshots — its own readme says so — so they are the
authority on this repo's palette without being authoritative to the pixel.

## Deployment

Netlify, building from `master`. [`netlify.toml`](netlify.toml) is the single source of truth —
settings there override anything entered in the Netlify UI — and it carries the build command,
the publish directory, the security headers and the SPA fallback.

Three things the build depends on, none of which are obvious:

- **`.nvmrc` pins Node.** Netlify's precedence is `.nvmrc` > `.node-version` > `NODE_VERSION` >
  UI, so setting `NODE_VERSION` in `netlify.toml` would be silently ignored. It is deliberately
  absent there.
- **`.yarnrc.yml` must be committed.** Netlify does not support Yarn Plug'n'Play and requires
  `nodeLinker: node-modules`.
- **`yarn.lock` must be committed and current.** Netlify sets `CI=true`, which makes Yarn 4
  enforce `--immutable`; a stale lockfile fails the build rather than being quietly rewritten.

If a first build ever fails with the Yarn 1 shim's "Corepack must currently be enabled" message,
change the build command to `corepack enable && yarn install --immutable && yarn build`.

### Content Security Policy

The policy in `netlify.toml` is enforcing, not report-only, and is written to make the read-only
invariant structurally true rather than merely intended: `default-src 'none'` and
`form-action 'none'` mean a page that started submitting anything would break loudly.

**Every ticket that adds a host to the page must add it there, under the directive that governs
it** — not only a data source. A stylesheet is `style-src`, a webfont is `font-src`, a script is
`script-src`, an image is `img-src`; `default-src 'none'` blocks whatever is not listed. A blocked
fetch reports itself in the browser console as a CSP violation, which is the intended failure mode:
loud, and never mistakable for missing data. Vite's dev server sends no policy at all, so a missed
entry looks perfect under `yarn dev` and `yarn preview` and appears only in production.

`connect-src` is the allowlist of endpoints the dashboard may read, including any host substituted
through a `VITE_` override.

`style-src` and `font-src` are still `'self'` after ticket 14 adopted the Kleros ×AI design system.
That system's `tokens/fonts.css` `@import`s Manrope and JetBrains Mono from Google Fonts; this repo
self-hosts both from [`src/styles/webfonts.ts`](src/styles/webfonts.ts) instead, so adopting the
system cost the policy nothing. Reintroducing a remote font would need `fonts.googleapis.com` on
`style-src` **and** `fonts.gstatic.com` on `font-src` — two directives, and listing only one fails
quietly.

One entry is there for a reason worth knowing before you touch it. `euc.li` serves the agent
jurors' ENS avatars, which are images — so it looks like `img-src` alone should cover it. It does
not: viem's `getEnsAvatar` sends a `HEAD` request to the avatar URL to check its content type
before the URL ever reaches an `<img>`, and that request is governed by `connect-src`. Blocked, it
fails *quietly* — viem catches the error and falls back to loading the URL as an `Image`, which
`img-src` permits — so the avatars still appear and the only trace is a console violation on every
load. Listing the host is what keeps this policy's failures loud.

The policy carries no `frame-src`, because the dashboard embeds nothing. Combined with
`frame-ancestors 'none'` and `X-Frame-Options: DENY` that also means Netlify's deploy-preview
Drawer cannot embed the site — accepted, in exchange for a policy containing no capability the
product does not use.

## Invariants

These are not preferences. They are the terms on which this dashboard exists.

- **Read-only, forever.** It never votes, stakes, holds a key, signs, or connects a wallet.
- **No backend.** Every endpoint is reachable from the browser, public and keyless.
- **No secrets.** See Configuration above. There is nowhere in this codebase for one to live.
- **No personal data.** Agent jurors are identified by nickname and stack, never by who built them.
- **Partial data never renders as complete.** The deployment is public and may be cited in
  research; caveats belong in the UI, not only in the code that handles them.

## Known toolchain constraints

**Yarn must be 4.18 or newer, and is pinned twice.** Yarn up to 4.17.0 applies a builtin
Plug'n'Play compatibility patch to the `typescript` package that expects `lib/_tsc.js` — a file
TypeScript 7's native compiler does not have — and the install aborts. The patch is pointless
here (this project uses `nodeLinker: node-modules`, not PnP) and no configuration skips it;
`resolutions` cannot, because both it and the patch run in the same `reduceDependency` hook with
the patch applied second. The fix shipped in yarn 4.17.1, via
[yarnpkg/berry#7190](https://github.com/yarnpkg/berry/pull/7190).

The version is therefore pinned in two places, and both are load-bearing: `packageManager` is what
Netlify's corepack reads, and the `volta` key is what a local shell reads — Volta's yarn shim
ignores `packageManager`, so without the `volta` entry a contributor's `yarn install` silently
falls back to their default yarn and hits the bug again.

**TypeScript 7 ships `tsc` and nothing else.** No `tsserver`, no `require("typescript")` — the
programmatic API is deferred to 7.1. Nothing here needs one: Biome is Rust, Vite and Vitest
transpile via esbuild and rolldown, and `tsc --noEmit` is the only invocation. It would become a
blocker the moment anyone added typescript-eslint, whose peer range still excludes 7. Editor
diagnostics are LSP-based under 7; check your editor before relying on them.

**Dependency floors are ranges, not exact pins.** The maintainer's global Yarn config sets
`npmMinimalAgeGate`, quarantining registry versions published within roughly the last two days.
Caret ranges let Yarn resolve to the newest release that clears the gate; exact pins on a
just-published version fail the install outright.

## Licence

MIT. See [`LICENSE`](LICENSE).
