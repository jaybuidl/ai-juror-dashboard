# Merging parallel ticket branches

Parallel branches collide in the status prose and in the code. What auto-merge produces here is
true of each parent alone and false of the merge.

Each entry below cost real effort to discover and is easy to get wrong again.
They are facts about this codebase and the live court, verified against chain, subgraph
or a browser at the time noted. `CLAUDE.md` § Tripwires carries a one-line form of each;
this file is the full account.

- **Parallel ticket branches collide in the status prose *and* in the code.** Tickets 03, 14 and a
  CI branch each touched this file's status paragraph and `README.md` § Status. Git auto-merged all
  three textually and produced claims true of every parent alone and false of the merge — "no
  dispute data" one commit after the dispute list landed, and a `live` CI job describing one
  integration suite after `yarn test:integration` had silently picked up a second. Lint, types and
  tests passed on all of it. Tickets 04 and 05 then did it again in the source: both branches
  independently generalised the *same* private `fetch` helper so a second reader could share it, in
  different directions — `postSubgraphQuery` in a new `src/disputes/subgraph.ts` against an exported
  `postCoreQuery` left in `court-subgraph.ts` — so what conflicted was a design choice, not a text
  merge. Ticket 05's file records how that one was settled, under § Integrated with ticket 04.
  When integrating, re-read every sentence that counts what is done or says how many of something
  there are, and every helper both branches touched. Tickets 10 and 16 then showed the *type*
  version of the same thing: 10 made `rewards` a required field of `RawCourtData`, and 16's
  `DisputeCards.test.tsx` builds one — so the merge failed `check-types` on a file neither branch
  had a reason to touch. That one is cheap, because the compiler finds it; the four prose defects
  in the same merge are the expensive half, and nothing found them but reading. Then look for what the merge newly connects
  that neither parent could test: ticket 04's `slotsFor` only reaches ticket 05's matrix once both
  are on the same branch, and on either branch alone that wire is `undefined`. The sentences and
  hunks that raise a conflict marker are the easy half.
- **Never machine-resolve a conflict hunk by concatenating both sides, however additive it looks.**
  Three branches merged at once (08, 12, 13) produce dozens of hunks whose base side is empty, and
  a script that keeps ours-then-theirs for those looks safe and is not: git splits hunks wherever
  the diff happens to align, which in this repo's house style lands **inside a prose doc comment**.
  Concatenating then swallows the `/**` opener of the second block, or drops the `});` closing a
  `describe`, and the error surfaces hundreds of lines away pointing at the wrong thing. Four files
  broke that way on the 08 + 12 + 13 merge — `totals.ts`, `Matrix.tsx`, `useCourtPerformance.ts`,
  `performance.test.ts` — and it was Biome's parser that caught every one, not review. Worse, the
  same technique can lose a *type field* rather than a brace: `unreadDisputes` was concatenated
  onto the end of `WindowChange` instead of `CourtTotals`, which parses fine and is simply wrong.
  Resolve hunks by hand. If a script is unavoidable, diff the result against **both** parents
  afterwards for lines appearing more often than in either — that check is what proved the rest of
  that merge clean.
