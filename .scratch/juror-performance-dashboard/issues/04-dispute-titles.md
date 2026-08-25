# 04: Give each dispute row its real title

**What to build:** A visitor scanning the dispute list reads what each dispute is actually about,
rather than matching numbers.

**Blocked by:** 03

**Design:** `../canvas/Main.dc.html:156-173` (the row header: the title on the first line beside the
core dispute ID, the category on the second), `../canvas/README.md` for provenance

**Status:** done

- [x] Dispute titles and categories are read from the dispute resolver template subgraph
- [x] Template data is consumed as plain JSON — no IPFS resolution and no Kleros SDK dependency, so
      nothing Node-only enters the bundle
- [x] The title sits on the row header's first line, beside the core dispute ID, and truncates with an
      ellipsis rather than wrapping, so every row keeps one height
- [x] The category sits on the row header's second line, before the ruling, and never beside the title
- [x] A dispute whose template cannot be resolved still renders, identified by ID
