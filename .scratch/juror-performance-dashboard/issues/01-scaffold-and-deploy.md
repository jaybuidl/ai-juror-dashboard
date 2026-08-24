# 01: Scaffold the project and deploy it publicly

**What to build:** A visitor can open a public URL and see the dashboard's shell — its name and an
empty state. Nothing else works yet, but the deployment pipeline that every later ticket relies on
is proven end to end.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Vite + React + TypeScript application builds and runs locally
- [ ] yarn v4 with `nodeLinker: node-modules`
- [ ] Biome configured for lint and format, and passing
- [ ] A test runner is configured and one trivial test passes
- [ ] Deployed to Netlify at a public URL
- [ ] README states that any `VITE_`-prefixed configuration is baked into the bundle and is public by
      construction, so any endpoint key placed there must be origin-restricted rather than secret
