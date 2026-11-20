# Build, deploy, CSP and toolchain

The gaps between a local run and the Netlify deploy, and the toolchain errors that surface
nowhere near their cause.

Each entry below cost real effort to discover and is easy to get wrong again.
They are facts about this codebase and the live court, verified against chain, subgraph
or a browser at the time noted. `CLAUDE.md` § Tripwires carries a one-line form of each;
this file is the full account.

- **A vendored image under 4096 bytes is not `'self'` — it is `data:`** (2026-09-04, ticket 26).
  Vite's `assetsInlineLimit` defaults to 4096, so `src/roster/hermes-agent.png` (817 bytes) emits
  no file at all: `dist/` holds no PNG and the bundle carries one `data:image/png;base64` URI. It
  loads because `img-src` lists `data:` for ENS avatars, not because it is served from this
  origin. Anyone tightening that directive has to know the mark goes with it — and it goes **in
  production only**, since Vite dev and `yarn preview` send no CSP. Check `dist/` rather than
  reasoning from where the file sits in `src/`.

- **agentkit is only partly browser-safe.** `src/core/juror-v2.ts` and `disputes-v2.ts` are clean;
  `config-source.ts`, `sdk-lock.ts`, `rate-limit.ts`, `report-issue.ts` are Node-only. Its
  `src/index.ts` does not export the domain readers, and `getSubgraphUrl` reads `process.env`.
- **Vite dev and `yarn preview` send no CSP at all**, so a missing host in `netlify.toml` looks
  perfect locally and fails only in production — for a font or a stylesheet, as a silent fall back
  rather than an error. The guard-rail comment there covered only `connect-src` until ticket 14 and
  would have missed a font host entirely; it now covers any host, in the directive that governs it.
  Verify with an A/B against a local server sending the exact policy, collecting through a
  `report-uri` or a `securitypolicyviolation` listener registered at document start — the browser
  console does not carry violations to automation.
- **`yarn test` reads the deploy's `VITE_` variables on Netlify and none on your machine.** The
  build command is `yarn build:ci`, which runs lint, types *and the offline suite* inside the
  deploy environment — so every variable configured for the site is set while the tests run, and
  a green local suite says nothing about a test that reads `import.meta.env`. Production sets
  `VITE_ARBITRUM_RPC_URL`; the moment `arbitrumSource()` made the failure banner name the endpoint
  actually configured, two assertions expecting the literal `arb1.arbitrum.io` passed on every
  developer machine and failed only in the deploy. The comment beside them even stated the
  mechanism — "no `VITE_ARBITRUM_RPC_URL` is set under jsdom" — and drew the wrong conclusion from
  it. Assert what the accessor returns (`arbitrumSource().name`), and pin what the *default*
  derives to in one unit test that passes the URL explicitly. Before touching anything that reads
  `import.meta.env`, run the suite both ways: `yarn test` and
  `VITE_ARBITRUM_RPC_URL=… yarn test`. This applies to the other three overrides the moment
  anything derives from them.
- **`Thing.ts` and `Thing.tsx` differing only in case is a hard TypeScript error on macOS.**
  `TS1149`, raised at whichever file imports the second one, and it names both paths rather than
  saying "rename this". The house pattern of a pure model beside its component (`provenance.ts` +
  `ReadStamp.tsx`) is fine because those names differ; `failure.ts` + `Failure.tsx` is not, and
  becomes `failures.ts` + `Failure.tsx`. Biome and Vite say nothing — only `yarn check-types` does.

## Toolchain constraints

Moved from `README.md` on 2026-11-20, when the README was rewritten for visitors. These are
constraints rather than traps, so `CLAUDE.md` carries no one-line form of them.

- **Yarn must be 4.18 or newer, and is pinned twice.** Yarn up to 4.17.0 applies a builtin
  Plug'n'Play compatibility patch to `typescript` that expects `lib/_tsc.js`, a file TypeScript 7's
  native compiler does not have, and the install aborts. The patch is pointless here
  (`nodeLinker: node-modules`) and nothing skips it: `resolutions` cannot, because both run in the
  same `reduceDependency` hook with the patch applied second. Fixed in yarn 4.17.1
  ([yarnpkg/berry#7190](https://github.com/yarnpkg/berry/pull/7190)). Both pins are load-bearing:
  `packageManager` is what Netlify's corepack reads, and the `volta` key is what a local shell
  reads: Volta's yarn shim ignores `packageManager`, so without the `volta` entry a
  contributor's `yarn install` falls back to their default yarn and hits the bug again.
- **TypeScript 7 ships `tsc` and nothing else.** No `tsserver`, no `require("typescript")`; the
  programmatic API is deferred to 7.1. Nothing here needs it (Biome is Rust, Vite and Vitest
  transpile through esbuild and rolldown), but adding typescript-eslint would be a blocker, since
  its peer range still excludes 7. Editor diagnostics are LSP-based under 7.
- **Dependency floors are caret ranges, not exact pins.** The maintainer's global Yarn config sets
  `npmMinimalAgeGate`, quarantining versions published in roughly the last two days. A caret lets
  Yarn pick the newest release that clears the gate; an exact pin on a fresh release fails the
  install.
- **`yarn build` type-checks first on purpose.** Vite strips types without checking them and Biome
  does no type checking, so nothing else in the pipeline would catch a type error.
- **Type-checking is two programs.** `tsconfig.json` covers `src/` with `"types": []`, so
  `process`, `Buffer` and `__dirname` are errors in browser code; `tsconfig.node.json` covers the
  Vite and Vitest configs with the Node globals. Without the split a stray `process.env`
  type-checks, bundles, and throws on a public page, which is a live hazard because agentkit's
  `getSubgraphUrl` reads `process.env` and ADR-0003 moves metric code between the repos.
- **Biome's 100-column width matches `@kleros/agentkit`**, so metric logic extracted there
  reformats to a zero-line diff (ADR-0003).
- **`src/styles/kleros-ai/` is excluded from Biome**, like `.scratch`, because the formatter
  rewrites the vendored files (`0.10` becomes `0.1`, gradients explode). The exclusion keeps a
  re-copy of the design system a whitespace-free diff.
- **If a Netlify build ever fails with the Yarn 1 shim's "Corepack must currently be enabled"**,
  change the build command to `corepack enable && yarn install --immutable && yarn build:ci`.
