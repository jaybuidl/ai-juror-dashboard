# 04: Give each dispute row its real title

**What to build:** A visitor scanning the dispute list reads what each dispute is actually about,
rather than matching numbers.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Dispute titles and categories are read from the dispute resolver template subgraph
- [ ] Template data is consumed as plain JSON — no IPFS resolution and no Kleros SDK dependency, so
      nothing Node-only enters the bundle
- [ ] Each dispute row shows its title alongside its core dispute ID
- [ ] A dispute whose template cannot be resolved still renders, identified by ID
