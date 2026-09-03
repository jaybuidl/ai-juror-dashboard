# Build, deploy, CSP and toolchain

The gaps between a local run and the Netlify deploy, and the toolchain errors that surface
nowhere near their cause.

Each entry below cost real effort to discover and is easy to get wrong again.
They are facts about this codebase and the live court, verified against chain, subgraph
or a browser at the time noted. `CLAUDE.md` § Tripwires carries a one-line form of each;
this file is the full account.

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
  `Footer.tsx`) is fine because those names differ; `failure.ts` + `Failure.tsx` is not, and
  becomes `failures.ts` + `Failure.tsx`. Biome and Vite say nothing — only `yarn check-types` does.
