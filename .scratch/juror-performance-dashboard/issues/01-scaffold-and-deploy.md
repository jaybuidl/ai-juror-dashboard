# 01: Scaffold the project and deploy it publicly

**What to build:** A visitor can open a public URL and see the dashboard's shell — its name and an
empty state. Nothing else works yet, but the deployment pipeline that every later ticket relies on
is proven end to end.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

- [x] Vite + React + TypeScript application builds and runs locally
- [x] yarn v4 with `nodeLinker: node-modules`
- [x] Biome configured for lint and format, and passing
- [x] A test runner is configured and one trivial test passes
- [x] Deployed to Netlify at a public URL
- [x] README states that any `VITE_`-prefixed configuration is baked into the bundle and is public by
      construction, so any endpoint key placed there must be origin-restricted rather than secret

## Comments

**Scaffold done; the Netlify step is with the repo owner.** Five of six criteria are met on
`master`. The sixth is unticked on purpose: the owner asked to drive the Netlify CLI and console
themselves, so the repo is *prepared* for the deploy rather than deployed.

What is in place: Vite 8, React 19, TypeScript 7, yarn 4.18 (`nodeLinker: node-modules`), Biome
2.5 for lint and format, Vitest with jsdom, and a `netlify.toml` that is the single source of
truth for the build. `yarn verify` is green and a clean-room `rm -rf node_modules && CI=true yarn
install --immutable && yarn build` reproduces byte-identically, which is the path Netlify's
builder takes.

Decisions worth knowing before the next ticket:

- **Yarn must be 4.18 or newer.** Earlier versions cannot install TypeScript 7 at all — the
  builtin PnP compat patch expects a file the native compiler does not have. Pinned in both
  `packageManager` (for Netlify's corepack) and the `volta` key (for local shells, which ignore
  `packageManager`).
- **Two TypeScript programs.** `tsconfig.json` covers `src/` with `"types": []`, so `process.env`
  is a type error in browser code; `tsconfig.node.json` covers the build configs. This exists
  because agentkit's `getSubgraphUrl` reads `process.env` and ADR-0003 moves code between the
  repos.
- **The CSP in `netlify.toml` is enforcing.** `connect-src` is an allowlist and is deliberately
  narrower than the finished app needs. Ticket 02 must add the Ethereum mainnet RPC to it, or ENS
  resolution is blocked at the browser.
- **`yarn test` is offline; `yarn test:integration` is live.** The `.integration.test.*` infix is
  load-bearing in both configs.

Remaining, for the repo owner:

1. Create the project in the **Kleros** Netlify team from `jaybuidl/ai-juror-dashboard` (private
   repo — the Netlify GitHub App needs access granted to it specifically).
2. Set the project name to `kleros-ai-jurors` and confirm the production branch is `master`.
3. Nothing needs entering in the build settings UI: `netlify.toml` overrides it and already
   specifies `yarn build:ci` and `dist`.
4. Deploy Previews are on by default and branch deploys are off. Netlify URLs are public
   regardless of the repo being private — check team project-visibility or password protection
   if previews should stay closed while the dashboard is unfinished.

Then tick the last box. Tickets 02 and 03 are unblocked and can run in parallel.

### Deployed, 2026-08-25

**Live at <https://kleros-ai-jurors.netlify.app>.** The last checkbox is ticked: the repo owner
created the site and Git-linked it to master. Confirmed from outside — the deployed response
carries the enforcing CSP from `netlify.toml`, including the `connect-src` hosts ticket 02 added,
so the file really is the single source of truth for the deploy and a push really does ship it.
