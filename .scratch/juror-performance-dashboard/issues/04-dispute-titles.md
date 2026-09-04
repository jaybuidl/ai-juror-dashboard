---
status: done
blocked_by: ["03"]
---

# 04: Give each dispute row its real title

**What to build:** A visitor scanning the dispute list reads what each dispute is actually about,
rather than matching numbers.

**Design:** `../canvas/Main.dc.html:156-173` (the row header: the title on the first line beside the
core dispute ID, the category on the second), `../canvas/README.md` for provenance

- [x] Dispute titles and categories are read from the dispute resolver template subgraph
- [x] Template data is consumed as plain JSON — no IPFS resolution and no Kleros SDK dependency, so
      nothing Node-only enters the bundle
- [x] The title sits on the row header's first line, beside the core dispute ID, and truncates with an
      ellipsis rather than wrapping, so every row keeps one height
- [x] The category sits on the row header's second line, before the ruling, and never beside the title
- [x] A dispute whose template cannot be resolved still renders, identified by ID

## Comments

**Built 2026-08-25**, on `worktree-ticket-4`. `src/disputes/` gained `dispute-templates.ts` (pure
parsing and the join), `drt-subgraph.ts` (the reader) and `subgraph.ts` (the GraphQL error handling
both readers were duplicating). 30 offline tests added, 5 live. Verified in system Chrome against
the built bundle at 1280px and 430px: sixteen titles resolve, rows hold one height, and dispute
159's empty category takes its separator with it.

**The join had to be read, not computed.** Court 34's dispute 151 resolves through template 161 and
152 through 163 — the offset is neither zero nor constant, so `templateId` is now carried on the
model. It is nullable on the subgraph's own type.

**Decisions:**

- **Partial reads are counted, not caught.** The DRT read reports `{expected, resolved, isLoading}`
  rather than an `Error | null`, because the likeliest failure throws nothing: a reindexing template
  subgraph answers HTTP 200 with `[]` and a lagging one with part of the set. Both would have left
  rows silently untitled — indistinguishable from disputes that never had a title. A thrown error is
  then just the case where `resolved` is zero. Found by review, not by design; the first version
  caught only the throw.
- **The notice is separate from the disputes-failed one and worded so it cannot overclaim** — it says
  the list is complete and only titles are missing. Reusing the existing notice would have told a
  visitor the court's record was partial when it was whole.
- **The title element renders even when empty**, with a `min-height` of its own line box. Omitting it
  let grid row 1 fall back to the smaller dispute ID, so untitled rows sat shorter and every row
  shifted the moment titles landed. Also review-found.
- **`title` attribute for the clipped text**, as the pragmatic affordance. The accessible treatment
  is ticket 18's and is noted there.
- `VITE_DRT_SUBGRAPH_URL` added to `src/vite-env.d.ts`. No CSP change: the endpoint is on
  `api.goldsky.com`, which the core subgraph already put on `connect-src`.
